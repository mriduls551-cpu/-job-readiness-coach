# Algorithm Research

**Date:** 2026-06-18  
**Decision scope:** cold-start, constrained career guidance with 11 active roles and a governed 30-role candidate queue; no genuine outcome labels currently exist.  
**Evidence rule:** method descriptions are original summaries. No paper text, assessment items, code, or data was copied.

## Decision summary

Use a deterministic constrained hybrid: one global content geometry over the six dimensions already measured by the product, normalized branch preference, explicit readiness states, optional objective checks, and a disabled-by-default market prior. Do not call the current questionnaire RIASEC, IRT, ability measurement, or predictive employability. Do not train on synthetic personas.

RIASEC is a credible occupational-interest framework, but mapping this repository's nine original product questions onto Holland scales would create a psychometric claim the items cannot support. The parallel RIASEC prototype also had an always-zero Realistic dimension and inferred written English from unrelated creative choices. It remains a researched alternative, not the production model.

## Method comparison

| Method | Primary sources | Data need | Explainability / cost | Fit and limitations | Decision |
|---|---|---:|---|---|---|
| Content-based recommendation | Lops, de Gemmis & Semeraro, [Recommender Systems Handbook chapter](https://doi.org/10.1007/978-0-387-85820-3_3), Springer, 2011; Pazzani & Billsus, [The Adaptive Web](https://doi.org/10.1007/978-3-540-72079-9_10), 2007 | Role features plus one user profile; no outcomes | High; O(roles x features) | Strong cold-start baseline. Quality is bounded by authored features and self-report. Per-role weights break comparability; global weights do not. | **Use globally** |
| Normalized additive / MCDA | Belton & Stewart, [Multiple Criteria Decision Analysis](https://doi.org/10.1007/978-1-4615-1495-4), 2002 | Expert criteria/weights | Very high; linear | Best for separating preference, ability, constraints, and demand. Weights are policy until calibrated. Compensatory sums must not override hard constraints. | **Use decomposition** |
| Constraint-based recommendation | Felfernig et al., [Constraint-Based Recommender Systems](https://link.springer.com/chapter/10.1007/978-0-387-85820-3_17), 2011 | Explicit requirements | High; trivial at this catalog size | Appropriate for licenses, equipment, shifts, and explicit work-condition conflicts. Missing evidence must be `unknown`, not failure. Self-report comfort is not legal eligibility. | **Use readiness states** |
| Learning to rank | Liu, [Learning to Rank for Information Retrieval](https://www.nowpublishers.com/article/Details/INR-016), 2009; Burges et al., RankNet, ICML 2005 | Thousands of independently labeled user-role groups; more for complex models | Medium; training and drift monitoring required | No valid target today. Synthetic labels would only teach the authors' rubric. | Defer until outcomes |
| Pairwise preference | Bradley & Terry, [Biometrika](https://doi.org/10.1093/biomet/39.3-4.324), 1952; Thurstone, [Psychological Review](https://doi.org/10.1037/h0070288), 1927 | Repeated comparisons; ideally many per role pair | High; low cost | Useful for a short tie-breaker or future "which day sounds better?" comparisons. Too few comparisons now for a fitted latent-utility model. | Keep informal tie-breaker |
| Bayesian scoring / uncertainty | Gelman et al., [Bayesian Data Analysis](http://www.stat.columbia.edu/~gelman/book/), 3rd ed., 2013 | Defensible priors and outcome data | Explainable but materially more complex | Posterior probabilities would be attractive only after a generative model and validation data exist. A hand-built posterior would look scientific without being calibrated. | Use non-probability bands |
| IRT and computerized adaptive testing | van der Linden & Hambleton, [Handbook of Modern IRT](https://doi.org/10.1007/978-1-4757-2691-6), Springer, 1997 | Commonly hundreds to thousands of responses per item, including enough variation to estimate discrimination/difficulty | High after calibration; calibration is expensive | IRT is primarily for scored latent traits. These preference items have no correct answer and no calibrated item parameters. The routing/branch flow is adaptive, but is not CAT in the psychometric sense. | Do not claim or implement yet |
| Calibrated logistic / ordinal model | Guo, Pleiss, Sun & Weinberger, [ICML/PMLR](https://proceedings.mlr.press/v70/guo17a.html), 2017 | Genuine binary/ordinal outcomes, enough positives per role and parameter | High; cheap inference | Candidate future model for callback/offer/retention. Calibration must be evaluated on held-out real data and by role/city. | Phase 4 |
| Explainable recommendation | Zhang & Chen, [Explainable Recommendation survey](https://arxiv.org/abs/1804.11192), 2020; Tintarev & Masthoff, UMUAI 2012 | Feature/evidence provenance | High; low cost for templates | Explanations must state evidence and uncertainty, not reverse-engineer a flattering story. Generated prose may polish but must not invent reasons. | **Use deterministic evidence first** |
| Fair ranking | Singh & Joachims, [Fairness of Exposure](https://arxiv.org/abs/1802.07281), KDD 2018; Biega, Gummadi & Weikum, [Equity of Attention](https://arxiv.org/abs/1805.01788), SIGIR 2018 | Group labels for audit, exposure logs, a legitimate fairness objective | Medium/high | This product ranks options for a user, not candidates for an employer. Exposure still matters because demand priors can suppress niche roles. Protected traits must not enter ranking; proxy audits require consented evaluation data. | Audit; no quota rule yet |
| Contextual bandits | Li, Chu, Langford & Schapire, [WWW 2010](https://doi.org/10.1145/1772690.1772758); Agrawal & Goyal, [ICML/PMLR](https://proceedings.mlr.press/v28/agrawal13.html), 2013 | Large logged traffic, propensities, timely rewards | Low per decision; high operational risk | Employment reward is delayed, censored, and affected by employer behavior. Exploration can impose real user cost. Only consider after consent, safeguards, and off-policy evaluation. | Long-term only |
| Collaborative filtering / matrix factorization | Rendle et al., [Bayesian Personalized Ranking](https://arxiv.org/abs/1205.2618), UAI 2009 | Many users x roles implicit interactions | Low explainability; efficient | Twelve roles and no reliable interactions make this unsuitable. Application clicks also reflect exposure and labor-market barriers, not preference alone. | Reject now |
| Cold-start hybrid models | Schein et al., [SIGIR 2002](https://doi.org/10.1145/564376.564421) | Item/user attributes; optional interactions | Varies | Confirms the need for strong item metadata and an explicit new-user evaluation. Does not validate any particular career feature scheme. | Supports selected architecture |
| RIASEC occupational congruence | Tracey & Rounds, [Psychological Bulletin](https://doi.org/10.1037/0033-2909.113.2.229), 1993; Spokane, Meir & Catalano, [JVB](https://doi.org/10.1006/jvbe.2000.1772), 2000 | A licensed/validated interest inventory or locally validated original items | Explainable; low scoring cost | Useful research framework. Cross-cultural structure and outcome effect sizes vary; interest congruence is not eligibility or hiring probability. Existing questions were not designed to measure six Holland scales. | Research, not production claim |

## Baselines evaluated

`BENCHMARK_RESULTS.json` is generated by `npm run benchmark:algorithm`.

| Model | Synthetic top-1 | Synthetic top-3 | Ceiling hits | Interpretation |
|---|---:|---:|---:|---|
| Frozen production v2 | 17/20 | 17/20 | 14 | Reproduced pre-change control |
| Simple branch-additive | 19/20 | 19/20 | n/a | Expected advantage because persona labels and branch choices encode one another |
| Global content cosine | 19/20 | 19/20 | n/a | Useful diversity baseline; does not enforce eligibility |
| Constrained hybrid v4 | 16/20 | 16/20 | 0 | Selected for integrity and architecture, not synthetic "accuracy" |

These are authored structural tests. They cannot establish that 19/20 is better than 16/20 for real people. A separate generated witness verifies 41/41 catalog roles can rank first, which proves software reachability only.

## Publication provenance and reuse status

The table below is the source-level register for the publications cited above. `Citation only` means no permissive software/data license was identified or needed: the publication is used to learn a method and cite bibliographic facts, while its prose, figures, tables, instruments, code, and datasets are excluded. Mathematical ideas were reimplemented independently.

| Authors | Title | Venue / year | URL | Rights status and use |
|---|---|---|---|---|
| Pasquale Lops, Marco de Gemmis, Giovanni Semeraro | *Content-based Recommender Systems: State of the Art and Trends* | *Recommender Systems Handbook*, Springer, 2011 | [DOI](https://doi.org/10.1007/978-0-387-85820-3_3) | Publisher-copyrighted chapter; citation only |
| Michael J. Pazzani, Daniel Billsus | *Content-Based Recommendation Systems* | *The Adaptive Web*, Springer LNCS 4321, 2007 | [DOI](https://doi.org/10.1007/978-3-540-72079-9_10) | Publisher-copyrighted chapter; citation only |
| Valerie Belton, Theodor J. Stewart | *Multiple Criteria Decision Analysis: An Integrated Approach* | Springer, 2002 | [DOI](https://doi.org/10.1007/978-1-4615-1495-4) | Publisher-copyrighted book; citation only |
| Alexander Felfernig, Robin Burke | *Constraint-Based Recommender Systems: Technologies and Research Issues* | *Recommender Systems Handbook*, Springer, 2011 | [Publisher page](https://link.springer.com/chapter/10.1007/978-0-387-85820-3_17) | Publisher-copyrighted chapter; citation only |
| Tie-Yan Liu | *Learning to Rank for Information Retrieval* | *Foundations and Trends in Information Retrieval* 3(3), 2009 | [Publisher page](https://www.nowpublishers.com/article/Details/INR-016) | Publisher-copyrighted monograph; citation only |
| Chris Burges, Tal Shaked, Erin Renshaw, Ari Lazier, Matt Deeds, Nicole Hamilton, Greg Hullender | *Learning to Rank using Gradient Descent* | ICML, 2005 | [Proceedings PDF](https://icml.cc/Conferences/2005/proceedings/papers/050_LearningToRank_BurgesEtAl.pdf) | No code/data license relied on; citation only |
| Ralph Allan Bradley, Milton E. Terry | *Rank Analysis of Incomplete Block Designs: I. The Method of Paired Comparisons* | *Biometrika* 39(3/4), 1952 | [DOI](https://doi.org/10.1093/biomet/39.3-4.324) | Oxford/publisher-copyrighted article; citation only |
| Louis L. Thurstone | *A Law of Comparative Judgment* | *Psychological Review* 34(4), 1927 | [DOI](https://doi.org/10.1037/h0070288) | APA/publisher-copyrighted article; citation only |
| Andrew Gelman, John B. Carlin, Hal S. Stern, David B. Dunson, Aki Vehtari, Donald B. Rubin | *Bayesian Data Analysis*, third edition | CRC Press, 2013 | [Author site](http://www.stat.columbia.edu/~gelman/book/) | Publisher-copyrighted book; citation only |
| Wim J. van der Linden, Ronald K. Hambleton, editors | *Handbook of Modern Item Response Theory* | Springer, 1997 | [DOI](https://doi.org/10.1007/978-1-4757-2691-6) | Publisher-copyrighted book; citation only |
| Chuan Guo, Geoff Pleiss, Yu Sun, Kilian Q. Weinberger | *On Calibration of Modern Neural Networks* | ICML / PMLR 70, 2017 | [PMLR](https://proceedings.mlr.press/v70/guo17a.html) | Article copyright remains with authors; no code/data imported; citation only |
| Yongfeng Zhang, Xu Chen | *Explainable Recommendation: A Survey and New Perspectives* | *Foundations and Trends in Information Retrieval* 14(1), 2020 | [arXiv](https://arxiv.org/abs/1804.11192) | Publication/preprint rights do not grant a software/data license; citation only |
| Nava Tintarev, Judith Masthoff | *Evaluating the Effectiveness of Explanations for Recommender Systems* | *User Modeling and User-Adapted Interaction* 22, 2012 | [DOI](https://doi.org/10.1007/s11257-011-9117-5) | Springer/publisher-copyrighted article; citation only |
| Ashudeep Singh, Thorsten Joachims | *Fairness of Exposure in Rankings* | ACM KDD, 2018 | [arXiv](https://arxiv.org/abs/1802.07281) | ACM publication/preprint; no code/data license relied on; citation only |
| Asia J. Biega, Krishna P. Gummadi, Gerhard Weikum | *Equity of Attention: Amortizing Individual Fairness in Rankings* | ACM SIGIR, 2018 | [arXiv](https://arxiv.org/abs/1805.01788) | ACM publication/preprint; citation only |
| Lihong Li, Wei Chu, John Langford, Robert E. Schapire | *A Contextual-Bandit Approach to Personalized News Article Recommendation* | WWW, 2010 | [DOI](https://doi.org/10.1145/1772690.1772758) | ACM/publisher-copyrighted article; no code/data imported |
| Shipra Agrawal, Navin Goyal | *Thompson Sampling for Contextual Bandits with Linear Payoffs* | ICML / PMLR 28, 2013 | [PMLR](https://proceedings.mlr.press/v28/agrawal13.html) | Article copyright remains with authors; citation only |
| Steffen Rendle, Christoph Freudenthaler, Zeno Gantner, Lars Schmidt-Thieme | *BPR: Bayesian Personalized Ranking from Implicit Feedback* | UAI, 2009 | [arXiv](https://arxiv.org/abs/1205.2618) | Publication/preprint; no implementation or dataset imported |
| Andrew I. Schein, Alexandrin Popescul, Lyle H. Ungar, David M. Pennock | *Methods and Metrics for Cold-Start Recommendations* | ACM SIGIR, 2002 | [DOI](https://doi.org/10.1145/564376.564421) | ACM/publisher-copyrighted article; citation only |
| Terence J. G. Tracey, James Rounds | *Evaluating Holland's and Gati's Vocational-Interest Models: A Structural Meta-Analysis* | *Psychological Bulletin* 113(2), 1993 | [DOI](https://doi.org/10.1037/0033-2909.113.2.229) | APA/publisher-copyrighted article; no scales/items copied |
| Arnold R. Spokane, Elchanan I. Meir, Marc Catalano | *Person-Environment Congruence and Holland's Theory: A Review and Reconsideration* | *Journal of Vocational Behavior* 57(2), 2000 | [DOI](https://doi.org/10.1006/jvbe.2000.1772) | Elsevier/publisher-copyrighted article; citation only |
| John L. Holland | *Making Vocational Choices*, third edition | Psychological Assessment Resources, 1997 | [WorldCat record](https://search.worldcat.org/title/36705783) | Proprietary book/instrument ecosystem; theory reviewed, all test items, keys, norms, and tables excluded |

No source in this publication table is redistributed. Exact software and dataset licenses are recorded separately in `THIRD_PARTY_RESEARCH_AND_LICENSES.md`.

## Software projects evaluated

| Project | Method/use | Data/compute | License and commercial obligations | Decision |
|---|---|---|---|---|
| [scikit-learn](https://github.com/scikit-learn/scikit-learn) | Logistic/ordinal baselines, calibration, metrics | CPU; hundreds+ real rows for a small baseline | BSD-3-Clause; retain notices, no endorsement | Suitable later; no dependency added |
| [Microsoft Recommenders](https://github.com/recommenders-team/recommenders) | Evaluation patterns and recommenders | Usually interaction data and Python stack | MIT; retain copyright/license | Reference only |
| [RecBole](https://github.com/RUCAIBox/RecBole) | Large recommender benchmark framework | Interaction datasets, PyTorch/GPU optional | MIT; retain license | Too heavy/no data |
| [Cornac](https://github.com/PreferredAI/cornac) | Multimodal and classical recommenders | Interaction/content datasets | Apache-2.0; LICENSE/NOTICE and modification obligations; patent grant | Too heavy/no data |
| [LensKit](https://github.com/lenskit/lkpy) | Offline evaluation | Interaction datasets, Python | MIT; retain notice | Useful later for evaluation only |
| [LightFM](https://github.com/lyst/lightfm) | Hybrid matrix factorization | User-item interactions plus features | Apache-2.0; retain license/notice, patent terms | No interaction data; defer |

No project above was added. Production v4 uses existing TypeScript and Zod only.

## Selected architecture rationale

The constrained hybrid is the simplest option that meets the actual product contract:

1. global content similarity makes role scores comparable;
2. branch preference preserves the useful adaptive differentiation;
3. explicit readiness status prevents a preference score from hiding a stated contradiction;
4. objective evidence is optional and never imputed from unrelated answers;
5. demand is disabled when provenance is missing;
6. confidence is an evidence-quality band, never a probability.

Learning models, formal IRT, Bayesian probabilities, and bandits are rejected until real data makes their assumptions testable.

## Research limitations

The literature supports method families, not this questionnaire's validity. O*NET occupational data is US-oriented and licensed CC BY 4.0; it was reviewed but no scores were imported. No patent search was performed. This review reduces risk and is not a freedom-to-operate opinion or legal advice.
