import rawCatalog from '../../data/roles.seed.json';
import { z } from 'zod';
import { ROLE_CANDIDATES } from '@/lib/role-candidates';
import type { DimensionVector, MatchingCatalog, RolePolicy } from './types';

const vectorSchema = z.tuple([
  z.number().min(0).max(9),
  z.number().min(0).max(9),
  z.number().min(0).max(9),
  z.number().min(0).max(9),
  z.number().min(0).max(9),
  z.number().min(0).max(9),
]);

const rolePolicySchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  cluster: z.enum(['people-facing', 'desk-ops', 'analytical', 'creative']),
  lifecycleStatus: z.enum(['active', 'gated']).default('active'),
  aliases: z.array(z.string()).default([]),
  preferenceTarget: vectorSchema,
  readiness: z.record(z.enum(['basic', 'strong'])),
  preferredEducationStreams: z.array(z.string()),
  objectiveSignals: z.array(z.enum([
    'communication',
    'accuracy',
    'spreadsheet',
    'writing',
    'typing',
    'numeracy',
    'technical',
    'design',
  ])),
  verificationRequirements: z.array(z.string()).default([]),
  marketPrior: z.object({
    value: z.number().min(0).max(100).nullable(),
    geography: z.string().min(1),
    asOf: z.string().nullable(),
    sourceUrl: z.string().url().nullable(),
    license: z.string().nullable(),
  }),
});

const catalogSchema = z.object({
  catalogVersion: z.string().min(1),
  scoringVersion: z.string().min(1),
  marketPolicy: z.enum(['disabled-until-sourced', 'enabled']),
  roles: z.array(rolePolicySchema).min(1),
});

const PEOPLE_FACING_IDS = new Set([
  'non-voice-support-associate',
  'recruitment-executive',
  'merchant-relationship-executive',
  'hotel-front-office-associate',
  'food-beverage-service-associate',
  'preschool-daycare-facilitator',
]);
const CREATIVE_IDS = new Set([
  'field-sales-executive',
  'retail-sales-associate',
  'banking-sales-executive',
  'insurance-sales-associate',
  'microfinance-executive',
  'digital-cataloguer',
  'junior-graphic-designer',
  'digital-content-developer',
  'junior-video-editor',
]);
const DESK_OPS_IDS = new Set([
  'retail-store-operations-assistant',
  'logistics-operations-coordinator',
  'courier-operations-executive',
  'warehouse-associate',
  'supply-chain-executive',
  'housekeeping-associate',
  'kitchen-trainee',
  'ev-service-technician',
]);

function candidateCluster(roleId: string): RolePolicy['cluster'] {
  if (PEOPLE_FACING_IDS.has(roleId)) return 'people-facing';
  if (CREATIVE_IDS.has(roleId)) return 'creative';
  if (DESK_OPS_IDS.has(roleId)) return 'desk-ops';
  return 'analytical';
}

function candidateTarget(role: (typeof ROLE_CANDIDATES)[number]): DimensionVector {
  const cluster = candidateCluster(role.id);
  const target: DimensionVector =
    cluster === 'people-facing'
      ? [2, 7, 5, 6, 2, 2]
      : cluster === 'creative'
        ? [2, 4, 7, 3, 7, 4]
        : cluster === 'desk-ops'
          ? [4, 2, 2, 8, 1, 5]
          : [7, 2, 2, 7, 2, 8];
  if (role.objectiveSignals.includes('design')) target[4] = 9;
  if (role.objectiveSignals.includes('technical')) target[5] = 9;
  if (role.objectiveSignals.includes('numeracy')) target[0] = 9;
  if (role.objectiveSignals.includes('typing')) target[3] = 8;
  if (role.requirements.some((item) => item.includes('field') || item.includes('targets'))) {
    target[2] = 9;
  }
  return target;
}

function candidatePolicy(role: (typeof ROLE_CANDIDATES)[number]): RolePolicy {
  return {
    id: role.id,
    version: role.version,
    cluster: candidateCluster(role.id),
    lifecycleStatus: role.effectiveStatus,
    aliases: role.aliases,
    preferenceTarget: candidateTarget(role),
    readiness: {
      ...(role.objectiveSignals.includes('communication') ? { speaking: 'basic' as const } : {}),
      ...(role.objectiveSignals.some((signal) => signal === 'numeracy' || signal === 'spreadsheet')
        ? { numbers: 'basic' as const }
        : {}),
      ...(role.objectiveSignals.includes('accuracy') ? { dataAccuracy: 'basic' as const } : {}),
    },
    preferredEducationStreams: [],
    objectiveSignals: role.objectiveSignals,
    verificationRequirements: role.requirements,
    marketPrior: {
      value: null,
      geography: 'Indian metros',
      asOf: null,
      sourceUrl: null,
      license: null,
    },
  };
}

const baseCatalog = catalogSchema.parse(rawCatalog) as MatchingCatalog;

export const MATCHING_CATALOG = catalogSchema.parse({
  ...baseCatalog,
  roles: [...baseCatalog.roles, ...ROLE_CANDIDATES.map(candidatePolicy)],
}) as MatchingCatalog;

export function getRolePolicy(roleId: string) {
  return MATCHING_CATALOG.roles.find((role) => role.id === roleId);
}
