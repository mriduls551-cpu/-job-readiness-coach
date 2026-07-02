# Algorithm Audit — Assessment Engine (2026-07-02)

Deep audit of the deterministic matching algorithm (computational + psychometric lenses).
Excludes previously known/fixed issues (finalist point weight, discriminative rationale,
6-dim UI, stream boosts, writingConfidence, counter bug). Line numbers are as of audit
time and will drift with the in-flight working tree.

**Status notes (2026-07-02):**
- Findings #2 and #3 were verified independently and **fixed the same day** (see below).
- Full-suite verification is currently blocked: the working tree contains in-flight
  Sprint-5/E2 work (`b5` candidate-family branch question) that has ~60 pre-existing
  test failures (`Unknown question id: b5`). The two audit fixes were isolated and
  confirmed to add zero failures (identical 23-fail count on
  `assessment-engine.test.ts` with and without them).

---

## HIGH

### 1. Confidence "low" band and the low-confidence warning are dead code — ✅ FIXED 2026-07-03
`buildConfidence` (scorer.ts:209-221): `index = 100*(0.35·completeness + 0.3·separation
+ 0.2·consistency + 0.15·(0.55+0.35·coverage))`. Completeness is always 1 (scoring
requires a validated complete path) and consistency is 1 unless fewer than 3 of 41 roles
are non-conditional — virtually impossible. So index ≥ ~63 structurally, while
`WARNING_CONFIDENCE_THRESHOLD = 62` and the medium-band gate is `>= 55`. The "treat this
as a starting direction" warning and `band: 'low'` can essentially never fire.
**Fix:** drop the constant completeness/consistency terms (or compute them over optional
evidence), e.g. `index = 100*(0.6·separation + 0.4·coverage)`; re-derive thresholds from
persona runs.

### 2. Finalist over-weights through a second channel: vector injection — ✅ FIXED 2026-07-02
Finalist options carried `vector: [...policy.preferenceTarget]` (the role's own target
vector, L1 mass ~20+ vs ~3-6 for normal options), summed into both `computeUserVector`
and `buildPersonEvidence`. One answer contributed ~30-40% of preference-vector mass,
circularly inflating the picked role's cosine, the displayed `dimensionSnapshot`, and
every `adjacentRoles` cosine. The S2 fix capped finalist `roleScores` at 8 but missed
this. **Fix applied:** finalist option vector zeroed (`[0,0,0,0,0,0]`); the finalist now
scores via `roleScores` only.

### 3. Circular rationale regression: finalist exclusion filter never matches — ✅ FIXED 2026-07-02
`rationaleOptions = allSelected.filter((o) => o.id !== 'rf')` compared against option ids
that are actually `rf_${roleId}` — a no-op filter. "X stands out because of Direct
preference for X" (the 06-27 research bug) was back. **Fix applied:**
`!option.id.startsWith('rf_')`.

### 4. Benchmark is label-leaked: harness answers questions from the answer key
`buildResponses` fills the finalist and any unspecified branch answer with
`question.options.find(o => o.roleScores?.[persona.expectedRole])?.id`
(assessment-benchmark.test.ts:34-40); personas.ts states "finalist choice is derived
from expectedRole." Top-1/Top-3 accuracy is partially tautological. The
`frozenProductionV2` baseline (top1 17/20) also contradicts FINDINGS.md (13/20).
**Fix:** personas must pre-specify every answer including `rf`; add adversarial personas
authored against a written rubric by someone who hasn't seen the vectors; report metrics
with finalist held out. Until then the ≥85% merge gate is not trustworthy.

### 5. Last-write-wins profile patches silently erase stated feasibility constraints
`Object.assign(profile, option.profilePatch)` in answer order. A user who declares low
speaking comfort at r1_c gets overwritten to 'high' by the r4 polite-reply option —
killing the readiness disqualifier for voice-heavy roles they explicitly ruled out.
Conversely `cr_b4_c` infers `writingConfidence: 'low'` from a mere preference item.
**Fix:** per-signal precedence — explicit feasibility items (r1/r3) always dominate
inferred patches; within a tier take the minimum; never overwrite low with high.

### 6. Cluster commitment is unrecoverable + phantom third recommendation — ⚠️ PARTIALLY FIXED 2026-07-03 (phantom card)
Out-of-cluster core roles have zero `branchRoleScores`, so Q1-Q5 misrouting (margins
0-7; tie-breaker fires ~65%) cannot be corrected by any Phase-2 evidence. The analytical
cluster has only 2 core roles but `topRoles` always shows 3 — slot #3 is a cross-cluster
role with zero branch evidence displayed on the same ordinal scale.
**Fix:** impute a shrunken branch prior (in-cluster mean × 0.5) for the runner-up
cluster's roles; render only 2 cards for 2-role clusters.

## MEDIUM

### 7. "Objective evidence" is author-assigned self-report with a ratchet, gating confidence unevenly
`objectiveEvidencePatch` constants (communication 90 for the obviously-polite option;
spreadsheet 80 for one MCQ) merge via `Math.max` — evidence only goes up. `band: 'high'`
requires full coverage, but coverage is per-role signal count (customer-support needs
only `communication`, which nearly every path sets). r4's "wait for some time" is a dead
distractor; the item measures test-savviness. **Fix:** only keyed proof tasks may write
objectiveEvidence; merge by mean of independent items; require ≥2 items per signal.

