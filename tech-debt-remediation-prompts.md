# Tech-Debt Remediation — Prompt Pack for Cline
_Companion to `tech-debt.md` (2026-07-18 audit). One prompt per phase. Paste a phase's prompt
verbatim into a fresh Cline session. Run phases in order; do not start a phase until the previous
phase's commits are pushed._

**How to use:** Each prompt is self-contained (Cline starts with no memory of the audit). The
`SHARED CONTEXT` block is embedded at the top of every prompt — do not trim it. After each phase,
review the diff yourself before pushing.

---

## PROMPT 1 — Phase 0: Stop losing work (~half day)

```
You are a senior engineer working on "Job Readiness Coach", a Next.js 15 (App Router) + TypeScript
+ Supabase app in this repo. India-first, bilingual EN/HI, mobile-first.

## SHARED CONTEXT (read first)
- Read CLAUDE.md and tech-debt.md (2026-07-18 audit) before changing anything.
- Quality gate for EVERY commit: `npm run type-check && npm test` must pass (Jest unit suite).
- HARD RULES: never touch scoring logic in src/lib/assessment-engine.ts, src/lib/matcher/, or
  src/lib/roles/ in this phase. Never force-push. Never commit with message "update" — write
  clear, conventional messages. Commit each numbered task separately.
- Platform is Windows; the shell is PowerShell. Do not use bash-only syntax in commands.
- This phase is about PROCESS debt: the repo has lost landed work twice via squash merges
  (see commits cf07169 and b828a6c, both titled "... (lost in squash merge)").

## TASK 1 — TD-18: Triage the uncommitted working tree on main
`git status` currently shows ~6 modified files and ~5 untracked paths sitting on main with no
commit. For each path:
1. Run `git diff <path>` (or open untracked files) and summarize in one sentence what the change is.
2. Classify: (a) intentional work → commit, (b) generated artifact → gitignore, (c) unclear → STOP
   and ask me before touching it. Do NOT discard anything without asking.
Expected classifications (verify, don't assume):
- src/components/__tests__/ProductEntryPoints.test.tsx → new test suite, commit it (run it first).
- algo-validation/ALGORITHM_IMPROVEMENT_PLAN.md → documentation, commit it.
- scripts/create-llm-share.ps1 → tooling script, commit it (Phase 2 will fix its bugs).
- product-design-audit/2026-07-07-product-pass/ → audit artifacts; ask me whether to commit or ignore.
- .clineignore → commit it.
- Modified: package.json, src/app/career-fit-check/page.tsx, e2e/career-fit-check.spec.ts,
  src/components/auth/RegisterPageContent.tsx, src/components/home/HomeReferencePage.tsx,
  algo-validation/BENCHMARK_RESULTS.json → diff each; if they form one coherent feature, one
  commit; if not, ask me how to group them.
Acceptance: `git status` is clean (or only contains paths I explicitly told you to leave).

## TASK 2 — TD-14: Add merge-verification to WORKFLOW.md
Edit WORKFLOW.md. In the "ship" section, add a mandatory step for squash merges:
- Before deleting any feature branch after a squash merge, run
  `git diff <feature-branch> main -- .` and require an EMPTY diff as proof the merge is complete.
  If the diff is non-empty, the merge lost work — stop and re-land it.
- Add one sentence explaining WHY (two features were lost in squash merges in July 2026 and had
  to be recovered by hand: cf07169, b828a6c).
Also add a "post-merge smoke" line: run `npm run type-check && npm test` on main after merging.
Acceptance: WORKFLOW.md documents both steps; no other sections reworded.

## TASK 3 — TD-15: Refresh the stale "Current state" block in CLAUDE.md
Update ONLY the "Current state" section of CLAUDE.md (leave rules, stack, paths, commands alone):
- Active branch is `main` (the feature branch note is stale).
- Sprint 0 is DONE: the double-submit guard exists (isSubmitting in
  src/app/career-fit-check/page.tsx) and assessment feedback is user-scoped
  (src/app/api/assessment/feedback/route.ts). Remove the pointer to
  docs/code-review/2026-06-30-action-items.md — that directory no longer exists.
- Scoring engine version is `evidence-hybrid-v5` (see src/data/roles.seed.json and
  algo-validation/BENCHMARK_RESULTS.json).
- Update the test count: count test files with a glob of src/**/__tests__/* and e2e/*.spec.ts,
  run `npm test` once, and record the real current suite/test numbers.
- Update the "as of" date to today.
Acceptance: every claim in the Current state block is verifiable in the repo today.

## DELIVERABLE
A short report: what you committed (with hashes), what you changed in each doc, anything you
stopped on and why. Do not push — I will review and push.
```

