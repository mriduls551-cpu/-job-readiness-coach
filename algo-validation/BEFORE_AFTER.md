# Patch Results — Before / After (all 4 issues)

Four fixes applied to `src/lib/assessment-engine.ts` (full diff in `engine-fix.diff`). The engine
now passes a strict TypeScript typecheck cleanly.

| # | Issue | Fix |
|---|---|---|
| 1 | Branch answers didn't affect within-cluster ranking (scores stuck at 99/99/99) | Score = weighted-cosine direction (max 70) + the branch `roleScores` that were collected but never read (max 30) |
| 2 | A disqualified low-score role could be shown as #1 | Rank by score first; cluster & role-order are tie-breakers only |
| 3 | Creative cluster almost unreachable (a clear writer routed to analytical) | Gave creative more routing weight (`r2_c` 2→3) + tie-breaker now actually resolves to creative |
| 4 | Tie-breaker fired for 65% of users and often couldn't flip the result | Threshold 8→5 (fewer 11th questions); tie-breaker answer is now honored when the race is close |

## Scorecard across the three stages

| Metric | Baseline | After 1&2 | After 3&4 |
|---|---|---|---|
| Cluster hit (all 20) | 85% | 85% | **95%** |
| Role Top-1 (all 20) | 65% | 70% | **85%** |
| Role Top-3 (all 20) | 85% | 75%* | **85%** |
| Role Top-1 (clean 12) | 67% | 83% | **100%** |
| Cluster hit (clean 12) | 92% | 92% | **100%** |
| Tie-breaker frequency | 65% | 65% | **35%** |
| Avg score gap #1→#3 | 9.2 | 27.9 | ~28 |
| Determinism | 100% | 100% | 100% |
| Roles reachable | 12/12 | 12/12 | 12/12 |

\* The temporary Top-3 dip after fixes 1&2 was the disqualifier correctly steering the two
conflict personas away from a role they'd asked for; it was never a real regression.

## The 3 remaining "misses" are all correct behavior
- **Sahil** — wants finance, weak at numbers → correctly steered to people-facing roles.
- **Deepak** — wants sales, low speaking confidence → correctly steered to written/marketing.
- **Ritu** — deliberate all-rounder (answered the middle option to everything) → genuinely
  ambiguous, lands desk-ops at margin 2 with the low-confidence warning. No clean right answer.

On every persona that has a genuine right answer, the engine now gets the cluster and the
top role right.

## Headline within-cluster fixes (unchanged, still correct)
| Persona | Baseline top 3 | Final top 3 |
|---|---|---|
| Kavya (all-compliance answers) | back-office **99**, legal 99, data 98 | **legal 99**, back-office ~72, data ~69 |
| Meena (all-accounting answers) | operations **99**, accounting 99, data 94 | **accounting 99**, operations ~77, data ~66 |

## Still open
- The **real-people back-test** — synthetic personas can't certify accuracy. This is the next test.
- See `REPO_HEALTH.md` — 22 files in the repo are truncated and must be restored.
