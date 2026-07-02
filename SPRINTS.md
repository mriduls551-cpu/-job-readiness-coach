# Sprint Program — Assessment Engine + Onboarding Upgrade

**Companion to:** [assessment-onboarding-upgrade-plan.md](assessment-onboarding-upgrade-plan.md) (technical rationale, `file:line` targets, trade-offs).
**Build tool:** Codex (implementer) · **Review/PM/QA:** you.
**Created:** 2026-06-28.

## Local implementation closure — 2026-07-02

- [x] Critical dependency path implemented: `B1 -> B2 -> D3`, `B1 -> E2`, `C1 -> C3`, and `D1 -> D3`.
- [x] Guest fit-check flow verified on desktop and mobile: questions remain public, drafts resume after refresh, authentication is deferred until submission, and results remain protected.
- [x] Local release gates passed: lint, type-check, unit/integration tests, production build, and critical-path browser tests.
- [ ] GitHub CI, review, merge, and product sign-off remain external follow-ups.

Deferred as non-critical: `E1` i18n migration and remaining `P2` polish/spec-refresh work.

> Each sprint task is actionable on its own; deep "why" is in the plan doc section noted as `→ plan §X`. Work in **small PRs (one task = one PR)**. CI gates every PR: `npm run type-check`, `npm test`, `npm run lint`. No `any` escapes; EN/HI preserved.

## Capacity model
Codex types fast, so the bottleneck is **your review/accept throughput**. Plan to **~10 reviewable points/week at 80% capacity** (raw 12). Points are a complexity/review proxy, not hours.

## Program overview
| Sprint | Phase | Window | Focus | Risk |
|---|---|---|---|---|
| **S1** | A | Mon 06-29 → Fri 07-03 (1 wk) | Trust-layer fixes — **no scoring-rank change** | Low |
| **S2** | B | Mon 07-06 → Fri 07-17 (2 wk) | Scoring correctness — finalist+cap, stream, disqualifiers, confidence (rebaseline) | High |
| **S3** | C | Mon 07-20 → Fri 07-24 (1 wk) | Onboarding conversion — persist, a11y, deferred auth gate | Med |
| **S4** | D | Mon 07-27 → Fri 07-31 (1 wk) | Measurement loop — feedback, funnel, finalist A/B | Low–Med |
| **S5** | E | Mon 08-03 → Fri 08-07 (1 wk) | i18n debt, adjacent-role precision, polish | Med (mechanical) |

## Cross-sprint dependency graph
- S1 — independent (ship first).
- S2 `B1` (finalist+cap+test rewrite) → `B2` (rebaseline together) → S4 `D3` (A/B) and S5 `E2` (candidate precision).
- S3 `C1` (persist) → `C3` (deferred gate).
- S4 `D1` (feedback column) → `D3` (A/B attribution).

## Global Definition of Done (every sprint)
- [ ] One small PR per task, reviewed & merged
- [ ] `type-check` + `test` + `lint` green in CI
- [ ] EN + HI both verified for any user-facing copy
- [ ] Plan/spec docs updated when behavior changes
- [ ] Product sign-off (you)

---

# Sprint 1 — Trust-Layer Fixes (Phase A)
**Dates:** Mon 2026-06-29 → Fri 2026-07-03 · **Team:** Codex + you
**Goal:** Make results credible to a numerate user — discriminative reasons, all 6 dimensions, a sane counter — with **zero change to scoring rank**, locked by automated invariants.

### Capacity
| Person | Avail | Allocation | Notes |
|---|---|---|---|
| Codex | 5/5 | high throughput | precise tasks |
| You (review) | 5/5 | ~10 pts | the bottleneck |
| **Total** | **5** | **~10 pts (80%)** | buffer for interrupts |

