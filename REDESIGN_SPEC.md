# Job Readiness Coach — Redesign Engineering Spec (Codex Build Spec)

Audited against: branch `feat/analytics-i18n-email-phone-fixes`, base commit `c73c132`, plus the uncommitted token-consistency fixes already in this working tree (AuthGate flash-loader fix, CoachWidget/bottom-nav clearance, slate→token migration across 8 workspace pages, dashboard Hindi copy fixes — run `git diff` to see them). Audit date: 2026-06-24.

This document is a build spec for a coding agent (e.g. Codex) to execute mechanically, ticket by ticket, with no design judgment required except where a ticket explicitly says "DECISION REQUIRED." Every ticket is self-contained: file path, an exact search command to locate the target, an exact diff to apply, and an exact verification command. If at any point a search command in this document does not return the expected result, **stop and report it — do not guess, do not paraphrase, do not proceed to the next ticket.**

---

## 0. Execution protocol (read before doing anything)

1. **Work one ticket at a time, in order within a sprint.** Do not batch multiple tickets into one edit.
2. **Before editing, run the ticket's `LOCATE` command exactly as written.** It must return exactly the match count the ticket states (usually "exactly 1 match" — some tickets expect more; the ticket says so explicitly). If the count differs, STOP. Do not edit. Re-read the file and report what you actually found instead of what was expected.
3. **Apply the change exactly as shown in the `DIFF` block.** Lines starting with `-` must be removed, lines starting with `+` must be added, unmarked lines are unchanged context shown only so you can find the right spot. Do not "improve" the diff, do not add comments, do not reformat surrounding code.
4. **After editing, run the ticket's `VERIFY` command.** It must produce the stated expected result. If it doesn't, revert your edit and re-read the ticket — you applied something wrong.
5. **After every sprint (not every ticket), run:**
   ```bash
   npx tsc --noEmit -p tsconfig.typecheck.json
   ```
   This must produce no output. If it errors, the error tells you which ticket introduced a type problem — fix that ticket, don't proceed.
6. **Never invent a color, a Tailwind class, or a copy string that isn't explicitly given in a ticket or in §3 (Token Reference).** If a ticket asks you to write new user-facing copy and doesn't give you the exact string, that's a "DECISION REQUIRED" ticket — stop and surface the question instead of writing your own copy.
7. **§4 is a do-not-touch list.** No ticket in this document modifies those colors. If you notice one of them while editing nearby code, leave it alone.
8. **Do not add new npm dependencies.** Every ticket in this document is solvable with packages already in `package.json` (confirmed before writing each ticket below — `sonner`, `@radix-ui/react-dialog`, `next/font/google`, plain CSS/Tailwind). If you believe a ticket requires a new package, stop and report that instead of installing one.
9. **Ticket format reference** — every ticket below follows this exact schema:
   - **FILE** — exact path from repo root.
   - **LOCATE** — a shell command (grep) you run first. Its expected output/match-count is stated.
   - **DIFF** — a unified-diff-style block. Context lines have no prefix, removed lines start with `-`, added lines start with `+`.
   - **WHY** — one line, for sanity-checking only, not instruction.
   - **VERIFY** — a shell command you run after editing, with the expected result.

---

## 1. Product context (orientation only — not a ticket source)

India-first, bilingual (EN/HI) job-readiness coach for first-time entry-level job seekers. Core loop: fit-check → role match → resume → weekly plan → applications → interview prep, gated behind one account. Full architecture: `system-design.md`. This document covers only the front-end/design layer.

The visual identity (warm cream background, serif display headings, teal/saffron/lilac accents, pill buttons, glass-panel cards) was deliberately designed against a reference image in an earlier pass (`design-qa.md`, `product-design-audit/AUDIT_NOTES.md` — that pass ended "passed"). **Nothing in this document changes the visual language.** Every sprint either finishes something half-wired, removes an inconsistency, or adds a missing interaction affordance — none introduce a new color palette, layout system, or illustration style.

**Constraint that overrides any individual ticket if they ever conflict:** this product targets mobile-first India on 3G connections (`system-design.md` §1/§3: LCP < 2.5s target). No ticket in this document adds an image asset, a video, or a JS animation library. Motion in this document means CSS transitions/keyframes only.

---

## 2. Critique summary (why these sprints exist)

| Finding | Severity | Sprint |
|---|---|---|
| `/login` and `/register` render 100% English regardless of locale | Critical | 2 |
| Heading/body fonts have no actual loading mechanism — most Android devices never see the designed typography | Critical | 1 |
| 11 hardcoded hex/rgba color occurrences (6 distinct colors) that are near-duplicates of real tokens or untokenized one-offs | High | 0 |
| Checking off a plan task waits for a server round-trip before the checkbox visually updates | High | 7 |
| `sonner` (toast) is installed but used in exactly one of 8 workspace pages | High | 7 |
| Deleting a resume experience/education block happens instantly with no confirmation and no undo | High | 8 |
| No `:disabled` styling exists for any button/input component | Medium | 7 |
| `plan.tsx` renders a raw English enum value inside a Hindi-mode chip | Medium | 3 |
| "/dashboard" is two different Hindi words in two different files | Medium | 3 |
| 6 of 8 workspace pages use full Devanagari prose; 1 file uses Romanized Hinglish; 1 sentence mixes both | Medium | 3 |
| `.route-shell` section headers are inconsistently `text-2xl` vs `text-3xl` for the same hierarchy depth | Low | 5 |
| Home page has no footer | Low | 4 |

**What's already correct and must not be changed:** the token system's design intent (`globals.css:32-60`), `applications/page.tsx`'s amber/emerald/rose status-pill convention, `plan.tsx`'s amber/rose due-date convention, `resume/page.tsx`'s save-state dot convention, the `results/page.tsx` optimistic role-selection pattern (this is the pattern Sprint 7 extends to `plan.tsx`).

---

## 3. Canonical design token reference

Source of truth: `src/app/globals.css:32-60`, `tailwind.config.ts`. No ticket introduces a color outside this table.

| Token | Value | Use for |
|---|---|---|
| `--bg-page` | `#f8f2e7` | Page background base |
| `--bg-panel` | `rgba(255, 252, 246, 0.84)` | `.glass-panel` translucent surface |
| `--bg-panel-strong` | `rgba(255, 253, 249, 0.98)` | `.card` background |
| `--bg-warm` | `#fff8ee` | Warm accent background |
| `--ink-strong` | `#17232b` | Primary text, headings |
| `--ink-soft` | `#51616c` | Body/secondary text |
| `--ink-muted` | `#5f6e78` | Tertiary/meta text, captions, eyebrow labels |
| `--border-soft` | `rgba(18, 36, 41, 0.12)` | Default border, subtle neutral fill/pill background |
| `--accent-ink` | `#0f6d66` | Primary brand accent (teal) |
| `--accent-saffron` | `#d9822b` | Secondary accent |
| `--accent-blue` | `#2c6aaf` | Tertiary accent (rare — confirm before new usage) |
| `--accent-lilac` | `#6f61f4` | Tertiary accent (rare — confirm before new usage) |
| `--brand-ink` | `#113f45` | Wordmark, auth aside, darkest brand text |
| `--wash-saffron` | `rgba(217, 130, 43, 0.16)` | Saffron tint wash |
| `--wash-forest` | `rgba(15, 109, 102, 0.1)` | Teal tint wash — subtle fills, icon badges, hover states |
| `--shadow-sm/-md/-lg/-xl` | `globals.css:49-52` | Shared elevation scale |

**Protected, non-brand semantic colors** (do not replace with the above — see §4 for the full do-not-touch list): `amber-*`, `emerald-*`, `rose-*` used for status/error/warning states.

### Typography tokens

| Token | Current stack | Status |
|---|---|---|
| `--font-heading` | `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif` | Broken on Android — Sprint 1 |
| `--font-body` | `"Aptos", "Segoe UI", "Helvetica Neue", Arial, sans-serif` | Broken on Android — Sprint 1 |
| `--font-devanagari` | `"Nirmala UI", "Mangal", "Segoe UI", sans-serif` | Lower-priority version of the same problem — Sprint 1, ticket 1.3 |

### Component class catalog (all defined in `globals.css` `@layer components`, do not redefine elsewhere)

Surfaces: `.glass-panel` `.card` `.route-shell` `.workspace-hero` `.story-card` `.metric-tile` `.step-panel` `.match-card` `.selection-option` `.auth-aside` `.auth-form-card` `.trust-tile` `.phone-shell` `.editor-frame` `.warm-note` `.badge-pill`.
Actions: `.btn-primary` `.btn-secondary` `.btn-outline` `.input-field`.
Text: `.eyebrow-copy` `.heritage-quote`.
Chat: `.assistant-bubble` `.user-bubble`.
Chips: `.accent-chip` `.surface-chip`.
Layout: `.container-main` `.section-shell` `.journey-grid` `.workspace-section` `.metric-strip` `.progress-orbit` (+`__ring`).
Mobile nav/FAB: `.has-bottom-nav` `.coach-fab` `.pb-safe` (in `@layer utilities`).

---

## 4. Protected colors — no ticket touches these

