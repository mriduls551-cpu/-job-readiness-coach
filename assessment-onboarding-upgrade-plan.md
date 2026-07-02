# Assessment Engine + Onboarding — Consolidated Upgrade Plan

**Product:** Job Readiness Coach (Next.js 15 + Supabase) — AI career guidance for first-generation / entry-level Indian job seekers, bilingual EN/HI.
**Status:** Pre-launch. Plan ready for implementation (intended build tool: Codex).
**Created:** 2026-06-28
**Source:** Code-verified architecture plan + usability walkthrough (2026-06-27) + sprint plan.

> This document is self-contained and implementation-ready. Every change references `file:line`. It supersedes the divergent parts of `assessment-engine-v2-spec.md` (see "Spec is stale" below).

---

## 0. The two cores

1. **Assessment engine** — `src/lib/assessment-engine.ts` (~2200 lines), `src/lib/matcher/{scorer,quiz-to-vector,catalog,types}.ts`, `src/lib/role-candidates.ts`.
2. **Onboarding / questionnaire** — `src/app/career-fit-check/page.tsx`, `src/app/register/page.tsx`, `src/components/auth/RegisterForm.tsx`, `src/hooks/useAssessmentState.ts`, `src/lib/client-session.ts`. Fit-check posts to `POST /api/assessment/fit-check` (`src/app/api/assessment/fit-check/route.ts`).

Engine is a **v4 two-phase adaptive flow**: 5 routing questions → cluster (people-facing / desk-ops / analytical / creative) → 4 branch questions + 1 finalist. Deterministic scoring (weighted cosine on a 6-dim preference vector + branch role scores + objective "proof-task" evidence + market prior); eligibility via readiness conflicts / education stream / verification requirements.

---

## 1. Code-verified corrections (do NOT fix the wrong layer)

- **"Dimension bars sum to ~70%" is a UI bug, not an engine bug.** `dimensionSnapshot` (`assessment-engine.ts:2146-2155`) divides all 6 dims by the total → sums to ~100, and `assessment-engine.test.ts:105` already asserts all 6 are present. The loss is in `src/app/results/page.tsx:36-57`, which renders only 4 cards (Numbers, People = reactive+proactive, Structure, Creative) and **silently drops `analytical-output`** — that dropped dimension is the ~30% gap.
- **The 24-pt finalist is load-bearing for catalog reachability.** Candidate roles have **zero** branch `roleScores` (`catalog.ts:108-134`) and generic cluster vectors, so on their "witness path" their only role-specific signal is `rf_${roleId}` = 24 pts → 100/100 `branchPreference` (`scorer.ts:144`). `matcher.test.ts:285-331` and `assessment-benchmark.test.ts:200` require ~35 of 41 roles to reach top-3. **Naively lowering the finalist breaks reachability + two tests** — must be paired with capping the ranked catalog (Section 3B).
- **Catalog is 41 roles** (11 base + 30 candidates), not 12. `telemedicine-coordinator` is **retired** (not in `ROLE_ORDER`, `assessment-engine.ts:636-650`).
- **Spec is stale.** `assessment-engine-v2-spec.md` references 12 roles + telemedicine + a `DISQUALIFIER_RULES` array that does **not exist** in code (disqualification is via `evaluateEligibility()` only). Treat this plan as authoritative; update the spec separately.
- **`r4_d` is mislabeled** (`assessment-engine.ts:1149`): a *writing* instinct ("rewrite into a polished message") sets `speakingConfidence: 'low'`. Fix when adding `writingConfidence`.

---

## 2. Locked decisions (2026-06-28)

- **Auth gate → DEFERRED.** Users answer the 5 routing questions anonymously (persisted draft); account required only at the results/save step.
- **Candidate roles → CAP + ADJACENT LIST.** Rank the 11 core roles precisely; show the 30 candidates as a separate "adjacent directions to explore" list, never mixed into `topRoles[3]`. This unblocks lowering the finalist weight. Per-family `roleScores` authoring is a fast-follow.
- **Stream boost magnitude → 1.10** (conservative, tune post-data).
- **Recharts → NOT added** (render 6 dims with existing CSS tiles).

