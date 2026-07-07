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
// workday question contributes 24 so explicit work-condition preference can
// distinguish a 41-role catalog without role-specific weighting.
const MAX_BRANCH_POINTS = 24;
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
  return level === 'strong'
    ? 'You reported low comfort with detail and data-accuracy work.'
    : 'This role uses detail-heavy records, while you reported low comfort.';
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

  if (role.preferredEducationStreams.length > 0 && !person.educationStream) {
    return {
      status: 'insufficient-evidence',
      reasons: ['A preferred education background was not provided; verify alternative qualifications in the job listing.'],
      adjustment: 0.95,
    };
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
  const completeness = Math.min(1, person.selectedAnswerCount / person.requiredAnswerCount);
  const separation = ranked.length > 1 ? Math.min(1, (ranked[0].score - ranked[1].score) / 20) : 0;
  const consistency = ranked[0]?.eligibility === 'conditional' ? 0.25 : 1;
  const objectiveCoverage = ranked[0]?.components.objectiveCoverage || 0;
  const reliability = 0.55 + 0.35 * objectiveCoverage;
  const index = Math.round(
    100 * (0.35 * completeness + 0.3 * separation + 0.2 * consistency + 0.15 * reliability)
  );

  let band: ConfidenceEvidence['band'] = 'low';
  if (completeness === 1 && objectiveCoverage === 1 && index >= 75) band = 'high';
  else if (completeness === 1 && index >= 55) band = 'medium';

  const reasons: string[] = [];
  if (completeness < 1) reasons.push('The required assessment path is incomplete.');
  if (separation < 0.25) reasons.push('The leading roles are close together.');
  if (consistency < 1) reasons.push('The leading role conflicts with a reported work constraint.');
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