### 8. Branch-point cap destroys finalist/branch discrimination; components mix scales
`branchPreference = min(100, pts/12·100)` but attainable max ≈ 23, so a branch-consistent
user saturates at 12 and their finalist adds nothing, while a split user's finalist is
67 points of branchPreference — finalist influence is inversely proportional to
consistency. preferenceScore (uncentered cosine ×100) lives in ~45-95, so nominal
0.4/0.6 weights misstate real influence. **Fix:** denominator = true attainable max per
cluster path; min-max rescale components over the persona corpus before weighting.

### 9. Tie-breaker is an all-or-nothing 6-point override with a silent dead zone
The rtb answer adds +3 plus a within-3 grace override — flipping deficits up to 6, so one
question outranks all five routing questions. At deficit 7 (below the ask-threshold of 8)
the question is asked but provably cannot change the outcome. **Fix:** pure points with
trigger threshold ≤ points granted, or don't ask when it can't matter.

### 10. Cosine on uncentered all-positive vectors biases toward generalist roles; weights are dead code
`GLOBAL_DIMENSION_WEIGHTS = [1,1,1,1,1,1]`. All-nonnegative vectors floor similarity
around 0.4 and make balanced role vectors (hr-coordinator) systematically closer to any
summed answer vector than spiky ones (content-writer). Option informativeness is
implicitly weighted by arbitrary authoring magnitudes. **Fix:** subtract the catalog-mean
vector before cosine (the deviation trick already used for rationales) and L2-normalize
option vectors within each question.

### 11. Adjacent roles use a different, inflated scale; candidate finalist picks are discarded — ✅ FIXED 2026-07-03 (scale)
`adjacentRoles` = raw cosine ×100 cap 99 vs topRoles' evidence pipeline ×0.92 cap 95 —
adjacent numbers routinely exceed the headline match in the same payload. A candidate
role picked at the finalist gets +8 that is invisible (candidates excluded from topRoles;
adjacent ranking ignores branchRoleScores). **Fix:** rank adjacents by the
already-computed `scoreRole` output from `matching.rankedRoles`.

### 12. Single-item constructs; analytical branch is one binary item asked four times
Each readiness construct rides on ≤2 side-effect patches; all four analytical branch
questions are the same ops-analyst-vs-accounting contrast reworded (violates local
independence; 12/12 vs 0/12 saturation inflates apparent separation). No reliability
concept exists. **Fix:** make b1-b4 tap different facets (tool comfort, error tolerance,
output type, pace); feed cross-item disagreement into confidence as a deterministic
inconsistency penalty.

### 13. Cluster construct validity: persuasion conflated with content; no field/physical axis
sales-support sits in cluster `creative` with a people-proactive-dominant vector; a
persuasive extrovert routes to people-facing where no sales role exists (benchmark needed
a bespoke witness path for sales-support — the smoking gun). Desk-ops candidates include
warehouse/housekeeping/kitchen/EV-technician roles, yet no physical/field-tolerance axis
exists — the most binding real constraint (commute, family norms, safety) for this
population. **Fix:** persuasion signal in the people-facing→sales handoff (or sales
sub-branch); a field-vs-desk readiness signal as an eligibility gate, not a preference dim.

### 14. Hindi measurement non-equivalence via mechanical regex translation
`normalizeHindiCopy` applies ~600 sequential case-insensitive word swaps to
already-authored Hindi, re-translating intentional Hinglish with no gender/case
agreement (hazards like `['L','एल']`, `['by','के अनुसार']`). Item difficulty diverges by
language exactly on scored items for the target persona. No DIF check. **Fix:** freeze
human-reviewed Hindi strings as data (Sprint-5 E1 already plans the next-intl move); run
a deterministic DIF audit (EN vs HI option-selection distributions) once real data exists.

## LOW

### 15. Eligibility adjustment ordering and rounding tie-breaks
`evaluateEligibility` returns on stream mismatch (×0.95) before checking `gated` (×0.85),
so a gated + mismatched role gets the milder penalty. After ×0.92 compression and
rounding, ties break purely by catalog seed order (customer-support wins collisions).
**Fix:** take min of all applicable adjustments; break ties by unrounded evidenceScore,
then preferenceScore, before catalog order.

---

## Recommended sequence
1. ✅ #3 + #2 (applied — trust-layer integrity restored)
2. #5 constraint precedence (user-stated feasibility must be inviolable)
3. #1 confidence recalibration (honesty of the warning layer)
4. #4 benchmark integrity — **prerequisite for measuring everything else**
5. #6/#8/#9 scoring-shape fixes, re-baselined together (S2-style migration discipline)
6. #10-#15 with the Sprint-5 i18n/precision work

## Re-run gates
```bash
npm run type-check
npm test   # currently red from in-flight b5/E2 work — coordinate before re-baselining
```
