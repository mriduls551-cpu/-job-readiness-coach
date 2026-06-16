# Career-Match Algorithm — Findings (20-Persona Synthetic Test)

**Date:** 2026-06-16  ·  **Engine:** `src/lib/assessment-engine.ts` (`scoreAssessment` v2)
**Run:** 20 personas, scored twice each, fully deterministic.

> ⚠️ Note: the working copy of `src/lib/assessment-engine.ts` in the repo is **truncated**
> (1,470 lines, missing `scoreAssessment` and all scoring helpers). The complete 1,570-line
> version was recovered from an orphaned filesystem inode and used for this test. **Restore the
> full engine into version control before doing anything else** — your live build may be running
> on a stale or partial file.

## Headline
The engine is **stable and routes clusters well, but it does not reliably discriminate between
roles _within_ a cluster.** It's good at "this person is a desk-ops type"; it's weak at "...and
specifically a Data-Entry person vs a Back-Office person." For a product whose pitch is "we tell
you the *specific* job," that's the gap to close.

## Scorecard
| Metric | Result |
|---|---|
| Cluster hit rate | **85%** (17/20) |
| Role Top-1 hit | **65%** (13/20) |
| Role Top-3 hit | **85%** (17/20) |
| Determinism | 100% stable (0/20 wobble) |
| Role coverage | 12/12 roles reachable (no dead roles) |
| Tie-breaker fired | 65% (13/20) |
| "Broad profile" warning shown | 9/20 |

Top-3 at 85% is genuinely encouraging for an early engine. The problems are in *precision* and a
couple of sharp ordering bugs.

## Issue 1 — Score saturation kills within-cluster ranking (highest priority)
Weighted-cosine scores pile up at the 99 ceiling. Repeatedly the top 3 are **99 / 99 / 99**, so
the user's #1 is effectively decided by `ROLE_ORDER`, not their answers.

- **Meena (#9)** answered *every* branch question for accounting/Tally — yet was told her #1 is
  **Operations Analyst (99)**, with Accounting also at 99. Her explicit choices moved nothing.
- **Kavya (#7, law grad, all compliance answers)** → shown **Back-Office (99)** first, Legal
  second. Same pattern for Amit (#5) and Shabnam (#18): data-entry / back-office / legal all 99.

Branch questions barely shift the score relative to the cosine baseline, so they aren't doing
their job. **Fix direction:** widen score spread (lower the 99 cap or rescale), and/or weight
branch `roleScores` much more heavily so within-cluster answers actually separate roles.

## Issue 2 — Disqualified low-score roles still shown as the top match (bug)
`topRoles` is built cluster-first, then by score — so a crushed role outranks a higher-scoring
one from another cluster.

- **Sahil (#14)** — wants finance, said numbers are weak. Disqualifier correctly crushed finance
  to **Accounting (15) / Operations (14)**… but those are still displayed as his **#1 and #2**,
  while **Telemedicine (77)** — far higher — is buried at #3. The UI would headline a *15-point*
  role as his best match. That looks broken to a user. **Fix:** when the winning cluster's roles
  are all disqualified/low, fall back to the true top scorers across clusters (or re-route).

## Issue 3 — Creative cluster is structurally hard to reach
Creative only earns routing points from two options (`r2_c`, `r5_a`). A genuine writer who also
thinks analytically gets pulled into analytical.

- **Aditya (#10, clear content writer)** → routed to **analytical**; content-writer fell to rank
  4. Creative was reached only 3/20 times and needed the tie-breaker *every* time (margins of
  0–2). **Fix:** give creative more routing surface area, or a stronger tie-break path.

## Issue 4 — Tie-breaker fires for 65% of users
Margin threshold `< 8` is high vs. typical margins, so even decisive personas (margin 7) get an
11th question. Not a bug, but it means most users answer a "10-question" check that's really 11,
and it signals routing questions don't spread clusters far apart. Consider lowering to `< 5` or
spreading the routing scores.

## Issue 5 — The "broad profile" warning is over-firing (9/20)
A side effect of Issue 1: because top-3 scores cluster within 4 points so often, the hedge
warning shows for nearly half of users — diluting confidence in the headline result.

## What's working well
- **Cluster routing (85%)** is solid and the foundation is sound.
- **Disqualifier rules fire correctly** (finance crushed for weak-numbers; healthcare/law/commerce
  boosts apply) — the *logic* is right, only the *presentation* (Issue 2) is wrong.
- **Fully deterministic**, all 12 roles reachable, sensible cluster spread.

## Recommended fix order
1. **Restore the full engine to git** (truncation risk).
2. **Fix Issue 2** (disqualified-role ordering) — small change, removes an embarrassing visible bug.
3. **Fix Issue 1** (score spread + branch weighting) — the core precision lever; re-run this test
   and watch Top-1 hit rate climb.
4. Re-balance creative routing (Issue 3) and the tie-breaker threshold (Issue 4).
5. **Then run the real-people back-test** — synthetic results can't certify accuracy.

Artifacts in this folder: `personas.ts`, `run-test.ts`, `results.json`.
Re-run anytime: `npx tsx run-test.ts` (after restoring the full engine).
