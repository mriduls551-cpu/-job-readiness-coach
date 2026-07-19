# Credential Coherence — Codex Prompt (pre-launch items 1–3)

_Codex edition of `CREDENTIAL_COHERENCE_PROMPT.md` (same scope, same gates)._
_Paste everything inside the code fence into a fresh Codex session as one task._
_When it finishes, bring the branch + report back for validation before anything merges._

Codex-specific notes (outside the prompt, for you):
- Run Codex from the repo root (`nextjs-migration/`) with workspace-write access and network
  enabled for `npm`/Playwright.
- The full e2e gate needs a dev server on port 3000; the Playwright config starts one
  automatically and reuses an existing one. If your Codex approval mode blocks long-lived
  processes, approve that single `npm run dev` spawn when asked.

```
You are a senior engineer on "Job Readiness Coach", a Next.js 15 (App Router) + TypeScript app
in this repo. India-first, bilingual EN/HI, mobile-first. You are implementing the
"credential coherence" feature: the deterministic engine must never headline a role that is
obviously incoherent with the user's education (e.g. an MBBS graduate shown Data Entry as #1),
WITHOUT hard-blocking any role — demote and explain, never hide.

## SHARED CONTEXT (read before touching anything)
- This repo has no AGENTS.md. The project memory and binding rules live in CLAUDE.md at the
  repo root — read it FIRST and treat it as authoritative. Rules that bind this task:
  - Rule 1: the deterministic engine decides; AI/LLM never makes eligibility or ranking calls.
  - Rule 3: every user-facing string ships in English AND Hindi, following existing copy patterns.
  - Rule 5: ANY scoring/algorithm change requires `npm run benchmark:algorithm` re-run and the
    fast-check invariant tests staying green. This task IS a scoring change.
- Quality gate for every commit: `npm run type-check && npm test`.
- Work on a NEW branch `feat/credential-coherence` off current main. Commit per task with clear
  messages (never "update"). DO NOT push and DO NOT merge to main — the branch gets validated
  first by another reviewer.
- Environment is Windows. Prefer npm scripts over raw shell where possible; do not assume a
  POSIX shell for anything you script.
- The e2e gate expects a dev server on http://localhost:3000. playwright.config.ts starts
  `npm run dev` itself (reuseExistingServer: true). If you start one manually, do not leave
  stray pid/job files tracked — codex-dev-server.* patterns are already gitignored.
- READ these files before designing anything (verify every assumption against them; the code
  wins over this prompt wherever they disagree):
  - src/lib/matcher/scorer.ts        — production scorer (evidence-hybrid-v5): scoreRole,
    evaluateEligibility (returns status/adjustment/reasons), and scoreEvidence, where roles
    with eligibility === 'conditional' are already demoted below non-contradictory ones.
    Your feature should REUSE this demotion mechanism, not invent a parallel one.
  - src/lib/matcher/types.ts, src/lib/matcher/catalog.ts, src/data/roles.seed.json — role
    policy shape and catalog data (41 roles, scoringVersion "evidence-hybrid-v5").
  - src/lib/assessment-engine.ts     — builds the person evidence from responses + profile
    (educationStream, degreeName); note how the finalist question (direct role preference)
    flows into scoring.
  - src/app/career-fit-check/page.tsx — where degreeName (free text) and educationStream
    (dropdown: commerce/management/arts-humanities/science/healthcare/law/open) are collected.
  - src/lib/__tests__/assessment-benchmark.test.ts and src/lib/__tests__/*property*.test.ts —
    the benchmark and invariant harnesses you must extend and keep green.
  - e2e/product-lock.spec.ts and e2e/synthetic-client-ip.ts — e2e conventions to follow
    (including the synthetic x-forwarded-for pattern that keeps the auth rate limiter happy).

## DESIGN PRINCIPLES (these resolve every judgment call)
1. Demotion, not exclusion. A credential-incoherent role may still appear, ranked lower, with
   an honest reason. Zero roles become unreachable because of this feature.
2. The user's explicit choices beat inference:
   - If the user picked an educationStream in the dropdown, it wins over anything parsed from
     the degree text. The parser only fills gaps.
   - If the user directly selected a role in the finalist question, credential suppression
     must NOT demote that role — respect the stated preference and let the rationale carry
     the caveat instead.
3. Everything is catalog DATA + deterministic code. No LLM anywhere in this path.
4. Do not use education signals to penalise *under*-qualification beyond what the catalog's
   existing gates already do. This feature only addresses the overqualification-embarrassment
   case (professional degree → low-skill clerical role headlined).

## TASK 1 — Degree parser
Create `src/lib/matcher/degree-parser.ts`:
- `parseDegree(degreeName: string): { stream: EducationStream | null; level: EducationLevel | null }`
- `EducationLevel`: ordered union, e.g. 'secondary' | 'diploma' | 'undergraduate' |
  'postgraduate' | 'professional'. Export the ordering (needed by Task 2).
- Keyword map covering common Indian degrees, at minimum: 10th/12th, ITI, Diploma, BA, B.Com,
  BBA, B.Sc, BCA, B.Tech/BE, MBBS, BDS, BAMS, B.Pharm, Nursing/GNM/ANM, LLB, CA/CS/CMA, MA,
  M.Com, MBA/PGDM, M.Sc, MCA, M.Tech, MD/MS, LLM, PhD. Professional = MBBS/BDS/LLB/CA-family
  and their PG variants.
- Matching must be case/punctuation tolerant ("b com", "B.Com (Hons)", "btech", "M.B.B.S")
  and must handle common Hindi-script degree words (e.g. बीकॉम, एमबीबीएस) — check how
  normalizeHindiCopy or existing Hindi handling works before inventing your own.
- Unknown or empty input → { stream: null, level: null }. NEVER guess.
- Unit tests: happy paths, punctuation/case variants, Hindi variants, ambiguous strings that
  must return null, and the precedence rule (explicit dropdown stream beats parsed stream).

## TASK 2 — Credential-coherence rules (catalog data + eligibility)
1. Extend the role policy (types + roles.seed.json) with a `typicalEducationBand` field per
   role: the min and max EducationLevel the role typically hires at. Populate all 41 roles
   with sensible Indian-market values (e.g. data entry: secondary→undergraduate; accounting
   assistant: undergraduate→postgraduate; legal-compliance: undergraduate(law)→professional).
   Keep this reviewable: one clearly formatted commit that touches only catalog data.
2. In `evaluateEligibility` (src/lib/matcher/scorer.ts), add a coherence check: if the
   person's education level is TWO OR MORE steps above the role's band maximum, return
   status 'conditional' with a new reason (EN + HI copy following existing reason patterns,
   e.g. "This role typically hires below your education level; shown only because of your
   answers."). The existing conditional demotion in scoreEvidence then handles ranking.
   - Escape hatch (design principle 2): skip the demotion when the finalist answer directly
     selected this role. Verify how direct preference reaches the scorer before wiring this.
   - Person education level source: explicit stream/level where collected; else parseDegree.
3. Bump `scoringVersion` in roles.seed.json (evidence-hybrid-v5 → evidence-hybrid-v6) and
   regenerate the benchmark artifact via `npm run benchmark:algorithm`. Commit the updated
   algo-validation/BENCHMARK_RESULTS.json WITH this change and report every metric delta.
   Existing persona metrics must not regress (top-1/top-3 rates stay equal or better;
   role reachability must stay exactly equal — see principle 1).

## TASK 3 — Adversarial personas + e2e lock
1. Benchmark personas: add at least three to the benchmark harness —
   - MBBS grad whose answers lean desk-ops → data-entry-class roles must NOT be in top-3;
     a healthcare-coherent role should lead.
   - LLB grad, compliance-leaning answers → legal/compliance leads; clerical roles demoted.
   - B.Tech grad, analytical answers → analyst-class roles lead (control persona: bands must
     not distort an already-coherent match).
2. Property/invariant test (fast-check, alongside the existing invariant suite): for any
   generated response set, (a) every role still appears somewhere in the full ranking —
   demotion never removes roles; (b) a persona with level 'professional' never has a role
   whose band max is 'secondary' or 'diploma' in the top-3 UNLESS it was the finalist choice.
3. One e2e test appended to e2e/product-lock.spec.ts (follow its existing helpers and the
   syntheticClientIp pattern): complete the fit check with degree "MBBS", stream Healthcare,
   desk-ops-leaning answers, register, land on results, assert no data-entry-class role
   appears among the three role cards. Run it on chromium AND "Mobile Chrome" projects.

## ACCEPTANCE GATES (all must pass before you write the report)
1. `npm run type-check` — clean.
2. `npm test` — entire unit suite green (currently 25 suites; you will add more).
3. `npm run benchmark:algorithm` — green, artifact regenerated, no regression, reachability
   unchanged (all 41 roles still reachable in the full ranking).
4. `npx playwright test --workers=2` — full e2e suite green including your new test.
   (Do not raise workers above 2: the dev-mode server produces phantom timeouts under load.)

## DELIVERABLE — validation report
Write `algo-validation/CREDENTIAL_COHERENCE_REPORT.md` containing:
- Files changed (grouped by task) with one-line rationale each.
- The full before/after benchmark metric table and the exact BENCHMARK_RESULTS.json diff.
- The three persona outcomes (top-3 before vs after, with scores).
- Every design deviation from this prompt and why (deviations are fine; silent ones are not).
- Anything you found in the code that contradicts this prompt's assumptions.
- Output of all four acceptance gates (copy the summary lines).
Leave the branch `feat/credential-coherence` committed locally. DO NOT push, DO NOT merge.
```

---

## After Codex finishes (for Mridul)

Come back with the branch in place and say "validate credential coherence". Validation will
check, in order: the report's benchmark deltas against a fresh re-run, reachability of all 41
roles, the escape-hatch behavior (finalist choice beats suppression), Hindi copy on the new
eligibility reason, and a live browser pass with an MBBS persona — then we merge to main.
