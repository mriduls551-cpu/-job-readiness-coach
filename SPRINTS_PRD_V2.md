# Sprint Program — PRD v2 (trust core → decision data → growth organ)

**Companion to:** [PRODUCT_PRD_V2.md](PRODUCT_PRD_V2.md) (product truth) · [BUILD_PLAN.md](BUILD_PLAN.md) (sequencing rationale) · [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) (gates).
**Build tool:** Codex (implementer) · **Review/PM/QA:** Mridul (via Claude).
**Created:** 2026-07-05. Supersedes the completed engine program (`SPRINTS.md`, S1–S4, closed 2026-07-02).

> Each task is actionable standalone; deep "why" lives in BUILD_PLAN.md / PRD v2 section noted.
> Work in **small PRs (one task = one PR)**. CI gates every PR: `npm run type-check`, `npm test`,
> `npm run lint`. No `any` escapes. **EN + HI verified for every user-facing surface. Mobile-first.**
> Scoring changes additionally require `npm run benchmark:algorithm` + fast-check invariants green.

## Capacity model
Codex types fast; the bottleneck is **review/accept throughput**: plan **~10 reviewable points/week
at 80%** (raw 12). Points = complexity/review proxy, not hours.

## Program overview
| Sprint | Window | Focus | Risk | PRD v2 / GTM ref |
|---|---|---|---|---|
| **S0** | 2–3 days, immediate | Close out trust core, merge, deploy | Low | BUILD_PLAN §Sprint 0 |
| **S1** | weeks 1–2 | D1 decision instrument (dual CTA fake door + funnel) | Low | Roadmap Gate D1 |
| **S2** | weeks 2–4 | Shareable fit card — the growth organ | Med | GTM E-03 |
| **S3** | weeks 4–7 | Hindi parity via next-intl (kill the regex) | Med (mechanical) | GTM E-09 |
| **S4** | weeks 7–10 | Conversational fit-check over the same engine | High | GTM E-01 |
| **D1 review** | ~week 6 | Decide post-results journey from data (n ≥ 200 results views) | — | Roadmap §0 |

## Cross-sprint dependency graph
- S0 → everything (nothing ships until main carries the trust core).
- S1 → D1 review (CTA split is the decision input). S1 events → S2 share tracking reuses the same analytics plumbing.
- S2 independent of S3/S4 (no-regret under both D1 paths).
- S3 (next-intl catalogs) → S4 (chat copy must come from catalogs, not regex).
- **Do NOT build** D1 Path A (tracks/practice) or Path B (resume co-writer/coach loop) items until the D1 review lands. Fake door only.

## Global Definition of Done (every sprint)
- [ ] One small PR per task, reviewed & merged; clear commit messages (never "update")
- [ ] `type-check` + `test` + `lint` green; scoring-adjacent work: benchmark + invariants green
- [ ] EN + HI verified; mobile viewport (360px) verified
- [ ] No auth wall before results; deterministic engine untouched by AI surfaces
- [ ] PRD v2 / roadmap / this doc updated when behavior changes or a gate passes/fails
- [ ] Product sign-off (Mridul)

---

# Sprint 0 — Close out & ship the trust core
**Window:** 2–3 days · **Branch:** `feat/assessment-sprints-and-algorithm-fixes` → `main`
**Goal:** The trust core (168 tests green) reaches production. No new features.

### Backlog
| P | Item | Est | Deps |
|---|---|---|---|
| P0 | **Z1 — recordFeedback user-id filter**: scope feedback mutation to the requesting user (see `docs/code-review/2026-06-30-action-items.md` item 1) | 1 | — |
| P0 | **Z2 — educationStreamBoosts benchmark confirmation**: run `npm run benchmark:algorithm`, attach delta to PR; revert boost if benchmark regresses (item 2) | 1 | — |
| P0 | **Z3 — double-submit guard**: `submitting` state in `src/app/career-fit-check/page.tsx`, disable submit while in flight (item 3) | 1 | — |
| P0 | **Z4 — merge to main + deploy**: pull main into branch, resolve, full gate, merge, Vercel deploy, smoke-test prod assessment E2E | 2 | Z1–Z3 |

**Load:** 5 pts · **Gate:** CI green on main; production serves the new engine; prod smoke test passes.

---

# Sprint 1 — The D1 decision instrument
**Window:** weeks 1–2 · **Goal:** Every funnel step measurable and the fake-door CTA live, so D1 is decided by data at ~200 results views.

### Backlog
| P | Item | Est | Deps |
|---|---|---|---|
| P0 | **D1a — Dual CTA on results** (`src/app/results/`): "Build my resume" (existing flow) vs "Start practicing with AI" (fake door → "coming soon" sheet + waitlist capture w/ contact opt-in, Supabase table + migration). Equal visual weight, EN/HI, order randomized per session to kill position bias | 3 | S0 |
| P0 | **D1b — PostHog funnel events** (`src/lib/analytics.ts`): `assessment_start`, `question_answered` (with index), `assessment_complete`, `results_viewed`, `cta_resume_clicked`, `cta_practice_clicked`, `feedback_submitted`. Include UTM params (video → assessment CTR) | 2 | S0 |
| P0 | **D1c — PostHog dashboard**: completion % (target ≥55%), per-question drop-off, CTA split, accuracy-feedback split. Document dashboard URL in this file | 1 | D1b |
| P1 | **D1d — D1 review trigger**: scheduled check or manual review at n ≥ 200 `results_viewed`; template the decision memo (inputs: CTA split, accuracy split, share rate) | 1 | D1c |
| P2 | **D1e — waitlist admin view**: read-only list in `src/app/admin` | 1 | D1a |

