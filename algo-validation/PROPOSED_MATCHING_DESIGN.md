# Proposed Matching Design

**Implemented version:** `constrained-hybrid-v4`  
**Catalog version:** `2026-06-18.1`  
**Purpose:** deterministic career guidance, not hiring automation or a probability of employment.

## Why this model

The selected design is the smallest model that fixes the current system's structural defects without claiming unavailable data. It uses the six dimensions the questions already encode, one global geometry for every role, normalized branch evidence, explicit readiness states, optional demonstrated-ability checks, and a market term that stays off until sourced.

The parallel RIASEC prototype was rejected for production because the questionnaire was not designed or validated as a Holland inventory, Realistic evidence was always zero, and written ability was inferred from unrelated choices. RIASEC remains a future research option only if original items are validated locally or a suitably licensed instrument is adopted.

## Inputs

### Preference evidence

Every valid selected option has the existing vector:

`[numerical, people-reactive, people-proactive, process-ops, creative-output, analytical-output]`

Vectors are summed across the canonical routing, optional tie-breaker, and active branch. Off-path and unknown answers are rejected before scoring.

### Branch preference

Active branch choices contribute authored role points. For role `r`:

`B_r = min(1, branchPoints_r / 24)`

The four evidence questions contribute at most 12 points in total. The transparent finalist contributes 24 points to exactly one role and therefore determines the branch component without using role-specific weights. This direct stated preference is 60% of a self-report-only score; it is deliberately separated from eligibility and demonstrated ability.

### Readiness evidence

Routing answers currently expose number comfort, speaking comfort, and data/detail comfort. These are self-reports, not demonstrated ability or legal eligibility. The catalog marks each role's need as `basic` or `strong`.

An explicit `low` conflict produces `eligibility = conditional` and a 0.35 ranking adjustment. Conditional roles are withheld from the visible top three when at least three non-contradictory alternatives exist. Missing education/domain evidence produces `insufficient-evidence`, never an automatic failure.

### Demonstrated ability

The internal `AssessmentProfile.objectiveEvidence` field supports optional verified 0-100 checks:

- `communication`: short scenario response or communication sample
- `accuracy`: small record-check task
- `spreadsheet`: spreadsheet interpretation/manipulation
- `writing`: short practical writing task
- `typing`: timed accuracy task
- `numeracy`: short applied arithmetic task
- `technical`: troubleshooting task
- `design`: reviewed work sample

Only checks declared relevant to a role are averaged. Coverage is the share of a role's relevant checks that are present, so one of two checks receives half of the maximum ability weight. Missing or out-of-range objective evidence is `null`; it is not imputed from education, language, or unrelated preference answers and does not lower the score. The public assessment endpoint does not accept objective scores from the client; a future task endpoint must score and attest them server-side.

### Market demand

Each role has a structured prior record with value, geography, date, URL, and license. All current values are null and the catalog policy is `disabled-until-sourced`. When a licensed maintainable feed exists, demand may receive at most 5% weight and must be evaluated for exposure effects. City text never silently changes a score.

## Formula

All roles use the same global dimension weights (currently all one). Let `u` be the summed user vector and `v_r` the role target.

`P_r = cosine(u, v_r)`

Without objective evidence:

`E_r = 0.40 P_r + 0.60 B_r`

With complete relevant objective evidence `A_r`:

`E_r = 0.30 P_r + 0.50 B_r + 0.20 A_r`

For coverage `c` between zero and one, the weights interpolate without creating missing-evidence zeros:

`E_r(c) = (0.40 - 0.10c) P_r + (0.60 - 0.10c) B_r + 0.20c A_r`

If a sourced demand prior `D_r` is enabled later:

`E'_r = 0.95 E_r + 0.05 D_r`

Final internal index:

`score_r = round(92 * E'_r * readinessAdjustment_r)`, clamped to `[0, 95]`. The monotonic 0.92 scale preserves ordering while preventing a false-probability-looking pile-up at 99.

The raw index is retained for deterministic ordering and regression analysis. The results UI displays ordinal evidence bands, not the integer.

## Normalization and missing data

- Cosine compares direction, so longer paths do not automatically score higher.
- Branch points are normalized against 24 finalist points and capped at one.
- Missing objective evidence triggers weight redistribution to preference/branch rather than a zero.
- Missing or non-preferred education is `insufficient-evidence` with a small 0.95 adjustment and an explanation to verify alternative qualifications; it is not a hard exclusion.
- A required active answer cannot be missing. Invalid, inactive, and wrong-branch answers are rejected.
- No unknown value is silently converted to an average candidate.

## Adaptive-path integrity

`validateAssessmentResponses` reconstructs the only legal path:

1. validate all five routing question/option pairs;
2. recompute whether the tie-breaker is active;
3. validate or reject the tie-breaker;
4. recompute the winning cluster;
5. validate all four evidence answers and the finalist answer against that branch;
6. reject unknown keys, inactive answers, missing answers, and options from another branch;
7. persist only canonical responses.

