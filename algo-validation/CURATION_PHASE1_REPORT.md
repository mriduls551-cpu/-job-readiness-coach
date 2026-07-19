# Curation Phase 1 Validation Report

Date: 2026-07-19
Branch: `feat/curation-phase1`

## Files changed by task

### Task 1 - streamRelevance
- `src/data/roles.seed.json` - Added `streamRelevance` for all 41 roles and bumped `scoringVersion` to `evidence-hybrid-v7`.
- `src/data/role-candidates.seed.json` - Mirrored `streamRelevance` in candidate seed policies.
- `src/lib/matcher/types.ts` - Replaced the narrow `educationStreamBoosts` policy surface with `streamRelevance`.
- `src/lib/matcher/catalog.ts` - Validates `streamRelevance` and expands it into candidate catalog roles.
- `src/lib/role-candidates.ts` - Validates candidate seed `streamRelevance`.
- `src/lib/matcher/scorer.ts` - Applies stream match boost and mild non-open stream mismatch demotion only when a stream signal exists.
- `src/lib/assessment-experiments.ts` - Added tunable `streamMismatchFactor`.

### Task 2 - symmetric min-side rule
- `src/lib/matcher/scorer.ts` - Added min-side two-level education demotion with bilingual reason and finalist escape hatch.
- `src/lib/assessment-engine.ts` - Carries full ranked roles plus `backgroundFit` metadata for presentation and tests.

### Task 3 - three-shelf results
- `src/app/results/page.tsx` - Keeps the top-three cards unchanged and adds mobile-first shelves below: strong fits, also open, shown on request.

### Task 4 - tests and validation
- `algo-validation/personas.ts` - Added 12th-pass service persona and identical-answer B.Com/B.Tech pair.
- `src/lib/__tests__/assessment-benchmark.test.ts` - Bumped production benchmark model to v7 and locked exact witness reachability at 36.
- `src/lib/__tests__/assessment-engine.property.test.ts` - Added reachability, no-signal inertness, finalist bypass, and secondary-level top-three invariants.
- `src/lib/__tests__/matcher.test.ts` - Added stream relevance catalog/scoring checks and underqualification demotion tests.
- `src/lib/__tests__/assessment-experiments.test.ts` - Updated experiment assertions for `streamMismatchFactor`.
- `src/app/api/assessment/__tests__/fit-check.test.ts` - Updated scoring config fixture.
- `e2e/product-lock.spec.ts` - Added 12th-pass shelf lock, running in Chromium and Mobile Chrome.
- `algo-validation/BENCHMARK_RESULTS.json` - Regenerated v7 benchmark artifact.

## Benchmark metrics

| Metric | Before v6 | After v7 | Delta |
| --- | ---: | ---: | ---: |
| Benchmark personas | 23 | 26 | +3 |
| Evidence hybrid top-1 | 20 | 23 | +3 |
| Evidence hybrid top-1 rate | 0.8695652174 | 0.8846153846 | +0.0150501672 |
| Evidence hybrid top-3 | 20 | 23 | +3 |
| Evidence hybrid top-3 rate | 0.8695652174 | 0.8846153846 | +0.0150501672 |
| Evidence hybrid roles in top-1 | 14 | 14 | 0 |
| Evidence hybrid roles in top-3 | 24 | 23 | -1 |
| Evidence hybrid topScoreAt99 | 0 | 0 | 0 |
| Evidence hybrid mean top score | 81.7391304348 | 82.5 | +0.7608695652 |
| Witness roles | 41 | 41 | 0 |
| Witness roles in top one | 36 | 36 | 0 |
| Witness roles in top three | 36 | 36 | 0 |
| Gated roles | 10 | 10 | 0 |

## BENCHMARK_RESULTS.json diff