---

## 3. Assessment engine upgrade

### 3A. Discriminative rationale (the High user-research bug)
**Root cause:** `signalAlignment()` (`assessment-engine.ts:1883-1888`) is a raw dot-product; the finalist option's high-magnitude vector (`:1794`) wins for *every* role in the cluster, so its self-referential signal `"Direct preference for ${role.name}"` (`:1791`) dominates every card (observed: Operations Analyst's #1 reason was "Direct preference for Accounting & Finance Assistant").
**Change:**
1. Exclude the finalist option (`id === 'rf'`) from the rationale candidate pool before the `.map` in `scoreAssessment` (`:2114-2118`).
2. Replace raw dot-product with **cosine + deviation-from-cluster-mean**: an option is a reason for role R only if `cosine(option.vector, R.vector)` exceeds the cluster's mean cosine for that option. (Chosen over information-gain: deterministic, cheap, audit-friendly, expresses "what makes THIS role different from its neighbors.")
**Files:** `assessment-engine.ts` (`signalAlignment`, `scoreAssessment:2114`). **Trade-off:** drops magnitude info — acceptable; rationale should reflect direction, not intensity (intensity is already in scoring).

### 3B. Finalist weight + catalog cap (the central tension)
**Change (do both together):**
1. Lower `MAX_BRANCH_POINTS` 24 → **12** (`scorer.ts:19`) and reduce the finalist contribution 24 → **~8** (`buildFinalistQuestion`, `assessment-engine.ts:1795`) so the four discriminator questions drive `branchPreference`.
2. **Cap the ranked catalog**: rank only the 11 core roles in `topRoles`; add an `adjacentRoles` field to `AssessmentResult` (`:126-143`) for candidate roles ranked by cosine alone. Additive/optional → old `result_snapshot` JSON still hydrates (`route.ts:55-84`).
**Migration (mandatory, same commit):** rewrite `assessment-benchmark.test.ts:200-201` and `matcher.test.ts:299-324` to assert reachability within `adjacentRoles`, not `topRoles[3]`. Re-baseline `frozenProductionV2` (`assessment-benchmark.test.ts:168-178`). Document in `algo-validation/MIGRATION_AND_ROLLBACK.md`.

### 3C. Education stream: boosts + neutral unknown
**Change:**
1. Add a boost path: multiplier **>1.0** in `scoreRole` (`scorer.ts:140-192`) when stream matches (law→legal-compliance; commerce/science→accounting-finance / operations-analyst). Start at **1.10**.
2. Treat missing stream as **strictly neutral (1.0)** — change the missing-stream branch (`scorer.ts:78-84`) from `0.95`; drop the `insufficient-evidence` reason for *absent* stream (keep softened copy for *mismatched* stream).
**Files:** `scorer.ts` (`evaluateEligibility:62-119`, `scoreRole`), `types.ts` (`RolePolicy`), `roles.seed.json`, catalog Zod schema (`catalog.ts:15-42`). **Guard:** boosts must not regress top-1 accuracy on `personas.ts`.

### 3D. Disqualifier completeness incl. `writingConfidence`
**Change:**
1. Add `writing` to `ReadinessSignal` (`types.ts:13`) + `PersonEvidence.readiness` (`types.ts:65-77`) + `buildPersonEvidence` (`quiz-to-vector.ts:38-42`).
2. Set `writingConfidence` from the creative-branch writing-style option; fix `r4_d` (`assessment-engine.ts:1149`) to set writing (not speaking) confidence.
3. Add `content-writer` readiness `{ writing: 'strong' }` (`roles.seed.json`) so low writing confidence → `conditional`.
4. Delete dead telemedicine disqualifier references.
**Guard:** `matcher.test.ts:230-257` (objective-evidence) must still pass.

