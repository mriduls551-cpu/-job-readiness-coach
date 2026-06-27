# System Design — Job Readiness Coach

_Last updated: June 2026 | Stack: Next.js 14 · Supabase · OpenRouter · Upstash Redis · Vercel_

---

## 1. What We're Building

An India-first, bilingual (EN/HI), AI-assisted job-readiness coach. It is not a chatbot. The core product is a **structured, deterministic system** with an AI coach layer on top. This distinction drives most of the architectural decisions.

**Core user journey:**
1. Land → AI greeter orients the user
2. Career fit-check → deterministic scoring engine → top 3 role matches
3. User selects a role → resume builder tailored to that role
4. Dashboard + weekly plan → adaptive check-ins
5. (future) Interview coach per role

**Scale target (pre-launch):** Mobile-first India, 0–10k MAU initially. Design should survive 100k MAU without a rewrite.

---

## 2. Functional Requirements

| Module | What it does |
|---|---|
| Fit-check engine | 9-question adaptive flow → deterministic role scoring → top 3 |
| Role catalog | 12 curated entry-level India roles, read-heavy, quasi-static |
| AI coach | Streaming chat, context-aware, role-scoped |
| Resume builder | Role-aligned sections, AI co-writing, PDF export |
| Weekly plan | Adaptive action checklist, progress tracking |
| Application tracker | CRUD job applications |
| Auth | Email/password + magic link via Supabase |
| Bilingual delivery | EN primary, HI for all user-facing copy |
| Admin | User management, cron triggers, email logs |

---

## 3. Non-Functional Requirements

| Requirement | Target | How |
|---|---|---|
| Fit-check latency | < 400ms p99 | Pure TS, no LLM, Redis cache for role catalog |
| AI coach TTFB | < 2s | Streaming response, OpenRouter routing to fast model |
| Availability | 99.5% | Vercel managed, Supabase managed, no infra ops |
| Mobile performance | LCP < 2.5s on 3G India | RSC + streaming, aggressive static/ISR |
| Cost per user | < ₹2/session | AI gated, rate-limited; assessment is LLM-free |
| Bilingual | Full EN, production HI | Translation layer in lib/i18n |

---

## 4. System Architecture

### 4.1 Layers

```
┌─────────────────────────────────────────────────────────┐
│  CLIENT — Next.js App Router (React, TanStack Query)    │
│  Mobile-first, EN/HI, offline-tolerant local drafts     │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────────┐
│  EDGE — Vercel Edge Middleware (middleware.ts)           │
│  Auth guard · Locale detection · Rate-limit early exit  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  NEXT.JS SERVERLESS FUNCTIONS (API Routes)              │
│  /api/assessment · /api/agent · /api/resume             │
│  /api/plan · /api/auth · /api/admin · /api/cron         │
└───┬──────────┬───────────┬──────────────────────────────┘
    │          │           │
┌───▼──┐  ┌───▼────┐  ┌───▼──────┐  ┌──────────┐
│Supa- │  │OpenRou-│  │Upstash   │  │Email     │
│base  │  │ter/LLM │  │Redis     │  │Service   │
│Auth+ │  │Coach + │  │Rate limit│  │Onboarding│
│PG    │  │Resume  │  │+cache    │  │reminders │
└──────┘  └────────┘  └──────────┘  └──────────┘
```

### 4.2 Key Design Decisions

**Decision 1: Assessment engine is LLM-free by design.**
The scoring engine (`lib/product/assessment-engine.ts`) is pure TypeScript with deterministic additive scoring across 6 dimensions. LLMs are used only for rationale text after the score is computed. This gives: consistent results, zero AI cost on assessment, full auditability, and a testable score pipeline.

**Decision 2: OpenRouter as LLM abstraction layer.**
All AI calls go through OpenRouter, not a specific provider. This lets you swap models (e.g. Gemini → Claude → local Llama) without touching application code. Critical for cost management as you scale.

