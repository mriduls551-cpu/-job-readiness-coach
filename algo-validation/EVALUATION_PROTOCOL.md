# Evaluation Protocol

**Protocol version:** 2026-06-19.2  
**Applies to scoring version:** `constrained-hybrid-v4`  
**Purpose:** structural verification now, predictive validation when genuine outcome data exists

## 1. Evidence boundary

The checked-in personas are synthetic. They test software invariants and examples chosen by the product team; they do not estimate predictive validity, employability, job success, or user satisfaction. Top-1 and top-3 results on those personas must always be labelled synthetic agreement.

The current model is deterministic decision support. Its confidence band describes the quality and consistency of collected evidence, not the probability that a user will obtain or enjoy a job.

## 2. Reproduce the current benchmark

From the application root:

```powershell
npm run benchmark:algorithm
```

This writes `algo-validation/BENCHMARK_RESULTS.json`. The benchmark freezes the pre-change production formula in the test file and compares it with:

1. the former production algorithm;
2. a normalized additive baseline;
3. a globally weighted content baseline; and
4. the selected constrained hybrid.

The current 20-persona structural results are:

| Method | Synthetic top-1 | Synthetic top-3 | Roles reached | Top scores at 99 |
|---|---:|---:|---:|---:|
| Frozen production v2 | 17/20 | 17/20 | 12/12 | 14/20 |
| Normalized additive | 19/20 | 19/20 | 11/11 | not applicable |
| Global content | 19/20 | 19/20 | 11 top-one; 22 top-three across expanded catalog | not applicable |
| Constrained hybrid v4 | 16/20 | 16/20 | 13 top-one; 24 top-three across expanded catalog | 0/20 |

These numbers demonstrate reproducibility and reduced ceiling saturation. They do not prove that one method is more accurate for real people. Expansion adds plausible neighboring alternatives, so agreement with labels authored for the old 11-role catalog falls from 17 to 16. The hybrid remains selected because it enforces eligibility consistency, handles missing evidence explicitly, and produces explanations from the same components used to rank.

The catalog contains 41 recommendable roles. A generated witness path places all 41 first and in the top three; the ten gated roles still carry `insufficient-evidence`. This is structural reachability only. It does not establish that ordinary users can reliably distinguish close roles or that the role is suitable for them.

## 3. Automated structural suite

Run:

```powershell
npm test -- --runInBand
npm run type-check
npm run build
```

The checked-in tests cover the following requirements.

| Requirement | Test method | Pass condition |
|---|---|---|
| Determinism | Score identical canonical submissions repeatedly | Byte-equivalent role order and components |
| Invalid IDs | Unknown question or option IDs | `AssessmentValidationError` / HTTP 400 |
| Incomplete paths | Omit routing, required tie-break, or branch answer | Rejected; no recommendation persisted |
| Stale backtracking | Submit option IDs from a prior branch | Rejected; stale answers never score |
| Canonical path | Resolve routing, optional tie-break, and active branch | Only active question IDs retained |
| Role reachability | Generated valid witness for every catalog role | Every published role can rank first; gated roles retain warning state |
| Eligibility contradiction | Low readiness for an explicit role requirement | Role marked conditional and withheld when alternatives exist |
| Missing data | Omit preferred education or objective evidence | No imputation as demonstrated ability; confidence falls |
| Objective evidence | Add a relevant verified check | Ability component changes and confidence may rise |
| Tie stability | Equal rounded scores | Catalog order is the deterministic final key |
| Saturation | Score-distribution test and benchmark | Material reduction from the 14/20 ceiling baseline |
| Performance | Repeated local scoring | Deterministic in-process budget recorded by test |
| Explanation consistency | Compare reason codes/components to rank state | No eligibility or confidence claim unsupported by output fields |

### 3.1 Sampled answer combinations

The suite enumerates all routing combinations, every legally active tie-breaker and every authored branch/finalist option. Full Cartesian enumeration is unnecessary when independent branch paths cannot coexist, but every valid adaptive path and every question/option pair appears at least once.

### 3.2 Monotonic and metamorphic tests

For each role requirement, test transformations rather than assumed labels:

- Increasing a relevant objective-check result must not reduce that role's demonstrated-ability component.
- Reordering response object keys must not change results.
- Switching locale with identical option IDs must not change results.
- Adding an inactive branch answer must change a valid submission into a rejection, not a different ranking.
- Lowering an explicit readiness signal must not improve a role that requires that signal.
- Removing evidence must not increase the confidence band.

These are local properties. A matching preference answer can legitimately change other roles through normalization, so an absolute per-role monotonicity claim is not imposed on the whole ranking.

