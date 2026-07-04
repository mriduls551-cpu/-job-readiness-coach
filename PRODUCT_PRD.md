# Job Readiness Coach

## Product PRD and Current Build Status

> **Note (2026-07-05):** superseded by [PRODUCT_PRD_V2.md](PRODUCT_PRD_V2.md) wherever the two
> conflict (auth gating, role universe, monetization, build sequence). Kept for history and detail.

Last updated: June 2, 2026
Status: Product recovery in progress
Primary codebase: Next.js migration

---

## 1. Document Purpose

This document defines:

- what the product is
- who it is for
- what we are trying to build
- what the MVP includes
- how AI should and should not be used
- where the current implementation stands today

This PRD is the working source of truth for the product-recovery effort inside the existing Next.js codebase. It replaces the drifted interpretation that turned the product into a generic tech-career tool.

---

## 2. Product Summary

### Working Product Name

Job Readiness Coach

### One-Line Definition

An India-first, bilingual, AI-assisted job-readiness coach that helps early-career users discover realistic first-job roles, understand why those roles fit, build a stronger resume, and follow a practical weekly plan toward employment.

### Product Thesis

Many graduates and first-time job seekers do not need another broad career-exploration platform. They need a clear starting point, a realistic shortlist of roles, a better resume, and step-by-step help that feels supportive rather than overwhelming.

The product should behave like one continuous coach:

- it helps users identify good-fit entry-level roles
- explains those matches in plain language
- helps them create a role-aligned resume
- gives them a weekly action plan
- eventually coaches them through applications and interviews

### Product Positioning

This is not:

- a generic career quiz
- a pure chatbot
- an open-ended “ask anything” AI tool
- a tech-career-only recommender
- a broad “all careers in India” encyclopedia for MVP

This is:

- practical
- guided
- role-focused
- beginner-friendly
- bilingual
- mobile-first
- AI-assisted, but not AI-dependent for core outcomes

---

## 3. Problem Statement

Early-career users, especially fresh graduates and first-generation job seekers, often struggle with four linked problems:

1. They do not know which realistic roles they should target first.
2. They cannot explain their own strengths in job language.
3. Their resume is weak, generic, or empty.
4. They do not know what to do every week to actually move toward a job.

Existing products usually fail in one of two ways:

- they are too generic, inspirational, or academic
- they are too AI-first and unstable, with unclear or inconsistent recommendations

The product must solve for clarity, confidence, and action.

---

## 4. Target User

### Primary Audience

India-based early-career users who are looking for a realistic white-collar starting role and need structured guidance.

### Core Persona

A fresher or near-fresher who may have:

- limited confidence
- uneven English comfort
- little knowledge of job role differences
- weak resume quality
- no clear search plan

### Secondary Audiences

- users switching from one entry-level role to another
- users returning to job search after a gap
- users who already started applying but are not getting responses

### Exclusions for MVP

The MVP should not optimize primarily for:

- senior professionals
- highly specialized professionals
- broad postgraduate decision-making
- government exam strategy as the main use case
- licensed professions that require domain-specific credential workflows

---

## 5. Jobs To Be Done

When I do not know where to start, help me find realistic roles that fit me.

When I see a recommended role, help me understand why it fits me.

When I decide on a role, help me turn that decision into a stronger resume.

When I feel stuck, help me know what to do this week.

When I feel unsure, help me feel guided without making me depend entirely on AI.

---

## 6. Product Principles

### 6.1 AI Is the Coach, Not the Judge

AI should support conversation, explanation, drafting, and coaching.

AI should not be the source of truth for:

- core role scoring
- user-critical gating
- saved progress state
- salary truth
- application truth

### 6.2 Account-Gated Core Experience

Users should be able to understand the product from the landing page before signup.

Users must create an account before they can:

- start the fit check
- complete the fit check
- see their top 3 matches
- continue into resume, plan, dashboard, and coaching flows

### 6.3 India-First and Bilingual

The product should feel made for India, not translated into India. Hindi and English should both be usable, and the examples, roles, tone, and task framing should feel locally relevant.

### 6.4 Practical Over Aspirational

The MVP should prioritize realistic starting roles and practical next steps over ambitious but low-conversion long-horizon exploration.

### 6.5 One Continuous Coach

