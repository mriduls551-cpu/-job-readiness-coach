import type { AssessmentScoringConfig } from '@/lib/assessment-experiments';
import type {
  ConfidenceEvidence,
  DimensionVector,
  EligibilityStatus,
  MatchingCatalog,
  MatchingResult,
  ObjectiveSignal,
  PersonEvidence,
  RankedRoleEvidence,
  ReadinessSignal,
  RequirementLevel,
  RolePolicy,
} from './types';
import { DEFAULT_ASSESSMENT_SCORING_CONFIG } from '@/lib/assessment-experiments';

const GLOBAL_DIMENSION_WEIGHTS: DimensionVector = [1, 1, 1, 1, 1, 1];
// Four discriminator questions contribute up to 12 points; the finalist
// workday question contributes about 8, so the evidence questions remain the
// main within-cluster discriminator.
const MAX_BRANCH_POINTS = 12;
// The index is ordinal, not a calibrated probability. Scaling preserves every
// ordering while avoiding a visually misleading pile-up at 99.
const ORDINAL_INDEX_SCALE = 0.92;
const ORDINAL_INDEX_CAP = 95;
function weightedCosine(a: DimensionVector, b: DimensionVector): number {
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;
  for (let index = 0; index < a.length; index += 1) {
    const weight = GLOBAL_DIMENSION_WEIGHTS[index];
    const av = a[index] * weight;
    const bv = b[index] * weight;
    dot += av * bv;
    aNorm += av * av;
    bNorm += bv * bv;
  }
  if (!aNorm || !bNorm) return 0;
  return dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
}

function readinessConflict(
  signal: ReadinessSignal,
  level: RequirementLevel,
  value: string | undefined
): string | null {
  if (value !== 'low') return null;
  if (signal === 'numbers') {
    return level === 'strong'
      ? 'You reported low comfort with number-heavy work.'
      : 'This role uses numbers regularly, while you reported low comfort.';
  }
  if (signal === 'speaking') {
    return level === 'strong'
      ? 'You reported low comfort with frequent spoken interaction.'
      : 'This role includes spoken interaction, while you reported low comfort.';
  }
  if (signal === 'dataAccuracy') {
    return level === 'strong'
      ? 'You reported low comfort with detail and data-accuracy work.'
      : 'This role uses detail-heavy records, while you reported low comfort.';
  }
  return level === 'strong'
    ? 'You reported low confidence in sustained writing and editing work.'
    : 'This role depends on steady writing quality, while you reported low confidence.';
}

function evaluateEligibility(
  person: PersonEvidence,
  role: RolePolicy
): { status: EligibilityStatus; reasons: string[]; adjustment: number } {
  const reasons: string[] = [];
  for (const [signal, level] of Object.entries(role.readiness) as Array<
    [ReadinessSignal, RequirementLevel]
  >) {
    const conflict = readinessConflict(signal, level, person.readiness[signal]);
    if (conflict) reasons.push(conflict);
  }

  if (reasons.length > 0) {
    return { status: 'conditional', reasons, adjustment: 0.35 };
  }

  if (
    role.preferredEducationStreams.length > 0 &&
    person.educationStream &&
    !role.preferredEducationStreams.includes(person.educationStream)
  ) {
    return {
      status: 'insufficient-evidence',
      reasons: ['Your education stream is not the usual background for this role; relevant experience or training may still qualify.'],
      adjustment: 0.95,
    };
  }

  if (role.lifecycleStatus === 'gated') {
    return {
      status: 'insufficient-evidence',
      reasons: [
        `This role requires verified evidence before recommendation: ${role.verificationRequirements.join(', ')}.`,
      ],
      adjustment: 0.85,
    };
  }

  if (role.verificationRequirements.length > 0) {
    return {
      status: 'insufficient-evidence',
      reasons: [
        `Confirm these working conditions or skills before applying: ${role.verificationRequirements.join(', ')}.`,
      ],
      adjustment: 0.95,
    };
  }

  return { status: 'ready', reasons: [], adjustment: 1 };
}

function educationStreamAdjustment(
  person: PersonEvidence,
  role: RolePolicy,
  scoringConfig: AssessmentScoringConfig
): number {
  if (!person.educationStream) return 1;
  return role.educationStreamBoosts.includes(person.educationStream)
    ? scoringConfig.streamBoostFactor
    : 1;
}

function objectiveScore(
  person: PersonEvidence,
  signals: ObjectiveSignal[]
): { score: number | null; coverage: number } {
  const evidence = person.objectiveEvidence;
  if (!evidence || signals.length === 0) return { score: null, coverage: 0 };
  const values = signals
    .map((signal) => evidence[signal])
    .filter(
      (value): value is number =>
        typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
    );
  if (values.length === 0) return { score: null, coverage: 0 };
  return {
    score: values.reduce((sum, value) => sum + value, 0) / values.length,
    coverage: values.length / signals.length,
  };
}

