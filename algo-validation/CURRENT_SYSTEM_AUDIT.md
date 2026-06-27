# Current System Audit

**Audit date:** 2026-06-18  
**Audited implementation:** `src/lib/assessment-engine.ts`, the fit-check UI and API, both database adapters, results UI, tests, scripts, migrations, and existing algorithm documents.  
**Status:** pre-change baseline. Repository documents are cited only where the running code confirms them.

> **Post-audit implementation note (2026-06-19):** The current runtime is now `constrained-hybrid-v4` with 41 recommendable roles, strict canonical-path validation, four cluster evidence questions plus a required finalist question, versioned result snapshots, explicit eligibility states, and retired Patient Care/Telemedicine IDs. The findings below remain the frozen baseline used for before/after comparison.

## Executive finding

The production system is a deterministic two-stage content scorer, not an employability predictor. It can separate the hand-authored role archetypes, but it currently mixes stated preference, weak self-reported ability, and a few soft eligibility penalties into one number labelled "Match score". The number is not a probability, is not calibrated against employment outcomes, and is not comparable across roles because every role applies different dimension weights before cosine similarity.

The implementation passes 100 existing tests, but those tests explicitly accept empty assessments. The production API accepts arbitrary question IDs, arbitrary option IDs, incomplete active branches, and arbitrary selected-role IDs. A backtrack can therefore leave old branch answers that satisfy the UI's non-empty check while being invalid for the newly selected branch. Such a submission is saved as `completed` and still receives recommendations.

The 20-persona harness reports 95% cluster, 85% top-1, and 85% top-3 agreement with its authored expectations. This proves determinism and some intended routing behavior only: the personas, answers, and labels were authored from the same scoring design. It is not independent accuracy evidence. Fourteen of those 20 results hit the score ceiling of 99.

## End-to-end system map

1. **Collection:** `/career-fit-check` collects optional name, city, and free-text degree plus five routing answers. `getNextQuestions` may insert one tie-breaker, then appends four questions for the winning cluster.
2. **Client state:** answers live only in React component state until submission. All four branch sets reuse IDs `b1` through `b4`.
3. **Submission:** the page POSTs `responses` and the three profile fields to `/api/assessment/fit-check`.
4. **Request validation:** Zod limits answer count and string length, but does not validate known question IDs, option membership, the active adaptive path, or completion.
5. **Scoring:** `db.saveAssessment` calls `scoreAssessment`; both memory and Supabase adapters use the same function.
6. **Persistence:** raw responses, derived profile, selected top role, all role scores, and `completed` status are stored. Cluster, confidence, explanations, catalog version, scoring version, and evidence details are not stored.
7. **Explanation:** POST optionally replaces deterministic rationales with OpenRouter output. These AI rationales are not persisted. A later GET recomputes the result and therefore returns deterministic rationales and whatever the current code/catalog now produces.
8. **Results:** the client stores the result locally and opens `/results`, which displays three roles, integer "Match score", a strength band, salary copy, rationale, and four dimension percentages. Users may choose one of the displayed roles.
9. **Downstream use:** selected role drives resume, weekly plan, interview content, reminders, dashboard, and coach context.

## Collected and missing evidence

### Actually collected and used

| Evidence | Source | Use |
|---|---|---|
| Five routing choices | `r1`-`r5` | Cluster points and six-dimensional preference vector |
| Optional tie-breaker | `rtb` | Adds cluster points and can select a near-leading cluster |
| Four active branch choices | `b1`-`b4` | Adds vector signal and role-specific bonus |
| Number/data comfort | routing question `r3` | Profile patch and three penalty rules |
| Speaking comfort | routing question `r4` | Profile patch and one penalty rule |
| Name | profile form/account | Stored; no ranking effect |
| City | profile form | Rationale wording only; no ranking or demand effect |
| Degree name | profile form | Stored; no ranking effect |
| UI locale | header | Copy selection only; no ranking effect |

### Declared but dead or disconnected

`educationStream` is never collected in the production fit-check. Therefore commerce/science, law, and healthcare boosts do not run in normal production submissions, although the synthetic harness seeds them directly. `RoleDefinition.streams` is never consulted. `englishLevel`, `workStylePreference`, `writingConfidence`, `biggestProblem`, `preferredEnvironment`, and `weeklyAvailability` are declared but never collected or scored. The specification describes a writing-avoidance rule, but production has no such rule.

