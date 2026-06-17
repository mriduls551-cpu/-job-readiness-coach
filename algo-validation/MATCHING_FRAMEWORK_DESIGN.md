# Matching & Guidance Framework — Design Spec

Purpose: replace the 12 hand-tuned role vectors with a **scalable framework** where
adding a role is filling in a template, matching is deterministic and testable, and
the handoff to the LLM for guidance is a defined contract. Scope v1: metro-city
entry-level roles in India.

## Resolved decisions

1. **Matching is deterministic.** The LLM does not pick roles. It only writes
   guidance after matching (Stage 2).
2. **Role profiles use an O\*NET-anchored standard dimension space** (RIASEC +
   aptitude/constraint layer). Profiles are LLM-drafted from a real job description,
   human-reviewed, and validated against personas before publishing.
3. **The role catalog lives in Supabase** as editable data, not code constants.
   Adding/updating a role (incl. salary) needs no deploy.

---

## 1. Two engines, one contract

```
quiz answers ─► [STAGE 1: MATCHER] ─► MatchResult ─► [STAGE 2: GUIDANCE] ─► coaching
                 deterministic            (contract)      LLM, grounded
```

- **Stage 1 (Matcher):** person → ranked roles. Pure functions, fully unit-tested.
- **Stage 2 (Guidance):** `MatchResult` + profile → personalized plan via LLM,
  grounded in real metro postings, structured output, traced.

The "missing fixture" is (a) the role schema that makes Stage 1 scale and (b) the
`MatchResult` object that Stage 1 hands to Stage 2.

---

## 2. The standard dimension space (the shared currency)

Every person and every role is expressed in the **same** space. This is what kills
the collision problem — no more per-role weights.

**Interest layer — RIASEC (Holland codes), 0–100 each:**
Realistic, Investigative, Artistic, Social, Enterprising, Conventional.
(Maps cleanly to your roles: Conventional≈desk/data/process, Enterprising≈sales,
Social≈people-help, Artistic≈writing/creative, Investigative≈analytical.)

**Aptitude / constraint layer (entry-level India reality):**
- `numeracy` (0–100), `writtenEnglish`, `spokenCommunication` — self-rated via quiz.
- Hard filters: `eligibleStreams`, `minEnglishLevel`, `requiredCerts` (e.g., Tally).

**Market metadata (data, not scoring):** `metroSalaryBand`, `demandLevel`,
`metroAvailability`, `realJobTitles[]` (for searchability).

Adding a role in the existing space usually needs **no new questions** — that's the
scalability win. New questions are only needed if a role family probes a dimension
the quiz doesn't yet cover.

---

## 3. Role schema (the Supabase catalog row)

```
role {
  id, name{en,hi}, shortLabel{en,hi}, cluster,
  riasec:        { R,I,A,S,E,C }          // 0-100, the interest profile
  aptitude:      { numeracy, writtenEnglish, spokenCommunication }  // required level
  hardFilters:   { eligibleStreams[], minEnglishLevel, requiredCerts[] }
  market:        { metroSalaryBand, demandLevel, metroAvailability, realJobTitles[] }
  copy:          { summary, whyItFits, starterTasks[], strengths[] }  // {en,hi}
  status:        draft | validated | published
  version
}
```

Profiles are authored once, in this schema. The scorer never changes when a role is
added.

---

## 4. The global scoring function (one formula, every role)

```
score(person, role):
  1. HARD GATE   — if person fails hardFilters (stream/English/cert) → role excluded.
  2. INTEREST    — similarity(person.riasec, role.riasec)            // 0..1
  3. APTITUDE    — penalty for gaps where role.aptitude > person.aptitude
  4. DEMAND PRIOR— small boost by role.market.demandLevel (break ties toward jobs)
  final = calibrate( w1*interest − w2*aptitudeGap + w3*demandPrior )  // 0..100
```

Key differences from today: one global weight set (`w1..w3`) instead of per-role
weights → scores are comparable. Disqualifiers become principled aptitude-gap terms
and hard filters, not hand-tuned multipliers. Output is calibrated and **ties are
detected and surfaced honestly** (banded labels, not a fake 78-vs-74 ranking). The
`w` weights are tuned against the eval set, not guessed.

---

## 4a. How scoring scales (user profiled once, roles scored against it)

The matcher is **one algorithm in two steps**, and the two are decoupled — this is
what lets the catalog grow without re-architecting anything.

