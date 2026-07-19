# Comprehensive Pre-Launch Curation — Codex Prompt Pack (3 phases)

_Goal: before launch, every education tier (non-graduate, diploma/ITI, graduate by stream,
postgraduate, professional) sees a distinct, coherent, honestly-ordered role list, and the
catalog covers the Indian entry-level market — with zero loss of user agency._

**How to run:** one phase per fresh Codex session, in order. Each phase works on its own
branch, never pushes, and ends with a report validated before the next phase starts.
Phases 2 and 3 contain STOP checkpoints where Mridul approves product decisions.

**Shared rules for every phase** (embedded in each prompt): CLAUDE.md is authoritative
(no AGENTS.md in this repo). Deterministic engine decides, LLM never ranks. Bilingual EN/HI
for every user-facing string. Mobile-first for every UI change. Scoring changes require
`npm run benchmark:algorithm` + fast-check invariants green (rule 5). Gates per phase:
`npm run type-check` → `npm test` → `npm run benchmark:algorithm` → `npx playwright test
--workers=2` (cap workers at 2). Demotion never exclusion: no role becomes unreachable.
Explicit user choices (stream dropdown, finalist pick) always beat inference.

---

## PHASE 1 — Stream relevance + min-side rule + three-shelf results

```
You are a senior engineer on "Job Readiness Coach" (Next.js 15 App Router + TypeScript,
India-first, bilingual EN/HI, mobile-first). Read CLAUDE.md first; it is authoritative.
Work on branch `feat/curation-phase1` off main. Commit per task, never push, never merge.
Windows environment; prefer npm scripts.

Read before designing (code wins over this prompt): src/lib/matcher/scorer.ts (note
evaluateEligibility and the conditional-demotion path — REUSE it), src/lib/matcher/types.ts,
src/lib/matcher/degree-parser.ts (EducationLevel order), src/data/roles.seed.json,
src/data/role-candidates.seed.json (both carry typicalEducationBand and, on some roles,
educationStreamBoosts), src/app/results/page.tsx, e2e/product-lock.spec.ts,
algo-validation/CREDENTIAL_COHERENCE_REPORT.md (the pattern this phase extends).

## TASK 1 — streamRelevance on all 41 roles
1. Add `streamRelevance: EducationStream[]` to the role policy (types + both seed files):
   the streams for which this role is a NATURAL fit. Populate all 41 roles with sensible
   Indian-market values (GST Assistant → commerce; Software Testing / Web Dev / IT Helpdesk
   → science; Legal Ops → law; Telemarketing-class roles → open/any; use `open` to mean
   "no stream is more natural than another" — service/field roles are typically open).
   One data-only commit, clearly formatted for review.
2. Scoring: replace the narrow educationStreamBoosts mechanism with streamRelevance-driven
   adjustment in the scorer — stream match → the existing boost factor; stream mismatch for
   a role with a non-open streamRelevance → a MILD demotion factor (e.g. 0.9, tunable via
   AssessmentScoringConfig; NOT the 0.35 conditional crush — mismatch is a nudge, not a
   contradiction). Keep educationStreamBoosts working or migrate it cleanly — no dead data.
3. If the user has no stream (no dropdown pick, unparseable degree), streamRelevance must
   have ZERO effect.

## TASK 2 — Symmetric min-side (underqualification) rule
typicalEducationBand.min is stored but unused. Mirror the existing max-side rule in
evaluateEligibility: if the person's education level is TWO OR MORE steps BELOW the role's
band minimum, status 'conditional' with a new bilingual reason ("This role typically asks
for more formal education; your practical evidence matters more here." + Hindi, following
existing reason patterns). Same escape hatch: never applied to the finalist-selected role.
A 12th-pass user (level 'secondary') must get a coherent top-3 of genuinely-open roles.

## TASK 3 — Three-shelf results presentation
On src/app/results/page.tsx, group the ranked list into three labeled shelves (EN + HI,
mobile-first, no horizontal scroll):
  1. "Strong fits for your background" — top roles that are stream-relevant AND
     level-coherent (no conditional credential/education reasons).
  2. "Also open to you" — remaining non-conditional roles currently shown.
  3. "Shown on request" — credential/education-demoted roles, collapsed behind a toggle,
     each with its caveat visible when expanded.
The top-3 cards and everything downstream (selection, share card, D1 CTAs, feedback) must
keep working unchanged — shelves are presentation over the same ranked data, not a new
ranking. If the current results page only renders 3 cards, extend it to render the shelved
list below the top-3 without disturbing the top-3 experience.

## TASK 4 — Tests
1. Benchmark personas: extend the harness with a 12th-pass persona (service-leaning answers
   → top-3 all reachable-band roles) and a B.Com-vs-B.Tech pair with IDENTICAL answers
   whose top-3 differ through streamRelevance alone (this is the acceptance test for
   "distinct lists per degree").
2. fast-check invariants: (a) no streamRelevance or min-side demotion ever removes a role
   from the full ranking; (b) a person with null stream and null level gets byte-identical
   rankings to the pre-change scorer given the same config (feature is inert without
   signal); (c) finalist choice is never demoted by either new rule.
3. One e2e in e2e/product-lock.spec.ts (existing helpers + syntheticClientIp): a 12th-pass
   persona completes the journey and the results page shows the three shelves with the
   demoted shelf collapsed. Both projects.

## Version, gates, deliverable
Bump scoringVersion → evidence-hybrid-v7; regenerate and commit BENCHMARK_RESULTS.json;
existing persona metrics must not regress and reachability must stay exactly equal.
Run all four gates. Write algo-validation/CURATION_PHASE1_REPORT.md (files changed per
task, benchmark before/after table + diff, the B.Com/B.Tech divergence demonstration,
deviations with reasons, gate outputs). Leave the branch local. DO NOT push.
```

