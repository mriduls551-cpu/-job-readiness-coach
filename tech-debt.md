# Tech Debt Audit — Job Startup Next.js App
_Refreshed: 2026-07-18 (supersedes 2026-06-16 audit; previous saved as `tech-debt.prev-2026-06-16.bak`)_

Priority score = (Impact + Risk) × (6 − Effort), each axis 1–5 (Effort inverted).
All counts below re-verified against the working tree on 2026-07-18 (branch `main`).

## Update — 2026-07-18

Progress since 2026-06-16 (verified in code, not from memory):

- ✅ **TD-01 resolved (better than planned)** — `getDB()` now **hard-fails** without Supabase unless
  in-memory mode is explicitly allowed (`isInMemoryPersistenceAllowed()`, `db.ts:2004`). The
  persistence illusion is gone.
- ✅ **TD-10 acute phase resolved** — no `.fuse_hidden*`, `*.log`, or root debug scripts tracked in
  git anymore (`scripts/qa-journey.mjs` remains, but in `scripts/` as the fix prescribed). However
  the *work-loss theme* has returned in a new form → see **TD-14**.
- ✅ **TD-11 resolved** — tracked corruption/log/debug artifacts are cleaned up.
- ✅ **TD-05 materially improved** — route tests went **0 → 6 suites** (auth, fit-check, waitlist,
  shares, analytics events, admin stats). ~19 of 26 routes still untested; kept open at lower score.
- ✅ **Sprint 0 items landed** — fit-check double-submit guard is in (`isSubmitting`,
  `career-fit-check/page.tsx:39,264`); assessment feedback is user-scoped
  (`resolveRequestUserId` in `api/assessment/feedback/route.ts`).
- ⚠️ **TD-02 improved but open** — `ENABLE_LOCAL_AUTH` override + prod guard + `/api/health`
  surfacing exist, but the **default is still enabled for every non-production env**
  (`auth-mode.ts:12`). Still opt-out, not opt-in.
- ⚠️ **TD-07 / TD-08 worsened** — `assessment-engine.ts` 2,079 → **2,189** lines;
  `db.ts` 1,289 → **1,807** lines.
- ❌ **TD-03 still open** — no `getClientIp()` helper exists; `x-forwarded-for` parsing remains
  copy-pasted across **6 non-test sites** (fit-check, agent/chat, login, register, middleware,
  rate-limiter).
- ❌ **TD-04 unchanged** — **11** explicit `any` across 5 files (rate-limiter ×4, client-session ×3,
  logger ×2, career-fit-check ×1, dashboard ×1).
- ⚠️ **TD-12 grew** — raw `console.*` calls 9 → **13** (7 real offenders outside `logger.ts`:
  admin pages ×6, mock-auth ×1).
- 🆕 **Three new items:** TD-14 (squash-merge work loss), TD-15 (CLAUDE.md/doc drift),
  TD-17 (LLM-share sanitizer corrupts documents).

**Current top open items:** TD-14 (40) · TD-15 (30) · TD-18 (25) · TD-03 (25) · TD-02 (25) ·
TD-05 (24) · TD-07 (21) · TD-04 (20) · TD-06 (20) · TD-17 (16) · TD-08 (15) · TD-12 (10).

---

## Prioritised Backlog

### 🔴 Critical

#### TD-14 · Git workflow is losing landed work via squash merges _(NEW)_
**Category:** Infrastructure / Process  **Score: 40** · Impact 5 · Risk 5 · Effort 2
Two of the last five commits on `main` are **recoveries of previously-landed work**:
`cf07169 "fix: restore anonymous fit check with persisted draft (lost in squash merge)"` and
`b828a6c "feat: re-land server-authoritative scoring experiments (lost in squash merge)"`.
This is the June truncation incident's successor: the mechanism changed (git process instead of a
FUSE mount) but the outcome is the same — shipped work silently disappears and must be noticed and
re-landed by hand. The repo also lives at a path containing `"- Copy\New folder\"`, suggesting
manual copy-based backups of the working clone, which multiplies the chance of merging from a stale
copy.

