# Product Roadmap — v1.1 (2026-07-05)

Inputs: [PRODUCT_PRD.md](PRODUCT_PRD.md) (Job Readiness Coach), the founder GTM/Monetization/MVP draft
("Earning Academy", July 2026 PDF), the locked assessment-upgrade decisions of 2026-06-28, and the
2026-06-27 user-research walkthrough.

Format: **Now / Next / Later**, with explicit decision gates. Items are only scheduled when the product
they depend on exists or is committed. Sprint-level execution detail lives in [BUILD_PLAN.md](BUILD_PLAN.md).

---

## 0. The open strategic decision (Gate D1)

The PRD and the GTM draft agree on the core (deterministic discovery assessment, bilingual, mobile-first,
value-before-signup, India-first) but diverge on the **endgame**:

| | PRD: Job Readiness Coach | GTM draft: Earning Academy |
|---|---|---|
| After results, user… | builds resume → weekly plan → applies to jobs | joins a track → learns (YouTube) → practices with AI → earns micro-gigs |
| Routing target | 11 core roles (+ adjacent list) | 2 operator tracks |
| Revenue depends on | (not defined in PRD) | S3 take-rate on gigs + S4 SME subscriptions |
| Post-MVP big build | Resume co-writer, coach loop | Learning paths, practice tasks, gig marketplace |

**Gate D1 — choose the endgame (or the bridge between them).** Everything in "Later" is sequenced
behind this. The two are reconcilable — roles can map into operator tracks — but the post-results
journey can only have one primary CTA.

**Cheapest test for D1 (do in "Now"):** on the results page, show two equal CTAs — "Build my resume"
vs "Start practicing with AI" (fake-door for the second) — and measure clicks by segment. Data, not
debate, decides D1.

---

## 1. NOW (0–6 weeks) — trust core. No-regret under both visions.

The GTM draft's own quality gate (E-03: "8/10 test users call the result surprisingly accurate")
depends entirely on this work. Nothing monetizes until the assessment is trusted.

Status verified against `feat/assessment-sprints-and-algorithm-fixes`, 2026-07-05:

| # | Item | Status |
|---|---|---|
| 1 | **Assessment trust layer** — catalog cap + adjacent-roles list, finalist weight 24→12, education stream boosts + neutral unknown, all-6-dimension results fix, fast-check invariants (15 suites / 168 tests green) | **Done** (on branch) |
| 2 | **Deferred auth + draft persistence** — anonymous routing questions, zustand-persisted draft, account at results/save | **Done** (on branch) |
| 3 | **Post-results accuracy feedback** → DB (`recordFeedback` + migration) | **Done** (on branch) |
| 4 | **Close-out & ship** — 3 open review items ([action list](docs/code-review/2026-06-30-action-items.md)), merge to `main`, deploy | **In Progress** — BUILD_PLAN Sprint 0 |
| 5 | **Funnel instrumentation** (PostHog) — completion ≥55%, per-question drop-off, results→CTA CTR | **Not Started** — Sprint 1 |
| 6 | **D1 fake-door experiment** on the results page (see Gate D1) | **Not Started** — Sprint 1 |

The remaining "Now" work is Sprints 0–1 of [BUILD_PLAN.md](BUILD_PLAN.md) (~2 weeks), not six —
the trust layer landed faster than this roadmap assumed when drafted.

## 2. NEXT (2–10 weeks) — the growth organ + reach.

Adopted from the GTM draft; compatible with the PRD. All **Not Started**; sprint detail in
[BUILD_PLAN.md](BUILD_PLAN.md).

1. **Shareable identity/fit card** (GTM E-03) — BUILD_PLAN Sprint 2 (weeks 2–4): `next/og` image +
   public link, renders ≤3s, share tracking, return CTA. K-factor engine (target share ≥15%);
   serves both visions.
2. **Hindi parity done properly** (GTM E-09 / Tier 3) — Sprint 3 (weeks 4–7): move question copy
   from the ~470-entry regex normalizer to next-intl catalogs (dep already installed).
   Gate: 10-user Hindi register test ≥4/5.
