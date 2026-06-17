# Role Catalog & Matching — Market Research Brief

**Purpose:** collect the data I need to (1) build a demand-aligned v2 role catalog and (2) tune
the matching engine to predict real hires. Fill what you can from recruiter conversations, public
data, and job listings; partial is fine — flag gaps.

---

## Part A — Product-level inputs (fill once)

1. **Target geography** — which cities/regions first? (matching demand is city-specific.)
2. **Target user profile** — typical education levels, streams, age, languages spoken/read.
3. **Primary language(s)** of the user base (English / Hindi / regional) — affects which roles fit.
4. **Demand distribution** — for your target city(ies), rank roles by *hiring volume* (how many
   openings/month, roughly). A ranked list is enough; exact numbers are a bonus. Sources: EPFO
   payroll data, NCS portal, TeamLease/Indeed/Naukri published reports, recruiter conversations.
5. **Recruiter/agency demand** — from your placement-agency chats: which roles do they actually
   get paid to fill, and which are hardest to find candidates for? (These get priority + are your
   monetization.)
6. **Catalog size target** — confirm we cap at ~15–18 roles (coverage vs. precision tradeoff).

---

## Part B — Per-role data (one row per candidate role)

For **every role you want in the catalog** (keep existing + propose new), capture the fields below.
Copy the template per role.

### Identity & demand
- **Role name** (the canonical title)
- **Aliases** — what it's actually called in listings (e.g., "Field Sales Executive / Sales Officer / BDE")
- **Hiring volume** — High / Medium / Low for the target city (+ rough openings/month if known)
- **Typical employers / sectors** (e.g., FMCG, NBFC, edtech, 3PL logistics)
- **Fresher-friendly?** — can a 0-experience candidate get hired? (Yes / Needs some exp)

### Entry requirements (these become hard filters / disqualifiers)
- **Minimum education / stream** (e.g., any graduate / commerce / none)
- **Spoken English needed?** — None / Basic / Conversational / Fluent
- **Specific skills required** — typing speed, Excel/Tally, 2-wheeler + license, specific software
- **Language(s)** required locally
- **Shift / travel** — desk-based / field / night shift / relocation

### Job reality (these become the summary, starter tasks, salary shown to users)
- **Day-to-day tasks** (2–4 bullets)
- **Starting salary range** (realistic for tier-2/3, monthly)
- **Growth path** (what it leads to in 1–2 years)

### Fit profile — rate the role 0–5 on each (this builds the matching vector)
How much is this role about each of the following? (0 = not at all, 5 = central)
- **Numbers / accuracy** — money, data, calculations
- **People — reactive** — handling queries, complaints, supporting others
- **People — proactive** — initiating, persuading, sales, outreach
- **Process / operations** — following or owning workflows, coordination, documentation
- **Creative output** — writing, content, campaigns, design
- **Analytical output** — analysis, reporting, dashboards, diagnosing problems

### Disambiguation
- **Closest other role(s)** in the catalog, and **the one question** that would tell them apart
  (e.g., "Field sales vs telecalling → 'Do you prefer meeting people in person or over the phone?'").

---

## Part C — Candidate roles to research

**Keep & verify (existing 12):** Customer Support, Sales Support, Academic Counsellor,
HR Coordinator, Data Entry/MIS, Back-Office Operations, Operations Analyst,
Accounting & Finance Assistant, Digital Marketing Executive, Content Writer,
Telemedicine Coordinator*, Legal & Compliance Operations*.
(\* flag whether these have real fresher volume in your city — candidates for down-ranking/gating.)

**High-volume roles to evaluate for adding:** Field Sales / Field Executive · Telecalling / BPO
Voice · Delivery & Last-Mile / Logistics Ops · Warehouse Associate · Retail Store Associate ·
Banking/NBFC Sales (loans, cards, collections) · Non-voice / Chat & Email Support · Data
Annotation / Tagging. (Add any the recruiters name that aren't here.)

---

## Part D — Two quick exercises (high signal, low effort)

1. **The 10-listings test:** pull 10 real fresher job postings in your target city. Try to map each
   to a current role. However many you *can't* cleanly place = your coverage gap, quantified.
2. **Recruiter wishlist:** ask 2–3 agencies, "What 5 roles do you most need candidates for right
   now?" That single list should largely define the v2 catalog.

---

## What I'll do with this
Each field maps to the engine: identity/demand → catalog + ranking weights; entry requirements →
disqualifier rules; job reality → user-facing copy + salary; the 0–5 fit ratings → the role's
6-dimension matching vector; disambiguation → the branch questions that keep roles distinguishable.
Hand back whatever you gather and I'll produce the v2 catalog (vectors, clusters, branch questions,
disqualifiers) ready to validate.
