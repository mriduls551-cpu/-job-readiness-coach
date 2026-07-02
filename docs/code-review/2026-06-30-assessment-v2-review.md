# Code Review — Assessment Engine V2 changeset (working tree vs `HEAD`)

> Reviewed: 2026-06-30 · Base: `45f0260` · Scope: current uncommitted working tree
> (28 modified files, 11 new files, ~1,660 insertions / ~269 deletions).
> No open PR exists on the remote (`mriduls551-cpu/-job-readiness-coach`); this reviews the
> in-progress local change set, which is the equivalent body of work.

## Summary

A substantial, well-tested evolution of the fit-check scoring pipeline: a deterministic
A/B scoring experiment (`assessment-experiments.ts`), a writing-confidence readiness signal,
education-stream score boosts, core-vs-adjacent role separation, results-page feedback capture,
and a persisted draft store so users can resume the quiz. Type-check is clean and the large
majority of tests pass. **One newly added unit test fails on the committed code**, and the
experiment parameters are currently client-supplied (trust/integrity gap). Both are addressed
below.

## Verification performed

| Gate | Command | Result |
|------|---------|--------|
| Type-check | `npm run type-check` | ✅ Pass (clean) |
| Unit tests (changed areas) | `jest` on engine/matcher/property/fit-check/store/page suites | ❌ **1 failed**, 95 passed (96 total) |

Failing test: `src/lib/__tests__/matcher.test.ts` →
*"supports a lighter finalist experiment on mixed people-facing evidence"*.

## Critical Issues

| # | File | Line | Issue | Severity |
|---|------|------|-------|----------|
| 1 | src/lib/__tests__/matcher.test.ts | 386–404 | New test asserts the lighter-finalist variant lowers `allScores['customer-support']`, but the fixture `customerSupportMixedEvidence` infers `academic-counsellor` as the finalist (`rf_academic-counsellor`). `customer-support` receives **zero** finalist points under either config, so both sides are `62` and `toBeLessThan` can never pass. The implementation is correct (the inferred role drops 90→82). `npm test` is red. | 🔴 Critical (blocking) |
| 2 | src/app/api/assessment/fit-check/route.ts | 49–58, 152–183 | `scoringVariant` and `scoringConfig` are accepted from the request body and trusted. Experiment bucketing should be server-authoritative. A client can self-select its variant/config (within Zod bounds) and the persisted `scoring_variant` may not reflect the real PostHog bucket — contaminating experiment analytics and contradicting the endpoint's own stated principle that it "deliberately cannot accept self-awarded scores." | 🟠 High |

### Detail — Issue 1 (root cause, verified)

`completePath(routes.people, ['pf_b1_b','pf_b2_b','pf_b3_d','pf_b4_c'])` auto-fills the finalist
question with `rf_${inferredRole}`, where `inferredRole` is the role with the most accumulated
discriminator points. For this mixed set that role is **`academic-counsellor`**, not
`customer-support`. `applyScoringConfigToSelectedOptions()` only scales `rf_*` `roleScores`, so:

- `academic-counsellor`: control **90** → lighter_finalist_v1 **82** ✅ (experiment works)
- `customer-support`: control **62** → lighter **62** (no finalist points either way) ❌ assertion target

**Fix (pick one):**
- Assert on the role that actually carries the finalist points:
  `expect(lighterFinalist.allScores['academic-counsellor']).toBeLessThan(control.allScores['academic-counsellor'])`
  (and update the `toBeGreaterThan(0)` guard to the same role); **or**
- Rebuild the fixture so `customer-support` is the inferred finalist (e.g. choose discriminator
  options whose `roleScores` favor `customer-support`), keeping the assertion as-is.

Prefer the first — it documents the real behavior and is a one-line change.

### Detail — Issue 2 (experiment integrity)

The client (`career-fit-check/page.tsx`) reads the flag via PostHog, resolves the config, and
sends both `scoringVariant` and `scoringConfig` to the API; the server re-resolves but still
honors the client-provided `scoringConfig` override and persists the client-declared variant.

**Recommendation:** evaluate the feature flag server-side (PostHog server SDK, keyed by `userId`),
derive `scoringConfig` from the resolved variant on the server, and drop `scoringConfig` (and
ideally `scoringVariant`) from the request schema. If keeping a client hint for latency, treat it
as advisory only and never let it override server-resolved config. This makes bucketing tamper-proof
and keeps `scoring_variant` analytically trustworthy.

## Suggestions

