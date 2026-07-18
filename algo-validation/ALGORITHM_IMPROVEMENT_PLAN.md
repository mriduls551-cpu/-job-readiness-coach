# Algorithm Improvement Plan — Evidence-Based Recommendations

**Date:** 2026-07-18  
**Engine:** `src/lib/assessment-engine.ts` (v4, constrained-hybrid) + `src/lib/matcher/scorer.ts`  
**Based on:** 20-persona synthetic test (FINDINGS.md), system audit (CURRENT_SYSTEM_AUDIT.md), v2 spec (assessment-engine-v2-spec.md), matching framework design (MATCHING_FRAMEWORK_DESIGN.md), and source code analysis.

---

## Current State Summary

| Metric | Value | Target |
|--------|-------|--------|
| Cluster hit rate | 85% (17/20) | ≥85% ✅ |
| Role Top-1 hit | 65% (13/20) | ≥85% ❌ |
| Role Top-3 hit | 85% (17/20) | — |
| Score saturation (99 ceiling) | 70% (14/20) | ≤10% ❌ |
| Tie-breaker usage | 65% (13/20) | ≤30% ❌ |
| "Broad profile" warning | 45% (9/20) | ≤15% ❌ |
| Determinism | 100% stable | 100% ✅ |
| Role coverage | 12/12 reachable | 12/12 ✅ |

**Headline finding:** The engine routes clusters well (85%) but does not reliably discriminate between roles *within* a cluster. It's good at "this person is a desk-ops type"; it's weak at "...and specifically a Data-Entry person vs a Back-Office person."

---

## 🔴 P0 — Critical Fixes (Visible Bugs & Structural Issues)

### 1. Fix Disqualified Role Ordering

**Problem:** When a user's routed cluster has all roles disqualified, the crushed low-score roles still display as #1 and #2, while higher-scoring roles from other clusters are buried.

