# Role Catalog Recommendation

**Decision date:** 2026-06-19  
**Recommendable catalog:** 41 roles  
**Expansion wired:** 30 (`20 active with evidence warnings`, `10 gated`)  
**Retired:** Patient Care Coordinator and its former Telemedicine Coordinator ID

## Decision

Thirty researched roles in `src/data/role-candidates.seed.json` are now connected to assessment, scoring, results, selected-role persistence, resume plans and interview preparation. Twenty may rank with explicit requirement warnings. Ten remain gated: they may surface as an exploration direction, but the result is marked `insufficient-evidence` until a credential, portfolio or practical check is verified.

Official NQR, NSDC and BFSI SSC records establish recognizable Indian titles or qualifications; they do not establish reusable current metro vacancy volume. Therefore market priors and salary claims remain null. Patient Care Coordinator is retired rather than mapped to another role. Historical snapshots containing either retired ID require a retake.

## Lifecycle

`proposed -> shadow -> gated/active -> retired`

- `shadow`: source research state retained for provenance; the runtime may promote it only through an explicit versioned recommendation policy.
- `gated`: additionally requires a credential, portfolio or practical task.
- `active`: may be selected, scored and shown to users.
- `retired`: rejected by new APIs and preserved only as historical provenance.

Moving a role between states requires a catalog-version change and reviewable evidence. Catalog order is not an activation mechanism.

## Admission Gate

A role becomes fully validated only when all are true. Until then, the UI must retain its evidence warning and must not imply predictive validity:

1. Dated, reusable evidence supports meaningful fresher hiring in target metros.
2. Canonical titles and aliases are searchable and stable.
3. Duties or work conditions differ materially from close neighbors.
4. Active original questions separate the role from every close neighbor.
5. Genuine requirements cover relevant shifts, field travel, standing, equipment, typing, tools or credentials without inferring disability or protected traits.
6. Relevant objective evidence is supported where preference answers are insufficient.
7. At least three expert-authored cases, including an ambiguous neighbor, pass.
8. Legal-path reachability, collision, contradiction and explanation tests pass without a role-specific promotion.
9. English and Hindi result/explanation content receives human review.
10. Salary or demand values remain null unless their exact reuse rights, date, geography and method are recorded.

## Candidate Portfolio

| Family | Candidate roles | Lifecycle |
|---|---|---|
| Customer and sales | Non-voice Support, Field Sales, Retail Sales, Banking Sales, Insurance Sales, Microfinance | Active with warnings; Insurance gated |
| Retail operations | Retail Cashier, Retail Store Operations Assistant | Active with warnings |
| Finance and people operations | Credit Processing, GST Assistant, Recruitment Executive, Payroll and Employee Data | Active with warnings; GST gated |
| Logistics and fulfilment | Logistics Coordinator, Courier Operations, Warehouse Associate, Supply Chain Executive | Active with warnings |
| Technical and software | IT Helpdesk, Software Testing, Web Development, EV Service Technician | IT Helpdesk active with warnings; others gated |
| E-commerce and commercial | Digital Cataloguer, Merchant Relationship Executive | Active with warnings |
| Creative media | Junior Graphic Designer, Digital Content Developer, Junior Video Editor | Gated |
| Hospitality and education | Hotel Front Office, Food and Beverage Service, Housekeeping, Kitchen Trainee, Preschool/Daycare | First three active with warnings; Kitchen and Preschool gated |

Exact aliases, requirements, separator signals, objective-check needs and title-source URLs are stored per candidate. Market priors are null for every candidate.

## Source And License Boundary

- NQR/NSDC records are used only for factual title, identifier and URL provenance. No open-content redistribution license was verified.
- BFSI SSC states all rights reserved. Only factual title/source references are stored.
- No curricula, task prose, assessment items, scoring tables, salary figures or source datasets were copied.
- Qualification existence is not demand evidence.
- Job-board scraping and manually copied vacancy counts remain excluded.

## How The Expansion Is Distinguished

The assessment retains four cluster-specific evidence questions and adds one transparent finalist question inside the routed cluster. Its options describe each role's work direction and requirements. This direct preference contributes the same globally defined points for every role; it does not use per-role promotion or catalog order. Eligibility and objective evidence remain separate, so a preferred title does not become a claim of readiness.

The next assessment version must add hierarchical family routing and original discriminator signals for:

- phone, written and in-person interaction;
- outbound targets and collections;
- field travel, standing and shift patterns;
- typing, Excel, Tally and regulated-document work;
- warehouse, store, workshop and hospitality environments;
- technical troubleshooting and portfolio evidence; and
- hands-on versus desk-based work.

## Management Controls Implemented

- Candidate catalog validation with Zod.
- Unique canonical IDs and case-insensitive aliases.
- Shared active-role validation for assessment selection, plans, resumes and coach context.
- Explicit retired-ID registry.
- Validation warnings generated in code and gated-state penalties kept in scoring.
- Tests proving all 41 roles have a valid visible witness path and retired IDs cannot re-enter workflows.
- Active catalog version bumped to `2026-06-19.2`; scoring version is `constrained-hybrid-v4`.

## What Is Proven And Unknown

Proven: 30 expansion roles are structurally registered, scored, selectable, downstream-compatible and reachable in the top three on a purpose-built valid path; gated roles retain `insufficient-evidence`; Patient Care is retired; selection is centrally validated.

Not proven: current vacancy volume, salary, predictive fit, subgroup fairness, or real-user discrimination among close neighboring roles. Those require recruiter review and genuine-user evaluation described in `EVALUATION_PROTOCOL.md`.