**→ STOP. Mridul returns for validation ("validate curation phase 1") before Phase 2.**

---

## PHASE 2 — Reachability repair (the 5 unreachable + 10 gated roles)

```
You are a senior engineer on "Job Readiness Coach". Read CLAUDE.md first — especially
rule 5 (benchmark + fast-check invariants gate all scoring changes). Work on branch
`feat/curation-phase2` off main (after Phase 1 merged). Never push, never merge.

PROBLEM: algo-validation/BENCHMARK_RESULTS.json reports 41 roles but only 36 reachable at
top-1 on any witness path, and 10 gated. Before the catalog grows (Phase 3), the existing
foundation must not leak: a role that can never be recommended is dead weight and every
new role risks the same fate.

## STEP 1 — Analysis only, change nothing
Run `npm run benchmark:algorithm` and `npm run catalog:report`. Identify exactly which 5
roles are top-1 unreachable and why — for each, classify: (a) no question/answer path
produces a matching vector, (b) a hard gate (eligibleStreams / minEnglishLevel /
requiredCerts) no benchmark persona can pass, or (c) always outscored by a sibling on
every possible path. Do the same review for the 10 gated roles: is each gate intentional
product policy or an accident? Write algo-validation/REACHABILITY_ANALYSIS.md with a
per-role verdict and recommendation: fix the witness path (data change), adjust question
mapping, or explicitly accept the role as adjacent-only (a product decision).

## STEP 2 — STOP for approval
Stop after the analysis. Mridul reviews the document and approves fixes per role.

## STEP 3 — Apply approved fixes only
One role per commit; re-run benchmark + invariants each time; commit the updated
BENCHMARK_RESULTS.json alongside each change. NEVER adjust global weights or scoring
formulas to force reachability — data, vectors, and question mappings only.
Target: every non-accepted role reachable at top-1 on at least one witness path.
Gates + algo-validation/CURATION_PHASE2_REPORT.md as in Phase 1. DO NOT push.
```

**→ STOP. Validation ("validate curation phase 2") before Phase 3.**

---

## PHASE 3 — India-wide catalog expansion (NCO-2015-guided)

```
You are a senior engineer + labour-market researcher on "Job Readiness Coach". Read
CLAUDE.md first. Work on branch `feat/curation-phase3` off main (after Phase 2 merged).
Never push, never merge.

GOAL: the catalog should cover the realistic Indian entry-level job market across every
education tier, not just the current 41 roles. Expansion is research-first and
founder-approved before any implementation.

## STEP 1 — Research + proposal (no code)
1. Study the existing catalog structure (src/data/roles.seed.json,
   src/data/role-candidates.seed.json): every role carries name/summary EN+HI, cluster,
   preference vector, typicalEducationBand, streamRelevance (Phase 1), hard filters,
   canonical path, salary copy.
2. Map the current 41 roles to NCO-2015 (India's National Classification of Occupations)
   division/group codes. Record the mapping in the proposal.
3. Identify coverage gaps against the Indian entry-level market, tier by tier:
   - Non-graduate (10th/12th): service, retail, field, delivery, security, BPO voice...
   - Diploma/ITI: technician trades, lab assistant, paramedical support, draughtsman...
   - Graduate by stream: incl. the missing healthcare-ops cluster (clinic coordinator,
     medical records, pharmacy assistant), hospitality management trainee, banking ops...
   - Postgraduate/professional: the thin end — coherent options for MBA/M.Com/LLB/MBBS
     (e.g. healthcare operations coordinator, paralegal, audit assistant).
4. Write algo-validation/ROLE_EXPANSION_PROPOSAL.md: per proposed role — NCO code, tier
   band, streamRelevance, cluster, one-line demand rationale (city-tier aware), and
   whether it needs new branch/finalist question surface. Propose a target catalog size
   with reasoning (expect roughly 60–75 total; justify your number). Rank proposals by
   expected demand so partial approval is easy.

## STEP 2 — STOP for approval
Mridul approves the role list (possibly a subset). Which roles exist is a product
decision, not an engineering one.

## STEP 3 — Implement approved roles in batches of ~5
Per batch: full role data EN+HI (have Hindi copy follow the existing localization
patterns), vectors, bands, streamRelevance, hard filters, question-surface updates where
approved, at least one benchmark persona per new role proving top-1 reachability on a
witness path, invariants green, benchmark artifact regenerated and committed per batch.
The finalist question must scale: verify the results/finalist UI stays usable on mobile
as role count grows (this is a UI acceptance criterion, not just data).
Bump scoringVersion once at the end (→ evidence-hybrid-v8). Full gates +
algo-validation/CURATION_PHASE3_REPORT.md. DO NOT push.
```

**→ Final validation ("validate curation phase 3"), merge, full-suite lock, launch.**

---

## Sequencing notes (for Mridul)

- Phases must merge in order — Phase 2's analysis is meaningless before Phase 1's scoring
  changes land, and Phase 3 builds on both.
- Realistic wall-clock: Phase 1 ≈ 2–3 days, Phase 2 ≈ 1–2 days, Phase 3 ≈ 1–2 weeks
  depending on how many proposed roles you approve. The Phase 3 STEP 1 research can start
  in a separate session while Phase 1 validation is underway — it touches no code.
- Every phase ends in a locally-committed branch + report. The validation handshake stays
  the same as credential coherence: fresh benchmark re-run, invariant checks, live
  browser persona pass, then merge.