### Expected but absent

There is no evidence for location/mobility, travel, field work, shifts, voice versus non-voice work, equipment/connectivity, typing speed, Excel level, Tally, licensing, language required for a specific role, target comfort, physical requirements with accommodation handling, or objective work samples. There is no city-role market prior. No assessment reliability, item discrimination, response consistency, or observed outcome label is recorded.

## Running formulas

### Routing

Each selected routing option contributes authored integer points to one or two of four clusters. The tie-breaker contributes three more points. Cluster order in the object is `people-facing`, `desk-ops`, `analytical`, `creative`, so exact ties default to that insertion order unless the explicit tie-breaker is within three points of the leader. A tie-breaker is requested when the top-two pre-tie margin is below five points.

This differs from the design document, which says a margin below 15 and a normalized additive model.

### Content score

All selected option vectors are summed into user vector `u`. For each role `r`, with a role-specific weight vector `w_r`, production computes:

`cos_r = sum_i (u_i w_ri)(r_i w_ri) / (sqrt(sum_i (u_i w_ri)^2) sqrt(sum_i (r_i w_ri)^2))`

The weights are applied to both vectors, so they enter the dot product as squared weights. Since `w_r` differs by role, these cosine values do not share one measurement scale.

Each selected option may also contribute authored role points. Production calculates:

`raw_r = round(70 * cos_r + min(30, 3 * sum(rolePoints_r)))`

and clamps `raw_r` to `[0, 99]` before eligibility multipliers.

### Penalties and boosts

| Condition | Roles | Multiplier |
|---|---|---:|
| Low number confidence | finance assistant, data entry/MIS, operations analyst | 0.15 |
| Low speaking confidence | customer support, sales support, academic counsellor | 0.25 |
| Low data confidence | data entry/MIS, back office, legal/compliance | 0.25 |
| High numbers plus commerce/science | finance assistant, operations analyst | 1.15 |
| Law stream | legal/compliance | 1.12 |
| Healthcare stream | telemedicine coordinator | 1.15 |

These are soft score multipliers, not verified eligibility constraints. Boosts are applied after the initial 99 clamp and clamped again, increasing ceiling saturation. In production the stream boosts are normally unreachable.

### Ranking and tie-breaking

All 12 roles are sorted by final score, not restricted to the routed cluster. Routed-cluster membership breaks equal scores, followed by fixed `ROLE_ORDER`. This is deterministic but gives catalog order hidden policy power. Positive scores are preferred; otherwise the first three ranked roles are returned.

### "Confidence" and warning

`confidenceScore` is merely the final top-two cluster point margin. It ignores response completeness, top-role separation, contradictions, evidence type, missing objective checks, and reliability. It is not a probability.

The warning appears when the top role is below 62, or when all three displayed roles are within four points of the top. The strength labels use fixed score thresholds (82, 70, 58), despite scores lacking empirical calibration.

## Catalog and cluster map

- **People-facing:** customer support, academic counsellor, telemedicine coordinator, HR coordinator
- **Desk operations:** back-office operations, data entry/MIS, legal/compliance operations
- **Analytical:** operations analyst, accounting/finance assistant
- **Creative:** digital marketing, content writer, sales support

Sales support is placed in the creative cluster despite being predominantly proactive people/target work. Data entry and MIS are combined despite materially different tool and analytical requirements. Telemedicine coordinator wording is narrower and less searchable than patient/care coordination. Academic counselling copy understates its common admissions-sales and target component.

## Integrity and correctness defects

### Critical

1. **Incomplete submissions are scored and persisted.** `scoreAssessment({})` returns three roles; the POST schema accepts `{responses:{}}`; both DB adapters mark the record completed.
2. **Question/option membership is unvalidated.** Unknown IDs, an option from another question, a missing tie-breaker, or an incomplete/wrong branch are accepted.
3. **Backtracking can create a false completion.** Branches reuse `b1`-`b4`. When routing changes, old option IDs remain. The UI sees a non-empty value and allows Next, even when that option is absent from the new question. The scorer silently drops it and scores partial evidence.

