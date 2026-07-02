# PRD: Adaptive Assessment Engine v2
**Product:** Job Readiness Coach  
**Status:** Pre-launch — full rebuild  
**Scope:** assessment-engine.ts + question flow + scoring logic  
**LLM dependency:** None (v1). LLM added as polish layer in v2 after this ships.

> Superseded by the live `constrained-hybrid-v4` implementation and the rollout docs in `assessment-onboarding-upgrade-plan.md` and `Sprints.md`. Keep this file only as historical context for the retired 12-role / pre-v4 design.

---

## Current Live Snapshot

This section reflects the live implementation in `src/lib/assessment-engine.ts` and related matcher files as of July 2026. The detailed design below remains useful as history, but it is no longer the shipped shape.

- The live catalog is **41 roles**, not 12.
- The ranked results set is **11 core roles** plus **30 candidate roles** surfaced separately through `adjacentRoles`.
- `telemedicine-coordinator` is **retired** and must not be treated as a live route.
- `patient-care-coordinator` is also retired; both retired ids are tracked in `src/data/role-candidates.seed.json`.
- The live result shape includes `topRoles`, `adjacentRoles`, `cluster`, `confidenceScore`, `confidenceBand`, `dimensionSnapshot`, `scoringVersion`, and `catalogVersion`.
- Disqualification is handled through the current eligibility/readiness pipeline in code. The historical `DISQUALIFIER_RULES` wording below is not the live implementation contract.
- Sprint planning and rollout truth now lives in `SPRINTS.md` and `assessment-onboarding-upgrade-plan.md`.

For implementation or verification work, use the current code and sprint docs first, then consult the remaining sections of this file only for background.

---

## Problem Statement

The current assessment engine presents 13 identical preference questions to every user and scores all 12 roles simultaneously using weighted cosine similarity. This produces three compounding problems: (1) self-report preference questions are answered aspirationally by fresh graduates, not accurately; (2) the 8 dimensions do not cleanly separate the 12 roles — 5 people-facing roles and 4 desk-ops roles share near-identical vectors; (3) there are no elimination rules, so users who explicitly avoid numbers routinely receive finance and data-entry recommendations as top results.

The consequence is a results page that fires the "your profile is broad" warning frequently, eroding trust in the product before any user has started a job search. Since the product is pre-launch, this is the right moment to rebuild the engine correctly rather than patch it.

---

## Goals

1. **Routing accuracy**: ≥85% of users should receive a top-1 recommendation that belongs to the correct role cluster (People-facing / Desk-ops / Analytical / Creative), measurable via post-results feedback.
2. **Confidence**: The "your profile is broad" warning should fire in ≤15% of assessments (vs. estimated ~40% today).
3. **Completion rate**: ≤9 questions total should reduce drop-off mid-assessment vs. current 13-question flow.
4. **Disqualifier accuracy**: Zero results where the top role directly contradicts a stated hard avoidance (e.g. finance recommendation for a user who said they avoid numbers).
5. **LLM-readiness**: The engine's output must carry enough structured signal (cluster, confidence score, top disqualifier signals) that a future LLM layer can personalize rationale without re-running the assessment.

---

## Non-Goals

- **Adding new roles**: The 12 existing roles are preserved in v1. Role expansion is post-launch work once routing is validated.
- **LLM rationale generation**: Deliberately excluded from v1. The engine must produce usable results without LLM. LLM is added as a layer on top after the deterministic core is proven.
- **Multilingual question redesign**: Hindi translations of the new questions are required but the question design work is done in English first.
- **User-facing confidence display**: The confidence score is computed internally and used for tie-breaking. It is not shown to users in v1.
- **Collaborative filtering / ML scoring**: No trained models. All scoring is deterministic and auditable.

---

## Architecture Overview

```
Phase 1 — 5 Routing Questions (same for everyone)
    Scenario-based. Measures behavioral tendency, not stated preference.
    Output: primary cluster score across 4 clusters
    
    If top cluster margin < 15 points → 1 tie-breaker question inserted
    
Phase 2 — 4 Branch Questions (different per cluster)
    Targeted differentiation within the 3-4 roles of the winning cluster.
    Output: specific role recommendation
    
Disqualifier Rules (applied before Phase 2 scoring)
    Hard multipliers that eliminate or heavily penalise roles when
    profile signals explicitly contradict role requirements.
    
Scoring
    6-dimension additive scoring (not cosine similarity).
    Scores are normalised 0–100. Top 3 roles returned.
    
Result
    topRoles[3], allScores, cluster, confidenceScore, dimensionSnapshot, warning
```

