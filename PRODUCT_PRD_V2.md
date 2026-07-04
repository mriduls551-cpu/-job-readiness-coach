# Product PRD v2 — Consolidated (2026-07-05)

Supersedes [PRODUCT_PRD.md](PRODUCT_PRD.md) (v1, "Job Readiness Coach") wherever the two conflict.
Folds in: the locked decisions of 2026-06-28, the trust-layer work that has since landed, the
Earning Academy GTM/monetization draft (July 2026), [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) v1.1,
and [BUILD_PLAN.md](BUILD_PLAN.md). Section 12 lists every point where v1 is superseded.

---

## Quick Summary

An India-first, bilingual (EN/HI), mobile-first product that takes an early-career user from
"I don't know where to start" to a trusted, explainable shortlist of realistic first roles — in
~12 minutes, free, no login required until the results step. A deterministic scoring engine (not
AI) makes the core decision; AI wraps around it for conversation, explanation, and coaching. The
assessment is the front door and the growth engine (shareable fit card). What happens *after*
results — resume-and-job coaching vs. learn-practice-earn tracks — is the one open strategic
decision (Gate D1), being settled with a fake-door experiment rather than debate. Monetization
follows a strict covenant: the learner never pays to learn; revenue comes from convenience
purchases, ads on open content, and (if D1 goes that way) a take-rate on income the platform
itself generates.

## Quick Notes

- **Engine status:** trust layer is built and green (168 tests) on `feat/assessment-sprints-and-algorithm-fixes`; needs 3 close-out items + merge (Sprint 0).
- **One open decision (D1):** first ₹500 earned vs. first offer letter as the post-results journey. Fake-door dual CTA ships in Sprint 1; review at ~200 results views.
- **Auth is deferred** — v1's account-gated principle is dead. Value before wall.
- **Role universe:** 11 core roles ranked precisely + ~30 "adjacent roles" shown as a list. Telemedicine coordinator is retired.
- **AI never judges:** scoring, eligibility, and saved state are deterministic; AI explains and coaches. Every AI surface has a static fallback.
- **Money covenant:** no learner fees to learn, no data selling, no paid certificates, no ads inside learning.
- **Biggest external dependency:** traffic (YouTube P0 + WhatsApp seeding). Without it, D1 and every growth metric starve.

---

## 1. Problem Statement

Early-career Indians — especially first-generation job seekers with uneven English comfort — do
not know which realistic roles to target first, cannot describe their strengths in job language,
and have no weekly plan that moves them toward income. Existing options are either generic
inspiration (career quizzes, aptitude sites) or unstable AI-first tools whose recommendations
change on every run. The cost of not solving it: the user's job search stalls at the starting
line, and the market keeps serving only those who already know what to ask for.

Evidence: the 2026-06-27 end-to-end walkthrough as the target persona found the deterministic
engine durable but every defect concentrated in the **trust/explanation layer** — users don't
need a smarter engine, they need to believe the one that exists.

## 2. Target User

**Primary:** India-based fresher or near-fresher seeking a realistic white-collar first role;
limited confidence, uneven English, weak resume, no search plan. Hindi or English, on a budget
Android phone, discovered via YouTube/WhatsApp.

**Secondary:** entry-level switchers, returners after a gap, and applicants getting no responses.

**Explicitly not (MVP):** senior professionals, postgraduate decision-making, government-exam
strategy, licensed-credential professions.

## 3. Goals

1. **Trusted discovery:** ≥8/10 test users call their result "surprisingly accurate"; post-results feedback ("does this feel right?") ≥70% Yes/Somewhat.
2. **Completion:** ≥55% of assessment starters finish; median ≤12 minutes.
3. **Organic growth:** fit-card share rate ≥15%; measurable K-factor (plan: 0.15–0.3).
4. **Return:** day-7 return ≥25%.
5. **Survival economics:** AI cost ≤₹15/active user/month; infra ≤₹3k/month; static-fallback rate ≤2%.

## 4. Non-Goals

1. **A gig marketplace (v1):** S3/S4 revenue depends on it, but building it precedes evidence. Gated behind D1 + a founder-hand-matched ~50-gig pilot.
2. **All careers in India:** 11 core roles + adjacent list. Breadth kills trust before it adds reach.
3. **Certificates or credentials:** the covenant forbids paid certificates; under the Earning Academy vision, the first ₹500 earned *is* the credential.
4. **Open-ended AI career advising:** AI stays bounded — explain, coach, draft. It never becomes the judge.
5. **Native apps, voice UI, employer/recruiter features, multi-agent architecture:** explicitly cut from MVP scope (GTM draft cuts, adopted).