**Risk if left:** Features regress in production without anyone deciding to remove them; the two
recoveries we caught imply others may not have been caught.

**Fix (Effort 2 — ~half day):**
1. After any squash merge, run `git diff <feature-branch> main -- .` **before deleting the branch**;
   an empty diff is the merge-complete proof. Add this to WORKFLOW.md's "ship" definition.
2. Pick one canonical clone; retire the copy-directories (or clearly mark them read-only archives).
3. Add a lightweight smoke e2e (`npm run test:e2e`) to the post-merge checklist so a lost feature
   fails loudly.

### 🟠 High

#### TD-15 · CLAUDE.md and project docs have drifted from reality _(NEW)_
**Category:** Documentation  **Score: 30** · Impact 3 · Risk 3 · Effort 1
CLAUDE.md is loaded into every agent session, so drift here propagates into every future work
session. Verified stale claims: Sprint 0 points at `docs/code-review/2026-06-30-action-items.md`
— **the `docs/code-review/` directory does not exist** (and two of the three Sprint 0 items are
already implemented); "active branch" names a feature branch but work now happens on `main`;
"15 suites / 168 tests" vs 23 test files on disk today. `algo-validation/ALGORITHM_IMPROVEMENT_PLAN.md`
similarly plans work that is already implemented (see the 2026-07-18 review of that document).

**Risk if left:** Contributors and agents re-plan or re-build landed work, or act on pointers to
files that no longer exist — directly violating the project's own rule #2.

**Fix (Effort 1 — ~1 hour):** Update CLAUDE.md's "Current state" block (branch, Sprint 0 status,
test counts, engine version `evidence-hybrid-v5`); either restore `docs/code-review/` from git
history or delete the reference; mark superseded sections of ALGORITHM_IMPROVEMENT_PLAN.md.

#### TD-18 · Uncommitted work sitting on `main` (11 paths) _(NEW)_
**Category:** Process  **Score: 25** · Impact 2 · Risk 3 · Effort 1
The working tree has 6 modified files (incl. `package.json`, `career-fit-check/page.tsx`,
`BENCHMARK_RESULTS.json`) and 5 untracked paths (incl. a new test suite
`ProductEntryPoints.test.tsx` and `scripts/create-llm-share.ps1`) with no branch and no commit.
Given TD-14's history, uncommitted work is the highest-risk place for work to exist in this repo.

**Fix (Effort 1):** Triage each path: commit what's intentional (per WORKFLOW.md "ship"), discard
what isn't. Nothing should sit unstaged on `main` across sessions.

#### TD-03 · Client-IP extraction copy-pasted across 6 sites _(still open, third audit in a row)_
**Category:** Code  **Score: 25** · Impact 2 · Risk 3 · Effort 1
Still no `getClientIp()` helper. `x-forwarded-for` parsing appears in `api/assessment/fit-check`,
`api/agent/chat`, `api/auth/login`, `api/auth/register`, `api/middleware.ts`, and
`lib/rate-limiter.ts` (×2). Divergent comma-splitting means the rate-limit key is inconsistent
across endpoints. This has survived two audits; either do the 2-hour fix or explicitly won't-fix it.

#### TD-02 · Local auth still default-on in every non-prod env _(improved, one change left)_
**Category:** Architecture  **Score: 25** · Impact 2 · Risk 3 · Effort 1
The guard rails landed (env override, prod check in `mock-auth.ts:37`, health surfacing). The one
remaining gap: `auth-mode.ts:12` returns `true` whenever `NODE_ENV !== 'production'`, so preview
deployments still advertise real-looking auth backed by wipeable storage unless someone remembers
to set `ENABLE_LOCAL_AUTH=false`. Flip the default (`return override === 'true'` semantics: opt-in),
and set it in `.env.local` for dev.

