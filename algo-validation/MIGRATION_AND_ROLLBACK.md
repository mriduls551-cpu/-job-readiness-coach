# Migration And Rollback

**Migration target:** `constrained-hybrid-v4` / active catalog `2026-06-19.2` / scorer `evidence-hybrid-v9`

## Rollout

1. Apply `supabase/migrations/20260618_version_assessment_results.sql` before deploying application code.
2. Deploy the strict validation and snapshot-writing API with the v4 scorer and 41-role catalog.
3. Monitor HTTP 400 rates by validation reason. A short increase can expose stale clients; it must not be worked around by accepting malformed answers.
4. Verify new rows contain `result_snapshot`, `scoring_version`, and `catalog_version`.
5. Compare role exposure, gated/conditional-role rate, confidence bands, and completion rate with the frozen v2 benchmark. Do not compare raw v2 and v4 scores as if they share a scale.

The migration is additive and does not rewrite historical rows. Complete legacy rows without a snapshot are rescored only as an explicit compatibility fallback; their UI should not imply that the displayed result is the original historical recommendation. Legacy rows that fail v4 completion/path validation return `retakeRequired: true` and no recommendation.

## Compatibility

- The API still returns `topRoles`, `cluster`, and `warning`.
- `topRoles` is now the core-role shortlist only; optional `adjacentRoles` carries the 30 candidate directions separately.
- New evidence fields and version identifiers are additive.
- Cluster routing now asks the tie-breaker when the top-two routing clusters are within 8 points; the broad-profile warning triggers when `confidenceScore < 62` or the visible top-three spread is 4 points or less.
- Historical `telemedicine-coordinator` and `patient-care-coordinator` selections are cleared and require a retake; they are never mapped to another role.
- The recommendable catalog contains 41 roles. Twenty expansion roles are active with evidence warnings and ten are gated.
- A v4 path requires `rf` in addition to `b1`-`b4`; v3 paths therefore require a retake instead of silent defaulting.

## Rollback

1. Roll application code back to the prior release while leaving the additive database columns in place.
2. Do not delete v3 or v4 snapshots; they are required to interpret already-shown recommendations.
3. Disable new assessment creation if the old client cannot send a valid adaptive path, rather than silently weakening validation.
4. Re-enable v4 only after the failing invariant has a regression test.

Dropping the new columns is neither required nor recommended for application rollback. If a later schema cleanup is approved, export versioned snapshots first and use a separately reviewed migration.

## Claims During Migration

The release may claim stricter input integrity, deterministic versioned results, explicit eligibility handling, and reduced synthetic ceiling saturation. It may not claim improved employment outcomes, predictive validity, calibrated probability, or fairness until genuine studies described in `EVALUATION_PROTOCOL.md` have been completed.
