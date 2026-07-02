import type {
  Role,
  PersonProfile,
  RoleScore,
  MatchResult,
  MatchBand,
  EnglishLevel,
  PersonRiasec,
  RiasecProfile,
} from './types';

// ─── Global weight constants (tune against eval set, never inline) ────────────

/** Weight on RIASEC interest similarity component (0–1 cosine). */
export const W_INTEREST = 55;

/** Weight on aptitude-gap penalty (points deducted per gap unit). */
export const W_APTITUDE_GAP = 30;

/** Small tiebreaker boost from demandLevel. Must stay low enough that a clear
 *  RIASEC match wins even when the matched role has lower demandLevel than a rival. */
export const W_DEMAND_PRIOR = 2;

/** Top-2 scores within this many calibrated points → nearTie = true. */
export const NEAR_TIE_THRESHOLD = 8;

/** English level ordering for hard-filter comparison. */
const ENGLISH_LEVEL_RANK: Record<EnglishLevel, number> = {
  basic: 0,
  functional: 1,
  proficient: 2,
};

const DEMAND_PRIOR: Record<string, number> = {
  high: 1.0,
  medium: 0.6,
  low: 0.2,
};

// ─── Hard-filter gate ─────────────────────────────────────────────────────────

function passesHardFilters(
  person: PersonProfile,
  role: Role
): { passes: boolean; reason?: string } {
  const { hardConstraints } = person;
  const { hardFilters } = role;

  if (!hardFilters.eligibleStreams.includes(hardConstraints.educationStream)) {
    return {
      passes: false,
      reason: `stream "${hardConstraints.educationStream}" not in eligible streams for this role`,
    };
  }

  const personRank = ENGLISH_LEVEL_RANK[hardConstraints.englishLevel];
  const requiredRank = ENGLISH_LEVEL_RANK[hardFilters.minEnglishLevel];
  if (personRank < requiredRank) {
    return {
      passes: false,
      reason: `English level "${hardConstraints.englishLevel}" below required "${hardFilters.minEnglishLevel}"`,
    };
  }

  for (const cert of hardFilters.requiredCerts) {
    if (!hardConstraints.certifications.includes(cert)) {
      return { passes: false, reason: `missing required cert: ${cert}` };
    }
  }

  return { passes: true };
}

// ─── RIASEC interest similarity (cosine) ─────────────────────────────────────

function riasecToArray(r: RiasecProfile | PersonRiasec): number[] {
  return [r.R, r.I, r.A, r.S, r.E, r.C];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Returns 0–1 similarity between person's RIASEC and role's RIASEC profile. */
function interestSimilarity(person: PersonProfile, role: Role): number {
  return cosineSimilarity(riasecToArray(person.riasec), riasecToArray(role.riasec));
}

// ─── Aptitude-gap penalty ─────────────────────────────────────────────────────

/**
 * Computes a 0–1 penalty factor. For each aptitude dimension where the role
 * requires more than the person has, we accumulate a proportional shortfall.
 * The total shortfall is capped at 1 (full disqualification).
 *
 * Three dimensions, each 0–100. Max aggregate deficit = 300.
 * penalty = sum(max(0, required - actual)) / 300  → 0..1
 */
function aptitudeGapPenalty(person: PersonProfile, role: Role): number {
  const p = person.aptitude;
  const r = role.aptitude;

  const deficit =
    Math.max(0, r.numeracy - p.numeracy) +
    Math.max(0, r.writtenEnglish - p.writtenEnglish) +
    Math.max(0, r.spokenCommunication - p.spokenCommunication);

  return Math.min(1, deficit / 300);
}

// ─── Demand prior ─────────────────────────────────────────────────────────────

function demandPrior(role: Role): number {
  return DEMAND_PRIOR[role.market.demandLevel] ?? 0.5;
}

// ─── Band assignment ──────────────────────────────────────────────────────────

function scoreToBand(score: number): MatchBand {
  if (score >= 72) return 'strong';
  if (score >= 55) return 'good';
  return 'explore';
}

// ─── Core scoring formula ─────────────────────────────────────────────────────

/**
 * score(person, role) — design spec §4:
 *   1. Hard gate   — excluded if person fails hardFilters
 *   2. Interest    — RIASEC cosine similarity (0..1) × W_INTEREST
 *   3. Aptitude    — gap penalty (0..1) × W_APTITUDE_GAP, subtracted
 *   4. Demand prior— small boost × W_DEMAND_PRIOR
 *   Calibrated to 0–100.
 */
export function scoreRole(person: PersonProfile, role: Role): RoleScore {
  const gate = passesHardFilters(person, role);
  if (!gate.passes) {
    return {
      roleId: role.id,
      score: 0,
      band: 'explore',
      excluded: true,
      excludeReason: gate.reason,
    };
  }

  const interest = interestSimilarity(person, role);       // 0..1
  const gapPenalty = aptitudeGapPenalty(person, role);     // 0..1
  const prior = demandPrior(role);                          // 0..1

  const raw =
    interest * W_INTEREST -
    gapPenalty * W_APTITUDE_GAP +
    prior * W_DEMAND_PRIOR;

  // Theoretical max = W_INTEREST + W_DEMAND_PRIOR = 60
  // Theoretical min = -W_APTITUDE_GAP = -30
  // Calibrate: shift and scale so raw=max→100, raw=0→~55, raw=min→~0
  const span = W_INTEREST + W_DEMAND_PRIOR; // 60
  const calibrated = Math.round(Math.max(0, Math.min(100, (raw / span) * 100)));

  return {
    roleId: role.id,
    score: calibrated,
    band: scoreToBand(calibrated),
    excluded: false,
  };
}

// ─── Full match ───────────────────────────────────────────────────────────────

/**
 * Scores all roles against person, ranks non-excluded by score desc,
 * detects near-ties, returns MatchResult.
 */
export function matchPerson(person: PersonProfile, roles: Role[]): MatchResult {
  const scored: RoleScore[] = roles.map((role) => scoreRole(person, role));

  const eligible = scored
    .filter((r) => !r.excluded)
    .sort((a, b) => b.score - a.score);

  const nearTie =
    eligible.length >= 2 &&
    eligible[0].score - eligible[1].score <= NEAR_TIE_THRESHOLD;

  const topRoles = eligible.slice(0, 3);

  return {
    personProfile: person,
    ranked: eligible,
    nearTie,
    topRoles,
  };
}
