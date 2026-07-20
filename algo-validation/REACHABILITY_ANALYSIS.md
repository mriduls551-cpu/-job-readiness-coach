# Reachability Analysis

Date: 2026-07-20
Branch: `feat/curation-phase2`
Base observed: current `main` at `5060229`

## Commands run

- `npm run benchmark:algorithm`
  - Result: passed.
  - Summary: `Test Suites: 1 passed, 1 total`; `Tests: 1 passed, 1 total`; `Time: 5.407 s`.
  - Benchmark output: 41 roles, 36 top-1 reachable on witness paths, 36 top-3 reachable on witness paths, 10 gated roles.
- `npm run catalog:report`
  - Result: passed.
  - Summary: 41 recommendable roles, 10 gated roles, 20 active roles with warnings, no duplicate IDs, no missing title sources.

## Important baseline note

Local `main` and `origin/main` do not include Phase 1 at the time of this analysis. The branch was created from current `main` as requested, but the observed scoring version is `evidence-hybrid-v6`, not Phase 1's `evidence-hybrid-v7`.

## Top-1 unreachable roles

All five unreachable roles are in the `creative` cluster and are sales or sales-adjacent. The current catalog witness builder uses a special sales-feasible route only for `sales-support`; every other creative-cluster role uses the generic creative route:

`r1_d, r2_c, r3_c, r4_d, r5_d`

That route includes a low-speaking preference (`r1_d`: "rather solve from data, documents, or systems"). For roles whose readiness requires speaking, `evaluateEligibility` returns `conditional`, applies the 0.35 adjustment, and the role drops out of the top three even when the finalist answer directly selects it. When the same roles use the existing sales-support route:

`r1_a, r2_c, r3_c, r4_a, r5_d`

each becomes top-1 without changing scoring.

| Role | Current witness result | Classification | Why | Recommendation |
| --- | --- | --- | --- | --- |
| `field-sales-executive` | Not in top 3. Top 3: `content-writer:65 ready`, `digital-marketing-executive:39 ready`, `digital-cataloguer:34 insufficient-evidence`. | (a) witness path does not produce matching feasibility; fix witness path data. | Role has `readiness.speaking = basic`, but the generic creative witness uses low-speaking `r1_d`, causing conditional demotion. With the sales-support route, it is top-1 at `84 insufficient-evidence`. | Extend the catalog witness special route from only `sales-support` to sales/field roles, or add a role-family witness route for sales-adjacent creative roles. |
| `retail-sales-associate` | Not in top 3. Same generic creative fallback top 3 as above. | (a) witness path does not produce matching feasibility; fix witness path data. | Role has `readiness.speaking = basic`; generic creative route says low-speaking. With the sales-support route, it is top-1 at `84 insufficient-evidence`. | Use the sales-feasible witness route for this role. |
| `banking-sales-executive` | Not in top 3. Same generic creative fallback top 3 as above. | (a) witness path does not produce matching feasibility; fix witness path data. | Role has `readiness.speaking = basic` and `dataAccuracy = basic`; generic creative route fails speaking feasibility. With the sales-support route, it is top-1 at `81 insufficient-evidence`. | Use the sales-feasible witness route for this role. |
| `insurance-sales-associate` | Not in top 3. Same generic creative fallback top 3 as above. | (a) witness path does not produce matching feasibility; fix witness path data. Gate is also intentional but not the reason it is top-1 unreachable. | Role has `readiness.speaking = basic`; generic creative route fails speaking feasibility. With the sales-support route, it is top-1 at `76 insufficient-evidence` with the expected gated reason. | Use the sales-feasible witness route for this role; keep gated policy unless product approves a certification-proof flow. |
| `microfinance-executive` | Not in top 3. Same generic creative fallback top 3 as above. | (a) witness path does not produce matching feasibility; fix witness path data. | Role has `readiness.speaking = basic` and `dataAccuracy = basic`; generic creative route fails speaking feasibility. With the sales-support route, it is top-1 at `81 insufficient-evidence`. | Use the sales-feasible witness route for this role. |

