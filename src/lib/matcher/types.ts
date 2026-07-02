export const DIMENSION_KEYS = [
  'numerical',
  'peopleReactive',
  'peopleProactive',
  'processOps',
  'creativeOutput',
  'analyticalOutput',
] as const;

export type DimensionKey = (typeof DIMENSION_KEYS)[number];
export type DimensionVector = [number, number, number, number, number, number];

export type ReadinessSignal = 'numbers' | 'speaking' | 'dataAccuracy' | 'writing';
export type ObjectiveSignal =
  | 'communication'
  | 'accuracy'
  | 'spreadsheet'
  | 'writing'
  | 'typing'
  | 'numeracy'
  | 'technical'
  | 'design';
export type RequirementLevel = 'basic' | 'strong';
export type EligibilityStatus = 'ready' | 'conditional' | 'insufficient-evidence';
export type ConfidenceBand = 'high' | 'medium' | 'low';

export interface ObjectiveEvidence {
  communication?: number;
  accuracy?: number;
  spreadsheet?: number;
  writing?: number;
  typing?: number;
  numeracy?: number;
  technical?: number;
  design?: number;
}

export interface RolePolicy {
  id: string;
  version: number;
  cluster: string;
  lifecycleStatus: 'active' | 'gated';
  aliases: string[];
  preferenceTarget: DimensionVector;
  readiness: Partial<Record<ReadinessSignal, RequirementLevel>>;
  preferredEducationStreams: string[];
  educationStreamBoosts: string[];
  objectiveSignals: ObjectiveSignal[];
  verificationRequirements: string[];
  marketPrior: {
    value: number | null;
    geography: string;
    asOf: string | null;
    sourceUrl: string | null;
    license: string | null;
  };
}

export interface MatchingCatalog {
  catalogVersion: string;
  scoringVersion: string;
  marketPolicy: 'disabled-until-sourced' | 'enabled';
  roles: RolePolicy[];
}

export interface PersonEvidence {
  preferenceVector: DimensionVector;
  branchRoleScores: Record<string, number>;
  selectedAnswerCount: number;
  requiredAnswerCount: number;
  readiness: {
    numbers?: string;
    speaking?: string;
    dataAccuracy?: string;
    writing?: string;
  };
  educationStream?: string;
  objectiveEvidence?: ObjectiveEvidence;
}

export interface ScoreComponents {
  preference: number;
  branchPreference: number;
  demonstratedAbility: number | null;
  objectiveCoverage: number;
  marketDemand: number | null;
  readinessAdjustment: number;
}

export interface RankedRoleEvidence {
  roleId: string;
  score: number;
  preferenceScore: number;
  eligibility: EligibilityStatus;
  eligibilityReasons: string[];
  components: ScoreComponents;
}

export interface ConfidenceEvidence {
  index: number;
  band: ConfidenceBand;
  reasons: string[];
  completeness: number;
  separation: number;
  consistency: number;
  objectiveCoverage: number;
}

export interface MatchingResult {
  rankedRoles: RankedRoleEvidence[];
  confidence: ConfidenceEvidence;
  scoringVersion: string;
  catalogVersion: string;
}
