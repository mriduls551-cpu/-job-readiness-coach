import rawCandidates from '../data/role-candidates.seed.json';
import { z } from 'zod';

const localizedTextSchema = z.object({
  en: z.string().min(2),
  hi: z.string().min(2),
});

const educationLevelSchema = z.enum([
  'secondary',
  'diploma',
  'undergraduate',
  'postgraduate',
  'professional',
]);

const candidateRoleSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  version: z.number().int().positive(),
  status: z.enum(['active', 'gated']),
  familyId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: localizedTextSchema,
  aliases: z.array(z.string().min(2)).min(1),
  requirements: z.array(z.string().min(2)).min(1),
  separatorSignals: z.array(z.string().min(2)).min(1),
  typicalEducationBand: z.object({
    min: educationLevelSchema,
    max: educationLevelSchema,
  }),
  objectiveSignals: z.array(
    z.enum([
      'communication',
      'accuracy',
      'spreadsheet',
      'writing',
      'typing',
      'numeracy',
      'technical',
      'design',
    ])
  ).min(1),
  titleEvidence: z.object({
    sourceName: z.string().min(2),
    url: z.string().url(),
    reviewedAt: z.string().date(),
    licenseStatus: z.enum([
      'facts-only-no-content-reuse',
      'all-rights-reserved-facts-only',
    ]),
  }),
});

const candidateCatalogSchema = z.object({
  catalogVersion: z.string().min(1),
  reviewedAt: z.string().date(),
  marketPolicy: z.literal('disabled-until-licensed-volume-evidence'),
  recommendationPolicy: z.literal('active-with-evidence-warnings'),
  retiredRoleIds: z.array(z.string()).min(1),
  roles: z.array(candidateRoleSchema).min(30),
});

const parsed = candidateCatalogSchema.parse(rawCandidates);

export type CandidateRole = (typeof parsed.roles)[number] & {
  effectiveStatus: 'active' | 'gated';
  marketPrior: null;
  validationWarnings: string[];
};

export const ROLE_CANDIDATE_CATALOG_VERSION = parsed.catalogVersion;
export const RETIRED_ROLE_IDS = Object.freeze([...parsed.retiredRoleIds]);
export const ROLE_CANDIDATES: CandidateRole[] = parsed.roles.map((role) => ({
  ...role,
  effectiveStatus: role.status,
  marketPrior: null,
  validationWarnings: [
    'licensed metro vacancy-volume evidence',
    'recruiter-reviewed eligibility rules',
    'three expert-authored cases',
    'reviewed bilingual result and explanation content',
    ...(role.status === 'gated' ? ['verified credential, portfolio, or practical-task gate'] : []),
  ],
}));

export const ROLE_CANDIDATE_COUNT = ROLE_CANDIDATES.length;

export function getRoleCandidate(roleId: string) {
  return ROLE_CANDIDATES.find((role) => role.id === roleId);
}

export function isRetiredRoleId(roleId: unknown): roleId is string {
  return typeof roleId === 'string' && RETIRED_ROLE_IDS.includes(roleId);
}