### Backlog
| P | Item | Est | Deps |
|---|---|---|---|
| P0 | **A1 — Discriminative rationale**: cosine deviation-from-cluster-mean in `signalAlignment` ([assessment-engine.ts:1883](src/lib/assessment-engine.ts:1883)) + exclude finalist (`rf`) from reasons ([:2114](src/lib/assessment-engine.ts:2114)). → plan §3A | 3 | — |
| P0 | **A2 — Render all 6 dimensions** (add `analytical-output`, split People reactive/proactive) ([results/page.tsx:36](src/app/results/page.tsx:36)). → plan §3F | 1 | — |
| P0 | **A3 — Counter + id-driven reset**: total from `getNextQuestions`, clamp `currentIndex`, `pruneOrphanResponses` ([career-fit-check/page.tsx:60](src/app/career-fit-check/page.tsx:60)). → plan §4B | 2 | — |
| P0 | **A4 — fast-check invariants** (add dev dep `fast-check`): rationales distinct · dims sum 100±1 · no hard-avoidance contradiction · scores strictly descending in [0,99] · determinism. New `assessment-engine.property.test.ts`. → plan §6A | 3 | A1–A3 |
| P1 | **A5 — PostHog funnel events**: `fit_check_started/question_answered/submitted`, `results_role_selected` ([analytics.ts](src/lib/analytics.ts)) — no DB | 1 | — |
| P2 | **A6 — Spec supersede note** in `assessment-engine-v2-spec.md` (stale 12-role/telemedicine) | 1 | — |

**Load:** 9 P0 + 1 P1 = 10 pts (~83%) · stretch +1

### Risks
| Risk | Mitigation |
|---|---|
| Codex changes scoring while editing rationale | DoD gate: **benchmark `topRoles` order unchanged** + A4 distinct-rationale invariant |
| fast-check flaky/slow | fixed seed + bounded `numRuns`; reuse witness-path gen from `matcher.test.ts` |
| Review bottleneck | one small PR per item; drop A5/A6 first |
| Scope creep into Phase B | **Out of scope:** finalist weight, catalog cap, stream, confidence |

### Sprint DoD (additions)
- [ ] **Benchmark confirms `topRoles` order unchanged** (explanation-layer only)
- [ ] 6 dims render; top-3 cards show distinct #1 reasons; no impossible counter

### Key dates
| Date | Event |
|---|---|
| Mon 06-29 | Start |
| Wed 07-01 | Mid check-in (~2/4 P0 merged) |
| Fri 07-03 | Demo |
| Mon 07-06 | Retro → start S2 |

---

# Sprint 2 — Scoring Correctness (Phase B)
**Dates:** Mon 2026-07-06 → Fri 2026-07-17 (2 wk) · **Team:** Codex + you
**Goal:** Recalibrate scoring behind the locked decisions (lower finalist + cap catalog + adjacent roles), add stream boosts, complete disqualifiers, and reconcile confidence — with a **documented re-baseline**.

### Capacity
| Person | Avail | Allocation | Notes |
|---|---|---|---|
| Codex | 10/10 | high | careful, test-heavy |
| You (review) | 10/10 | ~18 pts | more review per item (risk) |
| **Total** | **10** | **~18 pts (80% of 22)** | |