**Load:** 8 pts (~80%) · **Gate:** every funnel step visible in PostHog; both CTAs firing events in prod; waitlist rows landing.

### Risks
| Risk | Mitigation |
|---|---|
| Fake door feels deceptive | "Coming soon — join the waitlist" copy is honest; opt-in only |
| Low traffic starves D1 | Founder YouTube P0 workstream runs in parallel; UTM capture in D1b makes it visible |

---

# Sprint 2 — Shareable fit card (growth organ, GTM E-03)
**Window:** weeks 2–4 · **Goal:** A WhatsApp-legible share card + public route that turns every result into acquisition.

### Backlog
| P | Item | Est | Deps |
|---|---|---|---|
| P0 | **G1 — Card image** via `next/og` `ImageResponse` (built into Next 15, no new dep): role, top dimensions, first name; legible at WhatsApp thumbnail size; EN/HI | 3 | S0 |
| P0 | **G2 — Public share route** `/r/[publicId]`: opt-in only, first name only (no PII), OG tags, return CTA "Find which track fits you — free, 12 minutes"; `publicId` unguessable (nanoid), Supabase migration | 3 | G1 |
| P0 | **G3 — Share intent**: `navigator.share` + WhatsApp deep-link fallback; `share_clicked`, `share_completed` events; share-driven visits tagged (`?src=share`) → K-factor in dashboard | 2 | G2, D1b |
| P1 | **G4 — perf check**: card render ≤3s on simulated 4G; document measurement in PR | 1 | G1 |

**Load:** 9 pts · **Gate:** card ≤3s on 4G; share rate baseline measured (target ≥15%); zero PII beyond first name on public route.

### Risks
| Risk | Mitigation |
|---|---|
| Public route leaks result detail | Opt-in, first-name-only, reviewed field allowlist in the route handler |
| Card unreadable as thumbnail | Design for 400px width first; test real WhatsApp preview |

---

# Sprint 3 — Hindi parity done properly (GTM E-09)
**Window:** weeks 4–7 · **Goal:** No regex in the question path; question/report copy in next-intl catalogs.

### Backlog
| P | Item | Est | Deps |
|---|---|---|---|
| P0 | **H1 — Extract catalogs**: migrate the ~470-entry `normalizeHindiCopy` regex (`src/lib/assessment-engine.ts`) to next-intl message catalogs (`src/lib/i18n`); mechanical, split into ≤5 PRs by copy domain (questions, options, dimensions, report, UI chrome) | 5 | S0 |
| P0 | **H2 — Delete the regex path** + snapshot test proving EN/HI output identical pre/post migration | 2 | H1 |
| P1 | **H3 — Hindi register test**: 10-user test script + capture sheet; ship gate ≥4/5 "sounds natural"; fix top offenders | 2 | H2 |

**Load:** 9 pts · **Gate:** no regex in question path; Hindi completion rate within 10 points of English (PostHog, from S1 events).

---

# Sprint 4 — Conversational fit-check (GTM E-01)
**Window:** weeks 7–10 · **Goal:** Optional chat layer over the **same deterministic engine**. AI asks/explains; the engine decides.

### Backlog
| P | Item | Est | Deps |
|---|---|---|---|
| P0 | **C1 — Chat layer, chips-first**: server-side only, Haiku-class model via the existing AI SDK/OpenRouter client (`src/lib/openrouter.ts`) — do **not** add a parallel SDK unless a needed feature is missing (decision documented in PR); streaming; answers map to the same question/response schema the engine consumes | 5 | S3 |
| P0 | **C2 — Cost guardrails**: hard per-user daily token budget (Upstash counter); static form remains default; LLM outage invisible (automatic fallback, `ai_fallback` event; target fallback rate ≤2%) | 2 | C1 |
| P0 | **C3 — Equivalence property test**: same inputs → same ranking in chat mode and form mode (fast-check, extends `src/lib/__tests__/`) | 2 | C1 |
| P1 | **C4 — completion-time instrumentation**: median completion ≤12 min measured per mode | 1 | C1, D1b |

**Load:** 10 pts · **Gate:** property test green; median ≤12 min; AI cost ≤ ₹15/active user/month; fallback ≤2%.

### Risks
| Risk | Mitigation |
|---|---|
| Chat drifts into judging eligibility | C3 property test is the hard lock; AI output never enters `scorer.ts` inputs beyond schema-validated answers |
| Token costs blow the ₹3k/mo infra cap | C2 budget is a hard cut-off, not an alert |

---

# D1 decision review (~week 6, parallel to S3)
**Inputs:** CTA split (S1), accuracy-feedback split, share rate (S2), YouTube→assessment CTR.
**Output (required action items, not optional):**
1. One primary post-results journey — then, and only then, schedule Path A (track home E-04 → practice tasks E-05 → progress spine E-06) or Path B (resume co-writer → weekly coach loop).
2. **Schedule the S2 monetization sprint** (Razorpay UPI, ₹49 deep feedback / ₹99 month unlimited — PRD v2 §9) targeting ~month 4, attached to whichever deep-feedback surface the chosen path creates. Never gates progress.
3. Update PRD v2 §12, PRODUCT_ROADMAP.md, and this file with the decision and the two new sprints.

# Standing cost guardrails (every sprint)
AI server-side only · Haiku-first, bigger models only for report rationale · hard per-user daily budget · static fallback behind every AI surface · infra ≤ ₹3k/month · fallback rate ≤2% · page ≤2s on 4G.