---

## Dimension Model (v2)

Replace the current 8 dimensions with 6 that cleanly separate the 12 roles:

| # | Dimension | What it measures | Replaces |
|---|-----------|-----------------|---------|
| 0 | `numerical` | Comfort with numbers, records, reconciliation | `analytical` + `technical` (partial) |
| 1 | `people-reactive` | Helping, listening, support under pressure | `people` (partial) |
| 2 | `people-proactive` | Persuading, guiding, outreach-driven contact | `leadership` |
| 3 | `process-ops` | Following SOPs, documentation, structured accuracy | `structure` + `precision` |
| 4 | `creative-output` | Writing, campaigns, content creation | `creative` + `innovation` (partial) |
| 5 | `analytical-output` | Dashboards, reports, problem diagnosis | `analytical` + `technical` (partial) |

**Dropped dimensions:** `technical` (near-zero signal across all questions) and `leadership` (conflated with persuasion; now captured by `people-proactive`).

---

## Role Cluster Mapping

```
PEOPLE-FACING cluster
  → customer-support
  → academic-counsellor
  → patient-care-coordinator
  → hr-coordinator

DESK-OPS cluster
  → back-office-operations
  → data-entry-mis
  → legal-compliance-operations

ANALYTICAL cluster
  → operations-analyst
  → accounting-finance-assistant

CREATIVE cluster
  → digital-marketing-executive
  → content-writer
  → sales-support  (outbound energy + communication)
```

---

## Phase 1: Routing Questions (5 questions, same for everyone)

All five questions are scenario-based. The user is presented with a concrete situation and picks the response that feels most natural — not the most impressive one.

### Q1 — Stress response (People signal)
*"A customer contacts you upset about a delayed order. What do you do first?"*
- A: Stay calm, acknowledge how they feel, and walk them through what I can do — *(people-reactive +3)*
- B: Look up the order status immediately and give them a clear timeline — *(process-ops +2, analytical-output +1)*
- C: Check if there's a written escalation process and follow it step by step — *(process-ops +3)*
- D: Figure out if there's a pattern causing this and flag it to prevent future cases — *(analytical-output +3)*

### Q2 — Free time choice (Work identity)
*"You have 2 free hours at work with no meetings. What do you genuinely pick?"*
- A: Call 5 people and move pending conversations forward — *(people-proactive +3)*
- B: Fix a broken Excel report that's been giving wrong numbers — *(numerical +2, process-ops +2)*
- C: Research and write a useful comparison doc or guide — *(creative-output +2, analytical-output +1)*
- D: Clean up a messy process and document a better way to do it — *(process-ops +3, analytical-output +1)*

### Q3 — Numbers relationship (Hard signal for numerical)
*"Your manager asks you to check 200 rows of data for errors. You:"*
- A: Get into it — I find mistakes satisfying to catch — *(numerical +3, process-ops +2)*
- B: Do it carefully but it's not something I'd choose — *(numerical +1)*
- C: Would rather someone explain the pattern so I can check faster — *(analytical-output +1)*
- D: Would prefer to delegate this and handle something more people-facing — *(people-reactive +1)*

### Q4 — Communication mode (Proactive vs reactive people split)
*"You're given a list of 20 potential customers to contact. You:"*
- A: Call them directly — I'm comfortable starting conversations — *(people-proactive +3)*
- B: Email them with a clear message and follow up on replies — *(people-proactive +1, process-ops +1)*
- C: Research each one first so I know what to say — *(analytical-output +2)*
- D: Would prefer an inbound role where they come to me — *(people-reactive +2)*

### Q5 — Output preference (Creative signal)
*"Which of these would you find most satisfying to show your manager at end of week?"*
- A: A campaign or piece of content that got real engagement — *(creative-output +3)*
- B: A clean report or dashboard they can act on — *(analytical-output +3, numerical +1)*
- C: A process you improved or documented — *(process-ops +3)*
- D: A set of calls or conversations you moved forward — *(people-proactive +2, people-reactive +1)*

---

## Tie-Breaker Question (inserted if top cluster margin < 15 pts)

### Q-TIE — Direct role preference
*"Which offer sounds strongest for your first 12 months?"*
- A: Customer or student support — clear goals, training provided — *(people-reactive +3)*
- B: Operations or MIS — reports, trackers, process ownership — *(process-ops +3, numerical +2)*
- C: Marketing or content — campaigns and audience growth — *(creative-output +3)*
- D: Accounts or compliance — records, review, accuracy — *(numerical +3, process-ops +2)*

