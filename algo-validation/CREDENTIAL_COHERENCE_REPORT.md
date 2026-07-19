# Credential Coherence Validation Report

Generated: 2026-07-19
Branch: `feat/credential-coherence`

## Files changed

### Task 1 - Degree parser

- `src/lib/matcher/degree-parser.ts` - deterministic degree parser for Indian English and Hindi-script degree names.
- `src/lib/matcher/types.ts` - added `EducationStream`, `EducationLevel`, and ordered level constants.
- `src/lib/matcher/quiz-to-vector.ts` - carries parsed stream/level into `PersonEvidence`; explicit dropdown stream wins over parsed stream; finalist role is captured for the escape hatch.
- `src/lib/__tests__/degree-parser.test.ts` - covers common degree names, punctuation/case variants, Hindi variants, unknown strings, and stream precedence.

### Task 2 - Credential coherence

- `src/data/roles.seed.json` - bumped `scoringVersion` to `evidence-hybrid-v6` and added bands for the 11 core seeded roles.
- `src/data/role-candidates.seed.json` - added bands for the 30 expanded-catalog roles.
- `src/lib/role-candidates.ts` - validates candidate-role education bands.
- `src/lib/matcher/catalog.ts` - validates role-policy education bands and passes candidate bands into `MATCHING_CATALOG`.
- `src/lib/matcher/scorer.ts` - adds the two-or-more-level overqualification conditional check, using existing conditional demotion and skipping direct finalist choice.
- `src/lib/__tests__/matcher.test.ts` - verifies every role has a band, demotion never removes data-entry, and direct finalist selection is not credential-demoted.
- `src/lib/__tests__/assessment-benchmark.test.ts` - writes the `evidenceHybridV6` benchmark artifact.
- `algo-validation/BENCHMARK_RESULTS.json` - regenerated benchmark artifact.

### Task 3 - Adversarial personas and e2e

- `algo-validation/personas.ts` - added MBBS, LLB, and B.Tech adversarial/control personas.
- `src/lib/__tests__/assessment-engine.property.test.ts` - adds invariant that professional-level personas keep all roles scored and do not show secondary/diploma-band roles in top 3 unless directly selected.
- `e2e/product-lock.spec.ts` - adds MBBS + Healthcare desk-ops-leaning product lock on chromium and Mobile Chrome.

## Benchmark metrics

| Metric | Before | After |
|---|---:|---:|
| Scoring version | evidence-hybrid-v5 | evidence-hybrid-v6 |
| Benchmark cases | 20 | 23 |
| Evidence hybrid top-1 | 17 | 20 |
| Evidence hybrid top-1 rate | 0.85 | 0.8695652173913043 |
| Evidence hybrid top-3 | 17 | 20 |
| Evidence hybrid top-3 rate | 0.85 | 0.8695652173913043 |
| Roles in top 1 | 14 | 14 |
| Roles in top 3 | 22 | 24 |
| Top score at 99 | 0 | 0 |
| Mean top score | 80.65 | 81.73913043478261 |
| Witness roles | 41 | 41 |
| Witness top-1 reachability | 36 | 36 |
| Witness top-3 reachability | 36 | 36 |
| Gated roles | 10 | 10 |

Existing 20-persona top-1/top-3 counts stayed effectively unchanged; the aggregate count rises because three new adversarial cases were added and all three pass top-1/top-3.

## BENCHMARK_RESULTS.json diff

```diff
diff --git a/algo-validation/BENCHMARK_RESULTS.json b/algo-validation/BENCHMARK_RESULTS.json
index a4b542d..9064483 100644
--- a/algo-validation/BENCHMARK_RESULTS.json
+++ b/algo-validation/BENCHMARK_RESULTS.json
@@ -1,6 +1,6 @@
 {
-  "generatedAt": "2026-07-18T18:22:13.193Z",
-  "scoringVersion": "evidence-hybrid-v5",
+  "generatedAt": "2026-07-19T07:02:52.358Z",
+  "scoringVersion": "evidence-hybrid-v6",
@@
-      "cases": 20,
-      "top1": 20,
-      "top3": 20,
+      "cases": 23,
+      "top1": 23,
+      "top3": 23,
@@
-      "cases": 20,
-      "top1": 19,
-      "top3": 20,
-      "top1Rate": 0.95,
+      "cases": 23,
+      "top1": 22,
+      "top3": 23,
+      "top1Rate": 0.9565217391304348,
@@
-    "evidenceHybridV5": {
-      "cases": 20,
-      "top1": 17,
-      "top3": 17,
-      "top1Rate": 0.85,
-      "top3Rate": 0.85,
+    "evidenceHybridV6": {
+      "cases": 23,
+      "top1": 20,
+      "top3": 20,
+      "top1Rate": 0.8695652173913043,
+      "top3Rate": 0.8695652173913043,
       "rolesInTop1": 14,
-      "rolesInTop3": 22,
+      "rolesInTop3": 24,
       "topScoreAt99": 0,
-      "meanTopScore": 80.65
+      "meanTopScore": 81.73913043478261
```

## Adversarial persona outcomes

| Persona | Before top 3 | After top 3 |
|---|---|---|
| MBBS, healthcare support | customer-support 88 ready; academic-counsellor 41 ready; food-beverage-service-associate 39 insufficient-evidence | customer-support 88 ready; academic-counsellor 41 ready; preschool-daycare-facilitator 35 insufficient-evidence |
| LLB, compliance leaning | legal-compliance-operations 90 ready; back-office-operations 42 ready; data-entry-mis 39 ready | legal-compliance-operations 90 ready; operations-analyst 38 ready; logistics-operations-coordinator 37 insufficient-evidence |
| B.Tech, analytical control | operations-analyst 89 ready; retail-cashier 40 insufficient-evidence; credit-processing-associate 40 insufficient-evidence | operations-analyst 89 ready; retail-cashier 40 insufficient-evidence; credit-processing-associate 40 insufficient-evidence |

## Deviations and contradictions

- `roles.seed.json` contains 11 core roles, not all 41. The current production catalog appends 30 roles from `role-candidates.seed.json`, so bands were added to both data files.
- Eligibility reasons are currently typed as `string[]` and rendered directly. Existing reasons are English-only, which contradicts the bilingual-copy requirement. The new credential reason includes English and Hindi in the same string to avoid a broad eligibility-reason shape migration in this scoring change.
- The exact `npx playwright test --workers=2` command reached all listed tests but hung during Windows/webServer teardown. Running the same suite against an explicitly managed local dev server completed with exit code 0.

## Acceptance gates

```text
> npm run type-check
> tsc --noEmit -p tsconfig.typecheck.json
clean
```

```text
> npm test
Test Suites: 26 passed, 26 total
Tests:       222 passed, 222 total
Snapshots:   0 total
Time:        23.555 s
```

```text
> npm run benchmark:algorithm
Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
scoringVersion: evidence-hybrid-v6
catalog reachability: 36/41 top-one witness paths, 36/41 top-three witness paths
```

```text
> npx playwright test --workers=2
Observed: runner listed all 42 tests, then hung during Windows webServer teardown before printing a terminal summary.

Workaround used for validation:
PowerShell-managed npm run dev + CI=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test --workers=2 --reporter=line
Result: 41 passed, 1 flaky, exit code 0.

New credential lock isolated on both projects:
2 passed (33.0s)
```
