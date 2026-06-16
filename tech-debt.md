# Tech Debt Audit — Job Startup Next.js App
_Refreshed: 2026-06-16 (supersedes 2026-06-08 audit; previous saved as `tech-debt.prev-2026-06-08.bak`)_

Priority score = (Impact + Risk) × (6 − Effort), each axis 1–5 (Effort inverted).

## What changed since the last audit (8 days)
- 🔴 **A repo-wide file-truncation event occurred** — 26 source files (incl. `package.json`,
  `globals.css`, the assessment engine, most pages/routes) were silently truncated, breaking the
  build entirely. Recovered this session from git `HEAD`. **New items TD-10 and TD-11 capture the cause.**
- ✅ **One item fixed this session:** the assessment engine's branch `roleScores` were collected
  but never used in scoring (dead logic that broke within-cluster ranking). Now consumed; four
  scoring fixes applied and validated (see `algo-validation/`).
- ⚠️ **None of TD-01 … TD-09 from the previous audit were actioned.** All still open, re-verified
  against current code below. An audit nobody acts on is itself process debt.

---

## Prioritised Backlog

### 🔴 Critical

#### TD-10 · Dev environment is silently truncating files _(NEW)_
**Category:** Infrastructure  **Score: 40** · Impact 5 · Risk 5 · Effort 2
The working tree shows the hallmark of an interrupted file-sync / FUSE mount: **75 `.fuse_hidden*`
orphan inodes** scattered through `src/`, and 26 files were found cut off mid-line (a `package.json`
truncated at `"typescript":` with no value broke every build). This is not a one-off — the orphan
count shows it has happened repeatedly. Work and code are being lost silently.

**Risk if left:** Recurring broken builds, silent loss of uncommitted work, and (because the engine
was among the casualties) shipping a stale/partial algorithm without noticing.

**Fix (Effort 2 — ~half day):**
1. Commit the recovered clean state **now** so there's a known-good baseline.
2. Stop editing directly on the synced/FUSE mount; work on a local clone and push, or fix the sync
   client that's interrupting writes.
3. Add a pre-commit hook (`husky` + a 2-line check) that fails if any staged file fails
   `tsc --noEmit` or contains `.fuse_hidden`, so corruption can never be committed again.

#### TD-01 · `InMemoryDB` singleton gives false data-persistence confidence _(still open)_
**Category:** Architecture  **Score: 32** · Impact 4 · Risk 4 · Effort 2
`db.ts` still exports a module-level memory singleton (5 refs). On serverless/Vercel each cold start
wipes registered users, assessments, and plans silently. Fix unchanged: startup warning +
`/api/health` `persistence` field + docs that this is local-test-only.

#### TD-02 · `mock-auth.ts` wired into non-production paths by default _(still open)_
**Category:** Architecture / Code  **Score: 28** · Impact 3 · Risk 4 · Effort 2
`isLocalAuthEnabled()` (in `auth-mode.ts`, used by `mock-auth.ts`) still returns true for any
non-production env. Previews advertise real-looking auth that loses all state on deploy, and the
divergent `localStorage` session keys can create ghost sessions. Fix: require explicit
`ENABLE_DEV_AUTH=true`; move seed users to a Jest fixture; add startup env validation.

### 🟠 High

#### TD-11 · Corruption artifacts, logs & debug scripts are committed to git _(NEW)_
**Category:** Infrastructure / Documentation  **Score: 25** · Impact 2 · Risk 3 · Effort 1
`git ls-files` currently tracks **75 `.fuse_hidden*` files, 7 `*.log` files, and 8 root debug
scripts** (`diagnose*.ts`, `smoke-test*`, `qa-journey.mjs`). `.gitignore` covers none of these
patterns (it lists two specific log filenames only). Result: repo bloat, noisy diffs, and
corruption junk shipped to every clone.

**Fix (Effort 1 — ~1 hour):**
1. Add to `.gitignore`: `.fuse_hidden*`, `*.log`, `/diagnose*.ts`, `/smoke-test*`, `qa-journey.mjs`.
2. `git rm --cached` all 90 currently-tracked offenders.
3. Move any debug script still useful into `scripts/`; delete the rest.

#### TD-03 · Client-IP extraction copy-pasted across 7 sites _(still open, grew)_
**Category:** Code  **Score: 25** · Impact 2 · Risk 3 · Effort 1
`x-forwarded-for` parsing now appears in **7** locations (was 5+); no `getClientIp()` helper exists.
They disagree on comma-splitting, so the rate-limit key is inconsistent. Fix: one `getClientIp()`
in `request-user.ts`, dedupe all sites.

#### TD-04 · `any` in core libraries _(still open)_
**Category:** Code  **Score: 25** · Impact 2 · Risk 3 · Effort 1
**11** explicit `any` uses remain in `src` (rate-limiter public API, `client-session` resumeDraft,
`dashboard` assessment state). Replace with the real types (`ResumeDraft`, `AssessmentRecord`,
typed request union).

