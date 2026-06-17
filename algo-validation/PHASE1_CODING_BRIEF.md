# Phase 1 Coding Brief — Matching Foundation (local-first)

Paste this into a fresh coding session. It builds the foundation of the new
matching framework, **fully locally and offline-testable**, and proves it
matches-or-beats the current engine before anything switches over. Production
(Supabase, live LLM) is a later config swap — do not require it here.

Read these first for context (same repo, `algo-validation/`):
`MATCHING_FRAMEWORK_DESIGN.md`, `ROLE_RESEARCH_REVIEW.md`, `ROLES_METRO_REDEFINED.md`.

---

```
You are a senior TypeScript engineer. Build Phase 1 of a new career-matching
framework. Work LOCAL-FIRST: everything must develop and test with no cloud
services and no live API calls. Plan before coding; ask if a decision is unclear.

REPO
- Next.js 14 + TypeScript. Jest installed. Existing engine:
  src/lib/assessment-engine.ts (deterministic, 12 hardcoded roles, 6-dim vectors,
  public entry point scoreAssessment()). Do NOT delete it yet — keep it working
  behind a flag for parity testing.
- Design docs in algo-validation/ describe the target framework. Follow them.

ARCHITECTURAL RULES (non-negotiable)
1. Stage 1 matching = PURE FUNCTIONS, no I/O. Fully unit-testable offline.
2. Roles are read through a RoleCatalog interface, never a direct DB call:
     interface RoleCatalog { getPublishedRoles(): Promise<Role[]> }
   - Implement JsonRoleCatalog now (reads a local seed file).
   - Stub SupabaseRoleCatalog (same interface, throws "not wired" for now).
   - An env var (e.g. ROLE_CATALOG=json|supabase, default json) selects which.
3. No new heavy dependencies. No live network in tests.

WHAT TO BUILD
A. Role schema + local seed
   - Define the Role type per MATCHING_FRAMEWORK_DESIGN.md §3 (riasec{R,I,A,S,E,C}
     0-100, aptitude{numeracy,writtenEnglish,spokenCommunication}, hardFilters,
     market{metroSalaryBand,demandLevel,metroAvailability,realJobTitles}, copy, status).
   - Migrate the existing 12 roles into a local seed file roles.seed.json:
     * Derive each role's RIASEC profile from its current 6-dim vector (propose a
       mapping; flag any you're unsure about for human review).
     * Apply the metro salary bands from ROLES_METRO_REDEFINED.md.
     * Rename telemedicine-coordinator -> patient-care-coordinator (id, names,
       Hindi pair, realJobTitles).
B. Global scorer (MATCHING_FRAMEWORK_DESIGN.md §4)
   - score(person, role): hard-filter gate -> interest similarity -> aptitude-gap
     penalty -> small demand prior -> calibrated 0-100.
   - One global weight set (w1..w3) as named constants (to be tuned against the
     eval set; do not hardcode magic numbers inline).
   - Detect near-ties (top roles within N points) and return that as a flag.
C. Answer -> person vector mapping
   - Map the existing quiz answers into the new dimension space (RIASEC + aptitude).
     Reuse current questions; document the mapping. Note any new question only if a
     dimension is genuinely unprobed.
D. Eval / persona harness (the deliverable that matters)
   - Load the labeled personas (starter set below) as fixtures.
   - Jest tests asserting: top-1 match, top-3 inclusion, hard-filter respect,
     near-tie surfaced (not shown as a clean ranking), every role reachable.
   - A PARITY test: run the same personas through the OLD scoreAssessment() and the
     NEW scorer; report agreement and every divergence with an explanation. Do not
     switch the app over to the new scorer in this phase — just prove it on personas.

DELIVERABLES (first reply = plan only)
1. The plan: file list, the RIASEC-from-vector mapping you propose, and the
   answer->dimension mapping.
2. Open questions for the human (especially any role whose RIASEC profile you’re
   unsure about, and the near-tie threshold N).
Then, after I approve: implement A–D with tests green and a short parity report.

CONSTRAINTS
- Keep scoreAssessment()'s existing signature/behavior intact for now.
- Deterministic, dependency-light, offline tests, TypeScript strict.
```

---

## Starter labeled personas (ground truth for the harness)

Encode these as response fixtures during the build. Expressed as profile + expected
outcome; the agent translates to concrete answer IDs. Covers every cluster plus a
deliberate tie case and a hard-filter case.

1. **Commerce grad, loves numbers, dislikes phone calls** → top-1 `accounting-finance-assistant`; top-3 may include `data-entry-mis`, `operations-analyst`; must NOT surface `sales-support`/`customer-support`.
2. **Arts grad, strong writer, enjoys research, low numeracy** → top-1 `content-writer`; top-3 may include `digital-marketing-executive`.
3. **Outgoing, persuasive, comfortable with targets, low detail-orientation** → top-1 `sales-support`; must NOT surface `data-entry-mis`.
4. **Calm, empathetic, patient, moderate English** → top-1 `customer-support`; top-3 may include `patient-care-coordinator`.
5. **Process-oriented, organized, likes documentation, avoids people-facing work** → top-1 `back-office-operations`; top-3 may include `data-entry-mis`.
6. **Analytical, turns messy data into decisions, commerce/science** → top-1 `operations-analyst`.
7. **Healthcare-adjacent, empathetic, organized coordinator** → top-1 `patient-care-coordinator` (verifies the rename end-to-end).
8. **Law/compliance grad, precise, rule-based, detail-heavy** → top-1 `legal-compliance-operations`.
9. **People-helping, guiding, structured communicator, education stream** → top-1 `academic-counsellor`; top-3 may include `hr-coordinator`.
10. **Balanced across people + process, no strong spike** (edge/tie) → expect a near-tie flag and the low-confidence warning, NOT a confident single answer.
11. **Wants finance but low numeracy + non-commerce stream** (hard-filter) → `accounting-finance-assistant` must be gated/penalized by the aptitude-gap + hard-filter logic, not ranked top.

Aim to grow this to ~30 (2–3 per role) before tuning weights.

---

## Go-live cutover checklist (for later — so it's known, not a surprise)

When you're satisfied locally, "plug and play" to production is these steps, nothing more:
1. Set `ROLE_CATALOG=supabase` and wire `SupabaseRoleCatalog`.
2. Seed the prod Supabase `roles` table from `roles.seed.json` (one import script).
3. Set secrets/keys in the production env (DB, LLM, rate-limiter).
4. Run the eval harness against the prod catalog read (should stay green).
5. One staging smoke test, then flip the matcher flag to the new scorer.