## 5. User Stories

**Discovery (P0 journey):**
- As a hesitant fresher, I want to answer simple questions in Hindi or English without creating an account, so I can see whether this is worth my time before giving anything up.
- As a first-gen job seeker, I want my top matches explained in plain language tied to *my* answers, so the result feels earned rather than horoscope-like.
- As a skeptical user, I want to say "not this one" and see the ranking respond with reasons, so I feel guided, not judged.
- As a user whose phone dies mid-quiz, I want my draft preserved, so I don't start over.
- As a proud finisher, I want a shareable card of my result, so I can post it in my WhatsApp group.

**Post-results (depends on Gate D1):**
- As a decided user, I want to turn my chosen role into a stronger resume and a weekly plan, so I know exactly what to do this week. *(Path B)*
- As a learner, I want each lesson paired with a hands-on AI-graded task with one specific fix, so I'm practicing, not just watching. *(Path A)*

**Edge cases:**
- As a user when the AI is down, I want the static form and static rationale to work identically, so the outage is invisible.
- As a Hindi-first user, I want the Hindi register to sound natural, not machine-translated.
- As a returning user, I want my saved result attached to my new account when I finally register.

## 6. Core User Journey (current)

1. **Arrive** (YouTube CTA / shared card / landing) → understand value without login.
2. **Fit check** — ~12 min, bilingual, chip-first; anonymous; draft persisted locally.
3. **Results** — top matches from 11 core roles + adjacent-roles list; 6-dimension snapshot; discriminative rationale; accuracy feedback prompt.
4. **Account** — created here, at the moment of value, to save the result. (≤3 steps.)
5. **Share** — fit card to WhatsApp (Sprint 2).
6. **Continue** — resume/plan today; dual CTA measures what users *want* next (Gate D1).

## 7. Requirements

### Must-Have (P0)

| # | Requirement | Acceptance essentials | Status |
|---|---|---|---|
| R1 | Deterministic fit engine, 11 core + adjacent list | Same inputs → same output; per-feature contributions stored; invariants under fast-check | **Done** |
| R2 | Anonymous assessment + persisted draft | Refresh/return loses nothing; account only at results/save | **Done** |
| R3 | Post-results accuracy feedback → DB | Yes/Somewhat/No recorded per result, user-scoped | **Done** (user-id filter pending, Sprint 0) |
| R4 | Full funnel instrumentation | Every step from start to CTA visible in PostHog | Sprint 1 |
| R5 | D1 fake-door dual CTA | Resume vs practice clicks measurable; waitlist capture on fake door | Sprint 1 |
| R6 | Shareable fit card | Renders ≤3s on 4G; public link, first-name only, opt-in; shares tracked | Sprint 2 |
| R7 | Hindi parity via message catalogs | No regex normalizer in question path; 10-user register test ≥4/5 | Sprint 3 |
| R8 | Static fallback for every AI surface | LLM outage invisible; fallback rate ≤2% | Standing rule |
| R9 | Page ≤2s on 4G, budget-Android-first | Measured on results + fit-check routes | Standing rule |

### Nice-to-Have (P1)

| # | Requirement | Acceptance essentials |
|---|---|---|
| R10 | Conversational fit-check mode (same engine underneath) | Property test: chat and form produce identical rankings; median ≤12 min; hard per-user daily token budget |
| R11 | Results decision support ("why this / not this one") | Re-rank is explained, conversational, never silently reorders |
| R12 | Resume co-writer section actions *(Path B)* / AI practice tasks with rubric feedback ≤30s *(Path A)* | Scoped after D1 |
| R13 | Micro-conveniences ₹49/₹99 via UPI | Never gates progress; ≤2 taps from a natural moment; needs Razorpay |

### Future Considerations (P2) — design for, don't build

- Take-rate rails: if D1 → Earning Academy, payments flow through the platform later; keep result/role/track IDs stable and user-scoped now.
- Corridor markets (Philippines, Kenya, Nigeria): same product, locale-swapped — which is why R7 moves copy into catalogs instead of more regex.
- Squads/cohorts and streaks: need day-7 return data first.
- SME-side accounts (S4): entirely post-pilot.

## 8. Assessment & AI Principles (unchanged from v1, reaffirmed)

- **AI is the coach, not the judge.** Core scoring, eligibility, and saved state are deterministic. AI explains, converses, drafts.
- Scores are framed as *match strength* ("strong fit", "explore further"), never as predictive certainty.
- Server-side LLM calls only; Haiku-first, larger models only for report rationale; hard per-user daily budget.
- Chat-derived signals become structured state; progress never lives only in chat logs.