**Evidence (FINDINGS.md, Issue #2):**
> [PERSON_NAME] (#14) — wants finance, said numbers are weak. Disqualifier correctly crushed finance to Accounting (15) / Operations (14)… but those are still displayed as his #1 and #2, while Telemedicine (77) — far higher — is buried at #3. The UI would headline a 15-point role as his best match. That looks broken to a user.

**Root cause:** `scorer.ts` lines 248-251 filter `nonContradictory` roles but the fallback logic doesn't promote cross-cluster alternatives when the winning cluster is all conditional.

**Fix:** When the top-ranked roles are all `conditional`, promote the highest-scoring `ready` role from any cluster into the top-3. The `evaluateEligibility` function already correctly identifies conditional roles — the presentation layer needs to respect this.

**Expected impact:** Eliminates visible "broken" results. Directly addresses v2 spec Goal #4: "Zero results where the top role directly contradicts a stated hard avoidance."

---

### 2. Fix Education Stream Collection

**Problem:** `educationStream` is never collected in the production fit-check UI, so commerce/science, law, and healthcare boosts never fire for real users.

**Evidence (CURRENT_SYSTEM_AUDIT.md, line 47):**
> `educationStream` is never collected in the production fit-check. Therefore commerce/science, law, and healthcare boosts do not run in normal production submissions, although the synthetic harness seeds them directly.

**Affected rules (all dead in production):**
| Rule | Condition | Roles | Multiplier |
|------|-----------|-------|------------|
| Commerce/Science boost | `numbersConfidence === 'high' && ['commerce', 'science'].includes(educationStream)` | accounting-finance-assistant, operations-analyst | 1.15 |
| Law boost | `educationStream === 'law'` | legal-compliance-operations | 1.12 |
| Healthcare boost | `educationStream === 'healthcare'` | telemedicine-coordinator | 1.15 |

**Fix:** Add an education stream question to the profile collection step, or infer from degree name via a keyword map (e.g., "B.Com" → commerce, "B.Sc" → science, "LLB" → law).

**Expected impact:** Unlocks 5 scoring rules that are already written, tested, and specified. The engine is currently running at partial capacity.

---

### 3. Hard Gates for Contradictions (Not Just Soft Multipliers)

**Problem:** All disqualifiers are soft multipliers (0.15–0.35). A user who says "I avoid numbers" can still get accounting as #1 if other signals are strong enough.

**Evidence (v2 spec, Goal #4):**
> Disqualifier accuracy: Zero results where the top role directly contradicts a stated hard avoidance (e.g. finance recommendation for a user who said they avoid numbers).

**Current behavior:** `evaluateEligibility` in `scorer.ts` (lines 64-121) correctly identifies contradictions and returns `conditional` status with a 0.35 adjustment. But conditional roles still appear in the top-3 display.

**Fix:** Add a `hardExclude` rule type. If `numbersConfidence === 'low'`, roles with `readiness.numbers === 'strong'` should be:
1. Marked `conditional` with a clear reason (already done)
2. **Excluded from top-3** unless no `ready` alternatives exist
3. If shown (no alternatives), displayed with a clear caveat, not as a confident recommendation

**Expected impact:** Zero contradictory top-1 recommendations. The v2 spec makes this non-negotiable.

---

## 🟠 P1 — Precision Improvements (Within-Cluster Discrimination)

### 4. Increase Branch Question Weight (30/70 Split)

**Problem:** Branch questions contribute only 60% of the evidence score. Since cosine similarity saturates quickly, branch answers barely shift rankings within a cluster.

**Evidence (FINDINGS.md, Issue #1):**
> [PERSON_NAME] (#9) answered *every* branch question for accounting/Tally — yet was told her #1 is Operations Analyst (99), with Accounting also at 99. Her explicit choices moved nothing.

> Branch questions barely shift the score relative to the cosine baseline, so they aren't doing their job.

**Current formula (scorer.ts, line 170):**
```
evidenceScore = 0.4 × preferenceScore + 0.6 × branchPreference
```

**Proposed formula:**
```
evidenceScore = 0.3 × preferenceScore + 0.7 × branchPreference
```

**Why 30/70 works:** With 4 branch questions each contributing up to 6 points (MAX_BRANCH_POINTS = 24), a perfect branch alignment gives 100 branch points vs. ~50 for a misaligned role — a 50-point gap. At 70% weight, this translates into a ~35-point final score difference, easily separating top roles within a cluster.

**Expected impact:** Top-1 hit rate: 65% → ~78%. Branch questions become the primary within-cluster differentiator, which is their designed purpose.

---

### 5. Widen Score Spread (Anti-Saturation)

**Problem:** Scores pile up at the 99 ceiling. When 3+ roles all score 99, ranking is effectively random (determined by `ROLE_ORDER` array order, not user answers).

**Evidence (FINDINGS.md, Issue #1):**
> Weighted-cosine scores pile up at the 99 ceiling. Repeatedly the top 3 are 99 / 99 / 99, so the user's #1 is effectively decided by ROLE_ORDER, not their answers.

**Evidence (CURRENT_SYSTEM_AUDIT.md, line 139):**
> Top score was 99 for 14/20 personas (70%).

**Current formula (scorer.ts, lines 187-193):**
```
score = clamp(0, 95, round(evidenceScore × eligibilityAdjustment × 0.92))
```

**Proposed fix — Non-linear stretch:**
```
rawScore = evidenceScore × eligibilityAdjustment
stretchedScore = 100 × (rawScore / 95) ^ 1.5
finalScore = clamp(0, 100, round(stretchedScore))
```

This transforms the 80–95 range into 60–100, creating visible separation between roles.

**Alternative — Sigmoid calibration:**
```
calibratedScore = 100 / (1 + exp(-0.08 × (rawScore - 75)))
```
Centered at 75, this naturally separates the middle range where most users cluster.

**Expected impact:** "Broad profile" warning rate: 45% → ~20%. Roles won't cluster within 4 points of each other, so the warning fires only for genuinely ambiguous cases.

---

### 6. Discrimination-Weighted Branch Questions

**Problem:** All branch questions contribute equally to `branchRoleScores`, but some questions are better discriminators than others.

**Evidence (v2 spec branch questions):**
- **BD2** ("strongest comfort zone"): Options directly map to specific roles (A→data-entry, B→back-office, C→legal-compliance). **High discrimination.**
- **BD3** ("ideal day"): "Minimal meetings, mostly screen-based" could apply to multiple desk roles. **Low discrimination.**

**Fix:** Add a `discriminationWeight` field to branch question options:
- High-discrimination options (direct role mapping): **1.5× weight**
- Medium-discrimination options: **1.0× weight**
- Low-discrimination options (ambiguous mapping): **0.75× weight**

**Expected impact:** The engine listens more to questions that actually differentiate roles. This is standard psychometric practice — item discrimination indexing.

---

## 🟡 P2 — Routing & Coverage Improvements

### 7. Strengthen Creative Cluster Routing

**Problem:** Creative only earns routing points from 2 of 5 routing questions. A writer who also thinks analytically gets pulled into analytical.

**Evidence (FINDINGS.md, Issue #3):**
> Creative only earns routing points from two options (r2_c, r5_a). A genuine writer who also thinks analytically gets pulled into analytical.

> [PERSON_NAME] (#10, clear content writer) → routed to analytical; content-writer fell to rank 4. Creative was reached only 3/20 times and needed the tie-breaker every time.

**Fix — Add creative signal to existing options:**

| Question | Option | Current Signal | Add |
|----------|--------|---------------|-----|
| Q1 (Stress response) | A: Stay calm, acknowledge, walk through | people-reactive +3 | creative-output +1 |
| [ADDRESS] (Communication mode) | B: Email with clear message, follow up | people-proactive +1, process-ops +1 | creative-output +1 |

**Why these options:** Q1-A involves empathetic communication (creative problem-solving under pressure). [ADDRESS]-B involves writing clarity (core creative skill). Both are natural fits that don't distort the existing signal.

**Expected impact:** Creative reachability: 15% → ~35%. Creative gets 4 routing touchpoints (matching other clusters), preventing analytical from systematically absorbing creative-aptitude users.

---

### 8. Lower Tie-Breaker Threshold (<3 Instead of <5)

**Problem:** Tie-breaker fires for 65% of users, functioning as a permanent 10th question rather than a true tie-breaker.

**Evidence (FINDINGS.md, Issue #4):**
> Tie-breaker fires for 65% of users. Margin threshold <5 is high vs. typical margins, so even decisive personas (margin 4) get an extra question. It signals routing questions don't spread clusters far apart.

**Fix:** Lower threshold from `< 5` to `< 3` cluster points. Combined with the creative routing fix (which spreads cluster scores further apart), this should bring tie-breaker usage to ~30%.

**Expected impact:** Tie-breaker rate: 65% → ~30%. Only genuinely ambiguous cases (within 3 points out of ~25 possible) trigger the extra question.

---

### 9. Add Response Consistency Check

**Problem:** No mechanism detects contradictory answers (e.g., user says they love numbers in [ADDRESS] but avoids data in their profile).

**Evidence (CURRENT_SYSTEM_AUDIT.md, line 51):**
> No assessment reliability, item discrimination, response consistency, or observed outcome label is recorded.

**Fix:** Compare the user's dimension vector against their stated confidences:
- If `numbersConfidence === 'low'` but the numerical dimension is above the 60th percentile → flag consistency warning
- If `speakingConfidence === 'low'` but people-proactive dimension is above the 60th percentile → flag consistency warning
- Consistency warnings lower the confidence band but don't change scores

**Expected impact:** Honest signaling to both the user and any downstream LLM layer. The v2 spec requires the engine to "carry enough structured signal that a future LLM layer can personalize rationale" — consistency is a critical signal.

---

## 🟢 P3 — Infrastructure & Calibration

### 10. Version Results in Database

**Problem:** GET rescoring means a deployment silently changes old assessments. A user's historical result can change without their knowledge.

**Evidence (CURRENT_SYSTEM_AUDIT.md, Issue #5):**
> Historical results are not versioned. GET rescoring means a deployment can silently change an old assessment and its top roles. Stored score and selected-role consistency are not checked.

**Fix:** Store these fields in the assessments table at submission time:
- `scoringVersion` (already computed)
- `catalogVersion` (already computed)
- `rankedRoles` snapshot (full scored array)
- `cluster` (routing outcome)
- `confidenceBand` (high/medium/low)

The GET endpoint should return the stored snapshot, not recompute. Only new assessments use the latest engine.

**Expected impact:** Eliminates silent result changes. Users see consistent results across sessions.

---

### 11. Real-User Feedback Loop

**Problem:** The engine is tuned against 20 synthetic personas authored from the same scoring design. There's zero real-user calibration.

**Evidence (CURRENT_SYSTEM_AUDIT.md, line 15):**
> The 20-persona harness reports 95% cluster, 85% top-1... This proves determinism and some intended routing behavior only: the personas, answers, and labels were authored from the same scoring design. It is not independent accuracy evidence.

**Fix (from v2 spec P1 requirements):**
1. Add post-results feedback: "Does this feel right? Yes / Somewhat / No" — stored in DB
2. After 500 responses, run a calibration pass:
   - Roles with <50% "Yes" rate → review vectors
   - Clusters with <70% "Yes" rate → review routing questions
   - Disqualifier rules with >10% false-positive rate → adjust thresholds

**Expected impact:** Data-driven tuning replaces circular synthetic validation. The engine improves over time based on real user outcomes.

---

### 12. Replace Confidence Score with Multi-Factor Confidence

**Problem:** `confidenceScore` is just the top-two cluster point margin. It ignores response completeness, contradictions, evidence type, and reliability.

**Evidence (CURRENT_SYSTEM_AUDIT.md, lines 93-95):**
> `confidenceScore` is merely the final top-two cluster point margin. It ignores response completeness, top-role separation, contradictions, evidence type, missing objective checks, and reliability. It is not a probability.

**The fix already exists in code:** `buildConfidence` in `scorer.ts` (lines 213-235) computes a proper multi-factor confidence index:
```
confidenceIndex = 100 × (0.35 × completeness + 0.3 × separation + 0.2 × consistency + 0.15 × reliability)
```

It also computes a confidence band (`high`/`medium`/`low`) with clear reasons. This just needs to be wired into `AssessmentResult` and surfaced in the UI.

**Expected impact:** Honest confidence signaling. Users see when results are tentative vs. confident, building trust.

---

## Implementation Order (Recommended)

| Priority | # | Change | Effort | Impact |
|----------|---|--------|--------|--------|
| **P0** | 1 | Fix disqualified role ordering | Small | Eliminates visible bug |
| **P0** | 3 | Hard gates for contradictions | Small | Zero contradictory top-1 |
| **P0** | 2 | Fix education stream collection | Medium | Unlocks 5 dead rules |
| **P1** | 4 | Increase branch weight to 70% | Tiny (1 line) | Top-1: 65% → ~78% |
| **P1** | 5 | Non-linear score stretch | Small | Warning: 45% → ~20% |
| **P1** | 6 | Discrimination-weighted questions | Medium | Better within-cluster separation |
| **P2** | 7 | Creative routing +2 touchpoints | Small | Creative: 15% → ~35% |
| **P2** | 8 | Lower tie-breaker to <3 | Tiny (1 line) | Tie-breaker: 65% → ~30% |
| **P2** | 9 | Response consistency check | Medium | Better confidence signal |
| **P3** | 10 | Version results in DB | Medium | Eliminates silent changes |
| **P3** | 12 | Multi-factor confidence | Small | Already coded, needs wiring |
| **P3** | 11 | Real-user feedback loop | Large | Enables data-driven tuning |

---

## What NOT to Change

Based on the analysis, these aspects of the current engine are working well and should be preserved:

- **Two-phase adaptive flow** (5 routing → cluster → 4 branch + 1 finalist): The architecture is sound
- **Six-dimension geometry** (numerical, people-reactive, people-proactive, process-ops, creative-output, analytical-output): Cleanly separates the 4 clusters
- **Global dimension weights** (no per-role weights): Makes scores cross-role comparable — a key improvement over v1
- **Deterministic scoring**: 100% stable, fully auditable
- **Eligibility states** (ready/conditional/insufficient-evidence): The framework is correct; only the presentation needs fixing
- **41-role catalog with canonical paths**: Scalable and well-structured

---

## Success Metrics (Post-Implementation)

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Role Top-1 hit (synthetic) | 65% | ≥80% | Re-run 20-persona test |
| Score saturation (99 ceiling) | 70% | ≤15% | Re-run 20-persona test |
| Tie-breaker usage | 65% | ≤35% | Re-run 20-persona test |
| "Broad profile" warning | 45% | ≤20% | Re-run 20-persona test |
| Disqualifier contradiction rate | >0% | 0% | Manual audit of 50 results |
| Creative cluster reachability | 15% | ≥30% | Re-run 20-persona test |

---

*Document version: 1.0 | Based on engine v4 (constrained-hybrid) | All evidence sourced from FINDINGS.md, CURRENT_SYSTEM_AUDIT.md, assessment-engine-v2-spec.md, and source code analysis.*