3. **Conversational fit-check mode** (PRD Sprint 2 = GTM E-01) — Sprint 4 (weeks 7–10): optional
   chat layer over the same deterministic engine; static form remains the fallback (LLM outage
   invisible).
4. **Results decision support** (PRD Sprint 3 = GTM E-02): "why this role" / "not this one"
   conversational re-rank. Slots after the D1 review — its framing depends on the chosen journey.
5. **Day-7 return measurement** (target ≥25%) — needed before any habit features are built.

**Dependency to watch:** the D1 review (~week 6) needs n ≥ 200 results views, which depends on the
off-repo YouTube P0 + WhatsApp seeding workstream. If traffic is not flowing by week 4, D1 slips —
flag it then, not at week 6.

## 3. LATER — monetization (all gated).

Monetization **principles** adopted now, as constraints on all future work:

> Discovery, lessons, and practice are free forever. Money enters only where value already exists.
> Never: learner fees to learn, selling user data, paid certificates, ads inside the learning experience.

| Stream | What | Gate |
|---|---|---|
| S1 — YouTube AdSense | Ad revenue on the open classroom | Off-repo GTM workstream (channel, 15–20 videos). Not a product-engineering item; only touchpoint is the video→assessment CTA link. |
| S2 — Micro conveniences (₹49 one-off / ₹99 mo) | Deep AI feedback, unlimited practice | Gated on **practice features existing** (D1 → Earning Academy path, or a coach-side equivalent). Requires Razorpay UPI. Never gates progress. |
| S3 — Earning take-rate (10–15%) | Platform fee on real SME micro-gig payments | Gated on **D1 = Earning Academy** AND a founder-hand-matched pilot (~50 gigs) proving SMEs pay for learner work. Do not build marketplace software before the manual pilot works. |
| S4 — SME subscriptions (₹999–2,999/mo) | Managed stream of AI-operator work | Gated on S3 flowing. Year 2–3 horizon. |

**Deliberately NOT adopted yet** (decide at D1, don't drift into them):
- 2-track routing (conflicts with the 11-role catalog decision; likely resolution: roles → tracks mapping).
- Learning paths, AI practice tasks, streaks, squads, capstone (GTM E-04/05/06/10/11).
- The 3–5 year revenue table — treated as scenario planning, not targets.

---

## 4. The five metrics that matter

1. Video → assessment click-through (once channel exists)
2. Assessment completion ≥55%
3. Card share rate ≥15%
4. Day-7 return ≥25%
5. First-earning rate (only after S3 pilot; the GTM draft's own sensitivity analysis says this one
   number decides whether this is a company or a free school)

Everything else is vanity.

---

## 5. Honest risk register (delta to PRD §19)

- **Pivot-by-accident risk**: building Earning Academy features piecemeal without deciding D1 splits
  the product into two half-products. Gate D1 explicitly.
- **Monetization-without-product risk**: S3/S4 are the revenue engine but have zero code behind them
  today. The manual gig pilot must precede any marketplace build.
- **Trust debt**: every stream downstream of the assessment inherits its credibility. The Now section
  is therefore the monetization work, even though it earns ₹0.
- **Traffic dependency**: the D1 decision and every growth metric (share rate, K-factor, day-7
  return) are meaningless without visitors. The YouTube/seeding workstream is off-repo but on the
  critical path.

---

## Changes — v1.1 (2026-07-05, same day as v1)

- **Status audit against the actual branch**: items 1–3 of "Now" (trust layer, deferred auth +
  draft persistence, accuracy feedback) were found **already landed** on
  `feat/assessment-sprints-and-algorithm-fixes` — marked Done. Remaining "Now" work shrank from
  ~6 weeks to ~2 (Sprints 0–1).
- **Next window pulled in** from 6–14 weeks to 2–10 weeks accordingly.
- Added sprint mapping to the new [BUILD_PLAN.md](BUILD_PLAN.md) (Sprints 0–4 + D1 review at
  ~week 6 / n ≥ 200 results views).
- Added the traffic dependency as an explicit risk with an early warning trigger (week 4).
- No priority changes; no items added or cut.
