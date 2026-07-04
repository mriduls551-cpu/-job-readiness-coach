# CLAUDE.md — Project memory (read this first)

## What this is
**Job Readiness Coach / "Earning Academy"** — India-first, bilingual (EN/HI), mobile-first web app.
Takes early-career users from "I don't know where to start" to a trusted shortlist of realistic
first roles in ~12 minutes, free, **no login until results**. Founder: Mridul (works through Claude).

Core principle: **a deterministic scoring engine decides; AI only explains and coaches.** Every AI
surface must have a static fallback. Money covenant: learner never pays to learn, no data selling,
no paid certificates, no ads inside learning.

## Source-of-truth docs (in priority order)
1. `PRODUCT_PRD_V2.md` — current PRD (supersedes `PRODUCT_PRD.md` v1 wherever they conflict)
2. `PRODUCT_ROADMAP.md` — Now/Next/Later + decision gates
3. `BUILD_PLAN.md` — sprint-level execution (Sprint 0 → …)
4. `WORKFLOW.md` — team git workflow ("sync", "ship", "run", "status" commands)
5. `assessment-engine-v2-spec.md`, `system-design.md`, `tech-debt.md` — reference

## Current state (as of 2026-07-05)
- Active branch: `feat/assessment-sprints-and-algorithm-fixes` (trust core landed, 15 suites / 168 tests green)
- **Sprint 0 pending:** 3 items in `docs/code-review/2026-06-30-action-items.md`
  (recordFeedback user-id filter, educationStreamBoosts benchmark check, double-submit guard in
  `career-fit-check/page.tsx`) → then merge to `main` + deploy
- **Open strategic decision — Gate D1:** post-results journey = resume/jobs (PRD v1) vs
  learn-practice-earn tracks (GTM draft). Being settled by fake-door dual CTA + PostHog data
  (~200 results views), NOT debate. Don't pre-build either endgame.
- Not built yet: share card, D1 CTAs, next-intl question copy, conversational mode, payments,
  learning/practice features.
- Role universe: 11 core roles + ~30 adjacent (list only). Telemedicine coordinator retired.
- Auth is deferred — value before wall. v1's account-gated principle is dead.

## Stack
- Next.js 15 (App Router) + React 18 + TypeScript, Tailwind, Radix UI, Zustand, TanStack Query/Table
- Supabase (DB + auth), Upstash Redis (rate limiting), Resend + react-email, Sentry, PostHog
- AI: Vercel AI SDK (`ai`, `@ai-sdk/openai`) via OpenRouter (`src/lib/openrouter.ts`)
- i18n: next-intl (installed; question copy still via `normalizeHindiCopy` regex — migration pending)
- Tests: Jest (unit, `jest.config.ts` / `jest.config.cjs`), Playwright (e2e)
- Deploy: Vercel (`vercel.json`)

## Key paths
- `src/app/` — routes: `career-fit-check` (assessment), `results`, `resume`, `plan`, `dashboard`, `interview`, `admin`, `api`
- `src/lib/assessment-engine.ts` + `src/lib/roles/` (incl. `scorer.ts`) — the deterministic engine. **Any scoring change needs benchmark + invariant tests** (`npm run benchmark:algorithm`, fast-check invariants in `src/lib/__tests__/`)
- `src/lib/assessment-experiments.ts` — server-authoritative scoring experiments
- `src/lib/matcher/`, `src/data/` — role matching + catalog (`npm run catalog:report`)
- `supabase/` — migrations; `algo-validation/` — algorithm validation artifacts

## Commands
```bash
npm run dev            # local dev
npm run type-check     # tsc, tsconfig.typecheck.json
npm test               # jest unit suite (must stay green: 168 tests)
npm run test:e2e       # playwright
npm run local:check    # validate .env.local
```
Quality gate before any ship: `npm run type-check && npm test`.

## Git workflow (two contributors share main — see WORKFLOW.md)
- "sync" = checkout main, pull, npm install if lockfile changed
- "ship" = add, commit (clear message, never "update"), **pull before push**, push, re-test
- Never force-push main. Resolve conflicts, explain them, continue.

## Rules for Claude on this project
1. Deterministic engine decides; never let AI make eligibility/scoring/routing decisions.
2. Don't re-plan work already landed (see BUILD_PLAN.md §0). Check the branch before proposing.
3. Bilingual EN/HI and mobile-first are non-negotiable for any user-facing surface.
4. No auth walls before the results step.
5. Scoring/algorithm edits require running the benchmark and keeping invariant tests green.
6. D1 is undecided — build only no-regret items (trust core, instrumentation, share card).
7. Act as a blunt cofounder/mentor: challenge scope creep, point at data over debate.