The product should feel like one joined-up experience:

- landing
- fit check
- results
- resume
- plan
- applications
- interview coaching

Not separate disconnected tools.

---

## 7. MVP Product Definition

### MVP Goal

Help a user move from uncertainty to a realistic role choice, a usable role-aligned resume, and a practical weekly action plan.

### MVP Scope

The MVP includes:

1. Public landing page
2. Account creation and login flow
3. Structured bilingual fit check
4. Account-based top 3 role matches
5. Plain-language rationale for each role
6. Role confirmation
7. Resume drafting and PDF download
8. Weekly plan tied to the chosen role
9. Basic dashboard with progress, reminders, and application momentum
10. Persistent coach infrastructure
11. AI-assisted explanations and coaching where useful

### MVP Non-Goals

The MVP does not need to fully launch:

- all possible career families
- unrestricted open-ended AI career advising
- advanced employer marketplace features
- deep institutional integrations
- complex social/community features

---

## 8. MVP Role Universe

The product should launch with a focused early-career white-collar role set.

### Recommended MVP Roles

- Customer Support Executive
- Sales / Inside Sales Executive
- Academic Counsellor
- HR Recruiter / HR Coordinator
- Data Entry / MIS Executive
- Back Office Operations Associate
- Operations Analyst / Operations Coordinator
- Junior Accountant / Finance Assistant
- Digital Marketing Executive
- Content Writer
- Telemedicine / Care Coordinator
- Legal / Compliance Operations Associate

### Why This Scope

This role set is:

- practical
- understandable to users
- broad enough to feel useful
- narrow enough to build well
- aligned to real first-job journeys

### Deferred to Later Versions

- software and engineering tracks as a major product branch
- UPSC / SSC / defence
- highly specialized healthcare roles
- very broad career universe exploration

---

## 9. Core User Journey

### Phase 1: Landing and Entry

The user arrives on the landing page and understands:

- this product helps with first-job readiness
- it is bilingual
- it requires account creation before product use
- they can create an account and then start the fit check

### Phase 2: Fit Check

The user completes a structured assessment that captures:

- work style preferences
- communication comfort
- comfort with people-facing vs desk-based work
- attention to detail
- comfort with numbers and process
- writing / content signals
- persuasion / support orientation
- stream or educational context where relevant

The assessment should feel smart, but not exhausting.

### Phase 3: Top Matches

The user receives top 3 role matches with:

- match strength
- why it fits
- strengths that contributed
- role description in plain language
- nearby alternative options

The user should not feel judged. They should feel guided.

### Phase 4: Role Confirmation

The user picks a role to move forward with.

If unsure, the coach can help explain:

- why this role fits
- why another role ranked lower
- what kind of day-to-day work the role involves

### Phase 5: Resume Co-Writer

The user enters or refines resume details.

The system helps:

- collect missing info
- shape weak content
- align resume language to the chosen role
- generate a downloadable PDF

### Phase 6: Weekly Plan

The user receives a concrete weekly plan tied to the chosen role.

Examples:

- resume fixes
- job search tasks
- application targets
- interview prep
- profile cleanup

### Phase 7: Ongoing Coaching

The coach can later support:

- stuck users
- application follow-up
- weekly adaptation
- mock interviews

---

## 10. Assessment and Matching Model

### Assessment Strategy

The fit check should use a deterministic scoring engine inspired by the stronger `career-fit-pro` prototype, but with a narrower MVP role set.

### Core Design

- multi-question structured assessment
- bilingual prompts
- stream-aware filtering where relevant
- direct-choice tradeoff questions to reduce shallow self-branding
- top 3 output instead of one “perfect” answer

### Matching Logic

Role matching should come from deterministic weighted scoring, not from AI judgment.

The engine should:

- map responses onto a structured profile
- compare user signals against role profiles
- compute relative fit
- rank roles
- identify ambiguity where needed

### Output Language

Scores should be framed as:

- match strength
- strong fit
- good fit
- explore further

They should not be framed as literal certainty or predictive probability.

---

## 11. AI Strategy

### Core Principle

AI should sit around the deterministic core, not inside the core decision itself.

### Where AI Should Be Used