---

## Phase 2: Branch Questions (5 evidence questions per cluster, then finalist)

### PEOPLE-FACING Branch

**BP1 — Guidance vs support**
*"Someone comes to you confused about their options. You naturally:"*
- A: Listen, empathise, and help them feel calm first — *(people-reactive → customer-support, patient-care-coordinator)*
- B: Walk them through each option clearly and help them decide — *(people-reactive → academic-counsellor)*
- C: Ask what they've already tried and coordinate next steps — *(people-proactive → hr-coordinator)*

**BP2 — Interaction energy**
*"End of a long day with back-to-back calls. You feel:"*
- A: Drained but fulfilled — I like helping, just need recovery time — *(customer-support, patient-care-coordinator)*
- B: Energised if the conversations went well — *(sales-support, academic-counsellor)*
- C: Ready for tomorrow's coordination work — *(hr-coordinator)*

**BP3 — Domain comfort**
*"Which setting sounds most natural?"*
- A: Handling complaints or queries for a product or service — *(customer-support)*
- B: Guiding students or families through education decisions — *(academic-counsellor)*
- C: Coordinating hiring, scheduling, or team logistics — *(hr-coordinator)*
- D: Supporting patients or healthcare appointments remotely — *(patient-care-coordinator)*

**BP4 — Writing style**
*"The writing you find easiest:"*
- A: Short, clear replies to customer questions — *(customer-support)*
- B: Structured guidance notes or follow-up summaries — *(academic-counsellor, hr-coordinator)*
- C: Medical or appointment-related documentation — *(patient-care-coordinator)*

---

### DESK-OPS Branch

**BD1 — Error orientation**
*"You spot an error in a completed piece of work. You:"*
- A: Fix it immediately and double-check everything around it — *(data-entry-mis, legal-compliance)*
- B: Log it, fix it, and add a check to catch it next time — *(back-office-operations)*
- C: Investigate what caused it before fixing anything — *(legal-compliance-operations)*

**BD2 — Rule orientation**
*"Your strongest comfort zone:"*
- A: Accuracy — entering, verifying, and reporting data cleanly — *(data-entry-mis)*
- B: Process — keeping operational workflows running correctly — *(back-office-operations)*
- C: Compliance — reviewing documents and records against rules — *(legal-compliance-operations)*

**BD3 — Interaction preference**
*"Your ideal day has:"*
- A: Minimal meetings, mostly screen-based focused work — *(data-entry-mis)*
- B: Some coordination with other teams, mainly task-driven — *(back-office-operations)*
- C: Reviewing documents with occasional clarification calls — *(legal-compliance-operations)*

**BD4 — Domain draw**
*"Which feels closest to work you'd want to get good at?"*
- A: Spreadsheets, data systems, and reporting tools — *(data-entry-mis)*
- B: Operational processes, documentation, coordination — *(back-office-operations)*
- C: Legal documents, compliance checklists, regulatory records — *(legal-compliance-operations)*

---

### ANALYTICAL Branch

**BA1 — Output type**
*"You built something useful at work. It's most likely:"*
- A: A dashboard or report someone uses every week — *(operations-analyst)*
- B: A reconciled set of accounts or financial records — *(accounting-finance-assistant)*

**BA2 — Numbers context**
*"The numbers work you find most satisfying:"*
- A: Spotting trends, building models, diagnosing what changed — *(operations-analyst)*
- B: Reconciling ledgers, checking invoices, ensuring accuracy — *(accounting-finance-assistant)*

**BA3 — Tool comfort**
*"Which sounds more natural right now?"*
- A: Excel/Sheets for analysis, pivot tables, dashboards — *(operations-analyst)*
- B: Tally, accounting entries, bookkeeping, financial records — *(accounting-finance-assistant)*

**BA4 — Career draw**
*"Where do you want to get better?"*
- A: Operations, process improvement, reporting — *(operations-analyst)*
- B: Finance, accounts, reconciliation — *(accounting-finance-assistant)*

---

### CREATIVE Branch

**BC1 — Creative output**
*"The work you're most proud of creating:"*
- A: A piece of writing, article, or content someone found useful — *(content-writer)*
- B: A campaign, ad, or post that got real engagement — *(digital-marketing-executive)*
- C: A pitch or conversation that convinced someone — *(sales-support)*