**Decision 3: Supabase over custom backend.**
Supabase gives Auth, PostgreSQL, Row-Level Security, and real-time in one managed service. Given team size (1–2 devs), this removes an entire infra layer. RLS enforces that users can only read their own data without application-layer enforcement on every route.

**Decision 4: InMemoryDB must die before launch.**
`db.ts` exports a module-level singleton that resets on cold starts. It was a dev convenience. Every Supabase write path must be complete before launch. Current migration seam: `getDB()` → swap to Supabase client at that call site.

---

## 5. Data Model

### 5.1 Core Tables (Supabase PostgreSQL)

```sql
-- users (managed by Supabase Auth, extended via profile)
profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users,
  full_name    text,
  city         text,
  locale       text DEFAULT 'en',  -- 'en' | 'hi'
  education_stream text,
  created_at   timestamptz DEFAULT now()
)

-- assessment session + results
assessments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES profiles(id),
  responses    jsonb NOT NULL,          -- raw Q&A map
  result       jsonb NOT NULL,          -- topRoles, scores, cluster, confidence
  selected_role text,                   -- role user confirmed
  locale       text,
  created_at   timestamptz DEFAULT now()
)

-- resume drafts (one per user per role)
resumes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES profiles(id),
  role_id      text NOT NULL,
  content      jsonb NOT NULL,          -- structured sections
  pdf_url      text,                    -- Supabase storage
  updated_at   timestamptz DEFAULT now()
)

-- weekly plans
plans (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES profiles(id),
  role_id      text NOT NULL,
  week_number  int NOT NULL,
  tasks        jsonb NOT NULL,          -- [{id, title, done, due_date}]
  updated_at   timestamptz DEFAULT now()
)

-- job applications
applications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES profiles(id),
  company      text NOT NULL,
  role         text NOT NULL,
  status       text DEFAULT 'applied',  -- applied|interview|offer|rejected
  notes        text,
  applied_at   date,
  updated_at   timestamptz DEFAULT now()
)

-- coach message history (optional persistence)
coach_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES profiles(id),
  role         text,                    -- 'user' | 'assistant'
  content      text NOT NULL,
  context_role text,                    -- role_id in scope
  created_at   timestamptz DEFAULT now()
)
```

### 5.2 Row-Level Security (RLS)

Every table: `user_id = auth.uid()`. No exceptions. Admin routes use a service role key stored server-side only, never exposed to the client.

### 5.3 Role Catalog (quasi-static)

The 12 roles live in `src/data/` as TypeScript constants. They are:
- Read at build time → served as static data
- Cached in Redis (TTL 24h) for API route access
- Not stored in Postgres (no user writes to the catalog)

At 100k MAU, migrate to a Supabase table with ISR revalidation if role set grows.

---

## 6. API Design

### 6.1 Key Endpoints

```
POST /api/assessment/fit-check
  Body: { responses: Record<string, string>, profile: AssessmentProfile }
  Auth: optional (guest flow allowed)
  Rate limit: 12 req / 10 min (Upstash)
  Returns: { topRoles[3], allScores, cluster, confidence, dimensionSnapshot }

POST /api/agent/chat
  Body: { messages: Message[], contextRoleId?: string }
  Auth: required
  Rate limit: 30 req / min per user
  Returns: text/event-stream (Vercel AI SDK streaming)

GET /api/agent/context
  Auth: required
  Returns: { profile, selectedRole, assessmentSnapshot, planProgress }
  — assembled before every coach session to prime the LLM

POST /api/resume/build
  Body: { roleId, sections }
  Auth: required
  Returns: { resumeId, content }

GET /api/resume/download?id=<uuid>
  Auth: required
  Returns: PDF stream (@react-pdf/renderer server-side)

GET /api/dashboard
  Auth: required
  Returns: { selectedRole, planWeek, progress, nextActions, coachNudge }

POST /api/plan
  Body: { roleId, weekNumber, taskUpdates }
  Auth: required

GET /api/health
  Auth: none
  Returns: { status, persistence, version }
  — persistence field MUST report 'supabase' not 'memory' before launch
```