| # | File | Line | Suggestion | Category |
|---|------|------|------------|----------|
| 1 | src/lib/db.ts | 908–922 | `recordFeedback` updates `.eq('id', latest.id)` with no `.eq('user_id', userId)`. Relies solely on RLS. Add the user_id filter for defense-in-depth (don't trust a single guard). | Security |
| 2 | src/lib/matcher/scorer.ts | 84–90, 119–127 | Removing the missing-education-stream `insufficient-evidence` branch + adding a multiplicative `educationStreamBoosts` (×1.1) are real scoring shifts (scoringVersion v5→v9). Confirm `BENCHMARK_RESULTS.json` deltas are intended and that roles with `preferredEducationStreams` aren't over-promoted when the user leaves stream blank. | Correctness |
| 3 | src/lib/analytics.ts | 60–78 | `posthog.onFeatureFlags(cb)` is never unregistered; on timeout the listener leaks (fires later as a no-op via `settled`). Capture the returned unsubscribe and clear it in both `finish` paths. | Performance |
| 4 | src/app/api/assessment/fit-check/route.ts | 208–218 | `after(queueAssessmentEmail)` fallback `void queueAssessmentEmail()` is fire-and-forget; in serverless the function may be torn down before the email sends. Acceptable as a non-`after` fallback, but log/accept that delivery isn't guaranteed off the request path. | Correctness |
| 5 | src/app/career-fit-check/page.tsx | 247–256 | `startTransition(() => void submitAssessment())` doesn't track the async fetch + up-to-1500ms flag wait, so `isPending` won't reflect the in-flight submit. Disable the submit control with a dedicated `submitting` state to prevent double submits. | Correctness |
| 6 | src/lib/stores/fitcheck-draft.ts | 30–38, 67–73 | Draft persists PII (`fullName`, `city`) to `localStorage` until submit. `clearDraft()` does clear on success, but consider not persisting name/city, or clearing on abandonment, to minimize at-rest PII. | Security/Privacy |
| 7 | src/app/career-fit-check/page.tsx | 95–110 | `questions`, `canonicalResponses`, and `activeQuestions` each call `getNextQuestions()`/`pruneOrphanResponses()` on every render (un-memoized). Negligible now; wrap in `useMemo` keyed on `responses` if the question set grows. | Performance |
| 8 | supabase/migrations/20260628_assessment_feedback.sql | 1–3 | `add column if not exists … check(…)` won't add the CHECK if the column already exists without it (idempotency edge). Minor; fine for a fresh column. | Maintainability |
| 9 | src/app/career-fit-check/page.tsx | 178–193 | `payload.data?.result` is typed `any`. Type it to the API's result shape for safety at the page boundary. | Maintainability |

## What Looks Good

- **Test investment** — property-based tests (`fast-check`), API-route tests, page tests, and a
  draft-store test were all added alongside the feature. Coverage of the new surface is strong.
- **Type-check passes clean**, and types were updated in lockstep with the schema
  (`job-coach-supabase.types.ts`, `matcher/types.ts`, `product.ts`).
- **`getSession()` now merges defaults** (`{ ...createEmptySession(), ...parsed }`) — fixes
  forward-compatibility when new session fields are added; a real robustness win.
- **Additive, reversible migrations** with column comments; `scoringVersion` correctly bumped
  (v5→v9) to reflect the scoring behavior change.
- **Clean separation** of core vs adjacent roles and the new feedback capture, both fully
  localized (en/hi).
- **Deterministic experiment module** (`assessment-experiments.ts`) with a sane
  `normalizeAssessmentScoringVariant` fallback and bounded Zod validation on the API.
- The `signalAlignment` WeakMap caching is correct and scoped to display-only rationale ordering.

## Verdict

> **Update 2026-06-30:** Both gating items are now resolved. Issue 1 (failing test) is fixed and
> Issue 2 (server-authoritative experiment) is implemented via deterministic server-side bucketing.
> Type-check is clean and the full suite is green (**15 suites / 170 tests**). Remaining items in
> [action-items.md](./2026-06-30-action-items.md) are non-blocking follow-ups.

**Request Changes** (original assessment). Two items gated merge:
1. 🔴 Fix the failing finalist-experiment test (Issue 1) so `npm test` is green — one-line change. ✅ Done
2. 🟠 Make the scoring experiment server-authoritative (Issue 2) before relying on its analytics. ✅ Done

Everything else is solid and can land with the suggestions tracked as follow-ups. The core
engine changes are well-reasoned and well-covered; the blocking issue is a mis-targeted assertion,
not a logic defect in the engine itself.
