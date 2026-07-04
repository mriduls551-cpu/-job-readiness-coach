# Build Plan — trust core → decision data → first revenue (2026-07-05)

Companion to [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md). Sequenced so that every sprint either
increases assessment trust, produces the data needed for the D1 decision, or builds the growth
organ — nothing waits on the undecided pivot.

## 0. Where the build actually is (verified against `feat/assessment-sprints-and-algorithm-fixes`)

Already landed (do not re-plan): catalog cap + adjacent-roles list, finalist weight 24→12
(`scorer.ts`), education stream boosts, all 6 dimension cards on results, fast-check invariants,
server-authoritative scoring experiment (`assessment-experiments.ts`), assessment feedback recording
(+ migration), draft persistence (zustand). Suite green: 15 suites / 168 tests.

Not built yet: share card, D1 results CTAs, next-intl question copy (dep installed but questions
still go through the `normalizeHindiCopy` regex), conversational mode, payments, any
learning/practice features.

---

## Sprint 0 — close out and ship the trust core (2–3 days)

1. The three 🟠 items in [docs/code-review/2026-06-30-action-items.md](docs/code-review/2026-06-30-action-items.md):
   `recordFeedback` user-id filter, benchmark-delta confirmation for `educationStreamBoosts`,
   `submitting` state to kill the double-submit window in `career-fit-check/page.tsx`.
2. Merge the feature branch to `main`, deploy.

**Gate:** `npm run type-check && npm test` green in CI; production serves the new engine.

## Sprint 1 — the decision instrument (weeks 1–2)

The D1 fake-door plus full funnel visibility. Cheapest work with the highest strategic payoff.

1. Results page dual CTA: **"Build my resume"** (existing flow) vs **"Start practicing with AI"**
   (fake door → "coming soon" + waitlist capture with contact opt-in).
2. PostHog events end-to-end: `assessment_start`, `question_answered` (index), `assessment_complete`,
   `results_viewed`, `cta_resume_clicked`, `cta_practice_clicked`, `feedback_submitted`.
3. One PostHog dashboard: completion % (target ≥55%), per-question drop-off, CTA split,
   accuracy-feedback split.

**Gate:** every funnel step visible; D1 review auto-scheduled at n ≥ 200 results views.

## Sprint 2 — shareable fit card, the growth organ (weeks 2–4) — GTM E-03

1. Card image via `next/og` `ImageResponse` (built into Next 15, no new dep): role, top dimensions,
   first name; WhatsApp-legible at thumbnail size.
2. Public share route `/r/[publicId]` — opt-in, first name only, OG tags, return CTA
   ("Find which track fits you — free, 12 minutes").
3. Share intent (`navigator.share` + WhatsApp deep link) and share-driven-visit tracking → K-factor.

**Gate:** card renders ≤3s on 4G; share rate baseline measured (target ≥15%).

## Sprint 3 — Hindi parity done properly (weeks 4–7) — GTM E-09

1. Migrate question/report copy from the ~470-entry `normalizeHindiCopy` regex
   (`assessment-engine.ts`) to `next-intl` message catalogs (dep already installed).
2. 10-user Hindi register test; ship gate ≥4/5 "sounds natural".

**Gate:** no regex in the question path; Hindi completion rate within 10 points of English.

## Sprint 4 — conversational fit-check (weeks 7–10) — GTM E-01 / PRD Sprint 2

1. Optional chat layer over the **same deterministic engine** — chips-first, add
   `@anthropic-ai/sdk`, Haiku, streaming, server-side only.
2. Hard per-user daily token budget; static form remains default fallback (LLM outage invisible).

**Gate:** property test — same inputs produce the same ranking in chat and form mode; median
completion ≤12 min; AI cost ≤ ₹15/active user/month.

## D1 decision review (~week 6, parallel to Sprint 3)

Inputs: CTA split from Sprint 1, accuracy-feedback split, share rate, early YouTube signal.
Output: the post-results primary journey. Then branch:

- **Path A — Earning Academy:** track home (E-04, YouTube embeds, zero hosting) → AI practice tasks
  (E-05, Haiku-graded against deterministic rubrics) → progress spine (E-06).
- **Path B — Job Coach:** resume co-writer section actions (PRD Sprint 4) → weekly coach loop
  (PRD Sprint 5).

Either path: **S2 micro-conveniences (Razorpay UPI, ₹49 deep feedback / ₹99 unlimited)** attach
around month 4 to whichever deep-feedback surface exists. Never gates progress.

## Parallel off-repo workstream (founder, weeks 0–8)

YouTube P0: 15–20 videos; every description carries the assessment link with UTM. The only product
work this needs is UTM capture, so video→assessment CTR shows up in the Sprint 1 dashboard.

## Standing cost guardrails (adopted from the GTM draft, effective now)

Claude server-side only · Haiku-first, Sonnet only for report rationale · hard per-user daily budget
· static fallback behind every AI surface · infra ≤ ₹3k/month · fallback rate ≤2% · page ≤2s on 4G.

## Working agreement

One sprint = one PR train. Gates re-run (`npm run type-check && npm test`) before merge. Roadmap
and this plan updated when a gate passes or fails — a gate that fails changes the plan, not the gate.