```diff
diff --git a/algo-validation/BENCHMARK_RESULTS.json b/algo-validation/BENCHMARK_RESULTS.json
index 9064483..dc94dec 100644
--- a/algo-validation/BENCHMARK_RESULTS.json
+++ b/algo-validation/BENCHMARK_RESULTS.json
@@ -1,6 +1,6 @@
 {
-  "generatedAt": "2026-07-19T07:02:52.358Z",
-  "scoringVersion": "evidence-hybrid-v6",
+  "generatedAt": "2026-07-19T13:13:35.844Z",
+  "scoringVersion": "evidence-hybrid-v7",
   "warning": "Synthetic personas test structure only; these rates are not predictive validity.",
   "catalogReachability": {
     "roles": 41,
@@ -21,33 +21,33 @@
       "source": "CURRENT_SYSTEM_AUDIT.md baseline run on 2026-06-18"
     },
     "simpleNormalizedAdditive": {
-      "cases": 23,
-      "top1": 23,
-      "top3": 23,
+      "cases": 26,
+      "top1": 26,
+      "top3": 26,
       "top1Rate": 1,
       "top3Rate": 1,
       "rolesInTop1": 11,
       "rolesInTop3": 11
     },
     "globallyWeightedContent": {
-      "cases": 23,
-      "top1": 22,
-      "top3": 23,
-      "top1Rate": 0.9565217391304348,
+      "cases": 26,
+      "top1": 25,
+      "top3": 26,
+      "top1Rate": 0.9615384615384616,
       "top3Rate": 1,
       "rolesInTop1": 10,
       "rolesInTop3": 22
     },
-    "evidenceHybridV6": {
-      "cases": 23,
-      "top1": 20,
-      "top3": 20,
-      "top1Rate": 0.8695652173913043,
-      "top3Rate": 0.8695652173913043,
+    "evidenceHybridV7": {
+      "cases": 26,
+      "top1": 23,
+      "top3": 23,
+      "top1Rate": 0.8846153846153846,
+      "top3Rate": 0.8846153846153846,
       "rolesInTop1": 14,
-      "rolesInTop3": 24,
+      "rolesInTop3": 23,
       "topScoreAt99": 0,
-      "meanTopScore": 81.73913043478261
+      "meanTopScore": 82.5
     }
   }
 }
```

## Persona outcomes

Before-sim means the same v7 code with stream signals disabled and no parseable level, approximating the pre-curation scorer behavior for these newly-added personas.

| Persona | Before-sim top 3 | After top 3 |
| --- | --- | --- |
| 12th-pass service | customer-support 90 ready; academic-counsellor 43 ready; food-beverage-service-associate 41 insufficient-evidence | customer-support 90 ready; food-beverage-service-associate 41 insufficient-evidence; hotel-front-office-associate 38 insufficient-evidence |
| B.Com identical answers | operations-analyst 89 ready; accounting-finance-assistant 41 ready; retail-cashier 40 insufficient-evidence | operations-analyst 89 ready; accounting-finance-assistant 41 ready; retail-cashier 40 insufficient-evidence |
| B.Tech identical answers | operations-analyst 89 ready; accounting-finance-assistant 41 ready; retail-cashier 40 insufficient-evidence | operations-analyst 89 ready; retail-cashier 40 insufficient-evidence; back-office-operations 39 ready |

B.Com/B.Tech divergence: the identical-answer pair now differs through stream relevance. B.Com keeps `accounting-finance-assistant` in top three; B.Tech shifts it out while preserving the coherent analytical lead role.

## Deviations and contradictions

- `preferredEducationStreams` previously acted like an eligibility gate in `evaluateEligibility`, which contradicted the phase requirement that stream mismatch is only a mild ranking nudge. I removed that eligibility use and replaced it with `streamRelevance`.
- `educationStreamBoosts` was migrated out of seed data instead of kept in parallel, to avoid dead data.
- The results shelves render compact role rows below the top three. Rich generated rationales are still built for the top-three cards; shelf rows use existing role summaries plus visible caveats to avoid bloating the scoring hot path.
- The e2e command `npx playwright test --workers=2` timed out once under Windows dev-server teardown. Final validation used an explicit `npm run dev` wrapper with `PLAYWRIGHT_BASE_URL=http://localhost:3000`, which exercises the same Playwright tests against the required URL.
- The final full e2e run exited 0 but reported one unrelated flaky auth test retry: `[chromium] e2e/auth.spec.ts:18 renders the registration form`. The new curation shelf test passed in both projects; targeted run summary was `2 passed (46.5s)`.

## Acceptance gates

- `npm run type-check`: `tsc --noEmit -p tsconfig.typecheck.json` completed with exit code 0.
- `npm test`: `Test Suites: 26 passed, 26 total`; `Tests: 229 passed, 229 total`; `Time: 46.017 s`.
- `npm run benchmark:algorithm`: `Test Suites: 1 passed, 1 total`; `Tests: 1 passed, 1 total`; `Time: 5.306 s`.
- `npx playwright test --workers=2`: direct command timed out during Windows dev-server teardown. Equivalent explicit-server run exited 0 with `43 passed (4.2m)` and `1 flaky`; targeted new e2e run exited 0 with `2 passed (46.5s)`.