- `applications/page.tsx` lines 38-43 (`STATUS_STYLES`) — amber/emerald/rose for interview/offered/rejected.
- `plan.tsx` lines 46-63 (`getDueDateLabel`) — amber for due-today/due-soon, rose for overdue.
- `resume/page.tsx` lines 399-406 — save-state dot: red→rose/emerald/amber for error/saved/pending (rose conversion happens in Sprint 0, ticket 0.5 — that's a same-family swap, not a brand-color conversion; still protected from ever becoming a brand teal/saffron color).
- Any `rose-*`/`amber-*`/`emerald-*` used for form validation or status anywhere in this codebase.

---

## 5. Redesign principles

1. Evolution, not revolution — no new visual language.
2. Fix the foundation (fonts, i18n) before polish (heading scale, footer).
3. One canonical way to do each thing — where this audit found 3-5 ways of achieving the same result, pick one, don't add a 6th.
4. Don't invent new semantic colors — reuse rose/amber/emerald for any future error/warning/success state.
5. Every interaction added in Sprint 7/8 must degrade gracefully with JS disabled or on a slow connection — optimistic updates must roll back on failure, never leave the UI in a state that contradicts the server.

---

## Sprint 0 — Finish the color-token migration

**Goal:** remove the remaining hardcoded hex/rgba colors that are near-duplicates of real tokens or untokenized one-offs.

### Ticket 0.1
**FILE:** `src/app/results/page.tsx`
**LOCATE:** `grep -n "bg-\[#d97b2f\]" src/app/results/page.tsx` → expect exactly 1 match.
**DIFF:**
```diff
-                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d97b2f] text-base font-semibold text-white">
+                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-saffron)] text-base font-semibold text-white">
```
**WHY:** `#d97b2f` is a near-duplicate of `--accent-saffron` (`#d9822b`), not the real token.
**VERIFY:** `grep -n "#d97b2f" src/app/results/page.tsx` → no output.

### Ticket 0.2
**FILE:** `src/app/results/page.tsx`
**LOCATE:** `grep -n "text-\[#103f44\]" src/app/results/page.tsx` → expect exactly 2 matches.
**DIFF (apply to both matches found by the LOCATE command above):**
```diff
-                        <h2 className="text-2xl text-[#103f44]">
+                        <h2 className="text-2xl text-[var(--brand-ink)]">
```
```diff
-                    <p className="text-sm font-semibold text-[#103f44]">
+                    <p className="text-sm font-semibold text-[var(--brand-ink)]">
```
**WHY:** `#103f44` is a near-duplicate of `--brand-ink` (`#113f45`).
**VERIFY:** `grep -n "#103f44" src/app/results/page.tsx` → no output.

### Ticket 0.3
**FILE:** `src/app/interview/page.tsx`
**LOCATE:** `grep -n "bg-\[#d97b2f\]" src/app/interview/page.tsx` → expect exactly 1 match.
**DIFF:**
```diff
-                    <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#d97b2f] text-xs font-semibold text-white">
+                    <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-saffron)] text-xs font-semibold text-white">
```
**WHY:** same near-duplicate-saffron issue as ticket 0.1, separate file.
**VERIFY:** `grep -n "#d97b2f" src/app/interview/page.tsx` → no output.

### Ticket 0.4
**FILE:** `src/app/resume/page.tsx`
**LOCATE:** `grep -n "rgba(10,90,96" src/app/resume/page.tsx` → expect exactly 1 match.
**DIFF:**
```diff
-              <div className="rounded-[1.6rem] border border-[rgba(10,90,96,0.14)] bg-[rgba(255,255,255,0.78)] p-5">
+              <div className="rounded-[1.6rem] border border-[var(--accent-ink)]/14 bg-[rgba(255,255,255,0.78)] p-5">
```
**WHY:** `rgba(10, 90, 96, ...)` is the decimal form of hex `#0a5a60` — the same rogue color fixed elsewhere as a hex literal in a previous pass, missed here because it was spelled differently. This is the only place in the codebase where it appears in decimal form — confirmed by the LOCATE command above returning exactly 1 match.
**VERIFY:** `grep -n "rgba(10,90,96\|rgba(10, 90, 96" src/app/resume/page.tsx` → no output.

### Ticket 0.5
**FILE:** `src/app/career-fit-check/page.tsx`
**LOCATE:** `grep -n "bg-\[#e6ece9\]" src/app/career-fit-check/page.tsx` → expect exactly 1 match.
**DIFF:**
```diff
-          <div className="mt-6 h-3 rounded-full bg-[#e6ece9]">
+          <div className="mt-6 h-3 rounded-full bg-[var(--border-soft)]">
```
**WHY:** `#e6ece9` (progress-bar track) has no matching token and no reason to be a one-off — `--border-soft` is the established neutral-fill token used for this exact purpose elsewhere.
**VERIFY:** `grep -n "#e6ece9" src/app/career-fit-check/page.tsx` → no output.

### Ticket 0.6
**FILE:** `src/app/results/page.tsx`
**LOCATE:** `grep -n "#e8f7ed" src/app/results/page.tsx` → expect exactly 1 match.
**DIFF:**
```diff
-                      <span className="rounded-full bg-[#e8f7ed] px-3 py-1 text-xs font-semibold text-[#18794e]">
+                      <span className="rounded-full bg-[var(--wash-forest)] px-3 py-1 text-xs font-semibold text-[var(--accent-ink)]">
```
**WHY:** this badge means "this role fits you well" — a brand-confidence statement, not a pass/fail system status, so it belongs in brand teal rather than an untokenized system-green. (This was a DECISION REQUIRED point in an earlier draft of this spec; the decision has been made — apply this diff as final.)
**VERIFY:** `grep -n "#e8f7ed\|#18794e" src/app/results/page.tsx` → no output.

### Ticket 0.7
**FILE:** `src/app/resume/page.tsx`
**LOCATE:** `grep -n "bg-\[#fffefb\]" src/app/resume/page.tsx` → expect exactly 1 match.
**DIFF:**
```diff
-            <div className="route-shell space-y-5 bg-[#fffefb]">
+            <div className="route-shell space-y-5 bg-white/90">
```
**WHY:** `#fffefb` is a flat near-white that duplicates what `bg-white/90` already does for the same visual purpose elsewhere in this same file (e.g. the `aside` panel two sections below uses `.card bg-white`, and other `.route-shell` instances in sibling files use `bg-white/90`).
**VERIFY:** `grep -n "#fffefb" src/app/resume/page.tsx` → no output.

### Ticket 0.8
**FILE:** `src/app/interview/page.tsx`
**LOCATE:** `grep -n "bg-\[#fffefb\]" src/app/interview/page.tsx` → expect exactly 3 matches.
**DIFF (apply identically to all 3 matches):**
```diff
-            <div className="route-shell bg-[#fffefb]">
+            <div className="route-shell bg-white/90">
```
(Note: one of the 3 matches is `<div className="route-shell space-y-4 bg-[#fffefb]">` — same substitution, `bg-[#fffefb]` → `bg-white/90`, the rest of the className string is unchanged.)
**WHY:** same as 0.7 — this file already uses `bg-white/90` for two other `.route-shell` instances (the right-hand column); these three should match.
**VERIFY:** `grep -n "#fffefb" src/app/interview/page.tsx` → no output.

### Ticket 0.9
**FILE:** `src/app/resume/page.tsx`
**LOCATE:** `grep -n "bg-red-500" src/app/resume/page.tsx` → expect exactly 1 match.
**DIFF:**
```diff
                   className={`h-3 w-3 rounded-full ${
                     saveState === 'error'
-                      ? 'bg-red-500'
+                      ? 'bg-rose-500'
```
**WHY:** standardizing the error-color family on `rose-*`, which is already the majority pattern in this file and in `applications/page.tsx`/`plan.tsx`.
**VERIFY:** `grep -n "bg-red-500" src/app/resume/page.tsx` → no output.

### Ticket 0.10
**FILE:** `src/components/auth/LoginForm.tsx`
**LOCATE:** `grep -n "text-red-600\|border-red-200\|bg-red-50\|text-red-700" src/components/auth/LoginForm.tsx` → expect exactly 3 matches.
**DIFF:**
```diff
           {errors.email ? (
-            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
+            <p className="mt-1 text-sm text-rose-600">{errors.email.message}</p>
           ) : null}
```
```diff
           {errors.password ? (
-            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
+            <p className="mt-1 text-sm text-rose-600">{errors.password.message}</p>
           ) : null}
```
```diff
         {errors.root ? (
-          <div className="rounded-[1.2rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
+          <div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
             {errors.root.message}
           </div>
         ) : null}
```
**WHY:** same red→rose standardization as ticket 0.9, applied to the auth forms.
**VERIFY:** `grep -n "red-600\|red-200\|red-50\|red-700" src/components/auth/LoginForm.tsx` → no output.

### Ticket 0.11
**FILE:** `src/components/auth/RegisterForm.tsx`
**LOCATE:** `grep -n "text-red-600\|border-red-200\|bg-red-50\|text-red-700" src/components/auth/RegisterForm.tsx` → expect exactly 5 matches.
**DIFF:** apply the identical substitution as ticket 0.10 (`red-600`→`rose-600`, `red-200`→`rose-200`, `red-50`→`rose-50`, `red-700`→`rose-700`) to all 5 occurrences — 4 are `<p className="mt-1 text-sm text-red-600">{errors.<field>.message}</p>` for fields `name`, `email`, `password`, `confirmPassword`; 1 is the `errors.root` block identical in structure to ticket 0.10's third diff.
**WHY:** same as 0.10.
**VERIFY:** `grep -n "red-600\|red-200\|red-50\|red-700" src/components/auth/RegisterForm.tsx` → no output.

### Sprint 0 — final verification
```bash
grep -rn "#d97b2f\|#103f44\|#e6ece9\|#fffefb\|#e8f7ed\|#18794e" src/app src/components
grep -rEn "rgba\(\s*10,\s*90,\s*96" src/app src/components
grep -rn "red-500\|red-600\|red-200\|red-50\|red-700" src/app/resume/page.tsx src/components/auth/LoginForm.tsx src/components/auth/RegisterForm.tsx
npx tsc --noEmit -p tsconfig.typecheck.json
```
All four commands must return no output. Sprint 0 is not done until they do.

---

## Sprint 1 — Real font loading

**Goal:** make `--font-heading` and `--font-body` actually load on devices without Apple/Microsoft system fonts (i.e. most Android phones — the majority of this product's target market per `system-design.md` §1). Uses `next/font/google`, which ships with the already-installed `next` package — no new dependency.

### Ticket 1.1
**FILE:** `src/app/layout.tsx`
**LOCATE:** `grep -n "import type { Metadata }" src/app/layout.tsx` → expect exactly 1 match (this is the first import line; the new font imports go directly after it).
**DIFF:**
```diff
 import type { Metadata } from 'next';
+import { Lora, Inter } from 'next/font/google';
 import { Toaster } from 'sonner';
```
**WHY:** import the two font loaders at the top of the file, before any component code.
**VERIFY:** `grep -n "next/font/google" src/app/layout.tsx` → 1 match.

### Ticket 1.2
**FILE:** `src/app/layout.tsx`
**LOCATE:** `grep -n "^export const metadata" src/app/layout.tsx` → expect exactly 1 match (the new font config objects go directly before this line).
**DIFF:**
```diff
+const lora = Lora({
+  subsets: ['latin'],
+  weight: ['500', '600', '700'],
+  variable: '--font-heading-loaded',
+  display: 'swap',
+});
+
+const inter = Inter({
+  subsets: ['latin'],
+  weight: ['400', '500', '600', '700'],
+  variable: '--font-body-loaded',
+  display: 'swap',
+});
+
 export const metadata: Metadata = {
```
**WHY:** `next/font/google` requires the font loader to be called at module scope (not inside the component) — these two constants are the exact pattern Next.js requires.
**VERIFY:** `grep -n "font-heading-loaded\|font-body-loaded" src/app/layout.tsx` → 2 matches.

### Ticket 1.3
**FILE:** `src/app/layout.tsx`
**LOCATE:** `grep -n "<html lang=\"en\">" src/app/layout.tsx` → expect exactly 1 match.
**DIFF:**
```diff
-    <html lang="en">
+    <html lang="en" className={`${lora.variable} ${inter.variable}`}>
```
**WHY:** the font CSS variables (`--font-heading-loaded`, `--font-body-loaded`) only exist on elements that have the loader's `.variable` className applied — putting it on `<html>` makes them available everywhere.
**VERIFY:** `grep -n "lora.variable" src/app/layout.tsx` → 1 match.

### Ticket 1.4
**FILE:** `src/app/globals.css`
**LOCATE:** `grep -n '\-\-font-heading:' src/app/globals.css` → expect exactly 1 match.
**DIFF:**
```diff
-    --font-heading: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
-    --font-body: "Aptos", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
+    --font-heading: var(--font-heading-loaded), "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
+    --font-body: var(--font-body-loaded), "Segoe UI", "Helvetica Neue", Arial, sans-serif;
```
**WHY:** putting the self-hosted font variable first keeps Apple devices on `"Iowan Old Style"` if they have it (matches original design intent — the loaded Lora is normally never reached there because the browser finds Iowan Old Style first... actually no: CSS font-family fallback always tries each name in the browser's *installed-font* check first, regardless of order relative to a loaded webfont, UNLESS the loaded font is listed first, in which case the browser uses the *loaded* font immediately without checking for installed fonts named later in the list. Putting `var(--font-heading-loaded)` first means Lora is used everywhere, including on Apple devices that have Iowan Old Style — this is intentional: it guarantees one consistent rendered typeface across every device instead of two different ones split by OS.) `"Aptos"` is dropped entirely since it's a closed Microsoft font almost no user has and Inter loading correctly makes it moot.
**VERIFY:** `grep -n "font-heading-loaded\|font-body-loaded" src/app/globals.css` → 2 matches.

### Ticket 1.5 (lower priority — do not skip 1.1-1.4 to get here, but do not skip this either without flagging why)
**FILE:** `src/app/layout.tsx` and `src/app/globals.css`
Add `Noto_Sans_Devanagari` via the identical pattern as 1.1-1.4 (`variable: '--font-devanagari-loaded'`), and in `globals.css` change:
**LOCATE:** `grep -n '\-\-font-devanagari:' src/app/globals.css` → expect exactly 1 match.
**DIFF:**
```diff
-    --font-devanagari: "Nirmala UI", "Mangal", "Segoe UI", sans-serif;
+    --font-devanagari: var(--font-devanagari-loaded), "Nirmala UI", "Mangal", "Segoe UI", sans-serif;
```
**WHY:** same problem class as 1.1/1.2, lower urgency because Android's default system font handles Devanagari reasonably already.
**VERIFY:** `grep -n "font-devanagari-loaded" src/app/globals.css src/app/layout.tsx` → 2 matches (one per file).

### Sprint 1 — final verification
```bash
grep -n "next/font/google" src/app/layout.tsx
grep -n "font-heading-loaded\|font-body-loaded" src/app/globals.css
npx tsc --noEmit -p tsconfig.typecheck.json
npm run build
```
Then start the dev server and visually confirm headings render as a humanist serif distinct from the browser's plain default serif (Lora has visible character — curved terminals, moderate contrast — unlike Georgia/Times). Open browser devtools Network tab, filter for `.woff2`, confirm at least 2 font files load from `/_next/static/media/`.

---

## Sprint 2 — Bilingual auth screens

**Goal:** `/login` and `/register` honor the selected locale. This is the highest-priority sprint in this document — confirmed before writing this sprint: `LoginForm.tsx`, `RegisterForm.tsx`, `AuthScaffold.tsx`, `login/page.tsx`, and `register/page.tsx` all currently have zero `locale`-conditional rendering.

**Structural fact this sprint depends on (verified, not assumed):** `src/app/login/page.tsx` and `src/app/register/page.tsx` are Server Components — they `export const metadata = {...}`, which is only legal in a Server Component. `getStoredLocale()` (`src/lib/client-session.ts:214-225`) returns the hardcoded literal `'en'` whenever `typeof window === 'undefined'`, which is always true during server rendering — so a Server Component can never know the real locale. **Tickets 2.1 and 2.2 therefore extract the page body into a new Client Component, leaving a thin Server Component behind that only holds the `metadata` export.** This is the standard Next.js App Router pattern for "this page needs metadata AND client-side hooks" — do not attempt to add `'use client'` directly to `page.tsx`, it will break the `metadata` export and fail the build.

### Ticket 2.1 — Split `login/page.tsx`
**Step A — create a new file** `src/components/auth/LoginPageContent.tsx` with exactly this content:
```tsx
'use client';

import { Suspense } from 'react';
import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAppStore } from '@/lib/store';

export function LoginPageContent() {
  const locale = useAppStore((state) => state.locale);
  const copy = (en: string, hi: string) => (locale === 'en' ? en : hi);

  return (
    <AuthScaffold
      eyebrow={copy('Save your progress', 'अपनी प्रगति सेव रखें')}
      title={copy(
        'Welcome back to your one calm job-readiness system.',
        'अपने एक ही व्यवस्थित जॉब-रेडीनेस सिस्टम में फिर से स्वागत है।'
      )}
      subtitle={copy(
        'Sign in to reopen your fit check, resume draft, weekly plan, and application momentum without starting over.',
        'अपनी योग्यता जाँच, जीवनवृत्त प्रारूप, साप्ताहिक योजना और आवेदन प्रगति को फिर से खोलने के लिए साइन इन करें।'
      )}
    >
      <div className="w-full">
        <div className="mb-8 text-center">
          <p className="eyebrow-copy">{copy('Save your progress', 'अपनी प्रगति सेव रखें')}</p>
          <h1 className="mt-3 text-4xl text-[var(--brand-ink)]">{copy('Sign in', 'साइन इन करें')}</h1>
          <p className="mt-2 text-[var(--ink-soft)]">
            {copy('Welcome back to Job Readiness Coach', 'जॉब रेडीनेस कोच में फिर से स्वागत है')}
          </p>
        </div>

        <Suspense fallback={<div>{copy('Loading...', 'लोड हो रहा है...')}</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </AuthScaffold>
  );
}
```
**Step B — replace the entire content of** `src/app/login/page.tsx` **with exactly this:**
```tsx
import { LoginPageContent } from '@/components/auth/LoginPageContent';

export const metadata = {
  title: 'Sign In - Job Readiness Coach',
  description: 'Sign in to your Job Readiness Coach account',
};

export default function LoginPage() {
  return <LoginPageContent />;
}
```
**WHY:** this is the only legal way to keep a static `metadata` export (Server Component requirement) on a page whose body needs `useAppStore` (Client Component requirement).
**VERIFY:** `grep -n "use client" src/components/auth/LoginPageContent.tsx` → 1 match. `grep -n "export const metadata" src/app/login/page.tsx` → 1 match. `npx tsc --noEmit -p tsconfig.typecheck.json` → no output.

### Ticket 2.2 — Split `register/page.tsx`
**Step A — create** `src/components/auth/RegisterPageContent.tsx` with exactly this content:
```tsx
'use client';

import { Suspense } from 'react';
import { AuthScaffold } from '@/components/auth/AuthScaffold';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useAppStore } from '@/lib/store';

export function RegisterPageContent() {
  const locale = useAppStore((state) => state.locale);
  const copy = (en: string, hi: string) => (locale === 'en' ? en : hi);

  return (
    <AuthScaffold
      eyebrow={copy('Keep your progress', 'अपनी प्रगति बनाए रखें')}
      title={copy(
        'Start with one free account, then move from confusion to a realistic first role.',
        'एक मुफ़्त खाते से शुरुआत करें, फिर अनिश्चितता से एक व्यावहारिक पहली भूमिका की ओर बढ़ें।'
      )}
      subtitle={copy(
        'Create your account to unlock the fit check, top role matches, a role-aware resume draft, and a weekly plan that stays saved.',
        'योग्यता जाँच, उपयुक्त भूमिकाओं, भूमिका-आधारित जीवनवृत्त प्रारूप और सुरक्षित साप्ताहिक योजना को अनलॉक करने के लिए अपना खाता बनाएँ।'
      )}
    >
      <div className="w-full">
        <div className="mb-8 text-center">
          <p className="eyebrow-copy">{copy('Keep your progress', 'अपनी प्रगति बनाए रखें')}</p>
          <h1 className="mt-3 text-4xl text-[var(--brand-ink)]">{copy('Create account', 'खाता बनाएँ')}</h1>
          <p className="mt-2 text-[var(--ink-soft)]">
            {copy('Build your job-readiness workspace once', 'अपना जॉब-रेडीनेस कार्यस्थल एक बार बनाएँ')}
          </p>
        </div>

        <Suspense fallback={<div>{copy('Loading...', 'लोड हो रहा है...')}</div>}>
          <RegisterForm />
        </Suspense>
      </div>
    </AuthScaffold>
  );
}
```
**Step B — replace the entire content of** `src/app/register/page.tsx` **with exactly this:**
```tsx
import { RegisterPageContent } from '@/components/auth/RegisterPageContent';

export const metadata = {
  title: 'Register - Job Readiness Coach',
  description: 'Create a new Job Readiness Coach account',
};

export default function RegisterPage() {
  return <RegisterPageContent />;
}
```
**WHY:** same reasoning as ticket 2.1.
**VERIFY:** `grep -n "use client" src/components/auth/RegisterPageContent.tsx` → 1 match. `grep -n "export const metadata" src/app/register/page.tsx` → 1 match. `npx tsc --noEmit -p tsconfig.typecheck.json` → no output.

### Ticket 2.3 — Localize `AuthScaffold.tsx`
**FILE:** `src/components/auth/AuthScaffold.tsx`
**LOCATE:** `grep -n "^import" src/components/auth/AuthScaffold.tsx` → expect exactly 2 matches (the file currently has no `'use client'` directive — confirmed by reading the full file; it starts directly with `import type { ReactNode } from 'react';`).
**DIFF (full-file replacement — the changes touch enough of the file that a line-diff would be harder to apply correctly than a full replacement; this is the complete target content):**
```tsx
'use client';

import type { ReactNode } from 'react';
import { BrandWordmark } from '@/components/BrandWordmark';
import { useAppStore } from '@/lib/store';

interface AuthScaffoldProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

const promisePoints: { en: string; hi: string }[] = [
  { en: 'Clear role matches instead of vague career advice', hi: 'अस्पष्ट करियर सलाह नहीं, बल्कि उपयुक्त भूमिकाओं के स्पष्ट सुझाव' },
  { en: 'Resume co-writing tied to your chosen direction', hi: 'आपकी चुनी हुई दिशा के अनुसार जीवनवृत्त सह-लेखन' },
  { en: 'Weekly plan, applications, and interview prep in one place', hi: 'साप्ताहिक योजना, आवेदन और साक्षात्कार की तैयारी एक ही जगह' },
];

const trustPoints: { en: string; hi: string }[] = [
  { en: 'No payment required', hi: 'कोई भुगतान आवश्यक नहीं' },
  { en: 'Progress saved to your account', hi: 'प्रगति आपके खाते में सुरक्षित रहती है' },
  { en: 'Made for first-job seekers', hi: 'पहली नौकरी खोजने वालों के लिए बनाया गया' },
];

export function AuthScaffold({
  eyebrow,
  title,
  subtitle,
  children,
}: AuthScaffoldProps) {
  const locale = useAppStore((state) => state.locale);

  return (
    <main className="section-shell">
      <div className="container-main">
        <div className="auth-layout">
          <section className="auth-aside">
            <div className="space-y-6">
              <BrandWordmark compact />
              <div className="heritage-quote">
                {/* Intentional: brand tagline stays Hinglish in both locales, the way a wordmark would. */}
                <p className="text-xl text-[var(--brand-ink)] sm:text-2xl">
                  Taiyari aaj ki, behtar kal ka.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <p className="eyebrow-copy">{eyebrow}</p>
              <h1 className="text-4xl leading-[1.02] text-[var(--brand-ink)] sm:text-5xl">
                {title}
              </h1>
              <p className="max-w-xl text-base leading-8 text-[var(--ink-soft)]">
                {subtitle}
              </p>
            </div>

            <div className="grid gap-1 border-y border-[var(--border-soft)] md:grid-cols-3">
              {promisePoints.map((item, index) => (
                <article
                  className="flex min-h-[8rem] gap-4 border-b border-[var(--border-soft)] px-2 py-5 last:border-b-0 md:border-b-0 md:border-r md:px-5 md:last:border-r-0"
                  key={item.en}
                >
                  <span className="pt-1 text-xs font-bold tracking-[0.16em] text-[var(--accent-saffron)]">
                    0{index + 1}
                  </span>
                  <p className="text-lg leading-7 text-[var(--brand-ink)]">{item[locale]}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {trustPoints.map((item) => (
                <div className="trust-tile" key={item.en}>
                  <span className="trust-tile__badge" />
                  <span>{item[locale]}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="auth-form-card">{children}</section>
        </div>
      </div>
    </main>
  );
}
```
**WHY:** adds `'use client'` (required for `useAppStore`), converts `promisePoints`/`trustPoints` to bilingual objects, keeps the Hinglish tagline as an explicit, commented decision rather than an unlabeled gap. `key={item}` changed to `key={item.en}` since `item` is now an object, not a string — using it directly as a React key would render `[object Object]` and break key uniqueness warnings.
**VERIFY:** `grep -n "use client" src/components/auth/AuthScaffold.tsx` → 1 match, must be line 1. `grep -n "useAppStore" src/components/auth/AuthScaffold.tsx` → 2 matches (import + call). `npx tsc --noEmit -p tsconfig.typecheck.json` → no output.

### Ticket 2.4 — Localize `LoginForm.tsx`
**FILE:** `src/components/auth/LoginForm.tsx`
**LOCATE:** `grep -n "export function LoginForm" src/components/auth/LoginForm.tsx` → expect exactly 1 match.
**DIFF (add the locale read and `copy` helper right after the existing hook calls):**
```diff
 export function LoginForm() {
   const router = useRouter();
   const searchParams = useSearchParams();
+  const locale = useAppStore((state) => state.locale);
+  const copy = (en: string, hi: string) => (locale === 'en' ? en : hi);
```
Add the import:
```diff
 import { logger } from '@/lib/logger';
 import { setStoredUser } from '@/lib/client-session';
 import { captureProductEvent, identifyProductUser } from '@/lib/analytics';
+import { useAppStore } from '@/lib/store';
```
Then apply these exact string-level replacements (each is a distinct, separately-locatable line — run the grep shown before each, it must match exactly once):
1. `grep -n ">Email Address<" src/components/auth/LoginForm.tsx` → DIFF: `-            Email Address` / `+            {copy('Email Address', 'ईमेल पता')}`
2. `grep -n "{errors.email.message}" src/components/auth/LoginForm.tsx` → DIFF: `-            <p className="mt-1 text-sm text-rose-600">{errors.email.message}</p>` / `+            <p className="mt-1 text-sm text-rose-600">{copy('Enter a valid email address', 'एक मान्य ईमेल पता दर्ज करें')}</p>` (this line's color class assumes ticket 0.10 already ran — if it still says `text-red-600` because Sprint 0 hasn't run yet, match on `text-red-600` instead and leave the color as-is; do not silently "fix" the color here, that's Sprint 0's job, not Sprint 2's)
3. `grep -n ">Password<" src/components/auth/LoginForm.tsx` → DIFF: `-            Password` / `+            {copy('Password', 'पासवर्ड')}`
4. `grep -n "{errors.password.message}" src/components/auth/LoginForm.tsx` → DIFF: same pattern as #2, target text `copy('Password is required', 'पासवर्ड आवश्यक है')`
5. `grep -n "Signing in...' : 'Sign in'" src/components/auth/LoginForm.tsx` → DIFF: `-          {isSubmitting ? 'Signing in...' : 'Sign in'}` / `+          {isSubmitting ? copy('Signing in...', 'साइन इन हो रहा है...') : copy('Sign in', 'साइन इन')}`
6. `grep -n "Use your account to reopen" src/components/auth/LoginForm.tsx` → DIFF: `-          Use your account to reopen saved progress, results, and resume edits across devices.` / `+          {copy('Use your account to reopen saved progress, results, and resume edits across devices.', 'अपने खाते से सेव की गई प्रगति, परिणाम और जीवनवृत्त के बदलाव किसी भी डिवाइस पर खोलें।')}`
7. `grep -n "Don&apos;t have an account?" src/components/auth/LoginForm.tsx` → DIFF: `-          Don&apos;t have an account?{' '}` / `+          {copy("Don't have an account?", 'खाता नहीं है?')}{' '}`
8. `grep -n ">Register here<" src/components/auth/LoginForm.tsx` → DIFF: `-            Register here` / `+            {copy('Register here', 'यहाँ रजिस्टर करें')}`

**Do NOT touch** `errors.root.message` (rendered from the `catch` block's server-driven `message`, not from zod) — localizing API error responses is out of scope for this sprint.
**WHY:** mechanical replacement of every hardcoded string with the `copy()` helper, matching the exact pattern `dashboard/page.tsx:76` already established for this same purpose.
**VERIFY:** `grep -c "copy(" src/components/auth/LoginForm.tsx` → at least 9 (1 helper definition + 8 call sites above — `grep -c` counts matching lines, and step 7's line has both `copy(` and a literal apostrophe-containing string, still counts as 1 line). `grep -n "useAppStore" src/components/auth/LoginForm.tsx` → 2 matches. `npx tsc --noEmit -p tsconfig.typecheck.json` → no output.

### Ticket 2.5 — Localize `RegisterForm.tsx`
**FILE:** `src/components/auth/RegisterForm.tsx`
Apply the identical mechanical pattern as ticket 2.4: add `const locale = useAppStore((state) => state.locale);` and the same `copy` helper after the existing hooks, import `useAppStore`, then replace:
- `Full Name` → `{copy('Full Name', 'पूरा नाम')}`
- `{errors.name.message}` → `{copy('Name must be at least 2 characters', 'नाम कम से कम 2 अक्षर का होना चाहिए')}`
- `Email Address` → `{copy('Email Address', 'ईमेल पता')}`
- `{errors.email.message}` (in this file) → `{copy('Enter a valid email address', 'एक मान्य ईमेल पता दर्ज करें')}`
- `Password` (the field label, not "Confirm Password") → `{copy('Password', 'पासवर्ड')}`
- `{errors.password.message}` → `{copy('Password must be at least 8 characters', 'पासवर्ड कम से कम 8 अक्षर का होना चाहिए')}`
- `Confirm Password` → `{copy('Confirm Password', 'पासवर्ड की पुष्टि करें')}`
- `{errors.confirmPassword.message}` → `{copy('Please confirm your password', 'कृपया अपने पासवर्ड की पुष्टि करें')}` (this message also fires for the `.refine()` mismatch case, whose schema message is `'Passwords do not match'` — since this ticket renders a static string keyed only on the error's presence, not its message, both the "missing" and "mismatch" zod errors on this field will show the same Hindi/English confirm-password text. If you want them distinguishable, that's a DECISION REQUIRED follow-up, not part of this ticket — ship the single shared message.)
- `{isSubmitting ? 'Creating account…' : 'Create account'}` → `{isSubmitting ? copy('Creating account…', 'खाता बनाया जा रहा है…') : copy('Create account', 'खाता बनाएँ')}`
- `Your progress, results, and resume will be saved to this account and accessible from any device.` → wrap in `copy(...)` with Hindi: `'आपकी प्रगति, परिणाम और जीवनवृत्त इस खाते में सुरक्षित रहेंगे और किसी भी डिवाइस से उपलब्ध होंगे।'`
- `Already have an account?` → `{copy('Already have an account?', 'पहले से खाता है?')}`
- `Sign in` (the link text, not a button) → `{copy('Sign in', 'साइन इन करें')}`

**Do NOT touch** `errors.root.message` — same reasoning as ticket 2.4.
**VERIFY:** `grep -c "copy(" src/components/auth/RegisterForm.tsx` → at least 12. `npx tsc --noEmit -p tsconfig.typecheck.json` → no output.

### Sprint 2 — final verification
```bash
grep -n "locale" src/components/auth/LoginForm.tsx src/components/auth/RegisterForm.tsx src/components/auth/AuthScaffold.tsx src/components/auth/LoginPageContent.tsx src/components/auth/RegisterPageContent.tsx
npx tsc --noEmit -p tsconfig.typecheck.json
npm run build
```
The first command must show multiple matches in every one of the 5 files. The build must succeed — this is the command that will actually catch a `metadata`-export-in-Client-Component mistake if tickets 2.1/2.2 were done wrong. Then manually: toggle to हिंदी anywhere in the app, navigate to `/login` and `/register`, confirm every visible string — aside panel, trust bullets, form labels, button text, validation errors triggered by submitting empty fields — is in Hindi.

---

## Sprint 3 — Copy & terminology consistency

### Ticket 3.1 — Translate `plan.tsx`'s task category chip
**FILE:** `src/app/plan/page.tsx`
**LOCATE:** `grep -n "^const CATEGORY_ICONS" src/app/plan/page.tsx` → expect exactly 1 match.
**DIFF (insert a new constant directly after `CATEGORY_ICONS`):**
```diff
 const CATEGORY_ICONS = {
   skill: BookOpen,
   assessment: Target,
   networking: Users,
   project: FolderKanban,
 };
+
+const CATEGORY_LABELS: Record<NonNullable<PlanTask['category']>, Record<Locale, string>> = {
+  skill: { en: 'Skill', hi: 'कौशल' },
+  assessment: { en: 'Assessment', hi: 'मूल्यांकन' },
+  networking: { en: 'Networking', hi: 'संपर्क' },
+  project: { en: 'Project', hi: 'परियोजना' },
+};
```
**WHY:** these 4 Hindi words are not new — they're copy-pasted verbatim from this same file's metric-tile labels (`grep -n "'कौशल'\|'मूल्यांकन'\|'संपर्क'\|'परियोजना'" src/app/plan/page.tsx` will show the existing usages this reuses).
**VERIFY:** `grep -n "CATEGORY_LABELS" src/app/plan/page.tsx` → at least 2 matches (the new constant + its usage from the next diff).

**LOCATE (second part of this ticket):** `grep -n "{task.category}" src/app/plan/page.tsx` → expect exactly 1 match.
**DIFF:**
```diff
                       <span className="inline-flex items-center gap-1 accent-chip">
                         {CatIcon ? <CatIcon aria-hidden="true" size={11} /> : null}
-                        {task.category}
+                        {CATEGORY_LABELS[task.category][locale]}
                       </span>
```
**WHY:** `{task.category}` currently renders the raw English object key (`skill`, `project`, etc.) verbatim, even in Hindi mode.
**VERIFY:** `grep -n "{task.category}$" src/app/plan/page.tsx` → no output (the literal raw-render is gone; `task.category` may still appear as an object-key lookup like `CATEGORY_LABELS[task.category]`, which is correct and expected).

### Ticket 3.2 — Unify "/dashboard" terminology in Hindi
**FILE:** `src/app/profile/page.tsx`
**LOCATE:** `grep -n "डैशबोर्ड" src/app/profile/page.tsx` → expect exactly 1 match.
**DIFF:**
```diff
-            {locale === 'en' ? 'Back to dashboard' : 'डैशबोर्ड पर वापस'}
+            {locale === 'en' ? 'Back to dashboard' : 'कार्यस्थल पर वापस जाएँ'}
```
**WHY:** every other reference to `/dashboard` in Hindi uses "कार्यस्थल" (workspace) — `Navigation.tsx`, `dashboard/page.tsx`, `plan/page.tsx`'s identical "कार्यस्थल पर वापस जाएँ" link text. This ticket matches the exact phrasing already used in `plan/page.tsx`, not just the same word.
**VERIFY:** `grep -n "डैशबोर्ड" src/app/profile/page.tsx` → no output.

### Ticket 3.3 — DECISION REQUIRED: Devanagari vs. Hinglish convention
**Do not execute this ticket's edits without an explicit go-ahead from the repo owner first — surface the question below and wait for an answer.**

**The question:** `career-fit-check.tsx`, `results.tsx`, `plan.tsx`, `applications.tsx`, `interview.tsx`, `profile.tsx` (6 files) use full Devanagari prose for Hindi body copy. `dashboard.tsx` uses Romanized Hinglish (e.g. `'Fit check poori karein'`). `resume.tsx` mixes both inside one sentence (`grep -n "अभी selected है" src/app/resume/page.tsx` → 1 match). Pick one:
- **(A) Standardize on Devanagari** (matches 6 of 8 files and the home page) — rewrite `dashboard.tsx`'s Hindi values and the mixed sentence in `resume.tsx` into Devanagari, preserving meaning exactly.
- **(B) Standardize on Hinglish** — rewrite the other 6 files' Hindi values into Romanized Hinglish instead.

**If the answer is (A):**
**FILE:** `src/app/resume/page.tsx`
**LOCATE:** `grep -n "अभी selected है" src/app/resume/page.tsx` → expect exactly 1 match.
**DIFF:**
```diff
-                    : `${headerTitle} अभी selected है, इसलिए draft generic fresher resume की जगह उसी path के लिए tuned है।`
+                    : `${headerTitle} अभी चुनी गई भूमिका है, इसलिए यह प्रारूप सामान्य जीवनवृत्त की जगह उसी दिशा के लिए तैयार किया गया है।`
```
Then in `src/app/dashboard/page.tsx`, every `copy(en, hi)` call whose `hi` argument is Romanized (e.g. `copy('Fit check poori karein', '...)`) gets its `hi` argument rewritten to Devanagari with identical meaning — reuse vocabulary already established elsewhere in the app (e.g. "योग्यता जाँच" for "fit check" — see `results/page.tsx`'s `'योग्यता जाँच शुरू करें'`/`'योग्यता जाँच फिर से करें'`) rather than inventing new phrasing. There is no single LOCATE/DIFF pair for this part — it touches every `journeySteps` and `nextStep` Hindi string in `dashboard/page.tsx` (roughly lines 104-202 as of this audit; re-locate by running `grep -n "copy(" src/app/dashboard/page.tsx` and reviewing each `hi` argument for Romanized text).

**If the answer is (B):** do the reverse — rewrite the Hindi values in the 6 Devanagari files into Hinglish. This is a larger surface area; if chosen, this becomes its own ticket-by-ticket breakdown (one per file) rather than a single ticket — ask for that breakdown to be written before starting, don't improvise it.

**Either way: do not leave this half-done.** Fixing `resume.tsx`'s mixed sentence without also resolving the dashboard-vs-rest split just relocates the inconsistency.

### Sprint 3 — final verification
```bash
grep -n "{task.category}$" src/app/plan/page.tsx
grep -n "डैशबोर्ड" src/app/profile/page.tsx
npx tsc --noEmit -p tsconfig.typecheck.json
```
First two commands must return no output (3.3 has no automated check — it's a manual read-through of whichever file set was chosen).

---

## Sprint 4 — Home page footer

### Ticket 4.1 — Check whether `/privacy` and `/terms` exist before wiring links
**LOCATE:** `find src/app -iname "privacy*" -o -iname "terms*"` (run from repo root).
- If this returns matching directories/files, use the real `Link href` values they expose.
- If this returns nothing, use ticket 4.2's diff exactly as written (it uses plain, non-clickable `<span>` text instead of `<Link>` for Privacy/Terms, plus one real `mailto:` link for Contact, so nothing links to a 404).

### Ticket 4.2 — Add the footer
**FILE:** `src/components/home/HomeReferencePage.tsx`
**LOCATE:** `grep -n "trust.map" src/components/home/HomeReferencePage.tsx` → expect exactly 1 match. The footer is inserted directly after the `</div>` that closes that block and before the `</main>` that ends the component — confirm by running `grep -n "</main>" src/components/home/HomeReferencePage.tsx` → expect exactly 1 match, and confirm the trust-bullet closing `</div>` is the element immediately preceding it (re-read the file directly if there's any other element in between — do not assume).
**DIFF:**
```diff
         <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-[var(--border-soft)] py-7 text-sm text-[var(--ink-soft)]">
           {currentCopy.trust.map((item) => (
             <span className="inline-flex items-center gap-2" key={item}>
               <span className="h-2 w-2 rounded-full bg-[var(--accent-saffron)]" />
               {item}
             </span>
           ))}
         </div>
+
+        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-soft)] py-8 text-sm text-[var(--ink-muted)]">
+          <p>© {new Date().getFullYear()} Job Readiness Coach</p>
+          <div className="flex gap-6">
+            <span>{locale === 'en' ? 'Privacy' : 'गोपनीयता'}</span>
+            <span>{locale === 'en' ? 'Terms' : 'नियम'}</span>
+            <a className="hover:text-[var(--brand-ink)]" href="mailto:support@jobreadinesscoach.example">
+              {locale === 'en' ? 'Contact' : 'संपर्क करें'}
+            </a>
+          </div>
+        </footer>
       </div>
     </main>
```
(If ticket 4.1 found real `/privacy`/`/terms` routes, replace the two `<span>` elements with `<Link className="hover:text-[var(--brand-ink)]" href="/privacy">...</Link>` / `href="/terms"` instead — `Link` is already imported in this file.)
**WHY:** closes the abrupt-ending gap noted in the critique — no footer, no privacy/terms/contact path, on a product that collects PII (name, email, phone, resume content).
**VERIFY:** `grep -n "<footer" src/components/home/HomeReferencePage.tsx` → 1 match. `npx tsc --noEmit -p tsconfig.typecheck.json` → no output. `npm run build` → succeeds.

**Do not add a stats/proof element with a fabricated number.** If asked to add social proof later, only do so with a real metric — that's a separate, explicit ticket, not part of this one.

---

## Sprint 5 — Heading-scale consistency

### Ticket 5.1 — Audit (run this before touching anything)
```bash
grep -rn "route-shell" -A 3 src/app/*/page.tsx | grep -E "text-(lg|xl|2xl|3xl|4xl)"
```
This is the ground truth for this sprint — not the bullet below, which is one confirmed instance found during this audit, not necessarily the only one.

### Ticket 5.2
**FILE:** `src/app/resume/page.tsx`
**LOCATE:** `grep -n "text-2xl text-\[var(--ink-strong)\]" src/app/resume/page.tsx` → expect exactly 1 match, on the line containing `{locale === 'en' ? 'Edit your resume' : 'अपना जीवनवृत्त संपादित करें'}` two lines below it.
**DIFF:**
```diff
-                <h2 className="text-2xl text-[var(--ink-strong)]">
+                <h2 className="text-3xl text-[var(--ink-strong)]">
```
**WHY:** matches the majority pattern for a `.route-shell` direct-child section header at this nesting depth — confirmed against `applications/page.tsx` (`grep -n "text-3xl text-\[var(--ink-strong)\]" src/app/applications/page.tsx`, the "Add a real application..." heading) and `results/page.tsx` (same class, the "Next step" card heading).
**VERIFY:** `grep -n "text-2xl text-\[var(--ink-strong)\]" src/app/resume/page.tsx` → no output.

**For any additional instance ticket 5.1's grep surfaces:** apply the same rule (`.route-shell` direct-child headers → `text-3xl`) unless the heading is inside a deliberately smaller nested card (e.g. a `.step-panel` nested inside a `.route-shell`) — those stay smaller since they're one hierarchy level deeper. If unsure whether an instance qualifies, leave it and report it rather than guessing.

### Sprint 5 — final verification
```bash
grep -n "text-2xl text-\[var(--ink-strong)\]" src/app/resume/page.tsx
npx tsc --noEmit -p tsconfig.typecheck.json
```

---

## Sprint 6 — Accessibility & responsive QA (verification only, no edits)

No ticket in this sprint changes code. Each item below is a manual check; if any fails, write a new ticket to fix it rather than patching ad hoc mid-audit.

1. **Contrast.** For every token in §3 used as text on `--bg-page` or on `.route-shell`/`.card`/`.story-card`, confirm contrast ≥ 4.5:1 (body text) or ≥ 3:1 (24px+/19px+ bold). Use the exact hex/rgba pairs from §3 in any WCAG contrast calculator.
2. **Mobile FAB clearance.** `.coach-fab` (`globals.css`) resolves to `bottom: calc(64px + env(safe-area-inset-bottom, 0px) + 0.75rem)`. On a device emulation profile with a non-zero safe-area inset (e.g. "iPhone 14 Pro," ≈34px), this is ≈110px — confirm it doesn't look excessively detached from the bottom nav. On a device with zero safe-area inset (most Android, older iPhones), confirm it's ≈76px and fully clears the nav bar (the nav bar itself is `--bottom-nav-height: 64px` tall).
3. **Focus states on error inputs.** `.input-field:focus` sets a `box-shadow` independent of border color, so an error-bordered (`rose-400`) input should still show a visible focus ring. Verify by tabbing through `/register` and `/applications`'s forms with an intentionally invalid value.

---

## Sprint 7 — Feedback & responsiveness essentials

**Goal:** close the three cheapest, highest-value interactivity gaps: the one interaction users repeat most often (toggling a plan task) has visible network lag; 7 of 8 user-triggered save/update actions give no confirmation at all; disabled buttons are visually indistinguishable from enabled ones. **No new dependency** — `sonner` (toast) is already installed and already imported in `profile/page.tsx`; this sprint extends its use to more files.

### Ticket 7.1 — Optimistic update for plan task toggling
**FILE:** `src/app/plan/page.tsx`
**LOCATE:** `grep -n "const toggleTask = " src/app/plan/page.tsx` → expect exactly 1 match.
**DIFF (this replaces the entire function body):**
```diff
   const toggleTask = (taskId: string, completed: boolean) => {
     if (!plan || !user) return;

+    const previousPlan = plan;
+    queryClient.setQueryData<PlanData>(['plan'], {
+      ...plan,
+      tasks: plan.tasks.map((task) =>
+        task.id === taskId ? { ...task, completed: !completed } : task
+      ),
+    });
+
     startTransition(async () => {
       const response = await fetch('/api/plan', {
         method: 'PUT',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           planId: plan.id,
           taskId,
           completed: !completed,
         }),
       });
-      if (!response.ok) return;
+      if (!response.ok) {
+        queryClient.setQueryData(['plan'], previousPlan);
+        toast.error(
+          locale === 'en'
+            ? 'Could not update that task. Please try again.'
+            : 'यह कार्य अपडेट नहीं हो सका। कृपया फिर से प्रयास करें।'
+        );
+        return;
+      }
       const payload = (await response.json()) as {
         data?: {
           plan: PlanData;
         };
       };
       if (payload.data?.plan) {
         queryClient.setQueryData(['plan'], {
           ...payload.data.plan,
           roleId: selectedRoleId || undefined,
         });
       }
     });
   };
```
Add the import:
```diff
 import { differenceInDays, isToday, isPast } from 'date-fns';
 import { CheckCircle2, BookOpen, Target, Users, FolderKanban } from 'lucide-react';
+import { toast } from 'sonner';
```
**WHY:** the checkbox now flips immediately on click (optimistic), and rolls back with an error toast only if the server rejects it — this is the exact pattern `results/page.tsx`'s "choose role" button already uses (`setSelectedRoleId` called before `await persistSelectedRole`), just not previously applied here.
**VERIFY:** `grep -n "from 'sonner'" src/app/plan/page.tsx` → 1 match. `grep -n "previousPlan" src/app/plan/page.tsx` → at least 2 matches. `npx tsc --noEmit -p tsconfig.typecheck.json` → no output. Manually: open `/plan` while signed in, open devtools Network tab and throttle to "Slow 3G," click an incomplete task — the checkbox must visually flip immediately, not after the request resolves.

### Ticket 7.2 — Toast feedback on resume save
**FILE:** `src/app/resume/page.tsx`
**LOCATE:** `grep -n "setSaveState('saved');" src/app/resume/page.tsx` → expect exactly 1 match (inside the autosave `useEffect`, after the `fetch('/api/resumes', { method: 'PUT' ...})` succeeds).
**DIFF:**
```diff
         setSaveState('saved');
         void captureProductEvent('resume_saved', {
           has_phone: Boolean(resume.phone),
           section_count: resume.experience.length + resume.education.length,
         });
         setStatusMessage(
           locale === 'en'
             ? 'Saved to your workspace.'
             : 'आपके कार्यस्थल में सुरक्षित हो गया।'
         );
+        toast.success(
+          locale === 'en' ? 'Resume saved.' : 'जीवनवृत्त सुरक्षित हो गया।'
+        );
```
Also locate the existing error branch in the same function — `grep -n "setSaveState('error');" src/app/resume/page.tsx` → expect exactly 1 match in this `useEffect` (there's a second `setSaveState('error')` inside `downloadResume`, a separate function — do not touch that one in this ticket, it's handled by ticket 7.3) — and add a matching `toast.error(...)` there using the existing `setStatusMessage` text as the toast message (`'Could not save right now, but your local draft is safe.'` / `'अभी खाते में सुरक्षित नहीं हो सका, लेकिन इस उपकरण पर आपका प्रारूप सुरक्षित है।'`).
Add the import: `import { toast } from 'sonner';` (this file does not currently import it — confirm with `grep -n "from 'sonner'" src/app/resume/page.tsx` returning no output before adding).
**WHY:** the only existing save confirmation is a small inline status line inside a `story-card` that's easy to miss above the fold; a toast is the same confirmation pattern already used successfully in `profile/page.tsx`.
**VERIFY:** `grep -n "from 'sonner'" src/app/resume/page.tsx` → 1 match. `grep -n "toast\." src/app/resume/page.tsx` → 2 matches. `npx tsc --noEmit -p tsconfig.typecheck.json` → no output.

### Ticket 7.3 — Toast feedback on resume PDF download failure
**FILE:** `src/app/resume/page.tsx`
**LOCATE:** `grep -n "Could not create the PDF right now." src/app/resume/page.tsx` → expect exactly 1 match, inside `downloadResume`.
**DIFF:**
```diff
     if (!response.ok) {
       setSaveState('error');
       setStatusMessage(
         locale === 'en'
           ? 'Could not create the PDF right now.'
           : 'अभी पीडीएफ़ तैयार नहीं हो सका।'
       );
+      toast.error(
+        locale === 'en' ? 'Could not create the PDF right now.' : 'अभी पीडीएफ़ तैयार नहीं हो सका।'
+      );
       return;
     }
```
**WHY:** PDF download is a deliberate user action with no other visible failure feedback — `setStatusMessage` updates a status line that's not necessarily in view if the user has scrolled to the preview pane to click "Download PDF."
**VERIFY:** `grep -n "toast\." src/app/resume/page.tsx` → 3 matches (this ticket adds 1 on top of ticket 7.2's 2). `npx tsc --noEmit -p tsconfig.typecheck.json` → no output.

### Ticket 7.4 — Toast feedback on logging/updating an application
**FILE:** `src/app/applications/page.tsx`
**LOCATE:** `grep -n "reset();" src/app/applications/page.tsx` → expect exactly 1 match, inside `onSubmit`, directly after `captureProductEvent('application_logged', ...)`.
**DIFF:**
```diff
         void captureProductEvent('application_logged', {
           status: nextApplication.status,
         });
         reset();
+        toast.success(
+          locale === 'en' ? 'Application logged.' : 'आवेदन दर्ज हो गया।'
+        );
       }
     });
   };
```
**LOCATE (second part):** `grep -n "captureProductEvent('application_status_updated'" src/app/applications/page.tsx` → expect exactly 1 match.
**DIFF:**
```diff
       void captureProductEvent('application_status_updated', { status });
+      toast.success(
+        locale === 'en' ? 'Status updated.' : 'स्थिति अपडेट हो गई।'
+      );
     });
   };
```
Add the import: `import { toast } from 'sonner';` (confirm absent first via `grep -n "from 'sonner'" src/app/applications/page.tsx`).
**WHY:** both actions currently update silently — the form resets and the list re-renders, but nothing tells the user it worked.
**VERIFY:** `grep -n "toast\." src/app/applications/page.tsx` → 2 matches. `npx tsc --noEmit -p tsconfig.typecheck.json` → no output.

### Ticket 7.5 — Disabled-state styling for shared button/input classes
**FILE:** `src/app/globals.css`
**LOCATE:** `grep -n "^  .btn-primary {" src/app/globals.css` → expect exactly 1 match.
**DIFF:**
```diff
   .btn-primary {
     @apply inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white transition;
     background: linear-gradient(135deg, #0f6d66, #0d5954);
     box-shadow: 0 16px 32px rgba(15, 109, 102, 0.24);
   }

   .btn-primary:hover {
     transform: translateY(-1px);
   }

+  .btn-primary:disabled,
+  .btn-secondary:disabled,
+  .btn-outline:disabled {
+    cursor: not-allowed;
+    opacity: 0.5;
+    transform: none;
+    box-shadow: none;
+  }
+
   .btn-secondary {
```
**WHY:** there is currently no `:disabled` rule anywhere in `globals.css` for any button class — confirmed by `grep -n ":disabled" src/app/globals.css` returning no output before this ticket. Every `disabled={isPending}` button in the product (resume save, plan toggle, application form submit, login/register submit, profile save) currently looks identical whether clickable or not.
**VERIFY:** `grep -n ":disabled" src/app/globals.css` → exactly 1 match (the combined selector above counts as 1 line/match for `grep -n` even though it applies to 3 classes). `npx tsc --noEmit -p tsconfig.typecheck.json` → no output (this is a CSS-only change; this command is checked anyway per the sprint-level rule in §0). Manually: open `/applications`, submit the form with an empty company name held down long enough to see the `disabled` state (or throttle network to make the `isPending` window visible) — the button should visibly dim, not just stop responding.

### Sprint 7 — final verification
```bash
grep -n "from 'sonner'" src/app/plan/page.tsx src/app/resume/page.tsx src/app/applications/page.tsx
grep -n ":disabled" src/app/globals.css
npx tsc --noEmit -p tsconfig.typecheck.json
```
All three `from 'sonner'` files must show 1 match each. The `:disabled` grep must show exactly 1 match.

---

## Sprint 8 — Confirm before destructive resume deletes

**Goal:** removing an experience or education block on the resume page currently deletes instantly with no confirmation and no undo. `@radix-ui/react-dialog` is already a dependency and already used once in this codebase (`src/components/admin/AdminUsersTable.tsx`) — this sprint follows that exact, verified pattern (confirmed by reading `AdminUsersTable.tsx:4,38,116-119,222-250` directly, not assumed).

### Ticket 8.1 — Add confirmation state and Dialog import
**FILE:** `src/app/resume/page.tsx`
**LOCATE:** `grep -n "^import" src/app/resume/page.tsx | tail -1` → find the last import line.
**DIFF:**
```diff
 import {
   formatIndianPhoneInput,
   isValidIndianPhoneNumberOrEmpty,
 } from '@/lib/phone';
+import * as Dialog from '@radix-ui/react-dialog';
```
**LOCATE (second part):** `grep -n "const \[isLoaded, setIsLoaded\] = useState(false);" src/app/resume/page.tsx` → expect exactly 1 match.
**DIFF:**
```diff
   const [isLoaded, setIsLoaded] = useState(false);
+  const [pendingDelete, setPendingDelete] = useState<{ type: 'experience' | 'education'; index: number } | null>(null);
```
**WHY:** mirrors the exact `pendingDelete` state pattern already used in `AdminUsersTable.tsx:38` (`useState<AdminUserRow | null>(null)`), generalized to hold which kind of block and which index is pending removal — this file has two separate removable lists (experience, education), so the state needs to distinguish them; `AdminUsersTable.tsx` only has one list, hence its simpler shape.
**VERIFY:** `grep -n "pendingDelete" src/app/resume/page.tsx` → at least 1 match. `npx tsc --noEmit -p tsconfig.typecheck.json` → no output (expected to still pass even though `pendingDelete` isn't used yet — unused-variable would only fail lint, not typecheck; if your lint config treats this as an error, ignore it until ticket 8.2 adds the usage in the same sprint).

### Ticket 8.2 — Route delete clicks through the confirmation state instead of deleting directly
**FILE:** `src/app/resume/page.tsx`
**LOCATE:** `grep -n "const removeExperience = " src/app/resume/page.tsx` → expect exactly 1 match.
**DIFF:**
```diff
-  const removeExperience = (index: number) => {
+  const confirmRemoveExperience = (index: number) => {
     updateResume(
       'experience',
       resume.experience.filter((_, itemIndex) => itemIndex !== index)
     );
   };
```
**LOCATE:** `grep -n "const removeEducation = " src/app/resume/page.tsx` → expect exactly 1 match.
**DIFF:**
```diff
-  const removeEducation = (index: number) => {
+  const confirmRemoveEducation = (index: number) => {
     updateResume(
       'education',
       resume.education.filter((_, itemIndex) => itemIndex !== index)
     );
   };
```
**LOCATE:** `grep -n "onClick={() => removeExperience(index)}" src/app/resume/page.tsx` → expect exactly 1 match.
**DIFF:**
```diff
-                        onClick={() => removeExperience(index)}
+                        onClick={() => setPendingDelete({ type: 'experience', index })}
```
**LOCATE:** `grep -n "onClick={() => removeEducation(index)}" src/app/resume/page.tsx` → expect exactly 1 match.
**DIFF:**
```diff
-                          onClick={() => removeEducation(index)}
+                          onClick={() => setPendingDelete({ type: 'education', index })}
```
**WHY:** the two "Remove block"/"Remove" buttons now open the confirmation instead of deleting immediately. The original functions are renamed (not duplicated) and reused as the dialog's actual delete action in ticket 8.3 — `removeExperience`/`removeEducation` no longer exist as standalone click handlers after this ticket, which is intentional; if anything else in this file still references the old names, that's a sign this ticket's LOCATE missed an occurrence — re-grep for `removeExperience\|removeEducation` across the whole file and confirm both remaining matches are exactly the two renamed function definitions, not stray references.
**VERIFY:** `grep -n "removeExperience\|removeEducation" src/app/resume/page.tsx` → exactly 0 matches (all renamed to `confirmRemoveExperience`/`confirmRemoveEducation` in ticket form, then further wired to the dialog in 8.3 — see that ticket before concluding this verify step early). `npx tsc --noEmit -p tsconfig.typecheck.json` → no output.

### Ticket 8.3 — Add the confirmation dialog
**FILE:** `src/app/resume/page.tsx`
**LOCATE:** `grep -n "^    </main>" src/app/resume/page.tsx` → expect exactly 1 match (the file's final closing tag before the function's `return` ends — confirm there is exactly one `</main>` in the file; this component has a single top-level `<main>` for its loaded-state render, separate from the early-return `FullPageLoader` states which don't use `<main>` directly).
**DIFF:**
```diff
       </div>
     </main>
+
+    <Dialog.Root open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
+      <Dialog.Portal>
+        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--ink-strong)]/40" />
+        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
+          <Dialog.Title className="text-xl font-semibold text-[var(--ink-strong)]">
+            {locale === 'en' ? 'Remove this block?' : 'इस ब्लॉक को हटाएँ?'}
+          </Dialog.Title>
+          <Dialog.Description className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
+            {locale === 'en'
+              ? 'This removes it from your resume draft immediately. This cannot be undone.'
+              : 'यह आपके जीवनवृत्त प्रारूप से तुरंत हटा दिया जाएगा। इसे वापस नहीं किया जा सकता।'}
+          </Dialog.Description>
+          <div className="mt-6 flex justify-end gap-3">
+            <Dialog.Close className="btn-outline" type="button">
+              {locale === 'en' ? 'Cancel' : 'रद्द करें'}
+            </Dialog.Close>
+            <button
+              className="btn-primary bg-rose-600 hover:bg-rose-700"
+              onClick={() => {
+                if (pendingDelete?.type === 'experience') confirmRemoveExperience(pendingDelete.index);
+                if (pendingDelete?.type === 'education') confirmRemoveEducation(pendingDelete.index);
+                setPendingDelete(null);
+              }}
+              type="button"
+            >
+              {locale === 'en' ? 'Remove' : 'हटाएँ'}
+            </button>
+          </div>
+        </Dialog.Content>
+      </Dialog.Portal>
+    </Dialog.Root>
+    </>
```
**This diff also requires wrapping the component's existing return value in a fragment**, since a component can only return one root element and this adds a second top-level node (the Dialog) as a sibling to the existing `<main>`. Locate the opening of the same return statement — `grep -n "  return (" src/app/resume/page.tsx | tail -1` → this is the `return (` immediately before `<main className="section-shell">` — and change:
```diff
   return (
+    <>
     <main className="section-shell">
```
**WHY:** `Dialog.Portal` renders outside the normal DOM tree regardless of where it's written in JSX, but the JSX itself still needs a single root — wrapping in `<>...</>` (a Fragment) is the standard fix, with no extra DOM node and no new dependency.
**VERIFY:** `grep -n "Dialog.Root\|Dialog.Portal\|Dialog.Content" src/app/resume/page.tsx` → 3 matches. `npx tsc --noEmit -p tsconfig.typecheck.json` → no output (a missing Fragment wrapper shows up here as a JSX/TS error — if you see one, you missed the `<>`/`</>` pair). `npm run build` → succeeds. Manually: open `/resume`, click "Remove block" on an experience entry — it must NOT delete immediately; a dialog must appear; clicking "Cancel" or the X must close it with the block still present; clicking "Remove" must delete it and close the dialog.

### Sprint 8 — final verification
```bash
grep -n "removeExperience\|removeEducation" src/app/resume/page.tsx   # expect 0 — both renamed
grep -n "pendingDelete" src/app/resume/page.tsx                        # expect several matches
npx tsc --noEmit -p tsconfig.typecheck.json
npm run build
```

---

## Summary checklist

| Sprint | Theme | Risk | New files | Depends on |
|---|---|---|---|---|
| 0 | Finish color-token migration | Low (mechanical) | none | prior session's token migration |
| 1 | Real font loading | Low (additive) | none | none |
| 2 | Bilingual auth screens | Medium (Server→Client split) | `LoginPageContent.tsx`, `RegisterPageContent.tsx` | none |
| 3 | Copy/terminology consistency | Low, except 3.3 (needs a decision) | none | none |
| 4 | Home page footer | Low | none | check `/privacy`,`/terms` existence first |
| 5 | Heading-scale consistency | Low | none | none |
| 6 | Accessibility/responsive QA | N/A (verification only) | none | Sprints 0-5 |
| 7 | Feedback & responsiveness essentials | Low-Medium (touches mutation logic) | none | none |
| 8 | Confirm before destructive deletes | Medium (refactors return JSX) | none | none |

Sprints 0, 1, 3, 4, 5, 7 can run in any order. Sprint 2 has no dependencies but is the highest-priority by impact. Sprint 8 is independent but touches the most structurally risky single change (the Fragment wrap) — run its `npm run build` check without skipping. Sprint 6 should run last, after 0-5 and ideally after 7-8 too, since it verifies the cumulative result.