**BC2 — Audience relationship**
*"Your natural mode when thinking about an audience:"*
- A: Writing clearly so they understand — *(content-writer)*
- B: Understanding what will get their attention — *(digital-marketing-executive)*
- C: Persuading them toward a decision — *(sales-support)*

**BC3 — Metric comfort**
*"You'd rather be measured on:"*
- A: Content quality and usefulness — *(content-writer)*
- B: Campaign performance and growth — *(digital-marketing-executive)*
- C: Outreach numbers and conversions — *(sales-support)*

**BC4 — Work preference**
*"More satisfying day:"*
- A: Research, draft, edit, publish — *(content-writer)*
- B: Plan campaign, set up ad, analyse results — *(digital-marketing-executive)*
- C: Build pipeline, make calls, close conversations — *(sales-support)*

---

## Disqualifier Rules

Applied as score multipliers **before** Phase 2 scoring. Derived from `profile` patches set during Phase 1.

```typescript
type DisqualifierRule = {
  condition: (profile: AssessmentProfile) => boolean;
  roleIds: RoleId[];
  multiplier: number; // 0.0 to 0.3 eliminates, 0.5 heavily penalises
};

const DISQUALIFIER_RULES: DisqualifierRule[] = [
  // Numbers avoidance → eliminates finance/data roles
  {
    condition: p => p.numbersConfidence === 'low',
    roleIds: ['accounting-finance-assistant', 'data-entry-mis', 'operations-analyst'],
    multiplier: 0.15,
  },
  // Speaking avoidance → penalises high-call roles
  {
    condition: p => p.speakingConfidence === 'low',
    roleIds: ['customer-support', 'sales-support', 'academic-counsellor'],
    multiplier: 0.25,
  },
  // Writing avoidance → penalises content role
  {
    condition: p => p.writingConfidence === 'low',
    roleIds: ['content-writer'],
    multiplier: 0.2,
  },
  // Detail/spreadsheet avoidance → penalises desk-heavy roles
  {
    condition: p => p.dataConfidence === 'low',
    roleIds: ['data-entry-mis', 'back-office-operations', 'legal-compliance-operations'],
    multiplier: 0.25,
  },
  // Strong numbers comfort + commerce/science → boost finance
  {
    condition: p => p.numbersConfidence === 'high' && ['commerce', 'science'].includes(p.educationStream || ''),
    roleIds: ['accounting-finance-assistant', 'operations-analyst'],
    multiplier: 1.15, // boost, not penalty
  },
  // Law stream → boost legal-compliance
  {
    condition: p => p.educationStream === 'law',
    roleIds: ['legal-compliance-operations'],
    multiplier: 1.12,
  },
  // Healthcare stream → boost patient care coordination
  {
    condition: p => p.educationStream === 'healthcare',
    roleIds: ['patient-care-coordinator'],
    multiplier: 1.15,
  },
];
```

---

## Confidence Score

Computed after Phase 1 cluster scoring:

```typescript
function computeConfidence(clusterScores: Record<ClusterId, number>): {
  topCluster: ClusterId;
  margin: number; // top score minus second score
  needsTieBreaker: boolean;
} {
  const sorted = Object.entries(clusterScores).sort((a, b) => b[1] - a[1]);
  const margin = sorted[0][1] - sorted[1][1];
  return {
    topCluster: sorted[0][0] as ClusterId,
    margin,
    needsTieBreaker: margin < 15,
  };
}
```

The tie-breaker question is inserted automatically when `needsTieBreaker === true`. No user-facing indication that this happened.

---

## Updated AssessmentResult Shape

```typescript
export interface AssessmentResult {
  profile: AssessmentProfile;
  cluster: ClusterId;                    // NEW — routing outcome
  confidenceScore: number;               // NEW — top cluster margin
  topRoles: RoleMatch[];                 // top 3 as before
  allScores: Record<RoleId, number>;
  summary: LocalizedText;
  warning: LocalizedText | null;
  dimensionSnapshot: Record<             // updated to 6 dimensions
    'numerical' | 'people-reactive' | 'people-proactive' |
    'process-ops' | 'creative-output' | 'analytical-output',
    number
  >;
}
```

---

## Requirements

### P0 — Must have at launch

