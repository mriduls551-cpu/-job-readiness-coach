# Results / Share Browser QA - Claude Second Pass

Date: 2026-07-05
Scope: real-browser QA of the results page, D1 practice waitlist modal, share creation flow, public share route, mobile replay, and OG image route.

## Environment

- App run locally with `npm run dev`
- Browser automation used Playwright in headless mode
- Main QA path used a seeded authenticated session created through `/api/auth/register` and `/api/auth/login`
- Register screen was also probed directly in-browser so the auth entry path was not skipped entirely

## Artifacts

- JSON summary: `output/qa/results-share-browser-findings.json`
- Dev logs:
  - `output/qa/dev-server.log`
  - `output/qa/dev-server.err.log`
- Screenshots:
  - `output/playwright/desktop-results.png`
  - `output/playwright/waitlist-modal.png`
  - `output/playwright/public-share-desktop.png`
  - `output/playwright/results-mobile.png`
  - `output/playwright/public-share-mobile.png`
  - `output/playwright/desktop-results-hindi.png`
  - `output/playwright/career-fit-entry-debug.png`

## Verified Passes

- Assessment flow can reach `/results` in-browser with a real authenticated session.
- Results page shows:
  - role results
  - `Build my resume`
  - `Start practicing with AI`
  - `Share fit card`
- Practice waitlist modal opens and submits successfully.
- Share action creates a WhatsApp deep-link popup and exposes a public share URL.
- Public share page loads successfully on desktop and mobile.
- Results page and public share page both load on a mobile viewport.

## Findings

### 1. OG image route fails at the real route

Severity: High

Repro:

1. Create a share from `/results`
2. Open the public share page
3. Request `/r/[publicId]/opengraph-image`

Observed:

- Dev log shows `GET /r/<publicId>/opengraph-image 500`
- Error in `output/qa/dev-server.err.log`:
  - `Invalid value for CSS property "display"... Received: "inline-flex"`

Likely source:

- [`src/app/r/[publicId]/opengraph-image.tsx`](</C:/Users/mridul/Documents/Job-startup - Copy/New folder/Job-startup/nextjs-migration/src/app/r/[publicId]/opengraph-image.tsx>)

Second-pass target:

- Replace `display: 'inline-flex'` and audit the file for any other CSS values unsupported by `next/og` / `ImageResponse`
- Re-verify:
  - route status `200`
  - content-type `image/png`
  - thumbnail legibility

### 2. Results/share flow does not switch to Hindi after forcing persisted locale to `hi`

Severity: High

Repro:

1. Reach `/results`
2. Set both persisted locale values to `hi`
3. Reload `/results`

Observed:

- Page stays in English
- JSON evidence in `output/qa/results-share-browser-findings.json`:
  - `hindiReloadShowsHindiResults: false`
  - body snippet still starts with `YOUR FIT-CHECK RESULTS`

Likely source areas:

- [`src/app/results/page.tsx`](</C:/Users/mridul/Documents/Job-startup - Copy/New folder/Job-startup/nextjs-migration/src/app/results/page.tsx>)
- [`src/lib/client-session.ts`](</C:/Users/mridul/Documents/Job-startup - Copy/New folder/Job-startup/nextjs-migration/src/lib/client-session.ts>)
- [`src/components/auth/SessionBootstrap.tsx`](</C:/Users/mridul/Documents/Job-startup - Copy/New folder/Job-startup/nextjs-migration/src/components/auth/SessionBootstrap.tsx>)

Second-pass target:

- Trace the actual locale source on results/share after reload
- Confirm whether results is reading stale store state, stale session state, or ignoring persisted locale
- Re-run browser QA in both EN and HI, not just EN

## Notes

- Direct `/register` probing was not a stable failure in the final warm run. The form was available quickly in the last pass, so do not treat the earlier loader delay as a confirmed product bug yet.
- The English share flow itself worked:
  - waitlist save succeeded
  - WhatsApp popup URL was generated
  - public share page loaded on desktop and mobile

## Recommended Second Pass

1. Fix [`src/app/r/[publicId]/opengraph-image.tsx`](</C:/Users/mridul/Documents/Job-startup - Copy/New folder/Job-startup/nextjs-migration/src/app/r/[publicId]/opengraph-image.tsx>) first and verify the route directly.
2. Fix locale persistence / reload behavior on [`src/app/results/page.tsx`](</C:/Users/mridul/Documents/Job-startup - Copy/New folder/Job-startup/nextjs-migration/src/app/results/page.tsx>).
3. Re-run browser QA on:
   - desktop EN
   - desktop HI
   - mobile EN
   - public share page + OG route