---

## PROMPT 2 — Phase 1: Quick wins (~1 day, five independent commits)

```
You are a senior engineer working on "Job Readiness Coach", a Next.js 15 (App Router) + TypeScript
+ Supabase app in this repo. India-first, bilingual EN/HI, mobile-first.

## SHARED CONTEXT (read first)
- Read CLAUDE.md and tech-debt.md (2026-07-18 audit) before changing anything.
- Quality gate for EVERY commit: `npm run type-check && npm test` must pass.
- HARD RULES: do not change any scoring/ranking behavior (src/lib/assessment-engine.ts scoring
  functions, src/lib/matcher/, src/lib/roles/). Do not change API response shapes. Never
  force-push. One commit per task below, in this order, each gated on type-check + tests.
- Platform is Windows; shell is PowerShell.
- These are refactors and config changes. If any task turns out to require a behavior change you
  didn't expect, stop that task, report, and continue with the next one.

## TASK 1 — TD-03: Extract getClientIp() and dedupe 6 call sites
Currently `x-forwarded-for` parsing is copy-pasted (with inconsistent comma-splitting!) in:
  src/app/api/assessment/fit-check/route.ts
  src/app/api/agent/chat/route.ts
  src/app/api/auth/login/route.ts
  src/app/api/auth/register/route.ts
  src/app/api/middleware.ts
  src/lib/rate-limiter.ts (2 occurrences)
Steps:
1. Read all 6 files first and note the exact parsing differences (first-IP vs whole header, trim,
   fallback value).
2. Add ONE exported helper `getClientIp(request)` to src/lib/request-user.ts (this module already
   holds request-level helpers like resolveRequestUserId). Behavior: take the FIRST entry of
   x-forwarded-for, trimmed; fall back to x-real-ip; then to a stable literal like 'unknown'.
3. Replace all 6 sites with the helper. IMPORTANT: this may change the effective rate-limit key at
   sites that previously used the whole header — that is the intended bug-fix; note it in the
   commit message.
4. Add a unit test file for the helper (comma list, single IP, missing header, whitespace).
Commit: "refactor: single getClientIp() helper, dedupe 6 x-forwarded-for sites"

## TASK 2 — TD-02: Make local/mock auth opt-in instead of opt-out
File: src/lib/auth-mode.ts. Today isLocalAuthEnabled() returns true for ANY non-production env
unless ENABLE_LOCAL_AUTH=false. Flip to opt-in:
- New behavior: return true ONLY when process.env.ENABLE_LOCAL_AUTH === 'true'.
- Then fix the fallout: search the repo for everything that depends on local auth being on by
  default — at minimum .env.local / .env.example, scripts/validate-local-env.mjs, Playwright
  config/e2e setup, and jest setup. Set ENABLE_LOCAL_AUTH=true explicitly in local/dev/test
  environments so `npm run dev`, `npm test`, and `npm run test:e2e` still work.
- Update the comment in src/lib/mock-auth.ts if it describes the old default.
Acceptance: type-check + unit tests pass WITH the flag set in test env; grep confirms no code
path assumes the old default. Commit: "fix: local auth is now explicit opt-in (ENABLE_LOCAL_AUTH=true)"

## TASK 3 — TD-04: Remove the 11 explicit `any` usages
Locations (verify counts before editing):
  src/lib/rate-limiter.ts (4) — type the Redis/limiter values properly
  src/lib/client-session.ts (3) — use the real ResumeDraft / session types
  src/lib/logger.ts (2) — prefer `unknown` with narrowing; if a rest-args signature genuinely
    needs it, use `unknown[]`, not `any`
  src/app/career-fit-check/page.tsx (1)
  src/app/dashboard/page.tsx (1) — use the real assessment/record types from src/lib
Rule: no `as any`, no `: any` left in these files; do NOT weaken tsconfig to get there.
Commit: "refactor: replace 11 explicit any with real types"

## TASK 4 — TD-06: Pin key dependencies + add Renovate
1. In package.json, pin EXACT versions (remove ^) for: next, react, react-dom, zod,
   @supabase/supabase-js, eslint-config-next. Use the versions currently resolved in
   package-lock.json — do NOT upgrade anything in this task.
2. Run `npm install` so the lockfile stays consistent.
3. Add a minimal renovate.json (config:recommended, group minor/patch, weekly schedule).
Commit: "chore: pin core deps to lockfile versions, add renovate config"

## TASK 5 — TD-12: Route raw console.* through the logger
Offenders (excluding src/lib/logger.ts internals, which are the legitimate sink):
  src/app/admin/page.tsx (1), src/app/admin/email/page.tsx (2), src/app/admin/cron/page.tsx (3),
  src/lib/mock-auth.ts (1)
Replace with the existing logger from src/lib/logger.ts, matching severity (error→logger.error,
etc.). Do not change what is logged, only how.
Commit: "chore: route console.* through logger (7 sites)"

## DELIVERABLE
Report per task: what changed, test results, and any task you had to stop (with the reason).
Do not push — I will review and push.
```

