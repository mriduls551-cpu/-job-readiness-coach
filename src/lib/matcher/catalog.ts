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
  educationStreamBoosts: z.array(z.string()).default([]),
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

const FAMILY_BASE_TARGETS: Record<string, DimensionVector> = {
  'customer-service': [2, 8, 3, 6, 2, 3],
  'people-operations': [3, 5, 5, 7, 2, 4],
  'commercial-operations': [3, 4, 6, 6, 3, 4],
  'hospitality': [2, 5, 4, 6, 2, 2],
  'education-services': [2, 8, 4, 5, 2, 3],
  'sales-field': [3, 4, 9, 3, 2, 2],
  'retail': [4, 4, 6, 5, 1, 4],
  'financial-sales': [5, 4, 8, 4, 1, 4],
  'field-finance': [5, 4, 7, 4, 1, 4],
  'retail-operations': [4, 2, 2, 8, 1, 4],
  'finance-operations': [8, 2, 2, 7, 1, 7],
  'logistics': [4, 2, 3, 8, 1, 5],
  'fulfilment': [3, 1, 2, 8, 1, 3],
  'technical-support': [5, 5, 3, 5, 1, 8],
  'software': [4, 1, 2, 6, 2, 9],
  'ecommerce-operations': [4, 2, 4, 6, 5, 6],
  'creative-media': [1, 2, 2, 3, 9, 5],
  'technical-trades': [5, 1, 1, 7, 1, 8],
};

function roleText(role: (typeof ROLE_CANDIDATES)[number]) {
  return [...role.separatorSignals, ...role.requirements, ...role.aliases].join(' ').toLowerCase();
}

function roleMatches(role: (typeof ROLE_CANDIDATES)[number], ...needles: string[]) {
  const text = roleText(role);
  return needles.some((needle) => text.includes(needle));
}

export function candidateCluster(role: (typeof ROLE_CANDIDATES)[number]): RolePolicy['cluster'] {
  switch (role.familyId) {
    case 'customer-service':
    case 'commercial-operations':
    case 'education-services':
      return 'people-facing';
    case 'sales-field':
    case 'financial-sales':
    case 'field-finance':
    case 'ecommerce-operations':
    case 'creative-media':
      return 'creative';
    case 'retail-operations':
    case 'logistics':
    case 'fulfilment':
    case 'technical-trades':
      return 'desk-ops';
    case 'finance-operations':
    case 'technical-support':
    case 'software':
      return 'analytical';
    case 'people-operations':
      return roleMatches(role, 'payroll', 'employee-data') ? 'analytical' : 'people-facing';
    case 'retail':
      return roleMatches(role, 'cash', 'point-of-sale', 'billing') ? 'desk-ops' : 'creative';
    case 'hospitality':
      return roleMatches(role, 'guest', 'restaurant', 'front-desk', 'service')
        ? 'people-facing'
        : 'desk-ops';
    default:
      return role.objectiveSignals.some((signal) =>
        ['technical', 'numeracy', 'spreadsheet'].includes(signal)
      )
        ? 'analytical'
        : 'desk-ops';
  }
}

function candidateTarget(role: (typeof ROLE_CANDIDATES)[number]): DimensionVector {
  const cluster = candidateCluster(role);
  const target = [
    ...(FAMILY_BASE_TARGETS[role.familyId] ||
      (cluster === 'people-facing'
        ? [2, 7, 5, 6, 2, 2]
        : cluster === 'creative'
          ? [2, 4, 7, 3, 7, 4]
          : cluster === 'desk-ops'
            ? [4, 2, 2, 8, 1, 5]
            : [7, 2, 2, 7, 2, 8])),
  ] as DimensionVector;

  if (roleMatches(role, 'written', 'email', 'chat', 'ticket')) {
    target[1] = Math.max(target[1], 6);
    target[3] = Math.max(target[3], 7);
    target[4] = Math.max(target[4], 4);
  }
  if (roleMatches(role, 'guest', 'customer', 'merchant', 'candidate', 'child', 'service')) {
    target[1] = Math.max(target[1], 6);
  }
  if (
    roleMatches(
      role,
      'persuasion',
      'sales',
      'product-explanation',
      'outreach',
      'policy-explanation',
      'community-field-work'
    )
  ) {
    target[2] = Math.max(target[2], 8);
  }
  if (
    roleMatches(
      role,
      'inventory',
      'dispatch',
      'shipment',
      'warehouse',
      'stock',
      'replenishment',
      'workflow',
      'records',
      'documentation'
    )
  ) {
    target[3] = Math.max(target[3], 8);
  }
  if (roleMatches(role, 'credit', 'financial', 'tax', 'cash', 'payroll', 'invoice', 'ledger')) {
    target[0] = Math.max(target[0], 8);
    target[5] = Math.max(target[5], 6);
  }
  if (roleMatches(role, 'technical', 'troubleshooting', 'diagnostic', 'testing', 'bug', 'coding', 'web')) {
    target[5] = Math.max(target[5], 8);
  }
  if (roleMatches(role, 'design', 'visual', 'multimedia', 'editing', 'catalog', 'content', 'listing')) {
    target[4] = Math.max(target[4], 7);
  }

  if (role.objectiveSignals.includes('design')) target[4] = 9;
  if (role.objectiveSignals.includes('technical')) target[5] = 9;
  if (role.objectiveSignals.includes('numeracy')) target[0] = 9;
  if (role.objectiveSignals.includes('typing')) target[3] = Math.max(target[3], 8);
  if (role.objectiveSignals.includes('writing')) target[4] = Math.max(target[4], 6);
  if (role.objectiveSignals.includes('accuracy')) target[3] = Math.max(target[3], 7);
  if (role.requirements.some((item) => item.includes('field') || item.includes('targets'))) {
    target[2] = 9;
  }
  return target;
}

function candidatePolicy(role: (typeof ROLE_CANDIDATES)[number]): RolePolicy {
  return {
    id: role.id,
    version: role.version,
    cluster: candidateCluster(role),
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
    educationStreamBoosts: [],
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
