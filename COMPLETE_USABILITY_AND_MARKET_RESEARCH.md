# Complete Usability + Market Research — Job Readiness Coach

This is the single combined reference: a full live walkthrough of every screen in the product (not just the core funnel), four real bugs found and fixed along the way, and the seven strategic market-fit questions answered against current, cited reports. It supersedes the need to read `USER_JOURNEY_WALKTHROUGH.md` and `PRODUCT_MARKET_RESEARCH_BRIEF.md` separately — both are folded in here, with two corrections made where this final pass found the earlier documents wrong. `USABILITY_TEST_PLAN.md` (the plan for a *real*, recruited, moderated study) and `REDESIGN_SPEC.md` (the design/engineering fix backlog) remain separate documents this one points back to.

**Date:** 2026-06-25. **Branch:** `feat/analytics-i18n-email-phone-fixes`. **Backend mode:** local mock-auth + in-memory DB (intentional, confirmed with the product owner — not a misconfiguration). **Test account:** `UX Walkthrough Test` / `uxwalkthrough-local2@example.com` — exists only in the dev server's in-memory store, not a real database row anywhere.
**Method:** a cognitive walkthrough (one tester driving the real browser/DOM/network through every screen) plus desk research against current job-market reports. Not a substitute for the real moderated study in `USABILITY_TEST_PLAN.md` — see that document for the recruiting plan that would get authentic user reactions, which nothing in this document can manufacture.

---

## Part 1 — Bugs found and fixed (all four)

Each was found live, root-caused in source, fixed, and re-verified — not theorized.

### Bug #1 — `src/lib/mock-auth.ts`: registered accounts vanish before login can find them
**Symptom:** `POST /api/auth/register` → `201`, immediately followed by `POST /api/auth/login` → `500`, "Invalid email or password" — reproducible with a fully separate, later manual login attempt using the same credentials.
**Root cause:** the mock user store was a plain module-level variable (`let mockUsers = null`). Next.js dev-mode hot-reload re-evaluates the module on every recompile, wiping it between the register call and the login call.
**Fix:** anchored to `globalThis.__mockAuthUsers`, which survives module re-evaluation within the same process.
**Verified:** register → auto-login → redirect to `/` → "WELCOME BACK, UX" personalized greeting.

### Bug #2 — `src/lib/db.ts`: same anti-pattern, breaks all persisted data
**Symptom:** `/results` showed "no assessment found" immediately after a fit-check `POST` had just returned `200` with real results.
**Root cause:** identical pattern one layer down — `memoryInstance`/`supabaseInstance` were plain module variables. The background refresh (`refreshStoredAssessmentFromServer`) hit a fresh, empty DB instance, got nothing back, and **actively called `clearLatestAssessment()`**, wiping the valid data that had just been written.
**Scope:** this is the more foundational of the two persistence bugs — it backs *all* in-memory data (users, assessments, resumes, plans, applications), not just assessments.
**Fix:** same `globalThis`-anchoring pattern, applied to both instances.
**Verified:** full fit-check run → `/results` rendered real role matches on the very next load. Also implicitly re-verified by every subsequent screen in this walkthrough (dashboard, resume, plan, applications, interview prep all show consistent, correctly-persisted data — see Part 2).

### Bug #3 — `src/app/career-fit-check/page.tsx`: the final adaptive question can never be answered
**Symptom:** on the question with id `rf` ("closest work direction," reached whenever the adaptive path lands there last), clicking any option never visually selects it, and submission is permanently blocked.
**Root cause:**
```ts
const next = { ...current, [question.id]: optionId };      // sets next.rf = optionId
if (question.id.startsWith('r') && question.id !== 'rtb') { // 'rf' matches this guard too
  // ...
  delete next.rf;                                            // immediately undoes the line above
}
```
The cleanup guard correctly excludes `rtb` from invalidating itself, but never added the same exclusion for `rf` — so answering `rf` deletes its own just-set answer in the same update.
**Fix:** `question.id !== 'rf'` added to the guard.
**Verified:** re-ran the full 10-question flow; selection now activates within 400ms, submission succeeds.