---

## PROMPT 3 — Phase 2: Structural refactors (one task per session recommended)

_Run each TASK as its own Cline session/prompt if context gets tight; they are independent._

```
You are a senior engineer working on "Job Readiness Coach", a Next.js 15 (App Router) + TypeScript
+ Supabase app in this repo. India-first, bilingual EN/HI, mobile-first.

## SHARED CONTEXT (read first)
- Read CLAUDE.md and tech-debt.md (2026-07-18 audit) before changing anything.
- These are PURE MOVE refactors: zero behavior change is the acceptance criterion. If you find a
  bug while moving code, do NOT fix it inline — note it in your report.
- Quality gate per commit: `npm run type-check && npm test`. For Task 1 additionally run
  `npm run benchmark:algorithm` BEFORE starting and AFTER finishing; the two outputs (and
  algo-validation/BENCHMARK_RESULTS.json) must be identical. Any diff = you changed behavior =
  revert and retry.
- Never force-push. Platform is Windows; shell is PowerShell.

## TASK 1 — TD-07: Split assessment-engine.ts (≈2,200 lines) into modules
Target layout:
  src/lib/assessment/types.ts         — interfaces, type aliases, enums
  src/lib/assessment/questions.ts     — routing/branch/tie-breaker question data
  src/lib/assessment/localization.ts  — the Hindi localization table + normalizeHindiCopy helpers
  src/lib/assessment/scoring.ts       — scoreAssessment and all scoring/confidence helpers
  src/lib/assessment/index.ts         — barrel
  src/lib/assessment-engine.ts        — becomes a thin re-export of the barrel (KEEP this file so
                                        the existing `@/lib/assessment-engine` imports keep working;
                                        do not rewrite importers in this task)
Method: move code top-down in dependency order (types → questions → localization → scoring),
type-checking after each move. Preserve every exported name and signature exactly. Do not
reorder object keys anywhere (cluster/ROLE_ORDER iteration order is load-bearing — CLAUDE.md
rule 5 territory).
Commit: "refactor: split assessment-engine into src/lib/assessment/* modules (no behavior change)"

## TASK 2 — TD-08: Split db.ts (≈1,800 lines) into modules
Target layout:
  src/lib/db/types.ts      — ProductDB interface + row/record types
  src/lib/db/mappers.ts    — the row↔domain mapper functions
  src/lib/db/memory.ts     — InMemoryDB
  src/lib/db/supabase.ts   — SupabaseDB
  src/lib/db/index.ts      — getDB() factory + barrel
  src/lib/db.ts            — thin re-export (same reasoning as above)
Keep the globalThis singleton pattern and the isInMemoryPersistenceAllowed() guard EXACTLY as-is.
Commit: "refactor: split db.ts into src/lib/db/* modules (no behavior change)"

## TASK 3 — TD-17: Fix the LLM-share scrubber so it stops corrupting documents
File: scripts/create-llm-share.ps1. Known failure: it redacted technical identifiers in
algo-validation/ALGORITHM_IMPROVEMENT_PLAN.md — question IDs like "r3"/"b2"/"Q3" became
"[ADDRESS]" and persona names became "[PERSON_NAME]" even in code-context quotes, making the
document unusable.
1. Read the script and reproduce the failure on a COPY of a doc in the scratchpad (never run it
   over real repo files while testing).
2. Fix: (a) exempt inline code spans/fenced code blocks from redaction entirely; (b) add an
   allowlist for repo identifiers (question IDs r1-r5, rtb, b1-b4, file paths, function names);
   (c) the address pattern must not match 2-3 character alphanumeric tokens.
3. Add a self-test mode (a -Test switch with embedded before/after fixtures) so regressions are
   catchable.
4. Ensure the script is tracked in git.
Commit: "fix: LLM-share scrubber no longer redacts code identifiers; add self-test"

## DELIVERABLE
Report per task: file inventory before/after, proof of identical benchmark output (Task 1),
test results, and any bugs you noticed but deliberately did not fix. Do not push.
```