The UI deletes `rtb`, `b1`-`b4`, and `rf` whenever a routing answer changes, deletes branch answers when the tie-breaker changes, and checks that a stored option is present in the current question before enabling Next.

## Ranking and ties

Roles sort by final score, then explicit catalog order. Readiness-conditional roles move behind non-contradictory alternatives when possible. Catalog order is versioned, making tie policy visible and deterministic.

The routed cluster remains an explanation/adaptation result, not a hidden ranking boost. This avoids cluster membership overriding a higher globally comparable score.

## Confidence

Confidence is not a probability. The index combines:

- completeness: 35%
- top-one/top-two separation, saturated at a 20-point gap: 30%
- consistency with readiness constraints: 20%
- evidence reliability: 15% (0.55 for self-report; higher when a relevant objective check exists)

Bands:

- `high`: complete, all relevant objective evidence present, index >= 75
- `medium`: complete and index >= 55
- `low`: otherwise

Reasons name close rankings, missing objective evidence, incompleteness, or contradiction. Self-report-only results cannot be labelled high confidence.

## Explanations

Each result carries:

- up to three selected supporting signals;
- preference score;
- readiness state and reasons;
- demonstrated-ability score or null;
- scoring/catalog versions;
- deterministic bilingual rationale.

OpenRouter no longer replaces the saved core rationale on POST. Generated coaching can discuss a result later, but cannot change ranking evidence.

## Baseline comparison

See `BENCHMARK_RESULTS.json`. The simple additive baseline wins the authored-persona metric because expected labels were written from those branch choices. That is leakage, not evidence that additive scoring predicts employment. V3 matches the frozen engine at 17/20 synthetic top-1 while reducing 99 ceilings from 14 to 2 and adding the required integrity/constraint behavior.

## Fairness and employment safeguards

- Protected characteristics are neither collected for ranking nor inferred.
- Name and city do not affect ranking.
- Education stream is optional and cannot create a hard exclusion.
- Low language/speaking comfort routes away from high-call work only when the user explicitly reports the conflict; future non-voice/local-language alternatives should be offered rather than treating language as general ability.
- Disability must not be inferred. Future work-condition questions must support accommodation and alternative-role explanations.
- Recommendations are user-contestable guidance and must never be exposed as an employer candidate score.
- Outcome evaluation must stratify error/exposure by consented audit groups and check proxies such as city tier, language medium, device access, and education route.

## Cold start

New users need only the assessment path. New roles require a versioned policy, a distinct question signal, constraint review, and reachability/adversarial tests. Market priors default to null. No role receives an optimistic default because data is missing.

## Rejected alternatives

- **Existing role-weighted cosine:** incomparable geometry and saturation.
- **Pure additive:** transparent but dominated by the answer-label construction and too compensatory without constraints.
- **RIASEC prototype:** unsupported measurement claim for these items.
- **Formal IRT/CAT:** no calibrated item parameters and preference items are not correct/incorrect tests.
- **LTR/logistic/neural ranking:** no genuine labels.
- **Collaborative filtering:** no interaction matrix.
- **Contextual bandits:** delayed high-stakes rewards and no propensities/outcome infrastructure.
- **LLM ranking:** non-deterministic and not contestable.

## Migration and rollback

Migration `20260618_version_assessment_results.sql` adds immutable result snapshot, scoring version, and catalog version. New assessments persist canonical responses and the deterministic snapshot. GET returns the snapshot instead of silently rescoring old users. Patient Care Coordinator and the former Telemedicine Coordinator ID are retired; historical snapshots containing either ID return a retake state rather than being mapped to an unrelated role.

Catalog expansion uses an explicit lifecycle. Thirty new roles are registered with aliases, requirements, separator signals and title provenance. Twenty are active with evidence warnings and ten are gated. The transparent finalist item makes them rankable without a role-specific boost; market priors remain disabled, and recruiter, expert-case, bilingual-content and real-user validation gaps are shown as unresolved limitations.

Deployment sequence:

1. apply the additive database migration;
2. deploy application code;
3. monitor 400 response rate, completion rate, role coverage, and errors by scoring version;
4. do not rewrite historical score JSON in place.

Rollback:

1. redeploy the previous app version;
2. leave additive columns in place (old code ignores them);
3. disable v3 via deployment rollback rather than deleting snapshots;
4. if role-ID compatibility is needed, retain the read alias until all old rows are migrated;
5. never drop columns during an emergency rollback.

## Claims boundary

Proven: deterministic execution, strict completion/path validation, versioned policy, contradiction handling, lower synthetic saturation, and test reachability. Observed only synthetically: persona top-1/top-3 agreement and score distributions. Unknown until real validation: occupational fit, employability, calibration, subgroup performance, and outcome lift.
