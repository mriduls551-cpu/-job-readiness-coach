# User Journey Walkthrough — Findings Log

A step-by-step record of a live, browser-driven walkthrough of the core product funnel, run against the `feat/analytics-i18n-email-phone-fixes` branch. This is a reference document, not a test plan — it records what was actually observed at each step, what broke, what was fixed, and what's still open. Use it as ground truth when scoping the next round of changes; don't re-derive these findings from scratch.

**Date:** 2026-06-25
**Method:** Cognitive walkthrough (one tester acting through the task script from `USABILITY_TEST_PLAN.md`, driving the real browser/DOM/network — not a real recruited participant; see that document's limitations section). Not a substitute for the real moderated study `USABILITY_TEST_PLAN.md` describes.
**Backend mode:** Local mock-auth + in-memory DB. `.env.local`'s three Supabase variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are blank by design — confirmed with the product owner that this is the intentional local end-to-end testing setup, not a misconfiguration. No real Supabase project was touched at any point in this walkthrough.
**Test account used:** name `UX Walkthrough Test`, email `uxwalkthrough-local2@example.com`, password `WalkthroughTest123!`. This is a mock-auth account that exists only in the dev server's in-memory store — it is not a real database row anywhere.

---

## 0. Prerequisite fixes (had to land before the journey was completable at all)

Two of the three bugs found below block the funnel so completely that the journey could not be driven past Task 2 / Task 3 until they were fixed. They are documented in full in §2; this section exists so the journey log below makes sense without forward references.

1. `src/lib/mock-auth.ts` — in-memory user store reset by Next.js dev-mode hot-reload, breaking register→login.
2. `src/lib/db.ts` — same anti-pattern, breaking assessment/resume/plan/application persistence.

Both were fixed with the identical pattern (anchor the singleton to `globalThis` instead of a module-level `let`) before the journey below could be completed end-to-end.

---

## 1. The journey, step by step

### Task 1 — First impression (logged out, cold load)

**URL:** `/`
**Action:** Load fresh, `localStorage.clear()` first to simulate a true first-time visitor, no task given — just observe.

**Observed (verbatim):**
- Header: "JR · Job Readiness Coach · India-first. Bilingual. AI-powered. For every first step." with an `English` / `हिंदी` toggle immediately visible, no hunting required.
- Headline: *"Your first job should not feel like a guessing game."*
- Accent line: *"Find a direction, then build toward it."*
- Body: *"Answer a few practical questions and get realistic role matches, a focused resume, a weekly plan, and interview preparation that stay connected."*
- CTAs: **Find my best-fit roles** (primary) / **Sign in** (secondary)
- Reassurance line directly under the CTAs: *"Free to use. About 5 minutes to your first useful recommendation."*
- Interactive widget, default tab pre-selected (no click needed to see content): *"WHAT WOULD HELP MOST TODAY?"* → "START WITH DIRECTION" → *"See roles that match how you naturally work."*
- Journey rail: 01 Discover · 02 Prepare · 03 Apply · 04 Interview
- Trust bullets: *Built for first-job seekers* / *English and Hindi* / *Progress stays connected*
- Footer present and correct: *"© 2026 Job Readiness Coach"* + Privacy / Terms (plain text, since those routes don't exist yet — by design, see `REDESIGN_SPEC.md` Sprint 4) / Contact (real `mailto:` link).

**Findings:**
- ✅ Value proposition, bilingual signal, and primary CTA all land within the first screen — no issues.
- ⚠️ **Watch-for, not confirmed:** the body paragraph packs 4 distinct deliverables (role matches + resume + weekly plan + interview prep) into one sentence. A cognitive walkthrough can't tell whether a first-time reader retains all four or just the gist — this needs a real participant's unprompted recall to confirm either way. Don't treat this as resolved; it's an open question for the real study.

---

### Task 2 — Register

**URL:** `/register`

**Action 1 — locate the language control.** Enumerated every `<button>` on the page (`document.querySelectorAll('button')`).
**Result:** exactly one button exists on `/register` — *"Create account"*. Same check on `/login` → exactly one button, *"Sign in"*.

**🔴 Finding — confirmed, not yet fixed:** **Neither `/login` nor `/register` has a language toggle of its own.** `Navigation.tsx` is hidden on both routes by design (`HIDE_PATHS`), and `AuthScaffold.tsx`'s own header only renders the wordmark. Bilingual rendering on these two screens (fixed correctly in `REDESIGN_SPEC.md` Sprint 2 — confirmed working when locale is already `hi`) depends entirely on the user having set their language preference somewhere else first (e.g. the home page). A user who lands directly on `/register` via a shared link, bookmark, or ad with no prior visit has no visible way to switch to Hindi on this exact screen.

**Action 2 — validation safety check.** Filled the form with deliberately invalid data: name `A` (too short), email `not-an-email`, password `short` (under 8 chars), confirmPassword `different` (mismatched). Submitted.
**Result:** zero network calls fired (`POST /api/auth/register` never appears in the network log for this submission) — confirmed client-side zod validation correctly blocks the request before it reaches the server. ✅ Safe.

**Action 3 — real registration attempt (first try, before fixes).**
Filled: name `UX Walkthrough Test`, email `uxwalkthrough-test+claude@example.com`, password `WalkthroughTest123!`, submitted.
**Result:**
```
POST /api/auth/register → 201 Created
POST /api/auth/login    → 500 Internal Server Error
```
Displayed to the user: **"Login failed: Invalid email or password"** — immediately after successfully creating an account. A second, fully independent manual `/login` attempt with the identical credentials failed the same way, ruling out a one-off race condition. See §2, Bug #1 for the root cause and fix.

**Action 4 — real registration attempt (second try, after the mock-auth.ts fix).**
Filled: name `UX Walkthrough Test`, email `uxwalkthrough-local2@example.com`, password `WalkthroughTest123!`, submitted.
**Result:**
```
POST /api/auth/register → 201 Created
POST /api/auth/login    → 200 OK
```
Redirected to `/`. Page now showed **"WELCOME BACK, UX"** with the logged-in CTA variants (*"Continue my journey"* / *"Open my workspace"*) — confirms a fully working session.

---

### Task 3 — Complete the fit-check

**URL:** `/career-fit-check`

**Observed on load:** the "Full name" field was pre-filled with `UX Walkthrough Test` from the account — confirms profile pre-fill works correctly.

**Action:** answered all questions, always selecting the first listed option, to drive a consistent adaptive path.

**Progress counter behavior (finding, not fixed):**
| Step | Counter shown |
|---|---|
| Start | "Question 1 of 5" |
| After Q4 | "Question 4 of 5" |
| After Q5 (branch triggers) | **"Question 6 of 10"** |
| ... | climbs steadily to "Question 10 of 10" |

**⚠️ Finding — confirmed, not fixed:** the total question count silently jumps from 5 to 10 partway through (this is the adaptive/branching logic in `getNextQuestions` extending the list based on answers — not a bug in itself), but the *progress indicator* gives no warning this can happen. A user who's just answered "Question 4 of 5" and feels nearly done is then told they're only on "Question 6 of 10" — effectively further from completion than the UI had been promising. Worth a real participant's reaction in the moderated study; the fix (if warranted) is a copy/progress-bar design decision, not a one-line patch.

**Final question (Q10) — `rf`, eyebrow "CLOSEST WORK DIRECTION":**
*"After comparing the actual work, which direction would you most seriously explore?"* — 9 role-preference options (Customer Support Associate, Academic Counsellor, HR Coordinator, Non-voice Support Associate, Recruitment Executive, Merchant Relationship Executive, Hotel Front Office Associate, Food and Beverage Service Associate, Preschool and Daycare Facilitator).

**🔴 Critical bug found here — see §2, Bug #2.** Clicking any of the 9 options never visually selected it (no active state), and "See my top matches" was blocked by *"Choose the option that feels closest to you before continuing."* This made the fit-check **permanently impossible to complete** whenever a user's adaptive path ended on this question. Root-caused, fixed, and re-verified (selection now activates within 400ms of clicking).

**After the fix**, submission succeeded:
```
POST /api/assessment/fit-check → 200 OK
```
Redirected to `/results`.

**Secondary bug found immediately after, on the results page — see §2, Bug #3.** First landing on `/results` post-submission showed the *empty* state ("RESULTS UNAVAILABLE / Complete your fit check to unlock role matches. We could not find a saved assessment in this session yet.") despite the POST having just succeeded. Root-caused, fixed, and the fit-check was re-run end to end to confirm.

---

### Task 4 — Review and select a role

**URL:** `/results` (after Bug #3's fix and a fresh fit-check run)

**Observed:** real, populated results —
- Headline: *"Customer Support Associate looks strongest right now, with Academic Counsellor close behind."*
- Dimension scores: Numbers 6% · People 61% · Structure 21% · Creative 10%
- 3 role cards (Customer Support Associate / Academic Counselling / HR Coordination), each with a "Why this fits" rationale paragraph and supporting-signal chips.
- Top card already showed **"Selected role"** (button label) — auto-selection of the top match, matching the optimistic-select pattern already in `results/page.tsx` (this pattern was the one already cited as "do it right" precedent when Sprint 7's plan-toggle fix was written).

No further action needed — default selection accepted, matching how a real user would most likely proceed unless they specifically wanted a different role.

---

### Task 5 — Build the resume, test the delete-confirmation (Sprint 8)

**URL:** `/resume`

**Observed on load:**
- Role-aware starter content pre-filled: skills chips `Empathy`, `Clear communication`, `Patience`.
- Role-switch tabs present: Customer Support / Academic Counselling / HR Coordination.
- Status line: *"Saved to your workspace."*

**Delete-confirmation test sequence:**
1. Default state: 1 experience entry, 1 education entry. Both "Remove" buttons `disabled` (correctly matches `disabled={length === 1}` in source).
2. Clicked "Add block" (experience) → 2nd entry appears, confirmed via counting `input[placeholder="Role"]` elements (1 → 2). "Remove block" became enabled on both entries.
3. Clicked "Remove block" on one entry → **a modal dialog appeared** (`role="dialog"`, accessible title *"Remove this block?"*, description *"This removes it from your resume draft immediately. This cannot be undone."*, **Cancel** / **Remove** buttons). Confirmed via DOM check: entry count stayed at 2 (not deleted yet).
4. Clicked **Cancel** → dialog closed, entry count still 2. ✅ Cancel preserves data.
5. Re-opened the dialog on the same entry, clicked **Remove** (confirm) → dialog closed, entry count dropped to 1. ✅ Confirm actually deletes.

**Result: Sprint 8 works exactly as designed, full stop.** No issues found.

---

### Task 6 — Weekly plan, optimistic toggle test (Sprint 7)

**URL:** `/plan`

**Observed:** 4 tasks listed, all initially incomplete.

**Optimism test:** clicked the first task's checkbox, then checked its active-class state after only a 50ms delay (deliberately far shorter than any realistic network round-trip — for reference, this codebase's own mock backends bake in artificial 500ms delays to simulate realism).
**Result:** active state was already `true` at 50ms. Confirms the checkbox flips before the server could possibly have responded — i.e. it's genuinely optimistic, not just a fast network in this dev environment.

**Persistence check (network log, in order):**
```
GET /api/plan → 404 Not Found      (expected — no plan exists yet for a brand-new account)
POST /api/plan → 201 Created       (client's fallback-create logic, matches source)
PUT /api/plan → 200 OK             (the actual toggle — confirms it persisted, not just a visual flip that silently failed)
```

**Result: Sprint 7's plan-toggle fix works completely — instant feedback and real persistence, both confirmed.** No issues found.

---

### Task 7 — Log an application, toast test (Sprint 7)

**URL:** `/applications`

**Action:** filled Company name = `Walkthrough Test Co`, Role title = `Customer Support Associate`, submitted.

**Observed:**
- "Pipeline health" metric incremented to `1`.
- "Applied" count = `1`.
- New entry appeared in "Recent applications" list.

**Toast confirmation:** not visually caught — by the time each DOM check could run (each check is a separate tool round-trip with unavoidable latency), the `sonner` toast had already auto-dismissed (default ~3-4s lifetime). This is a limitation of the walkthrough method, not a confirmed absence of the toast. Confidence the toast *does* fire comes from the source-level verification done earlier in this engagement (`toast.success(...)` is called unconditionally in the success branch of `onSubmit`, matching `REDESIGN_SPEC.md` Sprint 7 ticket 7.4 exactly) plus the fact that the underlying action visibly succeeded.

**Result: underlying functionality confirmed; toast visibility itself not independently re-confirmed in this session (already verified once via source).**

---

## 2. Bugs found and fixed during this walkthrough

### Bug #1 — `src/lib/mock-auth.ts`: registered accounts disappear before login

**Symptom:** `POST /api/auth/register` succeeds (`201`), the immediately-following auto-login (`POST /api/auth/login`) fails (`500`, message *"Invalid email or password"*). Reproducible with a completely separate, later, manual `/login` attempt using the identical credentials — not a race condition.

**Root cause:** `mockAuth`'s "database" was a plain module-level variable:
```ts
let mockUsers: Record<string, MockUserRecord> | null = null;
```
Next.js dev-mode hot-reloading re-evaluates route-handler modules on every recompile. Between the `register()` call writing a new user into one instance of `mockUsers` and the `login()` call reading from `getMockUsers()` moments later, a recompile (visible in the dev server log as repeated `Fast Refresh: rebuilding... done`) handed the module a **fresh, empty** instance — containing only the two hardcoded demo/admin accounts. The just-registered user was simply gone.

**How it was diagnosed:** a temporary `console.error('TEMP_DEBUG full login error:', err)` was added to the login route's catch block, reproduced once, and reverted immediately after reading the stack trace (confirmed via `git diff` showing zero residual change to that file). The trace pointed directly at `mock-auth.ts:148`.

**Fix applied:**
```ts
declare global {
  var __mockAuthUsers: Record<string, MockUserRecord> | undefined;
}
function getMockUsers() {
  if (!globalThis.__mockAuthUsers) {
    globalThis.__mockAuthUsers = buildDefaultMockUsers();
  }
  return globalThis.__mockAuthUsers;
}
```
`globalThis` survives module re-evaluation within the same Node process, unlike a plain `let`.

**Verified:** register → auto-login → redirect to `/` → "WELCOME BACK, UX" personalized greeting, confirmed live.

---

### Bug #2 — `src/lib/db.ts`: same anti-pattern, breaks all persisted data

**Symptom:** immediately after a fit-check `POST` returns `200` with real results, `/results` shows the empty/no-assessment state.

**Root cause:** identical pattern to Bug #1, one layer down:
```ts
let memoryInstance: InMemoryDB | null = null;
let supabaseInstance: SupabaseDB | null = null;
```
`useAssessmentState()`'s background refresh (`refreshStoredAssessmentFromServer`, in `client-session.ts`) calls `GET /api/assessment/fit-check` on every page mount. If a recompile happened between the assessment-saving `POST` and this `GET`, the GET hit a fresh, empty `InMemoryDB` instance, found nothing, and — critically — `refreshStoredAssessmentFromServer` then calls `clearLatestAssessment()` on a "no result" response, **actively wiping** the perfectly valid data that had just been written to local state/localStorage moments earlier.

**Scope of impact:** this is not limited to assessments. `memoryInstance` backs *all* in-memory persistence — users, resumes, plans, applications, reminders. Any of these can be silently lost across a recompile under this same mechanism. This is the more foundational of the two persistence bugs.

**Fix applied:** identical `globalThis`-anchoring pattern, applied to both `memoryInstance` and `supabaseInstance`:
```ts
declare global {
  var __dbMemoryInstance: InMemoryDB | undefined;
  var __dbSupabaseInstance: SupabaseDB | undefined;
}
// getDB() reads/writes globalThis.__dbMemoryInstance / __dbSupabaseInstance instead
```

**Verified:** full fresh fit-check run → `/results` rendered real role matches, dimension scores, and rationale text on the very next page load. Also implicitly verified by Task 6/7's successful `POST`/`PUT` persistence for plan and applications data, which depend on the same `getDB()` singleton.

---

### Bug #3 — `src/app/career-fit-check/page.tsx`: the final adaptive question can never be answered

**Symptom:** on the last question of the adaptive flow (id `rf`, "closest work direction," reached whenever the adaptive path lands there as the deciding step), clicking any option never visually selects it, and submission is blocked by client-side validation forever. **This fully blocks fit-check completion** — not a cosmetic issue.

**Root cause** — `chooseOption`, around line 60:
```ts
const chooseOption = (optionId: string) => {
  setResponses((current) => {
    const next = { ...current, [question.id]: optionId };   // sets next.rf = optionId
    if (question.id.startsWith('r') && question.id !== 'rtb') {  // 'rf' matches this guard too!
      delete next.rtb;
      delete next.b1;
      // ...
      delete next.rf;   // <- immediately deletes the value the line above just set
    }
    // ...
  });
};
```
The guard was written to invalidate downstream answers (`rtb`, `b1`-`b4`, `rf`) whenever an **earlier** role-preference question changes. It correctly excludes `rtb` from triggering this on itself, but never added the same exclusion for `rf` — so answering `rf` wipes its own just-set answer in the same state update.

**Fix applied:**
```ts
if (question.id.startsWith('r') && question.id !== 'rtb' && question.id !== 'rf') {
```

**Verified:** re-ran the full 10-question flow after the fix; the final selection now shows `active: true` within 400ms of clicking, and submission succeeds, redirecting to `/results` with real data.

---

## 3. Open findings (documented, not fixed — decisions for a future sprint)

| # | Finding | Where | Severity | Status |
|---|---|---|---|---|
| 1 | No language toggle exists on `/login` or `/register` themselves | `AuthScaffold.tsx`, both auth pages | Medium — only matters for users who land directly on these routes without visiting `/` first | Open |
| 2 | Fit-check progress counter total silently jumps (e.g. 5→10) mid-flow with no warning | `career-fit-check/page.tsx`, adaptive question logic | Low-medium — needs a real participant's reaction to confirm it's actually disorienting, not just a cognitive-walkthrough guess | Open, flagged for the moderated study in `USABILITY_TEST_PLAN.md` |
| 3 | Home page's value-prop sentence packs 4 deliverables into one sentence | `HomeReferencePage.tsx` | Low — same caveat as #2, needs real recall testing | Open |
| 4 | Toast confirmation on application logging not independently re-verified visually in this session | `applications/page.tsx` | None (already verified via source in an earlier pass) | Not actionable, informational only |

---

## 4. Files changed in this walkthrough

- `src/lib/mock-auth.ts` — Bug #1 fix
- `src/lib/db.ts` — Bug #2 fix
- `src/app/career-fit-check/page.tsx` — Bug #3 fix (one line, in addition to the unrelated Sprint 0 token fixes already in this file from the earlier redesign pass)

No other files were modified during this walkthrough. `.env.local` was inspected (value lengths only, never printed) but not changed.

---

## 5. How to re-run this journey

1. Confirm `.env.local`'s three `SUPABASE_*` variables are intentionally blank (local mock-auth mode), or substitute real credentials if testing against live Supabase instead.
2. `npm run dev`, navigate to `/`.
3. Register a fresh test account (any `@example.com` email is fine for mock-auth — never resolves anywhere real).
4. Walk Tasks 1-7 above in order. The fit-check's adaptive path is response-dependent; selecting the first option at every question reproduces the exact 10-question path documented here, including landing on the `rf` question last.
5. Cross-reference any new finding against `REDESIGN_SPEC.md` (Sprints 0-8) and `USABILITY_TEST_PLAN.md` before treating it as new — several of the items above were already anticipated or partially covered by those documents.
