# Action Items — Assessment Engine V2 review (2026-06-30)

Prioritized checklist derived from [the full review](./2026-06-30-assessment-v2-review.md).
Check items off as they land.

## 🔴 Blocking (fix before merge)

- [x] **Fix failing test** `matcher.test.ts` → "supports a lighter finalist experiment on mixed
  people-facing evidence". ✅ Done 2026-06-30 — re-targeted the assertion to `academic-counsellor`
  (control 90 → lighter 82), the role the fixture's finalist answer actually scales. Full suite
  now green: **15 suites / 168 tests passing**.
- [x] **Make the scoring experiment server-authoritative.** ✅ Done 2026-06-30 — implemented
  deterministic server-side bucketing (`assignFitCheckScoringVariant` in `assessment-experiments.ts`),
  keyed by `userId` against a `FIT_CHECK_SCORING_ROLLOUT` env percentage (default 0% = all control).
  Removed `scoringVariant`/`scoringConfig` from the POST body and made the schema `.strict()` so
  client overrides are now rejected (400). The server returns the assigned variant; the client emits
  it as a `$feature_flag_called` exposure for PostHog. Covered by new API tests.

## 🟠 Should fix (this iteration)

- [ ] Add `.eq('user_id', userId)` to `recordFeedback` in `db.ts` (defense-in-depth alongside RLS).
- [ ] Confirm the `educationStreamBoosts` (×1.1) + removal of the missing-stream
  `insufficient-evidence` penalty produce the intended `BENCHMARK_RESULTS.json` deltas, and that
  preferred-stream roles aren't over-promoted when the user leaves stream blank.
- [ ] Disable the submit control with a dedicated `submitting` state in `career-fit-check/page.tsx`
  (the `startTransition` doesn't track the async submit + flag wait → double-submit risk).

## 🟡 Follow-ups (track, non-blocking)

- [x] Unregister the `posthog.onFeatureFlags` listener in `getProductFeatureFlagVariant` (analytics.ts).
  ✅ Resolved 2026-06-30 — the helper was purpose-built for the old client-side flow and is now
  orphaned, so it (and its leak) were removed entirely along with the test mock.
- [ ] Note/accept that the non-`after` email fallback is best-effort in serverless (fit-check route).
- [ ] Minimize at-rest PII in the draft store (avoid persisting `fullName`/`city`, or clear on abandon).
- [ ] `useMemo` the repeated `getNextQuestions`/`pruneOrphanResponses` calls per render (page.tsx).
- [ ] Type `payload.data?.result` instead of `any` at the page boundary.
- [ ] Optional: name the CHECK constraint in `20260628_assessment_feedback.sql` for clean idempotency.

## Re-run gates after changes

```bash
npm run type-check
npm test
```