### 6.2 Response Envelope

All routes use a consistent envelope from `lib/api-response.ts`:
```ts
success(data)  → { ok: true, data }
error(message, code?) → { ok: false, error: message, code? }
```

### 6.3 Error Handling

| Scenario | Behavior |
|---|---|
| LLM timeout | Return last partial stream; coach shows "try again" nudge |
| Supabase unreachable | 503 with `Retry-After` header |
| Rate limit hit | 429 with `X-RateLimit-Reset` header |
| Assessment engine throws | Catch → log to Sentry → return safe fallback result |
| PDF render fails | Return HTML fallback download |

---

## 7. AI Coach Architecture

### 7.1 Context Assembly (critical)

Before every coach session, `/api/agent/context` assembles:
```
system prompt = [
  persona: "You are a job coach for early-career India users..."
  role_context: selected role, its JD, typical interview questions
  user_context: profile, education stream, assessment dimension snapshot
  plan_context: current week tasks, completion rate
  constraints: "Don't recommend roles outside the user's selected path.
                Answer in EN unless user writes in HI."
]
```

This context is rebuilt per session (not persisted in the system prompt). Keep it under ~2k tokens to stay cheap on any model.

### 7.2 AI Decision Boundary

| LLM | No LLM (deterministic) |
|---|---|
| Coach chat responses | Role scoring & ranking |
| Resume section drafts | Disqualifier rule application |
| Role rationale explanation | Plan task generation (template-based) |
| Interview question generation | Auth, profile, application CRUD |

**This boundary is a product invariant.** Letting the LLM influence role recommendations would make results inconsistent and undo the engine's trust properties.

### 7.3 Model Selection via OpenRouter

```
Default model: google/gemini-flash-1.5 (fast, cheap, Hindi-capable)
Fallback model: anthropic/claude-haiku  (if Gemini rate-limited)
Heavy tasks: anthropic/claude-sonnet (resume full rewrite, only on explicit action)
```

Cost guard: per-user token budget enforced at the route layer before calling OpenRouter. Exceeding budget returns a graceful "coach is resting" message, not a hard error.

---

## 8. Caching Strategy

| Data | Layer | TTL | Reason |
|---|---|---|---|
| Role catalog (12 roles) | Redis | 24h | Read by every assessment; never user-specific |
| Assessment result | TanStack Query | session | Avoid re-fetching on navigation |
| Dashboard summary | TanStack Query | 5 min stale | Cheap to re-fetch; changes with plan progress |
| Coach context | Server-side only | per-request | Never cached; always fresh user state |
| Resume PDF | Supabase Storage | permanent | Generated on demand, stored on save |
| Static pages (landing) | Vercel CDN | ISR 1h | Marketing copy, role descriptions |

---

## 9. Bilingual Delivery

**Principle:** EN is the source of truth. HI is a translation layer, not a separate content branch.

```
lib/i18n/
  en.json     — all UI strings in English
  hi.json     — HI translations (must be 1:1 with en.json keys)
  index.ts    — useLocale() hook, server-side getLocale()
```

Locale is:
1. Detected from `Accept-Language` header in Edge Middleware
2. Stored in `profiles.locale` after first login
3. Passed as `locale` param to all API routes that return user-visible strings

AI coach: instructed to respond in HI if the user writes in HI, EN otherwise. No separate model needed — Gemini Flash handles both well.

**Current gap:** HI copy quality is inconsistent. Before launch, every `hi.json` string needs a native speaker review pass. Do not ship HI as a feature without this.

---

## 10. Rate Limiting

Two layers:

**Edge layer (middleware.ts):** Upstash Redis sliding window, applied before the serverless function cold-starts. Cheapest possible rejection.

**Route layer (getRateLimiter):** Per-endpoint limits:
- `/api/assessment/fit-check`: 12 / 10 min — anti-abuse, assessment is cheap but write-heavy
- `/api/agent/chat`: 30 / min — LLM cost control
- `/api/resume/download`: 10 / hour — PDF render is CPU-intensive
- `/api/auth/*`: 5 / min — brute force protection

