// ─── Roles data-layer types ───────────────────────────────────────────────────
// Independent of assessment-engine.ts — this module does not import from it.

export type Locale = 'en' | 'hi';

export interface LocalizedText {
  en: string;
  hi: string;
}

export type StreamId =
  | 'open'
  | 'open-switch'
  | 'commerce'
  | 'management'
  | 'arts-humanities'
  | 'science'
  | 'healthcare'
  | 'law';

export type RoleId =
  | 'customer-support'
  | 'sales-support'
  | 'academic-counsellor'
  | 'hr-coordinator'
  | 'data-entry-mis'
  | 'back-office-operations'
  | 'operations-analyst'
  | 'accounting-finance-assistant'
  | 'digital-marketing-executive'
  | 'content-writer'
  | 'patient-care-coordinator'
  | 'legal-compliance-operations';

export type EnglishLevel = 'basic' | 'functional' | 'proficient';
export type DemandLevel = 'low' | 'medium' | 'high';
export type MetroAvailability = 'limited' | 'moderate' | 'abundant';
export type RoleStatus = 'draft' | 'validated' | 'published';

/** RIASEC interest profile, 0–100 per dimension (Holland codes). */
export interface RiasecProfile {
  R: number; // Realistic
  I: number; // Investigative
  A: number; // Artistic
  S: number; // Social
  E: number; // Enterprising
  C: number; // Conventional
}

/** Minimum required level for the role (0–100 self-rating scale). */
export interface AptitudeRequirements {
  numeracy: number;
  writtenEnglish: number;
  spokenCommunication: number;
}

export interface HardFilters {
  eligibleStreams: StreamId[];
  minEnglishLevel: EnglishLevel;
  /** e.g. ['tally'] for accounting roles */
  requiredCerts: string[];
}

export interface MarketData {
  metroSalaryBand: string;
  demandLevel: DemandLevel;
  metroAvailability: MetroAvailability;
  realJobTitles: string[];
}

export interface LocalizedCopy {
  summary: LocalizedText;
  whyItFits: LocalizedText;
  starterTasks: LocalizedText[];
  strengths: LocalizedText[];
}

/** O*NET anchor — documentation field, not used in scoring. */
export interface OnetAnchor {
  occupation: string;
  code: string;
  riasecOrder: string;
  /** true = author flagged uncertainty; human should review RIASEC profile */
  reviewNeeded?: true;
}

export interface Role {
  id: RoleId;
  name: LocalizedText;
  shortLabel: LocalizedText;
  cluster: string;
  riasec: RiasecProfile;
  aptitude: AptitudeRequirements;
  hardFilters: HardFilters;
  market: MarketData;
  copy: LocalizedCopy;
  onetAnchor: OnetAnchor;
  status: RoleStatus;
  version: number;
}

// ─── Person profile in the new dimension space ────────────────────────────────

export interface PersonRiasec {
  R: number;
  I: number;
  A: number;
  S: number;
  E: number;
  C: number;
}

export interface PersonAptitude {
  numeracy: number;        // 0–100
  writtenEnglish: number;
  spokenCommunication: number;
}

export interface PersonHardConstraints {
  educationStream: StreamId;
  englishLevel: EnglishLevel;
  certifications: string[];
}

export interface PersonProfile {
  riasec: PersonRiasec;
  aptitude: PersonAptitude;
  hardConstraints: PersonHardConstraints;
}

// ─── Scorer outputs ───────────────────────────────────────────────────────────

export type MatchBand = 'strong' | 'good' | 'explore';

export interface RoleScore {
  roleId: RoleId;
  /** Calibrated 0–100 */
  score: number;
  band: MatchBand;
  /** Hard-filtered roles are excluded before ranking */
  excluded: boolean;
  excludeReason?: string;
}

export interface MatchResult {
  personProfile: PersonProfile;
  ranked: RoleScore[];
  /** true when top-2 roles are within NEAR_TIE_THRESHOLD points */
  nearTie: boolean;
  topRoles: RoleScore[];
}
