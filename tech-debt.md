# Tech Debt Audit — Job Startup Next.js App
_Generated: 2026-06-08_

Priority score = (Impact + Risk) × (6 − Effort), where each axis is 1–5 (Effort inverted).

---

## Prioritised Backlog

### 🔴 Critical

---

#### TD-01 · `InMemoryDB` singleton gives false data-persistence confidence
**Category:** Architecture  **Score: 32** · Impact 4 · Risk 4 · Effort 2

`db.ts` exports a module-level `memoryInstance` singleton used whenever Supabase isn't configured. On Vercel and any serverless host, each cold start destroys the instance — registered users, assessments, and plans evaporate silently. Developers who test against the in-memory DB cannot trust that their flows work correctly in staging or production.

**Risk if left:** Silent data loss in any preview/staging env not connected to Supabase. Onboarding devs assume persistence they don't have.

**Fix (Effort 2 — ~1 day):**
1. Add a startup warning log whenever `InMemoryDB` is initialised in any environment: `logger.warn('⚠️  Using in-memory DB — data will not survive restart')`.
2. Add a `/api/health` response field `persistence: 'memory' | 'supabase' | 'unavailable'` so it's immediately observable.
3. Update `ALLOW_IN_MEMORY_DB` docs and README to explicitly state this is for local unit-test runs only, not for any shared or deployed environment.

---

#### TD-02 · `mock-auth.ts` is permanently wired into production code paths
**Category:** Architecture / Code  **Score: 28** · Impact 3 · Risk 4 · Effort 2