1. **Profile the user once.** Quiz answers collapse into a single point in the shared
   space (RIASEC + aptitude). This is computed independently of the catalog — it does
   not matter whether 12 roles exist or 120. The person is represented identically
   either way.
2. **Score every role against that one point.** Each role is also a point in the same
   space; the global scorer (§4) measures each role's fit to the user's point and
   ranks them.

**Consequence — adding roles is nearly free.** A new role is just another point scored
against the same user profile by the same function. The user never re-takes anything;
more roles simply produce a longer, more differentiated ranking. This is the source of
"more variance instead of a fixed 12" — the score becomes a spectrum across the whole
catalog rather than a bucket.

**Boundary — "any role" means "any authored role."** The scorer ranks points; a
real-world job becomes a point only after it's authored into the schema (§3) via the
onboarding pipeline (§6). The engine cannot score a role it has never been given.

**Engine variance ≠ what the user sees.** The engine may rank all N roles internally,
but the product must surface only a curated few — banded (Strong / Good / Explore),
with an optional "see more." Showing a user 20–30 roles overwhelms and erodes
decisiveness. Rich underneath, curated on top.

**Not two algorithms.** Steps 1 and 2 are one deterministic matcher. The genuinely
separate algorithm is Stage 2 (the LLM), which runs only after matching to write
guidance on the top roles — never to rank them.

---

## 5. Eval / persona harness (the measurement backbone)

- ~30–40 expert-labeled personas (2–3 per role + deliberate edge/tie cases): quiz
  answers + expected outcomes.
- Assertions: top-1 match, top-3 inclusion, hard-filter respect, no near-tie shown
  as a clean ranking, every role reachable.
- Runs on the existing `jest`. Every catalog change and weight change must pass it.
- This is also the safety net for migrating the 12 roles and for onboarding new ones.

---

## 6. Role-onboarding pipeline (the "working mechanism" to scale)

```
pick role ─► LLM drafts riasec+aptitude profile (from a real JD, anchored to O*NET)
          ─► human review/edit ─► add market data ─► validate vs personas
          ─► publish to Supabase (status: published)
```

A role only goes live if it passes the harness (reachable, doesn't collide, doesn't
regress existing matches). This is how the catalog grows from 12 → 80 without quality
rotting.

---

## 7. Stage-2 guidance contract (matcher → LLM)

**Handoff object (`MatchResult`):**
```
{ profile, locale,
  topRoles: [ { roleId, name, score, band,
                matchedStrengths[], skillGaps[], requiredSkills[],
                salaryBand, realJobTitles[] } ],
  grounding?: [ realMetroPostings… ] }
```

**LLM job (bounded):** given that object, produce structured guidance — why it fits
(from `matchedStrengths`), honest gaps, a 30/60/90-day starter plan, 2–3 portfolio
artifacts to build, resume bullets. **Must use only provided facts** (no invented
salaries/employers).

**Grounding:** retrieve current metro postings for the matched role and feed them in,
so guidance names the real tools/skills employers ask for. (This is the legitimate
home for retrieval/RAG — Stage 2, not Stage 1.)

**Guardrails:** structured output validated with `zod`; tracing/cost via Langfuse;
the chat/guidance endpoints rate-limited (you already have `@upstash/redis`).

---

## 8. Migration (evolve, don't rewrite)

1. Stand up the Supabase `roles` table + schema.
2. Convert the existing 12 roles into the new schema (LLM-draft RIASEC from their
   current vectors → your review). Rename `telemedicine-coordinator` →
   `patient-care-coordinator`. Apply the metro salary bands.
3. Put the new global scorer behind a flag; prove parity-or-better vs the old engine
   on the persona set before switching `scoreAssessment()` over.
4. Delete the hand-tuned constants once parity holds.

---

## 9. Build sequence (systematic)

- **Phase 1 — Foundation:** dimension space + role schema + Supabase catalog + eval
  harness + global scorer; migrate the 12, prove parity.
- **Phase 2 — Scale:** role-onboarding pipeline; expand catalog beyond 12.
- **Phase 3 — Guidance:** `MatchResult` contract + LLM guidance with structured
  output + Langfuse + rate limiting.
- **Phase 4 — Grounding:** retrieve/refresh real metro postings (pgvector) to ground
  guidance and keep salary/skill/demand data current.

Each phase ships behind the eval harness, so nothing regresses.