#### TD-05 · 19 of 26 API routes still untested _(improved: was 22 of 22)_
**Category:** Test  **Score: 24** · Impact 4 · Risk 4 · Effort 3
Route tests now exist for auth, fit-check, waitlist, shares, analytics events, and admin stats —
real progress. Still zero tests for: `applications`, `plan`, `dashboard`, `profile`, `resumes`,
`resume/download`, `agent/chat`, `agent/context`, `assessment/feedback`, `admin/users*`,
`admin/cron*`, `auth/logout`, `auth/session`, `health`. Keep the one-route-per-sprint cadence;
next up should be `assessment/feedback` (new, user-scoped, no test) and `applications`.

### 🟡 Medium

#### TD-07 · `assessment-engine.ts` God file _(worse: 2,189 lines)_
**Category:** Code / Architecture  **Score: 21** · Impact 4 · Risk 3 · Effort 3
Grew another 110 lines since June. Types + question data + scoring + Hindi localization table in one
file. The June truncation event and the July squash losses both show why: any corruption or bad
merge in this one file takes the whole engine with it. Split into
`assessment/{types,questions,scoring,localization,index}.ts` with a barrel re-export. Note the
matcher already lives separately (`src/lib/matcher/`) — finish the job.

#### TD-04 · `any` in core libraries _(unchanged: 11)_
**Category:** Code  **Score: 20** · Impact 2 · Risk 2 · Effort 1
`rate-limiter.ts` (4), `client-session.ts` (3), `logger.ts` (2, arguably legitimate),
`career-fit-check/page.tsx` (1), `dashboard/page.tsx` (1). Replace with real types; ~3 hours.

#### TD-06 · Dependencies unpinned _(partially improved)_
**Category:** Dependency  **Score: 20** · Impact 2 · Risk 2 · Effort 1
`next` is now `^15.5.18` (current major — good), but everything remains caret-ranged and there's
still no Renovate/Dependabot. A clean CI install can drift. Pin exact versions for `next`, `react`,
`zod`, `@supabase/supabase-js`; add automated update PRs.

#### TD-17 · LLM-share sanitizer corrupts technical identifiers _(NEW)_
**Category:** Documentation / Tooling  **Score: 16** · Impact 2 · Risk 2 · Effort 2
`scripts/create-llm-share.ps1` (untracked) PII-scrubs documents before external LLM use, but it
over-redacts: `algo-validation/ALGORITHM_IMPROVEMENT_PLAN.md` came back with question IDs replaced
by `[ADDRESS]` and persona names by `[PERSON_NAME]`, plus at least one silently altered quote —
making parts of the document unimplementable and its evidence untrustworthy. Fix the scrubber's
patterns (question IDs like `r3`/`b2` are not addresses), add an allowlist for code identifiers,
and track the script in git.

#### TD-08 · `db.ts` dual-implementation file _(worse: 1,807 lines)_
**Category:** Architecture  **Score: 15** · Impact 3 · Risk 2 · Effort 3
Grew ~500 lines since June. `InMemoryDB` + `SupabaseDB` + mappers + factory in one module. Split
into `db/{types,mappers,memory,supabase,index}.ts`.

### 🟢 Low

#### TD-12 · `console.*` instead of the logger _(grew: 7 real offenders)_
**Category:** Code  **Score: 10** · Impact 1 · Risk 1 · Effort 1
Outside `logger.ts` itself: admin pages (6), `mock-auth.ts` (1). One-hour cleanup.

#### TD-16 · 5 of 41 catalog roles unreachable at top-1 _(NEW, borderline product debt)_
**Category:** Code / Data  **Score: 12** · Impact 2 · Risk 2 · Effort 3
`BENCHMARK_RESULTS.json` (2026-07-16): 41 roles, only 36 reachable in top-1 on any witness path,
10 gated. Either the unreachable roles need witness paths (question/vector fixes) or they should be
"adjacent list only" per the roadmap. Requires benchmark + invariant tests per project rule #5.

---