### Backlog
| P | Item | Est | Deps |
|---|---|---|---|
| P0 | **B1 — Finalist weight + catalog cap** (one commit): `MAX_BRANCH_POINTS` 24→12 ([scorer.ts:19](src/lib/matcher/scorer.ts:19)); finalist 24→~8 ([assessment-engine.ts:1795](src/lib/assessment-engine.ts:1795)); cap `topRoles` to 11 core roles; add optional `adjacentRoles` to `AssessmentResult` ([:126](src/lib/assessment-engine.ts:126)) ranked by cosine; render adjacent list in results UI; update GET hydration ([route.ts:55](src/app/api/assessment/fit-check/route.ts:55)). **Rewrite** reachability tests ([matcher.test.ts:299](src/lib/__tests__/matcher.test.ts:299), [assessment-benchmark.test.ts:200](src/lib/__tests__/assessment-benchmark.test.ts:200)) + re-baseline `frozenProductionV2` ([:168](src/lib/__tests__/assessment-benchmark.test.ts:168)); document in `algo-validation/MIGRATION_AND_ROLLBACK.md`. → plan §3B | 5 | — |
| P0 | **B2 — Stream boosts + neutral unknown**: multiplier >1.0 (start **1.10**) in `scoreRole` ([scorer.ts:140](src/lib/matcher/scorer.ts:140)) for law→legal-compliance, commerce/science→accounting/operations; missing stream → 1.0 ([scorer.ts:78](src/lib/matcher/scorer.ts:78)); update `types.ts` RolePolicy, `roles.seed.json`, catalog Zod ([catalog.ts:15](src/lib/matcher/catalog.ts:15)). → plan §3C | 3 | B1 (rebaseline together) |
| P0 | **B3 — `writingConfidence` + disqualifier completeness**: add `writing` to `ReadinessSignal` ([types.ts:13](src/lib/matcher/types.ts:13)) + readiness ([:65](src/lib/matcher/types.ts:65)) + `buildPersonEvidence` ([quiz-to-vector.ts:38](src/lib/matcher/quiz-to-vector.ts:38)); set `writingConfidence` from creative-branch writing option; fix `r4_d` mislabel ([assessment-engine.ts:1149](src/lib/assessment-engine.ts:1149)); `content-writer` readiness `{writing:'strong'}`; delete telemedicine rule refs. → plan §3D | 3 | — |
| P1 | **B4 — Confidence/tie-breaker reconciliation**: pick tie-breaker threshold (<5 vs <8 via `personas.ts` backtest, **document the number**) ([computeConfidence:1858](src/lib/assessment-engine.ts:1858)); warning rule → `confidenceScore<62` OR top-3 spread ≤4 ([:2171](src/lib/assessment-engine.ts:2171)); verify ≤15% warning rate. → plan §3E | 2 | — |
| P1 | **B5 — Benchmark metrics**: add cluster top-1 accuracy vs `expectedCluster` (≥85%) + warning-rate to `assessment-benchmark.test.ts`. → plan §6B | 2 | B1 |
| P2 | **B6 — Per-stream copy softening** for mismatched (not absent) stream reasons | 2 | B2 |

**Load:** 11 P0 + 4 P1 = 15 pts core; stretch +2 (cap ~18)

### Risks
| Risk | Mitigation |
|---|---|
| Re-baseline silently hides a regression | Keep `personas.ts` top-1 accuracy as the guard; require ≥85% before merge |
| Cap breaks UI assumptions (`topRoles[3]`) | Update results page + GET hydration in same PR as B1 |
| Boosts flip rank order | Conservative 1.10; deterministic tie-break (`order` map, scorer.ts:223) keeps stability |
| S1 invariants regress | Property tests from A4 must stay green |

### Sprint DoD (additions)
- [ ] Rewritten reachability tests pass against `adjacentRoles`
- [ ] Benchmark re-baselined with documented numbers + rollback note
- [ ] 0 hard-avoidance contradictions (A4 invariant green); warning rate ≤15% on personas

### Key dates
| Date | Event |
|---|---|
| Mon 07-06 | Start |
| Fri 07-10 | Mid check-in (B1 merged + rebaselined) |
| Fri 07-17 | Demo |
| Mon 07-20 | Retro → start S3 |

---

# Sprint 3 — Onboarding Conversion (Phase C)
**Dates:** Mon 2026-07-20 → Fri 2026-07-24 (1 wk; may extend to 1.5) · **Team:** Codex + you
**Goal:** Lift completion and accessibility, and defer the auth gate so the 5 routing questions are answerable anonymously.

### Capacity
| Person | Avail | Allocation | Notes |
|---|---|---|---|
| Codex | 5/5 | high | auth refactor = careful |
| You (review) | 5/5 | ~10 pts | e2e the gate change |
| **Total** | **5** | **~10 pts (80%)** | |