1. Landing-page greeter
2. Conversational fit-check follow-ups
3. Results explanation and objection handling
4. Resume co-writing
5. Weekly plan adaptation
6. Mock interview coaching

### Where AI Should Not Be the Source of Truth

- top-role scoring
- user eligibility
- saved plan state
- application records
- canonical resume data
- salary facts or factual promises

### Greeter Definition

The AI greeter is a lightweight onboarding layer on the landing page.

Its job is to:

- welcome the user
- reduce hesitation
- understand why they came
- route them into fit check, resume, or another flow

It should be short, optional, and tightly guided.

### AI Mode Recommendation

The recommended approach is a hybrid coach:

- guided entry and quick replies
- bounded backend AI call for short personalized routing
- reliable fallback if AI is unavailable

---

## 12. Product Architecture

### Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS

### Backend / Persistence

- Supabase target architecture
- local in-memory fallback for development and partial offline progress

### Hosting

- Vercel

### LLM Provider

- OpenRouter

### Architectural Rule

The product must continue working in core paths even if OpenRouter is unavailable.

### Required Interfaces

- `POST /api/assessment/fit-check`
- `POST /api/agent/chat`
- `GET /api/agent/context`
- `GET /api/resume/download`
- resume CRUD endpoints
- plan and dashboard endpoints

---

## 13. Data and System Model

### Core Persistent Concepts

- user
- assessment result
- selected role
- resume draft
- weekly plan
- application activity
- reminders / nudges
- agent session / conversation context

### Product Rule

Chat-derived information should be turned into structured product state where appropriate. Important user progress should not live only in chat logs.

---

## 14. Experience Blueprint

### Screen 1: Landing

Purpose:

- explain product value quickly
- build trust
- offer fit-check entry
- optionally surface AI greeter

### Screen 2: Fit Check

Purpose:

- gather structured signals
- keep completion time reasonable
- feel guided, not bureaucratic

### Screen 3: Results

Purpose:

- reveal top 3 roles
- explain fit clearly
- help user commit to a next role

### Screen 4: Resume

Purpose:

- convert role clarity into a usable resume
- preview improvements
- support PDF export

### Screen 5: Dashboard / Plan

Purpose:

- give momentum after the first session
- make next actions visible
- prevent drop-off after results

### Screen 6: Interview

Purpose:

- simulate interview questions
- coach answers
- build confidence

This is a later-stage MVP+ layer, not the first shipping requirement.

---

## 15. Success Metrics

### Activation Metrics

- landing to fit-check start rate
- fit-check completion rate
- fit-check to results view rate
- results to role selection rate

### Value Metrics

- results to resume start rate
- resume completion rate
- resume PDF download rate
- plan adoption rate

### Retention / Coaching Metrics

- return within 7 days
- weekly plan completion activity
- continued applications logging
- interview practice usage

### Quality Metrics

- role recommendation satisfaction
- “this feels relevant to me” feedback
- AI usefulness without blocking core flows

---

## 16. Current Product Status

This section answers: where are we right now?

### 16.1 What Is Already Implemented

#### Product Direction

- The product has been re-baselined away from generic tech-career logic.
- The current working direction now matches the PRD more closely: India-first, bilingual, entry-level, role-guided job readiness.

#### Assessment Engine

- A new curated assessment engine has been implemented.
- The role universe has been narrowed to a practical MVP set.
- The engine is deterministic and produces top 3 matches.
- Assessment scoring is no longer based on the earlier lightweight tech-role quiz.

#### Fit-Check Flow

- The fit-check page is implemented in the Next.js app.
- It submits through the assessment API.
- Results are stored and passed into the product flow.

#### Results Flow

- The results page is implemented.
- Users see top 3 matches after signup and login.
- Role rationale is shown.
- The flow is now aligned to an account-gated assessment and results journey.

#### Resume Flow

- The resume page has been rebuilt around selected role context.
- Guest local drafting works.
- Logged-in persistence is supported through the app APIs.
- Resume PDF download is implemented.

#### Plan and Dashboard

- The dashboard has been reoriented around selected role, reminders, and momentum.
- The weekly plan page has been tied more closely to chosen role context.

#### AI Infrastructure

- OpenRouter service abstraction exists.
- Agent chat and context routes exist.
- Coach infrastructure exists in the app.
- AI-assisted explanation support has begun, but the full coach behavior is not yet complete.