function scoreRole(
  person: PersonEvidence,
  role: RolePolicy,
  marketEnabled: boolean,
  scoringConfig: AssessmentScoringConfig
): RankedRoleEvidence {
  const preferenceScore = weightedCosine(person.preferenceVector, role.preferenceTarget) * 100;
  const branchPreference = Math.min(
    100,
    ((person.branchRoleScores[role.id] || 0) / MAX_BRANCH_POINTS) * 100
  );
  const objective = objectiveScore(person, role.objectiveSignals);
  const demonstratedAbility = objective.score;
  const marketDemand = marketEnabled ? role.marketPrior.value : null;

  let evidenceScore: number;
  if (demonstratedAbility === null) {
    evidenceScore = 0.4 * preferenceScore + 0.6 * branchPreference;
  } else {
    const coverage = objective.coverage;
    const preferenceWeight = 0.4 - 0.1 * coverage;
    const branchWeight = 0.6 - 0.1 * coverage;
    const abilityWeight = 0.2 * coverage;
    evidenceScore =
      preferenceWeight * preferenceScore +
      branchWeight * branchPreference +
      abilityWeight * demonstratedAbility;
  }
  if (marketDemand !== null) {
    evidenceScore = 0.95 * evidenceScore + 0.05 * marketDemand;
  }
  evidenceScore *= educationStreamAdjustment(person, role, scoringConfig);

  const eligibility = evaluateEligibility(person, role);
  const score = Math.max(
    0,
    Math.min(
      ORDINAL_INDEX_CAP,
      Math.round(evidenceScore * eligibility.adjustment * ORDINAL_INDEX_SCALE)
    )
  );

  return {
    roleId: role.id,
    score,
    preferenceScore: Math.round(preferenceScore),
    eligibility: eligibility.status,
    eligibilityReasons: eligibility.reasons,
    components: {
      preference: Math.round(preferenceScore),
      branchPreference: Math.round(branchPreference),
      demonstratedAbility:
        demonstratedAbility === null ? null : Math.round(demonstratedAbility),
      objectiveCoverage: objective.coverage,
      marketDemand,
      readinessAdjustment: eligibility.adjustment,
    },
  };
}

function buildConfidence(person: PersonEvidence, ranked: RankedRoleEvidence[]): ConfidenceEvidence {
  const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
  const completeness = Math.min(1, person.selectedAnswerCount / person.requiredAnswerCount);
  const top = ranked[0];
  const second = ranked[1];

  // How clearly the leader beats the runner-up (a 20-pt gap == fully separated).
  const separation = top && second ? clamp01((top.score - second.score) / 20) : 0.5;
  // Absolute strength of the leading match: below ~45 there is no real signal,
  // 90+ is an unambiguous match. This is what makes a degenerate result (every
  // role scoring in the 20s because the cluster was disqualified) read as low.
  const topStrength = top ? clamp01((top.score - 45) / 45) : 0;
  const objectiveCoverage = top?.components.objectiveCoverage || 0;
  const conditionalTop = top?.eligibility === 'conditional';

  // Broad-profile signal: how many roles bunch within 6 pts of the leader.
  const crowd = top ? ranked.filter((role) => top.score - role.score <= 6).length : 0;
  const crowdingPenalty = clamp01((crowd - 1) / 4);

  // Separation and absolute strength are the two load-bearing terms; objective
  // work-sample coverage is a bonus, not a floor. (The old formula's constant
  // completeness/consistency terms pinned the index above ~63, so the warning
  // and the 'low' band could never fire — see 2026-07-02 algorithm audit #1.)
  const base = 0.5 * separation + 0.5 * topStrength;
  let index = 100 * Math.min(1, base + 0.1 * objectiveCoverage);
  index *= 1 - 0.25 * crowdingPenalty;
  if (conditionalTop) index *= 0.6;
  index *= completeness;
  index = Math.max(0, Math.min(99, Math.round(index)));

  let band: ConfidenceEvidence['band'] = 'low';
  if (completeness === 1 && objectiveCoverage === 1 && index >= 75) band = 'high';
  else if (completeness === 1 && index >= 55) band = 'medium';

  const consistency = conditionalTop ? 0.25 : 1;
  const reasons: string[] = [];
  if (completeness < 1) reasons.push('The required assessment path is incomplete.');
  if (topStrength < 0.35) reasons.push('The leading role does not stand out strongly yet.');
  if (separation < 0.25) reasons.push('The leading roles are close together.');
  if (crowdingPenalty >= 0.5) reasons.push('Several roles are bunched together near the top.');
  if (conditionalTop) reasons.push('The leading role conflicts with a reported work constraint.');
  if (objectiveCoverage === 0) reasons.push('No objective work sample is available yet.');
  else if (objectiveCoverage < 1) reasons.push('Only part of the relevant objective evidence is available.');

  return { index, band, reasons, completeness, separation, consistency, objectiveCoverage };
}

export function scoreEvidence(
  person: PersonEvidence,
  catalog: MatchingCatalog,
  scoringConfig: AssessmentScoringConfig = DEFAULT_ASSESSMENT_SCORING_CONFIG
): MatchingResult {
  const order = new Map(catalog.roles.map((role, index) => [role.id, index]));
  const marketEnabled = catalog.marketPolicy === 'enabled';
  const scored = catalog.roles
    .map((role) => scoreRole(person, role, marketEnabled, scoringConfig))
    .sort((left, right) => right.score - left.score || (order.get(left.roleId)! - order.get(right.roleId)!));

  const nonContradictory = scored.filter((role) => role.eligibility !== 'conditional');
  const rankedRoles = nonContradictory.length >= 3
    ? [...nonContradictory, ...scored.filter((role) => role.eligibility === 'conditional')]
    : scored;

  return {
    rankedRoles,
    confidence: buildConfidence(person, rankedRoles),
    scoringVersion: catalog.scoringVersion,
    catalogVersion: catalog.catalogVersion,
  };
}