### High

4. **Arbitrary role selection is accepted.** PATCH validates only a non-empty string and casts it to `RoleId`; downstream role lookups can then be undefined.
5. **Historical results are not versioned.** GET rescoring means a deployment can silently change an old assessment and its top roles. Stored score and selected-role consistency are not checked.
6. **Scores are cross-role incomparable and saturate.** Role-specific weights change the geometry per role, while a 30-point direct bonus plus clamping makes archetypal responses hit 99.
7. **Eligibility is preference masquerading as feasibility.** Self-reported avoidance produces large penalties, but actual job requirements are mostly absent and no hard/conditional eligibility state is exposed.

### Medium

8. **Production and validation differ.** Personas inject `educationStream`, enabling boosts unavailable through the UI. Some tests accidentally pass branch answers as `profileSeed` rather than merging them into responses, so they do not test branch scoring.
9. **AI explanation behavior is inconsistent.** POST may show a generated rationale, while refresh/GET reconstructs another rationale. Neither is tied to persisted evidence/version.
10. **Dimension percentages are compositional shares, not levels.** They sum to roughly 100, so increasing one can visually lower another even when absolute evidence did not fall. The UI also adds two shares for "People", which can exceed the intended single-dimension interpretation.
11. **No funnel link from recommendation to outcome.** Applications store free-text titles and coarse status but are not linked to assessment version/recommended role. Callback, interview, offer, and 30-day retention labels cannot be analyzed reliably.
12. **No item or scale evidence.** Questions are authored product items with no reliability, validity, differential item functioning, or accessibility study. They must not be described as a psychometric test.

## Baseline reproduced on 2026-06-18

Environment: repository lockfile, Node 24.2.0, Jest run in band.

- Existing suite: **7 suites, 100 tests passed**.
- Identical-input determinism in persona harness: **20/20 stable**.
- Synthetic authored personas: cluster **19/20 (95%)**, top-1 **17/20 (85%)**, top-3 **17/20 (85%)**.
- Tie-breaker used: **7/20**.
- All 12 roles appeared in at least one synthetic top three.
- Top score was **99 for 14/20** personas (70%).
- Empty input currently returns recommendations; an invalid option does too.

The persona metrics are observed structural agreement only. They do not establish predictive, criterion, convergent, or consequential validity.

## Analytics and responsible-use audit

PostHog infrastructure records generic product events/page views, but the fit-check does not emit assessment-start, question completion, branch, warning, result-view, role acceptance, or recommendation feedback events. The database can count applications and offers, but it cannot attribute them cleanly to a recommendation.

No protected characteristic is intentionally used. Name is collected but has no score effect; it should remain excluded. City, education stream, language comfort, device access, and mobility can become socioeconomic or regional proxies if added carelessly. Current language avoidance penalties may steer users away from roles rather than offer non-voice or local-language alternatives. The product is guidance, not a hiring decision, but the UI and email language ("we recommend" and integer match score) can overstate certainty.

## What is proven, observed, and unknown

### Proven by code/tests

- Scoring is deterministic for identical inputs.
- The current authored paths can reach all 12 existing roles in the persona set.
- Score-first sorting prevents a penalized role from outranking a role with a higher final score.
- Production lacks strict completion and membership validation.

### Observed only in synthetic tests

- High agreement with 20 hand-authored expected labels.
- Broad role and cluster reachability.
- Frequent score saturation and some intended contradiction penalties.

### Requires real-user evidence

- Whether questions measure stable preferences or ability.
- Whether recommended roles improve application, callback, interview, offer, or retention outcomes.
- Whether confidence bands correspond to human agreement or outcome rates.
- Whether items behave consistently across Hindi/English, gender, disability, socioeconomic background, city tier, or education route.
- Whether salary and market-demand statements remain accurate by city and date.

## Baseline conclusion

The existing engine is a useful deterministic prototype and a reasonable control baseline. It should not be tuned further in its current form. Completion/path validation and versioned evidence must be fixed first; then eligibility, preference, demonstrated ability, demand, and confidence should be represented separately. Raw 0-99 scores should no longer be presented as precise cross-role measurements until real calibration data exists.