### Backlog
| P | Item | Est | Deps |
|---|---|---|---|
| P0 | **C1 — Persisted draft store**: new `src/lib/stores/fitcheck-draft.ts` via `zustand/middleware` persist, key `job-readiness-fitcheck-draft`, `{responses,profile,currentIndex,locale,updatedAt}`; hydrate on mount ("Resume where you left off"); clear on submit ([career-fit-check/page.tsx:158](src/app/career-fit-check/page.tsx:158)). No new dep. → plan §4A | 3 | — |
| P0 | **C2 — Accessible options**: replace `<button>` options with `@radix-ui/react-radio-group` (**NEW dep**) ([page.tsx:324](src/app/career-fit-check/page.tsx:324)); Tailwind via `data-state=checked`; arrow-key nav + aria. → plan §4C | 2 | — |
| P0 | **C3 — Deferred auth gate**: remove pre-question redirect ([page.tsx:36](src/app/career-fit-check/page.tsx:36)); allow anonymous routing Qs; gate at results/submit; on register success replay persisted draft to `POST` fit-check. → plan §4D | 3 | C1 |
| P1 | **C4 — Stream default neutral framing** ([page.tsx:253](src/app/career-fit-check/page.tsx:253)) consistent with B2; optionally move stream/city capture after Q1 | 1 | B2 |
| P2 | **C5 — Cleanup**: reconcile/remove unused `useAssessmentState` ([src/hooks/useAssessmentState.ts](src/hooks/useAssessmentState.ts)); resume-UX polish | 2 | C1 |

**Load:** 8 P0 + 1 P1 = 9 pts (~80%) · stretch +2

### Risks
| Risk | Mitigation |
|---|---|
| Auth refactor regressions | Playwright e2e for register→replay path (`e2e/` exists) |
| Anonymous compute load | Deterministic & cheap (<20ms, matcher.test.ts:333); POST still auth → nothing persisted anonymously |
| Draft store conflicts with `client-session` | Keep it a **separate** store; don't touch `useAppStore`/session blob |

### Sprint DoD (additions)
- [ ] Mid-quiz refresh resumes; options keyboard-accessible (radiogroup semantics)
- [ ] Anonymous user completes 5 routing Qs, then gated at results; draft replays post-register; e2e green

### Key dates
| Date | Event |
|---|---|
| Mon 07-20 | Start |
| Wed 07-22 | Mid check-in |
| Fri 07-24 | Demo |
| Mon 07-27 | Retro → start S4 |

---

# Sprint 4 — Measurement Loop (Phase D)
**Dates:** Mon 2026-07-27 → Fri 2026-07-31 (1 wk) · **Team:** Codex + you
**Goal:** Stand up durable feedback + safe experimentation so routing accuracy is measurable and the finalist weight can be tuned with data.

### Capacity
| Person | Avail | Allocation | Notes |
|---|---|---|---|
| Codex | 5/5 | high | DB migration care |
| You (review) | 5/5 | ~10 pts | verify migration reversible |
| **Total** | **5** | **~10 pts (80%)** | |

### Backlog
| P | Item | Est | Deps |
|---|---|---|---|
| P0 | **D1 — Feedback capture**: nullable `feedback` (`yes|somewhat|no`) column on `job_coach_assessments` (Supabase migration + regenerate `job-coach-supabase.types.ts`); `recordFeedback()` in `ProductDB` ([db.ts:125](src/lib/db.ts:125)) + both impls; extend PATCH ([route.ts:197](src/app/api/assessment/fit-check/route.ts:197)) with optional `feedback`; 3-button capture on results ([results/page.tsx:133](src/app/results/page.tsx:133)). → plan §5A | 3 | — |
| P0 | **D2 — PostHog funnel completion**: finalize started→submitted funnel + feedback event (build on A5) | 1 | — |
| P1 | **D3 — Finalist-weight A/B**: read PostHog flag client-side; pass variant id + optional `scoringConfig` (finalist weight, stream factor) in POST; `scoreAssessment` accepts optional last-arg `scoringConfig` (callers unchanged); persist `scoring_variant` on row. → plan §5B | 3 | B1, D1 |
| P2 | **D4 — Admin views**: cluster distribution + feedback-rate in `src/app/admin` reading new columns | 2 | D1 |

**Load:** 4 P0 + 3 P1 = 7 pts; stretch +2 (~9)

### Risks
| Risk | Mitigation |
|---|---|
| Prod DB migration | Reversible migration + tested rollback; deploy off-peak |
| Client flag can't reach server scoring | Variant-in-POST pattern (documented in plan §5B) |
| Feedback unattributable | Persist `scoring_variant` + `scoring_version` per row |

