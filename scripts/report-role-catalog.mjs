import { readFile } from 'node:fs/promises';

const active = JSON.parse(
  await readFile(new URL('../src/data/roles.seed.json', import.meta.url), 'utf8')
);
const candidates = JSON.parse(
  await readFile(new URL('../src/data/role-candidates.seed.json', import.meta.url), 'utf8')
);

const activeIds = active.roles.map((role) => role.id);
const candidateIds = candidates.roles.map((role) => role.id);
const allIds = [...activeIds, ...candidateIds];
const duplicates = allIds.filter((id, index) => allIds.indexOf(id) !== index);
const missingSources = candidates.roles
  .filter((role) => !role.titleEvidence?.url)
  .map((role) => role.id);
const effectiveStatusCounts = candidates.roles.reduce((counts, role) => {
  counts[role.status] = (counts[role.status] || 0) + 1;
  return counts;
}, {});

const report = {
  activeCatalogVersion: active.catalogVersion,
  candidateCatalogVersion: candidates.catalogVersion,
  activeBaseRoles: activeIds.length,
  activatedExpansionRoles: candidateIds.length,
  recommendableRoles: allIds.length,
  gatedRoles: effectiveStatusCounts.gated || 0,
  activeWithWarnings: effectiveStatusCounts.active || 0,
  sourceResearchStatuses: candidates.roles.reduce((counts, role) => {
    counts[role.status] = (counts[role.status] || 0) + 1;
    return counts;
  }, {}),
  managed: allIds.length,
  retired: candidates.retiredRoleIds,
  marketPolicy: candidates.marketPolicy,
  recommendationPolicy: candidates.recommendationPolicy,
  duplicateIds: [...new Set(duplicates)],
  missingTitleSources: missingSources,
};

console.log(JSON.stringify(report, null, 2));

if (candidateIds.length < 30 || duplicates.length > 0 || missingSources.length > 0) {
  process.exitCode = 1;
}