No evidence found for category (b) hard catalog gates such as `eligibleStreams`, `minEnglishLevel`, or `requiredCerts` blocking these five in the benchmark. No evidence found for category (c) unavoidable sibling dominance: each role reaches top-1 once the witness route stops contradicting its speaking requirement.

## Gated role review

`npm run catalog:report` reports 10 gated roles. In the scorer, `lifecycleStatus: gated` produces `insufficient-evidence` with a visible reason; it does not hide the role. This appears intentional product policy where the role has material certification, portfolio, safety, equipment, or practical-proof prerequisites.

| Role | Gate requirements | Witness status | Verdict | Recommendation |
| --- | --- | --- | --- | --- |
| `insurance-sales-associate` | `current-certification`, `sales`, `customer-explanation` | Currently top-1 unreachable because the witness route contradicts speaking readiness; top-1 at `76 insufficient-evidence` with the sales-feasible route. | Intentional product policy; witness accident. Insurance sales should not be presented as ready without certification/regulatory proof. | Fix witness route only; keep gated unless a certification-proof signal is added. |
| `gst-assistant` | `accounting-foundation`, `spreadsheet`, `tally-or-tax-tool` | Top-1 reachable at `75 insufficient-evidence`. | Intentional product policy. GST filing needs accounting/tool foundation. | Accept gated policy. Later, add objective proof inputs if the product wants this to become ready. |
| `software-testing-assistant` | `test-case-skill`, `defect-reporting`, `computer-access` | Top-1 reachable at `78 insufficient-evidence`. | Intentional product policy. QA needs concrete technical work sample and computer access. | Accept gated policy. |
| `web-development-associate` | `coding-portfolio`, `computer-access`, `technical-training` | Top-1 reachable at `78 insufficient-evidence`. | Intentional product policy. Web development should require portfolio/training proof. | Accept gated policy. |
| `junior-graphic-designer` | `original-portfolio`, `design-tool`, `computer-access` | Top-1 reachable at `69 insufficient-evidence`. | Intentional product policy. Design recommendation needs original portfolio/tool evidence. | Accept gated policy. |
| `digital-content-developer` | `content-sample`, `authoring-tool`, `computer-access` | Top-1 reachable at `71 insufficient-evidence`. | Intentional product policy. Multimedia content needs sample/tool evidence. | Accept gated policy. |
| `junior-video-editor` | `editing-sample`, `editing-software`, `suitable-equipment` | Top-1 reachable at `69 insufficient-evidence`. | Intentional product policy. Video editing needs sample/software/equipment evidence. | Accept gated policy. |
| `kitchen-trainee` | `food-safety-training`, `hands-on-food-work`, `shift-work` | Top-1 reachable at `76 insufficient-evidence`. | Intentional product policy. Food safety and hands-on readiness are material. | Accept gated policy. |
| `preschool-daycare-facilitator` | `safeguarding-checks`, `child-focused-work`, `patience` | Top-1 reachable at `76 insufficient-evidence`. | Intentional product policy. Child-facing roles need safeguarding and suitability checks. | Accept gated policy. |
| `ev-service-technician` | `relevant-training`, `diagnostic-skill`, `workshop-work` | Top-1 reachable at `76 insufficient-evidence`. | Intentional product policy. Technical trade roles need training and practical evidence. | Accept gated policy. |

## Recommended Phase 2 fixes for approval

1. Fix the benchmark witness route for these five roles only: `field-sales-executive`, `retail-sales-associate`, `banking-sales-executive`, `insurance-sales-associate`, `microfinance-executive`.
2. Implement as data/test-harness witness mapping, not scoring logic:
   - Reuse the existing sales-support route for sales-adjacent creative roles: `r1_a, r2_c, r3_c, r4_a, r5_d`.
   - Keep finalist answer as `rf_<roleId>`.
3. Do not change global weights or scoring formulas.
4. Do not remove the gated status for any gated role without a separate product decision and a concrete proof signal.

## Stop point

Per the Phase 2 instruction, no fixes have been applied. Awaiting Mridul's per-role approval before changing benchmark witness data, question mappings, or catalog data.