### Sprint DoD (additions)
- [ ] Feedback persists and is visible (admin or PostHog); A/B variant recorded per assessment; migration reversible

### Key dates
| Date | Event |
|---|---|
| Mon 07-27 | Start |
| Wed 07-29 | Mid check-in |
| Fri 07-31 | Demo |
| Mon 08-03 | Retro → start S5 |

---

# Sprint 5 — Quality, i18n & Adjacent-Role Precision (Phase E + fast-follows)
**Dates:** Mon 2026-08-03 → Fri 2026-08-07 (1 wk; E2 may spill to a 6th sprint) · **Team:** Codex + you
**Goal:** Pay down the Hindi-regex debt, give adjacent roles real ranking signals (the cap fast-follow), and finish polish.

### Capacity
| Person | Avail | Allocation | Notes |
|---|---|---|---|
| Codex | 5/5 | high | E1 broad but mechanical |
| You (review) | 5/5 | ~10 pts | snapshot-review HI |
| **Total** | **5** | **~10 pts (80%)** | |

### Backlog
| P | Item | Est | Deps |
|---|---|---|---|
| P0 | **E1 — i18n migration**: move EN/HI question/option/result copy from `normalizeHindiCopy` regex ([assessment-engine.ts:150-617](src/lib/assessment-engine.ts:150)) to `next-intl` catalogs; HI snapshot tests; delete the ~470-entry table. → plan §7/§E | 5 | — |
| P1 | **E2 — Per-family candidate `roleScores`** (cap fast-follow): author deterministic scores for the 30 candidates using `familyId` + `separatorSignals` in `role-candidates.seed.json`; add per-cluster candidate-family branch question; extend benchmark reachability. → plan §3B note | 5 | B1 |
| P2 | **E3 — Polish**: focus states; loading state on auth routes (35s cold-compile bounce); fix plan-task category mislabel; dimension labels | 2 | — |
| P2 | **E4 — Spec refresh**: update `assessment-engine-v2-spec.md` to the live 41-role universe; retire telemedicine | 1 | — |

**Load:** 5 P0 + 5 P1 = 10 pts (~80%); E2 may split to its own sprint if content-heavy

### Risks
| Risk | Mitigation |
|---|---|
| HI regressions during i18n move | Snapshot tests before/after; migrate in chunks |
| E2 content effort underestimated | Split E2 into its own sprint; ship E1/E3/E4 regardless |

### Sprint DoD (additions)
- [ ] No regex Hindi path remains; HI snapshots pass
- [ ] Adjacent roles ranked with real signals (not cosine-only); spec current

### Key dates
| Date | Event |
|---|---|
| Mon 08-03 | Start |
| Wed 08-05 | Mid check-in |
| Fri 08-07 | Demo |
| Mon 08-10 | Retro → program close / plan next |

---

## Program-level risks
| Risk | Impact | Mitigation |
|---|---|---|
| Review bandwidth is the true limiter | Sprints slip even if Codex is fast | One task = one small PR; cut P2 → P1 → defer |
| S2 re-baseline masks accuracy loss | Worse matches reach users | `personas.ts` top-1 ≥85% is a hard merge gate from S2 on |
| Cumulative `AssessmentResult` shape drift | Old `result_snapshot` rows fail to hydrate | Keep all additions optional; bump `scoringVersion`; verify GET hydration each sprint |
| Bilingual drift | HI breaks while EN works | EN+HI both in every user-facing DoD; E1 snapshots |

## Success metrics (track across program)
| Metric | Target | Source |
|---|---|---|
| Correct-cluster top-1 | ≥85% | personas backtest + feedback (S2/S4) |
| "Broad profile" warning rate | ≤15% | engine warning field (S2) |
| Fit-check completion | ≥78% | PostHog funnel (S1/S4) |
| Hard-avoidance contradictions | 0% | fast-check invariant (S1) |
| "Feels right = Yes" | ≥65% | feedback column (S4) |
