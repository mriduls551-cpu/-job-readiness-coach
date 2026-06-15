# Job Readiness Coach UI And Product Audit

Date: 2026-06-06
Audit destination: local folder
Primary evidence:
- `01-home.png`
- `02-login.png`
- `03-register.png`
- `04-fit-check-gated.png`
- `05-results-empty.png`
- `06-dashboard-gated.png`
- source review across `src/app/*` and `src/components/home/HomeReferencePage.tsx`

## Steps Reviewed

1. Home route `/`
- Health: inconclusive from screenshot, because the captured image rendered blank.
- Notes: the source shows a full landing page with hero copy, CTA pair, stats, "How it works", and "Why people use it". The blank capture looks more like a rendering/capture issue than intended design.

2. Login `/login`
- Health: visually polished but too thin on reassurance.
- Notes: the card is clean and readable, but it asks for commitment before reinforcing value, trust, or what the user gets immediately after sign-in.

3. Register `/register`
- Health: clean and consistent, but the form is long relative to the amount of confidence-building context around it.
- Notes: the page mirrors login nicely, though it still feels like a detached auth screen rather than the start of a guided product journey.

4. Protected fit-check `/career-fit-check`
- Health: weak first impression when unauthenticated.
- Notes: the user sees a "Checking your session..." loader on a large empty canvas before redirect logic completes. This reads like a stalled app rather than a confident gated experience.

5. Protected results `/results`
- Health: weak unauthenticated state and weak empty-state framing.
- Notes: unauthenticated users again meet the generic session-check state. In code, the empty results state is helpful, but it still assumes the user already understands why the flow matters.

6. Protected dashboard `/dashboard`
- Health: weak access-state UX, stronger signed-in structure in code than in first-contact experience.
- Notes: source review shows good building blocks like progress, reminders, applications, resume, and weekly plan. But the first visible protected-state experience is a blank-heavy loader, which undercuts the "one calm system" promise.

## Main Findings

1. The gated experience is the biggest UX problem.
- Multiple core routes show a generic session-check loader before redirecting. For a first-time user, this feels like latency or breakage rather than clear product guidance.

2. The product promise is stronger in the PRD and source copy than in the visible UI.
- The product is meant to feel like one continuous coach. The current public-facing screens feel more like separate utilities with shared styling.

3. The auth pages are elegant but under-explain the reward.
- Login and registration are visually calm, but they do not carry enough product context, trust cues, or immediate next-step framing for a low-confidence first-job audience.

4. Signed-in pages appear feature-complete but not always journey-led.
- Dashboard, results, resume, plan, interview, and applications all expose useful capability. The structure leans toward "workspace modules" more than "coach-led progression".

5. Hindi localization is incomplete and inconsistent.
- Several screens still ship English labels inside Hindi mode, for example:
  - `src/app/results/page.tsx`
  - `src/app/dashboard/page.tsx`
  - `src/app/interview/page.tsx`
  - `src/app/applications/page.tsx`
  - `src/app/resume/page.tsx`
  - `src/app/plan/page.tsx`
- This weakens the India-first bilingual positioning.

## Recommendations

1. Replace client-side protected loaders with explicit access interstitials or server-side gating.
- Show a short explanation, one primary CTA, one secondary CTA, and what unlocks after sign-in.
- Example framing: "Create your account to save your fit-check, role matches, resume draft, and weekly plan."

2. Strengthen the landing and auth journey as one narrative.
- Add a compact three-step story above or beside auth:
  - find your top role matches
  - build a role-aware resume
  - follow a weekly plan until interviews
- Reinforce the 5 to 7 minute time-to-value and the bilingual promise.

3. Make the product feel more coach-led and less dashboard-led.
- On dashboard, results, resume, and plan, elevate one dominant next action at a time.
- Use stronger progression framing such as "You are here", "Next best step", and "What this unlocks next".

4. Add trust and confidence cues for first-time job seekers.
- Bring in small but specific reassurance elements:
  - free account
  - saved progress
  - realistic entry-level roles
  - plain-language guidance
  - no need to know your final career path yet

5. Finish Hindi localization before polishing visuals further.
- The product promise depends on this.
- Prioritize headings, buttons, empty states, tracker labels, and role-selection labels first.

6. Audit the landing page rendering separately.
- Because the home screenshot came back blank while the source is populated, this route should be checked in a live interactive browser session before treating it as design-complete.

## Limits

- The review used current-run screenshots for public and gated-first-contact states.
- Signed-in product areas were reviewed primarily from source because local session automation was not fully set up during this pass.
- Accessibility was assessed only from visible structure and copy patterns, not with keyboard, screen reader, or contrast instrumentation.