### 3E. Confidence / tie-breaker reconciliation
Code uses tie-breaker margin **<5** (`assessment-engine.ts:1879`); spec says <15; warning logic (`:2171-2182`) differs from spec's "<62 or 3+ within 4 pts". **Pick one rule, document it with the `personas.ts` backtest number that justifies it.** Recommend: test <8 vs <5 for fewest mis-routes; warn when `confidenceScore < 62` OR top-3 spread ≤4. **Files:** `assessment-engine.ts` (`computeConfidence:1858-1881`, warning `:2171-2182`), `scorer.ts` (`buildConfidence:194-216`).

### 3F. Honest 6-dim results viz (UI)
Render all 6 dims in `results/page.tsx:36-57` using existing CSS tiles (add `analytical-output`, split People into reactive/proactive). No new dependency.

---

## 4. Onboarding / questionnaire upgrade

### 4A. Mid-quiz persistence (zustand persist)
`career-fit-check/page.tsx:22-23` holds state in plain React → refresh loses everything. Add a **dedicated persisted store** (new `src/lib/stores/fitcheck-draft.ts`) via `zustand/middleware` `persist`, key `job-readiness-fitcheck-draft`, storing `{ responses, profile, currentIndex, locale, updatedAt }`. Hydrate on mount ("Resume where you left off"); clear on successful submit (after `router.push('/results')`, `:158`). **Do not** entangle with `useAppStore` or `client-session` (avoids blob thrash). No new dep.

### 4B. id-driven flow, correct counter, robust reset
Replace hardcoded `delete next.rtb/b1..b4/rf` (`page.tsx:60-80`) with `pruneOrphanResponses(responses)` derived from `getNextQuestions`. Clamp `currentIndex` to the new list length in the same update (kills the "Question 5 of 1" flash).

### 4C. Accessible single-select (Radix RadioGroup) — NEW dep
Options are `<button>` with a fake radio (`page.tsx:324-353`), no `role="radiogroup"`/arrow-keys/`aria-checked`. Add `@radix-ui/react-radio-group` (consistent with existing Radix deps), keep Tailwind styling via `data-state=checked`.

### 4D. Deferred auth gate (conversion)
Today `page.tsx:36-38` hard-redirects anonymous users to `/register` before any question. **Change:** allow the 5 routing questions anonymously (draft via 4A), gate **only at results/submit** ("Create a free account to save your matches"); on register success, replay the draft to `POST /api/assessment/fit-check`. Keep `RegisterForm` minimal (name/email/password) — capture stream/city in the fit-check, not registration.

---

## 5. Measurement & feedback loop

### 5A. "Does this feel right? Yes / Somewhat / No"
- **UI:** 3-button capture on `results/page.tsx` (below summary, `:133`), fires once.
- **DB:** nullable `feedback` (`yes|somewhat|no`) column on `job_coach_assessments` (Supabase migration; regenerate `job-coach-supabase.types.ts`); sits beside `result_snapshot`/`scoring_version` (`db.ts:283-287`). Add `recordFeedback()` to `ProductDB` (`db.ts:125-206`) + both impls; extend the existing `PATCH` handler (`route.ts:197-226`) with an optional `feedback` field (keep contract stable).
- **Why DB not just PostHog:** durable, version-tagged corpus for recalibration after 500 responses.

### 5B. PostHog events & finalist-weight A/B
- Events via `analytics.ts` `captureProductEvent`: `fit_check_started`, `fit_check_question_answered`, `fit_check_submitted`, `fit_check_feedback`, `results_role_selected`.
- A/B: scoring is **server-side** (`db.ts:434,787`), so read the PostHog flag client-side, pass a **variant id** in the fit-check POST, and add an optional last-arg `scoringConfig` (finalist weight, stream-boost factor) to `scoreAssessment`. Persist the variant on the row (`scoring_variant`) for attributable feedback. Keeps determinism + stable contract.

---

## 6. Testing strategy

