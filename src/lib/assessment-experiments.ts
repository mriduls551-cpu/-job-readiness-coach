export interface AssessmentScoringConfig {
  finalistWeight: number;
  streamBoostFactor: number;
  streamMismatchFactor: number;
}

export const FIT_CHECK_SCORING_FLAG_KEY = 'fit_check_scoring_variant';

// Control mirrors the engine's current hardcoded behavior exactly: the
// finalist question carries 24 raw points and education streams get no boost.
// Scoring output for control-assigned users is byte-identical to running the
// engine with no config at all.
export const DEFAULT_ASSESSMENT_SCORING_CONFIG: AssessmentScoringConfig = {
  finalistWeight: 24,
  streamBoostFactor: 1,
  streamMismatchFactor: 0.9,
};

export const ASSESSMENT_SCORING_VARIANTS = {
  control: DEFAULT_ASSESSMENT_SCORING_CONFIG,
  // The trust-layer calibration from feat/assessment-sprints-and-algorithm-fixes:
  // self-reported finalist preference stops dominating scenario/proof evidence,
  // and matching education streams get a mild boost instead of penalty-only
  // treatment. Run as an experiment so the 24-vs-8 design fork is decided by
  // accuracy-feedback data, not debate.
  lighter_finalist_v1: {
    finalistWeight: 8,
    streamBoostFactor: 1.1,
    streamMismatchFactor: 0.9,
  },
} as const satisfies Record<string, AssessmentScoringConfig>;

export type AssessmentScoringVariant = keyof typeof ASSESSMENT_SCORING_VARIANTS;

function isKnownVariant(value: string): value is AssessmentScoringVariant {
  return value in ASSESSMENT_SCORING_VARIANTS;
}

export function normalizeAssessmentScoringVariant(
  value: string | boolean | null | undefined
): AssessmentScoringVariant {
  if (value === true) return 'lighter_finalist_v1';
  if (value === false || value == null) return 'control';

  const normalized = value.trim().toLowerCase();
  if (isKnownVariant(normalized)) return normalized;

  if (['test', 'variant', 'treatment', 'on'].includes(normalized)) {
    return 'lighter_finalist_v1';
  }

  return 'control';
}

export function resolveAssessmentScoringExperiment(
  value: string | boolean | null | undefined
): {
  scoringVariant: AssessmentScoringVariant;
  scoringConfig: AssessmentScoringConfig;
} {
  const scoringVariant = normalizeAssessmentScoringVariant(value);
  return {
    scoringVariant,
    scoringConfig: { ...ASSESSMENT_SCORING_VARIANTS[scoringVariant] },
  };
}

export const FIT_CHECK_SCORING_ROLLOUT_ENV = 'FIT_CHECK_SCORING_ROLLOUT';

// Deterministic, dependency-free hash (cyrb53) → integer bucket in [0, 100).
// Used only for stable experiment assignment; it is not security-sensitive.
function hashToBucket(input: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hash % 100;
}

// Reads the rollout percentage (0–100) from the environment. Defaults to 0,
// so until an operator opts in every user stays on `control`.
export function resolveFitCheckScoringRollout(
  raw: string | undefined = typeof process === 'undefined'
    ? undefined
    : process.env[FIT_CHECK_SCORING_ROLLOUT_ENV]
): number {
  const pct = Number(raw);
  if (!Number.isFinite(pct)) return 0;
  return Math.min(100, Math.max(0, Math.trunc(pct)));
}

// Server-authoritative variant assignment: deterministic per user (stable
// across submissions) and impossible for the client to influence.
export function assignFitCheckScoringVariant(
  userId: string,
  rolloutPercent: number = resolveFitCheckScoringRollout()
): AssessmentScoringVariant {
  if (!userId || rolloutPercent <= 0) return 'control';
  return hashToBucket(`${FIT_CHECK_SCORING_FLAG_KEY}:${userId}`) < rolloutPercent
    ? 'lighter_finalist_v1'
    : 'control';
}