- [ ] Two-phase question flow: 5 routing questions for all users, then 4 branch questions matching the routing cluster
- [ ] Tie-breaker question inserted automatically when cluster margin < 15 points
- [ ] All 12 roles preserved with recalibrated 6-dimension vectors
- [ ] Disqualifier rules for all 4 hard-avoidance signals (numbers, speaking, writing, detail)
- [ ] Stream boost rules for law, healthcare, and commerce/science streams
- [ ] Both `en` and `hi` translations for all new questions and options
- [ ] `cluster` and `confidenceScore` fields added to `AssessmentResult`
- [ ] Existing API contract (`POST /api/assessment/fit-check`) unchanged — only internal engine changes
- [ ] Warning threshold tuned to fire only when top score < 62 or 3+ roles within 4 points
- [ ] All existing TypeScript types updated — no `any` escapes

### P1 — High priority fast-follow

- [ ] Post-results feedback: single "Does this feel right? Yes / Somewhat / No" stored in DB
- [ ] `dimensionSnapshot` shown as a visual bar on results page (4 dominant dimensions)
- [ ] Branch question set for the ANALYTICAL cluster includes learning path hint from uploaded dataset
- [ ] Admin dashboard shows cluster distribution across all submissions

### P2 — Future / LLM layer

- [ ] LLM rationale generation using `cluster + confidenceScore + topRoles` as structured input
- [ ] Adaptive question wording based on profile (e.g. city reference in question helper text)
- [ ] Outcome tracking: did the user apply for their recommended role? Did they get it?
- [ ] Vector recalibration using collected yes/somewhat/no feedback after 500 responses

---

## Success Metrics

### Leading indicators (measurable at launch)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Assessment completion rate | ≥78% of users who start Q1 complete all questions | DB — started vs submitted |
| "Broad profile" warning rate | ≤15% of submitted assessments | DB — warning field |
| Disqualifier contradiction rate | 0% — no result where top role directly contradicts stated avoidance | Manual audit of 50 random results |
| Average questions answered | ≤9.5 (accounting for tie-breaker) | DB — response count |

### Lagging indicators (measurable 4–8 weeks post-launch)

| Metric | Target | Measurement |
|--------|--------|-------------|
| "Feels right" rating | ≥65% Yes responses | DB — post-results feedback |
| Results page re-visit | ≥30% of users return to results within 7 days | Sessions |
| Role selection rate | ≥70% of users who see results select a role | DB — selectedRoleId set |

---

## Open Questions

| Question | Owner | Blocking? |
|----------|-------|-----------|
| Should the tie-breaker question be shown in the same UI as routing questions, or as a distinct "one more thing" screen? | Design | No — default is same UI |
| The ANALYTICAL cluster has only 2 roles — do we need 4 branch questions or can we use 2 strong ones? | Engineering | No — start with 4, cut if redundant |
| Hindi translations for scenario questions — who reviews for natural phrasing vs literal translation? | Content | Yes before launch |
| Should `cluster` be stored in the DB assessments table for analytics? Requires a schema migration. | Engineering | No — can add post-launch |
| Are stream boost multipliers (1.12–1.15) calibrated correctly, or should they start at 1.0 and be tuned after data? | Product | No — start conservative at 1.1 |

---

## What This Does Not Change

- The 12 role definitions (names, descriptions, salaryRange, starterTasks, strengths, accent colours)
- The results page UI — same 3 role cards
- The API surface (`/api/assessment/fit-check` POST/GET/PATCH)
- The coach chat widget (OpenRouter service unchanged)
- The database schema for assessments (responses stored as `Record<string, string>`)
- Authentication, rate limiting, or any other infrastructure

---

## Implementation Notes

The cleanest implementation approach:

1. Keep `assessment-engine.ts` as the single source of truth
2. Add `ROUTING_QUESTIONS: AssessmentQuestion[]` (5 questions) and `BRANCH_QUESTIONS: Record<ClusterId, AssessmentQuestion[]>` (4×4 questions)
3. Replace `ASSESSMENT_QUESTIONS` flat array with a `getQuestionsForSession(profile)` function that returns the correct adaptive sequence
4. The scoring function signature stays identical: `scoreAssessment(responses, profileSeed, locale)` — the caller does not need to know about phases
5. Phase routing is computed internally: run Phase 1 responses through cluster scorer, determine branch, return the branch questions to the UI via a new `getNextQuestions(currentResponses)` helper
6. The `career-fit-check/page.tsx` UI needs a minor update to call `getNextQuestions` after Q5 to fetch the Phase 2 set — the question-rendering loop itself doesn't change

---

*Spec version: 1.0 | Last updated: June 2026 | Status: Ready for engineering review*