---

## 11. Auth Flow

```
Guest (no account):
  fit-check → view results → prompted to save → register
  Local state: assessment responses in localStorage until auth

Registered user:
  Supabase email/password or magic link
  JWT stored as httpOnly cookie (Supabase SSR client)
  Middleware validates JWT on every protected route server-side

Session:
  Supabase handles refresh token rotation
  No custom session code needed
```

**Critical:** The `mock-auth.ts` / `isLocalAuthEnabled()` path must require `ENABLE_DEV_AUTH=true` explicitly. Currently it fires on any non-production env, including Vercel preview URLs, which creates ghost sessions.

---

## 12. Background Jobs

```
Vercel Cron (vercel.json):
  /api/cron/adapt-plans   — runs nightly
    → fetch users with active plans who haven't checked in for 3 days
    → generate nudge email via email service
    → optionally update plan tasks via Supabase

  /api/cron/cleanup       — runs weekly
    → delete orphaned guest assessment records (no user_id, >30 days old)
```

Cron jobs are idempotent. Each run checks a `last_run` timestamp in Redis before executing to avoid double-fires on Vercel's at-least-once delivery.

---

## 13. Observability

| Signal | Tool | What to watch |
|---|---|---|
| Errors | Sentry | `AssessmentValidationError`, LLM timeout, PDF render fail |
| Performance | Sentry Perf | fit-check p99, agent TTFB, PDF download duration |
| Health | `/api/health` | `persistence: "supabase"` — alert if it reports "memory" |
| Usage | Supabase Dashboard | MAU, assessment completions, resume saves |
| LLM cost | OpenRouter Dashboard | Token spend by model, by endpoint |

**Alert thresholds (set before launch):**
- fit-check p99 > 600ms → investigate Redis cache miss
- agent TTFB > 5s → check OpenRouter fallback routing
- error rate > 1% on any route → PagerDuty (or Slack webhook)

---

## 14. Scaling Path

| MAU | What changes |
|---|---|
| 0–10k | Current architecture. InMemoryDB replaced by Supabase. |
| 10–50k | Add Supabase read replicas. Move PDF generation to background queue (Supabase Edge Function). |
| 50–100k | Separate coach service into a standalone Edge Function. Add CDN-cached role API. Consider pgvector for personalized role matching. |
| 100k+ | Evaluate dedicated AI inference (self-hosted or fine-tuned model for HI). Add async job queue (Inngest or QStash) for plan adaptation. Shard by region (Mumbai edge node). |

---

## 15. Trade-off Log

| Decision | What we gave up | Why it's worth it |
|---|---|---|
| Deterministic scoring, no ML | Personalization that improves with data | Trustable results from day 1; explainable to users |
| OpenRouter abstraction | Direct API optimizations per provider | Flexibility to switch models as costs change |
| Supabase over custom Postgres | Fine-grained infra control | Zero-ops at current scale; built-in RLS |
| Single Next.js app (no microservices) | Independent scaling of coach vs. resume | Right for current team size; extract when forced to |
| LLM-free assessment | Richer "AI" feel in the assessment | Consistency, cost, and auditability outweigh marketing value |
| ISR over full SSR on marketing pages | Real-time updates to role copy | Vercel CDN speeds vs. zero value from sub-hour freshness |

---

## 16. What to Fix Before Launch (in priority order)

1. **Replace InMemoryDB with Supabase** (TD-01) — every write path must persist.
2. **Lock mock-auth behind explicit env flag** (TD-02) — prevents ghost sessions on previews.
3. **Extract `getClientIp()` helper** (TD-03) — currently duplicated in 11 places.
4. **Supabase RLS on all tables** — verify with `supabase test rls` before go-live.
5. **HI copy review** — native speaker pass on all `hi.json` strings.
6. **Set Sentry alert thresholds** — don't find out about p99 regressions from users.
7. **Add `/api/health` persistence check** — it's your canary for TD-01 being truly fixed.