---

## PROMPT 4 — Phase 3 (ongoing): route-test template + catalog reachability

### 4a. Route-test prompt (reuse once per sprint, swapping the ROUTE line)

```
You are a senior engineer adding API route tests to "Job Readiness Coach" (Next.js 15 App Router,
TypeScript, Supabase). Read CLAUDE.md first. Quality gate: `npm run type-check && npm test`.

ROUTE THIS SPRINT: src/app/api/assessment/feedback/route.ts
(Next in queue for future runs: applications → plan → dashboard → profile → resumes →
agent/chat → agent/context → admin/users → admin/cron → auth/logout → auth/session → health)

1. Study the existing route-test patterns FIRST — src/app/api/assessment/__tests__/fit-check.test.ts
   and src/app/api/auth/__tests__/auth.test.ts show how this repo mocks getDB()/supabase, builds
   NextRequest objects, and asserts the success/error envelope from src/lib/api-response. Match
   those patterns exactly; do not invent a new harness.
2. Create __tests__/<route>.test.ts next to the route. Cover at minimum:
   - happy path (correct status + response shape)
   - auth: 401 when resolveRequestUserId yields no user (if the route requires auth)
   - validation: 400 with a malformed body (exercise the zod schema branches)
   - failure: DB layer throwing → the route's error status, not an unhandled rejection
   - anything route-specific you see in the handler (e.g. feedback: 404 when no completed
     assessment exists)
3. Do NOT modify the route handler to make it more testable in this task. If the handler has a
   real bug, write the test that documents current behavior, and report the bug separately.
Commit: "test: cover /api/assessment/feedback route handler". Do not push.
```

### 4b. Catalog reachability prompt (TD-16 — the only prompt allowed to touch scoring data)

```
You are a senior engineer on "Job Readiness Coach". Read CLAUDE.md — especially rule 5: ANY
scoring/algorithm change requires `npm run benchmark:algorithm` plus the fast-check invariant
tests in src/lib/__tests__/ staying green. This task touches role/question DATA, so that rule
applies in full.

PROBLEM: algo-validation/BENCHMARK_RESULTS.json (2026-07-16) reports 41 catalog roles but only 36
reachable at top-1 on any witness path, with 10 gated. 5 roles can never be a #1 recommendation.

1. INVESTIGATE FIRST, change nothing: run `npm run benchmark:algorithm` and
   `npm run catalog:report`. Identify exactly WHICH 5 roles are unreachable and WHY — for each,
   trace whether it's (a) no question/answer path produces a matching vector, (b) a hard gate
   (eligibleStreams/minEnglishLevel/requiredCerts in the role definition) that no persona can
   pass, or (c) the role is outscored by a sibling on every possible path.
2. Write your findings to algo-validation/REACHABILITY_ANALYSIS.md with a per-role verdict and a
   recommendation: fix the witness path (data change) OR demote the role to the adjacent-roles
   list (product decision — flag these for me, do not demote unilaterally).
3. STOP after the analysis and show me the document. Only after I approve specific fixes:
   apply them one role per commit, re-running the benchmark + invariant tests each time, and
   commit the updated BENCHMARK_RESULTS.json alongside each change so the audit trail is clean.
Never adjust global weights or scoring formulas to make a role reachable — data and gates only.
```

---

## Notes for the operator (you, not Cline)

- **Order matters:** Phase 0 first — committing the clean state before refactors is the whole
  point of TD-14/TD-18. Don't run Phase 2 with a dirty working tree.
- **Review gates:** every prompt ends with "do not push" deliberately; you review diffs and push
  per WORKFLOW.md ("pull before push").
- **Session hygiene:** Phase 2's tasks are the context-heaviest; give each its own fresh session.
- **If Cline reports a stopped task**, resolve the question and re-run just that task — the
  prompts are written so tasks are independently committable.
