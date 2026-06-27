# Usability Test Plan — Job Readiness Coach

Method: moderated usability testing (think-aloud), per the standard fit for "evaluating a specific design or flow." This plan tests the live product on the `feat/analytics-i18n-email-phone-fixes` branch, which includes the consistency fixes from `REDESIGN_SPEC.md` Sprints 0-2, 7, and 8 (color/font/i18n cleanup, bilingual auth, optimistic task toggling, toast feedback, delete confirmation).

---

## 1. Objectives

This is not a general "is the app good" test — it's targeted at the specific things this session changed or that the product's own positioning claims, so the findings are actionable against known work rather than vague.

1. **Core journey completion.** Can a first-time user go from landing page → account → fit-check → role selection → resume draft → weekly plan without external help, in one sitting?
2. **Bilingual completeness.** Sprint 2 just made `/login` and `/register` actually bilingual. Does that hold up with a real Hindi-preferring participant — does the language feel natural and complete, or are there still moments that revert to English or feel machine-translated?
3. **New feedback affordances.** Sprint 7/8 added an optimistic checkbox on the weekly plan, toast confirmations on save/log actions, and a confirm-before-delete dialog on the resume page. Do participants notice these? Do they read as reassuring, or as friction?
4. **First-time confidence.** The product's own positioning targets "low-confidence first-job seekers." Where do participants hesitate, re-read copy, or say something like "wait, am I doing this right?"
5. **Mobile reality.** The product is explicitly mobile-first for India (`system-design.md` §1). Most sessions should run on a mobile viewport/device, not desktop.

## 2. Method

- **Format:** moderated, remote (screen-share) or in-person, think-aloud protocol.
- **Session length:** 35-40 minutes per participant.
- **Device:** 5 of 6-8 sessions on a real mobile phone (not desktop-emulated) — this is the dominant real-world condition for this product. 1-2 on desktop for contrast, since the codebase's `.route-shell`/`.workspace-hero` two-column layouts only fully activate above the `lg`/`xl` breakpoint and have never been usability-tested at that width.
- **Recording:** screen + audio, with consent. If in-person on a participant's own phone, screen-record via the OS's built-in recorder or point a second camera at the screen — don't require installing new software on their device.

## 3. Participants