#### TD-05 · Zero tests on 22 API route handlers _(still open, count up)_
**Category:** Test  **Score: 20** · Impact 5 · Risk 5 · Effort 4
Now **22** routes, still **0** route tests (only 2 lib unit tests + 2 e2e specs exist). Auth,
fit-check, and plan paths can regress silently. Add handler tests with mocked `db`/`supabase`,
auth + fit-check first.

#### TD-06 · `next` version unpinned (`^14.0.0`) _(still open)_
**Category:** Dependency  **Score: 20** · Impact 2 · Risk 2 · Effort 1
Still `^14.0.0`; a clean CI install can drift across all 14.x. Pin exact (`14.2.x`) and add
Renovate/Dependabot. (Same applies to the other `^` ranges — react, zod, supabase.)

### 🟡 Medium

#### TD-07 · `assessment-engine.ts` God file _(still open, now 2,079 lines)_
**Category:** Code / Architecture  **Score: 21** · Impact 4 · Risk 3 · Effort 3
Types + 12 role defs + all question data + scoring + helpers + a 478-line Hindi-localization table
in one file. Split into `assessment/{types,roles,questions,scoring,localization,index}.ts` with a
barrel re-export so existing imports keep working. (Doing this would also have contained the
truncation blast radius.)

#### TD-08 · `db.ts` dual-implementation file _(still open, 1,289 lines)_
**Category:** Architecture  **Score: 15** · Impact 3 · Risk 2 · Effort 3
`InMemoryDB` + `SupabaseDB` + 9 mappers + interface + factory in one module. Split into
`db/{types,mappers,memory,supabase,index}.ts`.

### 🟢 Low

#### TD-12 · `console.*` instead of the logger _(NEW, minor)_
**Category:** Code  **Score: 8** · Impact 1 · Risk 1 · Effort 1
A `logger.ts` exists but **9** raw `console.log/error/warn` calls remain in `src`. Route them
through the logger for consistent, controllable output.

#### TD-09 · Debug scripts in project root _(folded into TD-11)_
Superseded by TD-11 above.

---

## Phased Remediation Plan
All phases run alongside feature work — no freeze required.

### Phase 0 — Stop the bleeding (do this first, today)
| Item | Est. |
|------|------|
| TD-10: Commit recovered clean state; move off the corrupting mount; add pre-commit tsc guard | half day |
| TD-11: Fix `.gitignore`; `git rm --cached` the 90 tracked artifacts | 1h |

### Phase 1 — Quick wins (1 sprint, ~1 day total)
| Item | Est. |
|------|------|
| TD-03: Extract `getClientIp()` and dedupe 7 sites | 2h |
| TD-04: Replace 11 `any` in core libs | 3h |
| TD-06: Pin `next` (and other deps) + add Renovate | 1h |
| TD-01: InMemoryDB startup warning + `/api/health` persistence field | 2h |
| TD-12: Route `console.*` through logger | 1h |

### Phase 2 — Architecture cleanup (2–3 sprints, 1 ticket/sprint)
| Item | Est. |
|------|------|
| TD-02: Make dev-auth opt-in; strip mock-auth from prod paths | 2d |
| TD-07: Split `assessment-engine.ts` into modules | 2d |
| TD-08: Split `db.ts` into modules | 1.5d |

### Phase 3 — Test coverage (ongoing, 1 route/sprint)
auth → fit-check → applications → dashboard → plan/profile. Mock `db`/`supabase`; write tests as you
touch each route.

---

## Summary Table
| ID | Item | Category | I | R | E | **Score** | Status |
|----|------|----------|---|---|---|-----------|--------|
| TD-10 | Dev env truncating files | Infrastructure | 5 | 5 | 2 | **40** | 🆕 open |
| TD-01 | InMemoryDB persistence illusion | Architecture | 4 | 4 | 2 | **32** | open |
| TD-02 | mock-auth in non-prod paths | Architecture | 3 | 4 | 2 | **28** | open |
| TD-03 | Duplicate client-IP extraction (7×) | Code | 2 | 3 | 1 | **25** | open |
| TD-04 | `any` in core libs (11) | Code | 2 | 3 | 1 | **25** | open |
| TD-11 | Corruption/log/script files in git | Infrastructure | 2 | 3 | 1 | **25** | 🆕 open |
| TD-07 | assessment-engine God file (2,079) | Code | 4 | 3 | 3 | **21** | open |
| TD-05 | Zero API route tests (22 routes) | Test | 5 | 5 | 4 | **20** | open |
| TD-06 | Unpinned `next` | Dependency | 2 | 2 | 1 | **20** | open |
| TD-08 | db.ts dual-implementation (1,289) | Architecture | 3 | 2 | 3 | **15** | open |
| TD-12 | console.* vs logger (9) | Code | 1 | 1 | 1 | **8** | 🆕 open |
| — | Engine dead `roleScores` logic | Code | — | — | — | — | ✅ fixed this session |