## Resolved this cycle
| ID | Item | How verified |
|----|------|--------------|
| TD-01 | InMemoryDB persistence illusion | `getDB()` throws without explicit in-memory opt-in (`db.ts:2004`) |
| TD-10 | FUSE truncation (acute) | No corruption artifacts tracked; type-check clean; succeeded by TD-14 |
| TD-11 | Junk files in git | `git ls-files` clean of `.fuse_hidden*`/logs/debug scripts |
| — | Sprint 0: double-submit guard | `isSubmitting` gate in `career-fit-check/page.tsx` |
| — | Sprint 0: feedback user-scoping | `resolveRequestUserId` + 401 in `api/assessment/feedback/route.ts` |

---

## Phased Remediation Plan
All phases run alongside feature work — no freeze required.

### Phase 0 — Stop losing work (this week, ~half day)
| Item | Est. |
|------|------|
| TD-18: Triage + commit/discard the 11 uncommitted paths on `main` | 1h |
| TD-14: Add squash-merge verification step to WORKFLOW.md; pick canonical clone | 2h |
| TD-15: Refresh CLAUDE.md current-state block; fix dead doc pointers | 1h |

### Phase 1 — Quick wins (1 sprint, ~1 day total)
| Item | Est. |
|------|------|
| TD-03: Extract `getClientIp()` into `request-user.ts`; dedupe 6 sites | 2h |
| TD-02: Flip local-auth default to opt-in | 1h |
| TD-04: Replace 11 `any` | 3h |
| TD-06: Pin next/react/zod/supabase; add Renovate | 1h |
| TD-12: Route 7 `console.*` through logger | 1h |

### Phase 2 — Structural (2–3 sprints, 1 ticket/sprint)
| Item | Est. |
|------|------|
| TD-07: Split `assessment-engine.ts` into modules | 2d |
| TD-08: Split `db.ts` into modules | 1.5d |
| TD-17: Fix LLM-share scrubber patterns; track script in git | 0.5d |

### Phase 3 — Ongoing
- TD-05: One route-test suite per sprint (`assessment/feedback` → `applications` → `plan` →
  `dashboard` → `agent/*` → `admin/*`).
- TD-16: Catalog reachability pass, gated on benchmark + invariant tests (rule #5).

---

## Summary Table
| ID | Item | Category | I | R | E | **Score** | Status |
|----|------|----------|---|---|---|-----------|--------|
| TD-14 | Squash merges losing landed work | Infrastructure | 5 | 5 | 2 | **40** | 🆕 open |
| TD-15 | CLAUDE.md / doc drift | Documentation | 3 | 3 | 1 | **30** | 🆕 open |
| TD-18 | Uncommitted work on `main` (11 paths) | Process | 2 | 3 | 1 | **25** | 🆕 open |
| TD-03 | Duplicate client-IP extraction (6×) | Code | 2 | 3 | 1 | **25** | open (3rd audit) |
| TD-02 | Local auth default-on in non-prod | Architecture | 2 | 3 | 1 | **25** | open (improved) |
| TD-05 | 19/26 API routes untested | Test | 4 | 4 | 3 | **24** | open (improved) |
| TD-07 | assessment-engine God file (2,189) | Code | 4 | 3 | 3 | **21** | open (worse) |
| TD-04 | `any` in core libs (11) | Code | 2 | 2 | 1 | **20** | open |
| TD-06 | Unpinned dependencies | Dependency | 2 | 2 | 1 | **20** | open (improved) |
| TD-17 | LLM-share scrubber corrupts docs | Documentation | 2 | 2 | 2 | **16** | 🆕 open |
| TD-08 | db.ts dual-implementation (1,807) | Architecture | 3 | 2 | 3 | **15** | open (worse) |
| TD-16 | 5/41 roles unreachable top-1 | Code/Data | 2 | 2 | 3 | **12** | 🆕 open |
| TD-12 | console.* vs logger (7) | Code | 1 | 1 | 1 | **10** | open (grew) |
| TD-01 | InMemoryDB persistence illusion | Architecture | — | — | — | — | ✅ resolved |
| TD-10 | FUSE truncation (acute) | Infrastructure | — | — | — | — | ✅ resolved → TD-14 |
| TD-11 | Junk files in git | Infrastructure | — | — | — | — | ✅ resolved |
