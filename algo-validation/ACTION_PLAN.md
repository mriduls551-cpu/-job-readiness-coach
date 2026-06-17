# Job-Matching — Action Plan (one page)

**The frame:** two unproven bets — *does the matching work?* and *will anyone pay for the output?*
Test both cheaply before building anything. The goal metric is **hires**, not "feels accurate."

---

## The phases

**Phase 0 — Prove the matching is real** (this week; the kit already exists)
Run the back-test on 30–50 already-employed people (see `backtest-kit/`). Until the engine
recovers people's real jobs better than chance, everything else is built on sand. *Precondition.*

**Phase 1 — Make matching market-aware at the category level** (cheap; no listings, no scraping)
Re-shape the 12-role catalog toward where hires actually happen — add high-volume tier-2/3 roles
(telecalling/BPO, field sales, delivery & logistics, retail), down-rank the boutique ones. Weight
roles by role×city demand using public aggregate data (EPFO payroll, NCS, published hiring
reports). Add one onboarding question — *"What jobs have you seen advertised or been called for
near you?"* — turning users into a live, legal demand sensor. (Inputs collected via
`ROLE_RESEARCH_BRIEF.md`.)

**Phase 2 — Add one verification signal**
A single objective check beyond the self-report quiz — typing test, a 30-second spoken-English
clip, or a short per-cluster skill quiz. This is what makes a candidate *sellable* to a recruiter
and what makes matching actually predict hires.

**Phase 3 — Concierge the reverse marketplace in ONE city**
Sign 2–3 placement agencies/employers by hand. Manually match assessed candidates to their open
reqs. Goal: one real hire and one real rupee. No platform, no automation — just prove the loop and
that recruiters value vetted supply.

**Phase 4 — Close the outcome loop** (the long game / the moat)
Instrument the funnel: matched → applied → callback → hired → still-employed-at-30-days. Feed
outcomes back so the algorithm *learns* which candidate×role combos convert, instead of relying on
hand-tuned weights.

---

## Riskiest assumption
**Not the algorithm — Phase 3:** that recruiters will take and pay for candidates from an unproven
source. The whole reverse-marketplace thesis dies if they won't. Test it embarrassingly early.

## Single most useful next step (do now, in parallel with the back-test)
Walk into 2–3 local placement agencies and have the conversation below. It validates or kills the
business model for the cost of an afternoon — *and* hands you your real demand data (the roles they
name = your Phase-1 catalog priorities).

### Recruiter conversation script
1. "What 5 roles do you most need candidates for right now?" *(→ v2 catalog priorities)*
2. "For each — how many do you place a month, and how hard are they to fill?" *(→ demand weights)*
3. "What makes a candidate a yes vs. a no for those roles?" *(→ entry requirements / disqualifiers)*
4. "What do you wish you knew about a candidate *before* interviewing them?" *(→ what to verify)*
5. "If I sent you pre-assessed, pre-screened candidates for [role], would you take them?" *(→ demand)*
6. "Would you pay for that — per candidate, per hire, or a subscription? Roughly how much?" *(→ pricing)*
7. "What's wrong with how you source candidates today?" *(→ your wedge)*

Listen for whether they lean in on #5–6. Enthusiasm = green light; politeness = caution.

---

## This week
- [ ] Back-test: 30–50 employed people through the assessment (proves the tech)
- [ ] Recruiter conversation: 2–3 agencies, script above (proves the business + gives demand data)
- [ ] Fill `ROLE_RESEARCH_BRIEF.md` from what the recruiters say

Everything else waits on those two answers.