### Bug #4 — `src/app/profile/page.tsx`: infinite `GET /api/profile` loop (found in this final pass)
**Symptom:** visiting `/profile` fires **hundreds** of `GET /api/profile` requests in a row, not one.
**Root cause:** a chain reaction across two files:
1. `useCurrentUser()` (`src/hooks/useCurrentUser.ts`) reactively subscribes to the Zustand store: `const user = useAppStore((state) => state.user);`
2. `profile/page.tsx` had a `useEffect(..., [user])` whose body calls `setStoredUser(nextUser)` with a **freshly-parsed JSON object** — a new object reference every single time, even when the data is identical.
3. That write updates the same store `user` reads from, so `user`'s reference changes, which re-triggers the effect, which fetches and writes again — forever.
**Why this matters more than a typical bug:** this product explicitly targets cost-sensitive users on 3G connections in India (`system-design.md`'s own `< ₹2/session` target). An unbounded request loop on a budget device is a direct hit on exactly the constraint the product says it cares about — this isn't a cosmetic issue.
**Fix:**
```ts
const hasLoadedProfileRef = useRef(false);
useEffect(() => {
  if (!user || hasLoadedProfileRef.current) return;
  hasLoadedProfileRef.current = true;
  // ...unchanged fetch body...
}, [user]);
```
**Verified:** after the fix, a fresh page visit fires exactly **one** `GET /api/profile` call (confirmed by isolating the network log to requests after the genuine reload, separate from the stale pre-fix entries still sitting earlier in the same log).

**Files changed across all four fixes:** `src/lib/mock-auth.ts`, `src/lib/db.ts`, `src/app/career-fit-check/page.tsx`, `src/app/profile/page.tsx`. Nothing else.

---

## Part 2 — Full walkthrough, every screen

### Home (`/`) — first impression, cold load
Header states the value prop and bilingual signal immediately; EN/हिंदी toggle visible without hunting. Headline, CTA, and a reassurance line ("Free to use. About 5 minutes...") sit in the right order. Footer present and correct.
**Open finding:** the body paragraph packs 4 deliverables (role matches + resume + plan + interview prep) into one sentence — can't confirm recall risk without a real participant; flagged for the moderated study.

### Register / Login (`/register`, `/login`)
**Confirmed finding:** neither page has its own language toggle — `Navigation` is hidden on both routes by design, and `AuthScaffold`'s header only has the wordmark. Bilingual rendering (correct once `locale` is already `hi`) depends entirely on having set the language elsewhere first.
Client-side validation correctly blocks bad submissions before any network call. Real registration succeeded after Bug #1's fix; redirected to `/` with a personalized "WELCOME BACK, UX" state.

### Career fit-check (`/career-fit-check`)
Name pre-filled from the account. Adaptive flow expands from "Question 1 of 5" to "Question 6 of 10" partway through with no warning that the total can change — **open finding**, not fixed (a progress-bar/copy design decision, not a one-line patch). Final question was Bug #3, now fixed; full 10-question flow completes and submits successfully.

### Results (`/results`)
Real, populated output: *"Customer Support Associate looks strongest right now, with Academic Counsellor close behind"* with dimension scores (Numbers 6% / People 61% / Structure 21% / Creative 10%), three role cards with "why this fits" rationale, top role auto-selected via an already-optimistic pattern (no issue).

### Resume (`/resume`)
Role-aware starter content (skills: Empathy, Clear communication, Patience), role-switch tabs, autosave status line. **Delete-confirmation tested end-to-end:** added a 2nd experience block, opened the confirm dialog, tested both Cancel (preserves) and Remove (deletes) — both correct.
**Strategic finding (see Part 3, Q7):** the page is labeled "Resume co-writer" but contains zero AI-generation actions — the starter content is a deterministic template, not an LLM call. The only real AI surface in the whole product is the floating chat widget, and it isn't wired into this form.

### Weekly plan (`/plan`)
Task checkbox flips to complete within 50ms of clicking — confirmed genuinely optimistic (well under any realistic network latency, including this codebase's own deliberate 500ms mock-backend delays). Network trace confirmed real persistence: `GET /api/plan → 404` (expected, no plan yet) → `POST /api/plan → 201` (auto-created) → `PUT /api/plan → 200` (the toggle, actually saved).

### Applications (`/applications`)
Logged a test application; pipeline metric and status count both incremented correctly, entry appeared in the list. Toast confirmation not independently re-caught visually in this pass (sonner toasts auto-dismiss faster than this tool's round-trip latency) but the underlying `toast.success(...)` call was already verified in source in an earlier pass of this engagement.

### Dashboard (`/dashboard`) — newly covered in this pass
Fully working, and a strong positive signal: *"Hi UX, your search now has one working home base"* with **Journey done 5/5**, Resume "Ready," Applications "1," This week "1/4," all five journey-checkpoint milestones showing ✓, and the actual logged application appearing in "Recent applications." This confirms the product's core promise — *"Role direction, resume progress, weekly plan, reminders, and applications now move together instead of living in separate tabs"* — is real, end-to-end, not just marketing copy. This is the single best piece of evidence for Q1 in Part 3.

### Interview prep (`/interview`) — newly covered in this pass
Fully role-aware: *"Prepare for Customer Support interviews with one clear story,"* an auto-built 60-second introduction using the actual fit-check strengths, 3 practice questions, 3 stories to prepare, a pre-interview checklist. Same pattern as the resume page — deterministic, role-aware templates, not LLM-generated. No bugs found.

### Profile (`/profile`) — newly covered in this pass
Name/email/language settings all render and edit correctly. This page is where Bug #4 was found and fixed. **Correction to the earlier market-research pass:** that document speculated salary ranges might be a single national figure needing a "varies by city" disclaimer — checking `assessment-engine.ts` directly shows every role's `salaryRange` field already reads *"Verify current pay in the target city and employer listing"* (and the Hindi equivalent) — **no fixed number is ever shown.** That risk was already handled correctly; this document corrects the earlier speculation rather than carrying it forward as if confirmed.

### AI coach widget — tested directly in this pass
Opened the chat, sent *"What should I focus on this week for Customer Support roles?"*, confirmed `POST /api/agent/chat → 200 OK` in the network log. The endpoint genuinely works. This is the one place in the product a user gets real, generative AI value today — see Q7 below for why that's also the gap.

---

## Part 3 — Seven strategic questions, answered against current data

*(Method note: these are desk-research questions, not usability-test questions — see the citations, not opinion.)*

**Q1 — How beneficial is it for the first-time user?**
The problem it targets is real and large: per *State of Working India 2026* (Azim Premji University), ~40% of youth aged 15-25 are unemployed; India produces ~5M graduates/year against ~2.8M graduate-level jobs. Per NIIT's *India Skills Gap Report 2026*, there's a measured **confidence gap** — employers rate fresh-grad readiness at 82/100, students rate themselves at 57/100. The product's tone and structure target that gap specifically, and Part 2's dashboard walkthrough is direct evidence the connected-system promise (role → resume → plan → applications, all in one place) is real, not aspirational copy.

**Q2 — How intuitive is the UI?**
Structurally sound after the four bugs above are fixed. Remaining open findings are specific and named (no auth-screen language toggle, the 5→10 progress jump, the dense value-prop sentence) — see `REDESIGN_SPEC.md` for the broader design-consistency work already done on top of this.

**Q3 — Does it capture the current market scenario, and the future one?**
**Current — strong fit.** Per Naukri's *JobSpeak* (Jan-Mar 2026), entry-level (0-3yr) hiring grew 16% YoY — the highest of any bracket — concentrated in non-IT sectors (Hospitality +21%, BPO/ITES +18%) and tier-2 cities (Coimbatore, Gandhinagar, Surat). The product's 12-role catalog (support, operations, MIS, HR, counselling, etc.) maps closely onto exactly this. **Gap:** per the Skills Gap Report, 45% of employers now rank **portfolios of work** as a top readiness signal, and hiring is shifting to skills-first evaluation — the resume builder has no portfolio/proof-of-work field. The underlying fit-check logic (skills/dimensions, not degrees) is already philosophically aligned with this future; the resume *output format* hasn't caught up to it yet.

**Q4 — How will different users from around India use it?**
Real, citable gap: EN/HI-only, while hiring growth is shifting toward Tamil- and Gujarati-majority tier-2 cities. India's **Bhashini** platform (free government APIs for all 22 scheduled languages) and Indic NLP models (MuRIL, IndicBERT, Vakyansh) are a concrete extension path, not a hypothetical. Connectivity/device assumptions are already handled well (`system-design.md`'s 3G/LCP targets). Salary-range handling is *already* correctly city-agnostic (see Part 2's Profile correction) — not a gap.

**Q5 — Does it capture the sentiment from the latest surveys and reports on jobs?**
Yes, on the emotional read — the confidence-gap framing matches the State of Working India / NIIT data precisely, and the dashboard walkthrough shows the connected-system promise is genuinely delivered. No, on the skills-evidence shift — see Q3's portfolio gap.

**Q6 — What more questions should there be? How can it get better?**
Missing research questions (add to `USABILITY_TEST_PLAN.md`'s wrap-up, don't spin up a separate study):
- *"Would you build your real resume around this suggested role, or go back to a generic template?"* — tests trust, the real measure of benefit.
- *"If this were in [your regional language], would you use it over English/Hindi?"* — sizes the Q4 gap with real people instead of assumption.
- *"Did you expect AI to write any of this for you? Where?"* — asked during the resume task, directly tests the Q7 gap below.
- Funnel analytics question (not an interview question): what fraction of real users abandon mid-fit-check, and at which question? PostHog/`captureProductEvent` is already wired up for this.

Concrete product improvements, each tied to a finding above:
1. Add a lightweight portfolio/proof-of-work field to the resume builder (Q3).
2. Scope a Bhashini-based language expansion for the highest-growth regional-language cities (Q4).
3. Close the Q7 AI gap (below) before any messaging changes.

**Q7 — How does the user get the most value through AI on this?**
The core scoring engine is *deliberately* not AI (`system-design.md`: "a structured, deterministic system with an AI coach layer on top... not a chatbot") — correct, not a gap, given cost/trust constraints for a free product serving first-time users. **The actual gap, verified directly in source and confirmed live in this pass:** `resume/page.tsx` is branded "Resume co-writer" but has zero AI-generation actions — confirmed both by grepping the file (zero matches for any generate/suggest action) and by testing the chat widget directly, which works (`200 OK`) but is generic and not wired into the resume form at all. **A user gets real AI value from exactly one place today: asking the floating chat widget a question.** They get none inside the resume-writing flow itself, despite that flow's own branding promising otherwise. Highest-leverage fix: add an inline "Improve this description" action to each resume block, using the same `/api/agent/chat` infrastructure already built and already confirmed working.

---

## Sources

- [UPSC Editorial Analysis: State of Working India 2026](https://www.insightsonindia.com/2026/03/23/upsc-editorial-analysis-state-of-working-india-2026/)
- [Skills Overtake Degrees As Workforce Readiness Gap Reshapes Job Market — BW Education](https://www.bweducation.com/article/skills-overtake-degrees-as-workforce-readiness-gap-reshapes-job-market-601258)
- [Unemployment Rate In India 2026: Latest Data, Trends And State-wise Analysis](https://pwonlyias.com/unemployment-rate-in-india/)
- [India's Educated Youth & Job Market Challenges: 2026 Report](https://www.newkerala.com/news/a/indias-young-workforce-growing-getting-more-educated-state-962.htm)
- [Naukri JobSpeak March 2026](https://www.naukri.com/blog/naukri-jobspeak-march-26-records-a-9-rise-in-white-collar-hiring-as-fy26-closes-at-8-the-strongest-job-growth-in-three-years/)
- [Naukri JobSpeak Jan 2026: Non-IT drives growth, fresher hiring](https://www.naukri.com/blog/naukri-jobspeak-white-collar-hiring-opens-2026-with-3-yoy-growth-driven-by-non-it-sectors-and-fresher-hiring/)
- [Naukri JobSpeak Feb 2026: AI momentum](https://www.naukri.com/blog/naukri-jobspeak-it-hiring-shows-meaningful-recovery-and-ai-momentum-continues-white-collar-market-posts-12-yoy-growth-in-february-2026/)
- [Naukri JobSpeak Oct 2025: Fresher hiring double-digit jump](https://www.naukri.com/blog/understanding-hiring-trends-with-naukri-jobspeak-report-oct-2025/)
- [AI for Local Language — Inclusion through Vernacular Models (IBEF)](https://www.ibef.org/blogs/ai-for-local-language-inclusion-through-vernacular-models)
- [AI Career Roadmap India 2026](https://beincareer.com/ai-career-roadmap-india-2026/)
- [AI Recruitment Platforms in India: The Complete Guide (2026)](https://www.thehirehub.ai/guides/ai-recruitment-india)

---

## How this fits with the other documents

- `USABILITY_TEST_PLAN.md` — the recruiting plan for the *real* moderated study; add the Q6 probes above to its wrap-up section.
- `REDESIGN_SPEC.md` — if the Q6 product fixes (portfolio field, language expansion, resume AI action) get greenlit, they become a new sprint there, in its existing exact-diff ticket format.
- `USER_JOURNEY_WALKTHROUGH.md` / `PRODUCT_MARKET_RESEARCH_BRIEF.md` — superseded by this document; kept for history, not for new reference.