### 3.3 Sensitivity analysis

For each scoring constant, rerun the benchmark at the documented value plus and minus 10%. Record:

- top-1 churn;
- top-3 overlap;
- contradiction rate;
- mean and percentiles of top score;
- share of ties after rounding;
- per-role exposure and reachability; and
- confidence-band distribution.

A constant should not be changed merely to improve the synthetic labels. Changes require an interpretable product reason and, once available, confirmation on a held-out genuine dataset.

## 4. Expert-labelled cases

Create a separate, versioned set of ambiguous and adversarial cases. Each case must include the full evidence, acceptable top roles, prohibited contradictions, and short independent rationales from at least two reviewers. Resolve disagreements before the case becomes a regression fixture; preserve unresolved cases as analysis data rather than forcing one correct label.

Required case families:

- strong preference but missing eligibility evidence;
- strong preference with a directly conflicting readiness signal;
- two plausible neighbouring roles;
- low English confidence with roles that offer non-voice alternatives;
- disability or mobility constraints represented only through user-stated work conditions, never inferred traits;
- non-traditional education paths;
- objective evidence that contradicts self-report; and
- uniformly weak or contradictory answers.

Recruiters should separately review every eligibility requirement and disqualifier. They are reviewing whether a condition is genuinely necessary for an entry-level role, not endorsing the preference score.

## 5. Blind employed-person back-test

Recruit 30-50 consenting people already working in catalog roles, ideally across several metros, employers, education paths, and tenure bands. This is an exploratory study, not a validation sample large enough for broad claims.

1. Freeze the questionnaire, catalog, scorer, and analysis plan before collecting labels.
2. Collect assessment responses without showing recommendations.
3. Record current role, tenure, job-search history, and a short role-satisfaction measure separately.
4. Have reviewers map current titles to catalog roles while blinded to recommendations.
5. Score all participants once with the frozen version.
6. Report top-1 and top-3 inclusion with Wilson confidence intervals.
7. Report results by role; do not hide roles with too few observations inside an aggregate.
8. Review every contradiction and every unmapped job title qualitatively.

Current employment is an imperfect label: people can take available jobs they do not prefer and may succeed despite poor working conditions. Therefore report agreement with current role, not accuracy or job-fit prediction. Do not tune and evaluate weights on the same 30-50 cases. If tuning becomes necessary, collect a later holdout cohort or use a preregistered nested resampling analysis and retain the caveat about high variance.

## 6. Fairness and responsible-use audit

Protected characteristics are neither inputs nor inferred labels. Before each release:

- inventory direct inputs and plausible proxies;
- confirm employer-facing surfaces cannot use recommendations as hiring scores;
- test equivalent evidence with name, locale, and presentation-only fields changed;
- inspect exposure, conditional-rate, and confidence distributions across voluntarily supplied audit groups only where consent and lawful governance exist;
- review language, location, mobility, and equipment conditions for reasonable alternatives rather than blanket exclusion;
- test that users can inspect and change answers; and
- retain a route for contesting recommendations and reporting incorrect role requirements.

Small subgroup counts must be suppressed or aggregated to protect participants. A parity metric alone does not establish fairness; investigate the requirements and data-generating process behind any disparity.

## 7. Live outcome validation

Persist the recommendation snapshot, `scoringVersion`, and `catalogVersion`, then join only consented and appropriately governed funnel events:

`recommendation -> role selected -> application -> callback -> interview -> offer -> 30-day retention`

Report by recommendation rank and role:

- selection and application conversion;
- callback, interview, and offer conversion;
- 30-day retention;
- contradiction rate;
- role and cluster coverage;
- confidence-band outcome curves; and
- top-1/top-3 agreement for independently labelled studies.

Calibration is evaluated only when a score is explicitly trained against a defined binary or ordinal outcome. The current confidence band is evaluated for ordering quality: higher bands should have higher evidence completeness, fewer reviewer contradictions, and more stable rankings under perturbation. It must not be relabelled as a probability.

## 8. Release gates

An algorithm/catalog release requires:

1. all structural, type, and build checks passing;
2. zero accepted invalid or incomplete submissions;
3. zero known hard-requirement contradictions in visible top-three results when feasible alternatives exist;
4. every published role reachable without a manual boost;
5. benchmark and versioned catalog artifacts committed;
6. documented source and license provenance for new market inputs;
7. manual review of explanation text against score components; and
8. explicit notes separating proven software properties, synthetic observations, and unresolved real-user validity.

No top-1 threshold on synthetic personas is a release-quality claim. Predictive-validity language remains prohibited until an adequately designed real-outcome study supports it.