`isLocalAuthEnabled()` returns `true` whenever `NODE_ENV !== 'production'`. Any preview deployment (Vercel preview, staging branch) that lacks Supabase config silently falls through to `mock-auth`, which holds users in an in-memory dictionary keyed by email, stores sessions in `localStorage['auth-session']` (different key from `client-session.ts`'s `SESSION_KEY`), and resets on every server restart. There are also two password-reset methods (`resetPassword`, `confirmPasswordReset`) that mutate in-memory state, making them no-ops in reality.

**Risk if left:** A staging environment advertises registration/login that looks real but loses all state on deploy. The divergent localStorage keys between `mock-auth` and `client-session` can produce ghost sessions.

**Fix (Effort 2 — 1–2 days):**
1. Rename `isLocalAuthEnabled` → `isDevAuthEnabled` and require `ENABLE_DEV_AUTH=true` to be set explicitly — no more implicit non-production default.
2. Move `MOCK_USERS` seed to a test fixture file; strip `mock-auth` down to a thin stub used only in Jest.
3. Add an env-var validation step at startup (`src/lib/env-check.ts`) that throws if neither Supabase nor explicit dev-auth is configured.

---

### 🟠 High

---

#### TD-03 · Client IP extraction copy-pasted in 5+ places
**Category:** Code  **Score: 25** · Impact 2 · Risk 3 · Effort 1

The same three-line pattern appears verbatim in `auth/login/route.ts`, `auth/register/route.ts`, `agent/chat/route.ts`, `assessment/fit-check/route.ts`, and `api/middleware.ts` — while `rate-limiter.ts` has its own fourth variation. They disagree on whether to split `x-forwarded-for` on commas (the rate-limiter does; the route handlers don't), creating an inconsistent IP key used for rate-limiting.

```ts
// current — duplicated everywhere
const clientIp =
  request.headers.get('x-forwarded-for') ||
  request.headers.get('x-real-ip') ||
  'unknown';
```

**Fix (Effort 1 — 2 hours):**
Add `getClientIp(request: NextRequest): string` to `src/lib/request-user.ts` (or a new `src/lib/request-meta.ts`) that normalises `x-forwarded-for` splitting, deduplicate all call sites, and update `rate-limiter.ts` to use it.

---

#### TD-04 · `any` throughout `rate-limiter.ts` and `client-session.ts`
**Category:** Code  **Score: 25** · Impact 2 · Risk 3 · Effort 1

`rate-limiter.ts` types its entire public API (`RateLimitConfig.keyGenerator`, `createRateLimiter`, `getClientKey`, `getRateLimiter.check`) with `any`. `client-session.ts` types `resumeDraft` as `any | null` (equivalent to `any`). `dashboard/page.tsx` types its `assessment` state as `any`. These are holes that let malformed data flow silently.

**Fix (Effort 1 — 2–3 hours):**
- `rate-limiter.ts`: replace `any` with `NextRequest | { ip?: string; headers: Record<string,string> }` union.
- `client-session.ts`: import `ResumeDraft` from `@/lib/product` and type the draft field.
- `dashboard/page.tsx`: import the `AssessmentRecord` type from `@/lib/db`.

---

#### TD-05 · Zero test coverage on all 18 API route handlers
**Category:** Test  **Score: 20** · Impact 5 · Risk 5 · Effort 4

Every route under `src/app/api/` is untested. The highest-risk paths (auth login/register/logout, assessment fit-check, plan updates) can regress silently. The test infrastructure (`babel-jest`, `jest-environment-jsdom`) is already working.

**Fix (Effort 4 — 3–5 days spread across sprints):**
Priority order for route tests:
1. `auth/login` and `auth/register` — cover rate-limit path, Supabase path, mock-auth path, ZodError path.
2. `assessment/fit-check` — cover engine call, DB write, locale handling.
3. `applications` CRUD.
4. `dashboard` snapshot aggregation.

Use `jest.mock('@/lib/db')` + `jest.mock('@/lib/supabase')` to isolate routes from infrastructure.

---

#### TD-06 · `next` version range is unpinned (`^14.0.0`)
**Category:** Dependency  **Score: 20** · Impact 2 · Risk 2 · Effort 1

The `^` range will automatically pull in any `14.x` release, including breaking minor changes. Next.js 15 is stable and introduces breaking changes to `params`/`searchParams` (now Promises). The project's `package-lock.json` currently pins the resolved version, but a fresh `npm install` in CI from a clean cache will drift.

**Fix (Effort 1 — 30 min):**
Pin to an exact version: `"next": "14.2.35"`. Add a Dependabot or Renovate config to manage intentional upgrades.

---

### 🟡 Medium

---

#### TD-07 · `assessment-engine.ts` is a 1,570-line God file
**Category:** Code / Architecture  **Score: 21** · Impact 4 · Risk 3 · Effort 3

The file contains five distinct concerns in one module: type definitions, 12 role definitions (~25 lines each), question data (routing questions, tie-breaker, 16 branch questions), cluster/scoring algorithms, and public helper functions. Any PR touching questions or roles produces large diffs and merge conflicts.

**Fix (Effort 3 — 2–3 days):**
Split into:
- `src/lib/assessment/types.ts` — interfaces and enums only
- `src/lib/assessment/roles.ts` — `ROLE_DEFINITIONS`, `ROLE_ORDER`, `CLUSTER_ROLES`
- `src/lib/assessment/questions.ts` — `ROUTING_QUESTIONS`, `TIE_BREAKER_QUESTION`, `BRANCH_QUESTIONS`
- `src/lib/assessment/scoring.ts` — `scoreAssessment`, `getNextQuestions`, internal helpers
- `src/lib/assessment/index.ts` — barrel re-export (keeps all existing imports working)

---

#### TD-08 · `db.ts` is a 1,200-line dual-implementation file
**Category:** Architecture  **Score: 15** · Impact 3 · Risk 2 · Effort 3

`InMemoryDB`, `SupabaseDB`, 9 mapper functions, the `ProductDB` interface, and the singleton factory all live in one file. Finding a single Supabase query means scrolling past hundreds of lines of in-memory logic.

**Fix (Effort 3 — 1–2 days):**
Split into:
- `src/lib/db/types.ts` — `ProductDB` interface and record types
- `src/lib/db/mappers.ts` — `mapUserRow`, `mapAssessmentRow`, etc.
- `src/lib/db/memory.ts` — `InMemoryDB`
- `src/lib/db/supabase.ts` — `SupabaseDB`
- `src/lib/db/index.ts` — `getDB`, `getPersistenceMode` factory

---

### 🟢 Low

---

#### TD-09 · Debug scripts left in project root
**Category:** Documentation  **Score: 10** · Impact 1 · Risk 1 · Effort 1

`diagnose.ts`, `diagnose2.ts`, `diagnose3.ts`, `diagnose4.ts`, `smoke-test.ts`, `smoke-test-engine.mjs`, `smoke-test-engine.ts` are all in the project root alongside `package.json`. They have no `package.json` scripts and aren't ignored in `.gitignore` (or the equivalent), so they ship to every reviewer and create noise.

**Fix (Effort 1 — 15 min):** Move to `scripts/` and add `scripts/*.ts` to `.gitignore` or delete if no longer needed.

---

## Phased Remediation Plan

All phases are designed to run in parallel with feature work — no freeze required.

### Phase 1 — Quick wins (1 sprint, ~3 days of eng time)
These are low-effort, high-leverage changes that unblock everything else.

| Item | Owner | Est. |
|------|-------|------|
| TD-03: Extract `getClientIp()` helper | Any | 2h |
| TD-04: Replace `any` in rate-limiter + client-session | Any | 3h |
| TD-09: Move / delete debug scripts | Any | 30m |
| TD-06: Pin `next` to exact version + add Renovate | Eng lead | 1h |
| TD-01: Add `InMemoryDB` startup warning + health field | Any | 2h |

### Phase 2 — Architecture cleanup (2–3 sprints, 1 ticket each)
Tackle one per sprint alongside feature work.

| Item | Ticket | Est. |
|------|--------|------|
| TD-02: Make dev-auth opt-in, strip mock-auth from prod paths | 1 | 2d |
| TD-07: Split `assessment-engine.ts` into 4 modules | 1 | 2d |
| TD-08: Split `db.ts` into 4 modules | 1 | 1.5d |

### Phase 3 — Test coverage (ongoing, 1 route per sprint)
Write route handler tests as features in those routes are touched, not as a big-bang effort.

| Sprint | Routes to cover |
|--------|----------------|
| Sprint N | `auth/login`, `auth/register` |
| Sprint N+1 | `auth/logout`, `auth/session`, `assessment/fit-check` |
| Sprint N+2 | `applications`, `dashboard` |
| Sprint N+3 | `plan`, `profile`, `resumes` |

---

## Summary Table

| ID | Item | Category | Impact | Risk | Effort | **Score** |
|----|------|----------|--------|------|--------|-----------|
| TD-01 | InMemoryDB persistence illusion | Architecture | 4 | 4 | 2 | **32** |
| TD-02 | mock-auth in production paths | Architecture | 3 | 4 | 2 | **28** |
| TD-03 | Duplicate client IP extraction | Code | 2 | 3 | 1 | **25** |
| TD-04 | `any` types in core libs | Code | 2 | 3 | 1 | **25** |
| TD-07 | `assessment-engine.ts` God file | Code | 4 | 3 | 3 | **21** |
| TD-05 | Zero API route tests | Test | 5 | 5 | 4 | **20** |
| TD-06 | Unpinned `next` version | Dependency | 2 | 2 | 1 | **20** |
| TD-08 | `db.ts` dual-implementation | Architecture | 3 | 2 | 3 | **15** |
| TD-09 | Debug scripts in root | Documentation | 1 | 1 | 1 | **10** |