#### Supabase Migration Direction

- The app has been prepared for a Supabase-backed path.
- There is a repository seam between local fallback data and Supabase-backed persistence.

### 16.2 What Is Partially Implemented

#### Bilingual Experience

- English is in stronger shape than Hindi.
- Hindi support exists conceptually, but copy quality and consistency still need work.

#### Persistent Coach

- Agent routes and UI foundations exist.
- The persistent cross-product coach experience is not yet fully wired into the main journey.

#### AI Explanations

- Some AI-assisted explanation capability exists.
- Results explanation is not yet a polished conversational decision-support layer.

### 16.3 What Is Still Missing

#### AI Greeter

- Not yet implemented as the landing-page onboarding layer.

#### Conversational Fit Check

- The current fit-check is structured and deterministic, which is good.
- A true conversational mode on top of the same scoring engine is still missing.

#### Results Objection / Override Flow

- Users cannot yet naturally say things like “I do not want customer support, show me another path” and get guided reranking or explanation.

#### Resume Co-Writing Actions

- Resume infrastructure exists, but inline AI drafting and guided rewriting are still not fully built.

#### Weekly Adaptation Loop

- The plan page exists, but adaptive weekly coaching is not complete.

#### Interview Coach

- Not yet built as a production-quality role-specific layer.

#### Visual Fidelity to Target Prototype

- The current UI is improved and functional.
- It does not yet match the target high-fidelity storyboard closely enough.

---

## 17. Current Build Assessment

### What We Have

We currently have a usable product foundation with:

- a working product shell
- a real assessment engine
- a public results flow
- a role-aware resume flow
- a role-aware dashboard and plan flow
- AI and persistence seams for future growth

### What We Do Not Yet Have

We do not yet have the final polished product experience.

The codebase is now in a better strategic direction, but it still needs:

- tighter visual design
- stronger Hindi execution
- fully integrated coach behavior
- conversational orchestration across the whole journey

### Honest Status Label

Current state:

Functional MVP foundation, not launch-ready final product.

---

## 18. Recommended Next Build Sequence

### Sprint 1: Coach Entry Layer

- add landing-page AI greeter
- add guided intent routing
- preserve a non-chat CTA path

### Sprint 2: Conversational Assessment Mode

- add optional chat-based fit-check mode
- keep the same deterministic scoring engine underneath
- extract structured signals from conversation

### Sprint 3: Results Decision Support

- add “why this role” and “not this role” coach interactions
- support guided role confirmation

### Sprint 4: Resume Co-Writer

- add section-level AI writing actions
- add missing-information prompts
- improve role-specific rewriting

### Sprint 5: Weekly Coach Loop

- add adaptive plan check-ins
- connect plan progress to applications and coaching

### Sprint 6: Visual Refinement

- align landing, fit-check, results, and resume to the approved prototype direction
- tighten mobile composition
- fix Hindi presentation quality

---

## 19. Risks

### Product Risk

If the role set becomes too broad too early, the product will lose clarity and quality.

### AI Risk

If AI is allowed to become the judge instead of the coach, results will become unstable, expensive, and harder to trust.

### UX Risk

If the product asks for login too early or makes chat mandatory, activation will drop.

### Quality Risk

If bilingual support is inconsistent, the “India-first” promise will feel superficial.

---

## 20. Final Product Definition

Job Readiness Coach is a practical, bilingual, India-first AI-assisted product that helps early-career users:

- discover realistic entry-level roles
- understand why those roles fit
- build a stronger role-aligned resume
- follow a concrete weekly path toward getting hired

The system should feel like one continuous coach, but its most important decisions should remain deterministic, explainable, and reliable.

---

## 21. Bottom-Line Status

### What We Are Trying To Build

We are building a focused job-readiness product for early-career users, not a generic career explorer and not a pure chatbot.

### What The Product Is

It is a structured role-discovery, resume, and planning system with AI around it for guidance and coaching.

### Where We Are Today

We have the right product foundation and architecture direction in the current Next.js app, but we are still between “working MVP base” and “polished product.”

The strategy is now much healthier than the earlier drifted version. The next work is about completing the coach orchestration and bringing the product quality up to the intended design and experience standard.