**Target persona** (from the product's own stated audience, `system-design.md` §1 and `AUDIT_NOTES.md`): recent graduates or final-year students, first-time white-collar job seekers, India-based, mobile-primary internet use.

**Sample:** 6-8 participants, recruited across two axes that matter most to what we're testing:

| Axis | Split |
|---|---|
| Language preference | 3-4 Hindi-primary (comfortable reading Hindi, would naturally toggle the app to हिंदी) / 3-4 English-primary |
| Prior job-search experience | 3-4 zero prior applications / 3-4 have applied somewhere before but not been hired |

**Screener questions** (ask before booking, not during the session):
- Are you currently looking for your first full-time job, or did you graduate/will graduate within the last 12 months?
- Which language are you more comfortable reading on your phone — English, Hindi, or both equally?
- Have you used any job-search app or website before (Naukri, LinkedIn, Indeed, etc.)? If yes, which one most recently?
- Do you have a smartphone you'd be comfortable using for this session?

Exclude: anyone who already works in product/UX/design (they'll critique the interface instead of using it), anyone who has already used this specific product.

**Incentive:** standard for this participant profile — a gift card or UPI transfer is more practical than a physical gift for a remote-recruited, India-based, time-constrained audience.

## 4. Task script

Give the moderator's framing line verbatim before each task — don't paraphrase, since small wording changes bias whether participants treat something as a "test" of their competence vs. a "test" of the product. Hindi-primary participants should be told in their preferred language: *"यह आपकी परीक्षा नहीं है — हम ऐप की जाँच कर रहे हैं।"* ("This isn't a test of you — we're testing the app.")

### Warm-up (5 min)
- "Tell me a bit about your job search so far — what have you tried, what's been frustrating?"
- "Have you used any career or job-prep app before? What did you like or dislike about it?"

### Task 1 — First impression (un-prompted, 2 min)
Show the homepage. **Don't give a task yet.** Ask: *"Without clicking anything, what do you think this is for? Who is it for?"*
- **What we're checking:** does the value proposition land in the first few seconds, and does the bilingual toggle get noticed unprompted.

### Task 2 — Create an account
*"Imagine you want to start using this. Go ahead and create an account."*
- For Hindi-primary participants: *"Feel free to switch the app to Hindi first if you'd like to."*
- **What we're checking:** does the EN/HI toggle get found and used naturally; does the new bilingual `/register` screen (Sprint 2) read as complete and natural in Hindi, not just technically translated; do the three trust bullets ("No payment required," etc.) get read/registered at all.

### Task 3 — Complete the fit-check
*"Now go through whatever comes next to find out what kind of job might suit you."*
- **What we're checking:** does the 9-question adaptive flow feel too long or repetitive; do participants understand *why* they're being asked each question; does the profile-detail step (name/city/degree/education stream) feel like a natural part of the flow or a jarring form interruption.

### Task 4 — Review and pick a role
*"You should see some role suggestions now. Pick the one you'd actually go with, and tell me why."*
- **What we're checking:** do participants understand "why this fits" rationale text, or just look at the role title and ignore the reasoning; does the confidence-band language ("Evidence confidence: high/medium") mean anything to them.

### Task 5 — Build the resume
*"Let's build a resume draft for that role."*
- **What we're checking:** is it clear the draft was pre-filled based on their fit-check answers; do they understand the Edit/Preview toggle; **specifically try to get them to delete an experience or education block** and observe their reaction to the new confirmation dialog (Sprint 8) — does it read as helpful or as an annoying extra click; do they notice the "Saved to your workspace" toast (Sprint 7) at all, or does it pass by unnoticed.

### Task 6 — Check the weekly plan and complete a task
*"Open your weekly plan and mark one task as done."*
- **What we're checking:** does the checkbox feel instant (this is the optimistic-update fix from Sprint 7 — ask directly afterward: *"Did that feel fast or slow?"*); do they understand why these specific tasks were suggested.

### Task 7 — Log an application
*"Pretend you actually applied somewhere today. Log that application."*
- **What we're checking:** do they notice the toast confirmation; is the status-pill system (Applied/Interview/Offered/Rejected) self-explanatory.

### Wrap-up (5-8 min)
- "Of everything you just did, what was the most confusing moment?"
- "If you stopped using this halfway through, what would have made you stop?"
- "Did anything feel like it was just for English speakers, even after you switched to Hindi?" (Hindi-primary participants only — direct probe at the Sprint 2 fix.)
- Single Ease Question per task (see §5) if not already captured live.
- "Anything we should have asked you about but didn't?"

## 5. Metrics to capture per task

| Metric | How |
|---|---|
| Task success | Completed unaided / completed with a hint / failed |
| Time on task | Stopwatch from task prompt to completion |
| Single Ease Question (SEQ) | "How easy or difficult was that task?" 1 (very difficult) – 7 (very easy), asked immediately after each task |
| Verbal friction | Any moment of "hmm," re-reading, backtracking, or a direct confusion statement — timestamp it |
| Unprompted comments | Anything said without being asked — these are usually the highest-signal findings |

## 6. Synthesis plan (after sessions complete)

1. **Affinity-map** every timestamped friction moment and verbal comment across all sessions onto sticky notes (or a spreadsheet with one row per observation) — don't analyze session-by-session first, cluster across sessions.
2. **Group into themes**, then run each theme through an impact/effort matrix: does this block task completion (high impact) or just slow it down (lower impact)? Is the fix a copy change (low effort) or a flow redesign (high effort)?
3. **Cross-tab against the two recruiting axes** specifically: do Hindi-primary participants hit different friction points than English-primary ones (this is the direct test of Sprint 2's value)? Do zero-experience job seekers struggle with different things than people who've applied before?
4. **Report format:** themes ranked by impact/effort, each with 1-2 supporting verbatim quotes and which task/screen it occurred on, plus an explicit "this confirms/contradicts [Sprint N]" line wherever a finding relates to recent work — that traceability is what makes this test worth running now rather than generically later.

## 7. Timeline

| Week | Activity |
|---|---|
| 1 | Recruit 6-8 participants against the screener in §3 |
| 1 | Moderator pilots the script once with a non-target colleague to catch script issues before real sessions |
| 2 | Run 6-8 sessions (35-40 min each) |
| 2 (end) / 3 (start) | Affinity mapping + synthesis report |

## 8. Out of scope for this round

- **A/B testing the redesign vs. the pre-fix version** — that requires live traffic and statistical power this test isn't built for; if you want that comparison, it's a separate study (see the skill's A/B testing row: needs "statistical significance" sample sizes, not 6-8 people).
- **Interview-prep and profile-page flows** — not in the task script above to keep sessions under 40 minutes. Add as Task 8/9 in a follow-up round once the core funnel findings are addressed.
- **Sprint 3.3's Devanagari-vs-Hinglish decision** — this test will surface real signal on it (the Hindi-primary wrap-up probe above is designed to catch this), but don't treat 3-4 participants' reaction as a final verdict on its own; use it as directional input alongside whatever the product/content team decides.