## 9. Monetization (adopted 2026-07-05)

**Covenant (effective immediately):** discovery, lessons, and practice are free forever. Never:
learner fees to learn, selling user data, paid certificates, ads inside the learning experience.

| Stream | What | Gate |
|---|---|---|
| S1 AdSense | Ads on the open YouTube classroom | Off-repo; channel eligibility (~Month 6–9) |
| S2 Micro-conveniences | ₹49 deep feedback / ₹99 month unlimited | A deep-feedback surface existing (post-D1, ~month 4) |
| S3 Take-rate 10–15% | Fee on real SME micro-gig payments | D1 = Path A **and** manual ~50-gig pilot succeeding |
| S4 SME subscriptions | ₹999–2,999/mo managed work stream | S3 flowing (Year 2–3) |

Survival math: breakeven targeted on S1+S2 alone by Month 15–18; S3/S4 are growth, not survival.

## 10. Success Metrics

**Leading (days–weeks):** assessment completion ≥55% · median time ≤12 min · results→CTA CTR ·
accuracy feedback ≥70% positive · share rate ≥15% · video→assessment CTR (once channel live).

**Lagging (weeks–months):** day-7 return ≥25% · K-factor 0.15–0.3 · track/plan completion ·
(post-P3) **first-earning rate** — the single number that decides the company's ceiling
(>20% = generational; <5% = beloved free school).

**Guardrails:** AI ≤₹15/learner/month · fallback ≤2% · page ≤2s on 4G.

Measurement: PostHog dashboard (Sprint 1); feedback table in DB; evaluation checkpoints at each
BUILD_PLAN gate and the D1 review (n ≥ 200 results views).

## 11. Open Questions

| Q | Question | Owner | Blocking? |
|---|---|---|---|
| D1 | Post-results endgame: earn (tracks/gigs) vs employed (resume/plan)? | Founder, with Sprint-1 data | Blocks Sprint 5+, S2 placement, R12 |
| Q2 | LLM provider: code uses OpenRouter (v1); GTM draft assumes Claude API direct. Consolidate on one before the conversational mode. | Founder/eng | Blocks Sprint 4 only |
| Q3 | Will SMEs pay for learner micro-work? | Founder (manual pilot, ~50 gigs) | Blocks S3/S4 build, not MVP |
| Q4 | Hindi register quality bar met? (10-user test) | Founder + testers | Gates R7 ship, fallback = EN launch + HI fast-follow |
| Q5 | Traffic: is YouTube P0 producing visitors by week 4? | Founder | Blocks D1 review timing |

## 12. What v2 Supersedes in v1

1. **§6.2 Account-gated core experience → reversed.** Assessment is anonymous; account at results/save (locked 2026-06-28).
2. **§8 role list:** telemedicine coordinator retired; universe is 11 core + ~30 adjacent, not a flat 12.
3. **§9 Phase 1** ("requires account creation before product use") → superseded by deferred auth.
4. **No monetization section in v1** → §9 here, with covenant and gates.
5. **v1 Sprints 1–6 (§18)** → replaced by BUILD_PLAN Sprints 0–4 + D1 branch; v1's resume co-writer and weekly-coach-loop sprints become Path B of D1.
6. **§16 status narrative** → superseded by roadmap v1.1 status table (trust layer done, not pending).
7. **Working name:** "Job Readiness Coach" vs "Earning Academy" — unresolved until D1; both remain working titles.

## 13. Timeline & Phasing

See [BUILD_PLAN.md](BUILD_PLAN.md) for sprint detail. Summary: Sprint 0 close-out/deploy (days) →
Sprint 1 decision instrument (wk 1–2) → Sprint 2 share card (wk 2–4) → Sprint 3 Hindi (wk 4–7) →
Sprint 4 conversational mode (wk 7–10) → **D1 review ~wk 6** → Path A or B. No hard external
deadlines; the only date-like constraint is the GTM draft's Month-18 breakeven target, which
depends on the off-repo channel workstream starting now.

## 14. Risks

- **Pivot-by-accident:** building Path A features without deciding D1 → two half-products. Mitigation: gate + fake-door data.
- **Trust debt:** any regression in assessment credibility poisons every downstream stream. Mitigation: invariant tests, accuracy-feedback monitoring.
- **Traffic starvation:** all growth metrics need visitors; channel is off-repo. Mitigation: week-4 early-warning check.
- **Bilingual quality:** shallow Hindi breaks the India-first promise for the core persona. Mitigation: R7 gate.
- **Cost drift:** AI spend scales with users. Mitigation: Haiku-first, hard per-user budgets, guardrail metric.