### 6A. Property-based invariants — `fast-check` (NEW dev dep)
New `src/lib/__tests__/assessment-engine.property.test.ts`. Generate valid response paths via `getNextQuestions` (technique from `matcher.test.ts:125-159`); assert:
1. **No hard-avoidance contradiction** (numbers/speaking/writing/data `'low'` → excludes the contradicting roles from `topRoles`).
2. **Top-3 rationales differ** (distinct `rationale.en` and `supportingSignals[0]`) — regression lock for §3A.
3. **Dimension snapshot sums to 100 (±1).**
4. **Scores strictly descending & in [0,99].**
5. **Determinism** (same input → identical output).

### 6B. Extend benchmark
`assessment-benchmark.test.ts`: add cluster top-1 accuracy vs `personas.ts` `expectedCluster` (≥85% target) and warning-rate (≤15% target); rewrite reachability assertions to target `adjacentRoles`; re-baseline frozen numbers.

### 6C. UI tests
Results: assert all 6 dims render. Fit-check: counter never exceeds total; reset prunes orphans.

---

## 7. Phased sequencing

| Phase | Items | Effort | Risk |
|-------|-------|--------|------|
| **A — Trust-layer (ship first)** | 3A rationale · 3F 6-dim viz · 4B counter/reset · 6A invariants | S | **Near-zero** (no score change) |
| **B — Scoring correctness** | 3B finalist+cap (+test rewrite) · 3C stream · 3D writing · 3E confidence | M | High (rebaselines tests) |
| **C — Onboarding conversion** | 4A persist · 4C RadioGroup · 4D deferred gate | M | Medium |
| **D — Measurement loop** | 5A feedback+DB · 5B PostHog+A/B | M | Low |
| **E — Quality (deferred)** | Move ~470-entry Hindi regex (`normalizeHindiCopy`, `assessment-engine.ts:150-617`) to `next-intl` catalogs | L | Mechanical |

Dependencies: B1(finalist)→B2(cap+test rewrite); C4D depends on C4A; D5B-A/B depends on B (the thing tested) + D5A (attribution).

---

## 8. Sprints

> **Canonical sprint program (S1–S5)** — capacity, backlog, risks, DoD, dates, dependency graph, and success metrics — lives in **[SPRINTS.md](SPRINTS.md)**. Phase→sprint mapping: A→S1, B→S2, C→S3, D→S4, E(+fast-follows)→S5.

Sprint 1 (Phase A) summary — Mon 2026-06-29 → Fri 2026-07-03 (1 wk): discriminative rationale (3A), render 6 dimensions (3F), counter + id-driven reset (4B), fast-check invariants (6A); P1 PostHog events. Goal: credible results with **zero scoring-rank change**. See SPRINTS.md for the rest.

---

## 9. Open items (defaults chosen; revisit with data)
- Stream boost magnitude: **1.10** (tune after data).
- Tie-breaker threshold: pick <5 or <8 via `personas.ts` backtest; **document the number**.
- Update `assessment-engine-v2-spec.md` to the live 41-role universe (or decide to re-add telemedicine).

---

## 10. Critical files
- `src/lib/assessment-engine.ts` — `signalAlignment:1883`, `buildFinalistQuestion:1762`, `scoreAssessment:2090`, `dimensionSnapshot:2146`, `computeConfidence:1858`, warning `:2171`, Hindi regex `:150-617`
- `src/lib/matcher/scorer.ts` — `MAX_BRANCH_POINTS:19`, `evaluateEligibility:62`, `scoreRole:140`, `buildConfidence:194`
- `src/lib/matcher/{quiz-to-vector,catalog,types}.ts`, `src/lib/role-candidates.ts`
- `src/app/career-fit-check/page.tsx` — persistence, counter/reset `:60-80`, options `:324-353`, auth gate `:36-38`, stream default `:253`
- `src/app/results/page.tsx` — 6-dim viz `:36-57`, feedback capture
- `src/app/api/assessment/fit-check/route.ts` — GET hydration `:55-84`, PATCH `:197-226`
- `src/lib/db.ts` — `saveAssessment:428/781`, `ProductDB:125`, `result_snapshot:283`
- Tests: `src/lib/__tests__/{assessment-engine,assessment-engine.fixes,matcher,assessment-benchmark}.test.ts`
