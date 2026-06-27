# Third-Party Research and License Register

**Reviewed:** 2026-06-18  
**Scope:** sources consulted for the matching redesign, candidate data sources, evaluated software, and dependency-license risk.  
**Legal note:** this is engineering risk reduction, not professional legal advice or a freedom-to-operate opinion.

## Material incorporated into production

| Material | Provenance | License | Use / obligations |
|---|---|---|---|
| Mathematical cosine similarity and weighted sums | Standard mathematics | Not copyrightable as methods | Original TypeScript implementation; no copied code |
| Existing product question/role vectors | This repository | Project-owned/provisional | Reused in one global geometry; no third-party content added |
| Zod | Existing dependency `^3.22.4` | MIT | Runtime validation of versioned catalog; retain MIT notice when distributed as required |

No new package, external dataset, assessment instrument, question, scoring key, or third-party role vector was incorporated.

## Research data and frameworks

| Source | Exact status | Commercial use / modification / redistribution | What was done |
|---|---|---|---|
| Holland/RIASEC theory; Holland (1997), PAR | Book and named theory are publisher/proprietary publication material; the abstract theoretical ideas can be studied | No book text, SDS items, keys, norms, or tables may be reused without permission | Considered and rejected as a production measurement claim. Letter codes do not appear in v4 code/catalog |
| O*NET 30.3 Database | [CC BY 4.0](https://www.onetcenter.org/license_db.html), not "public domain" in the current license | Commercial use/adaptation allowed with attribution, license link, change indication, version-specific credit; O*NET trademark rules apply | License and framework reviewed. No database values imported, so no product attribution is triggered by v4 |
| O*NET Resource Center pages | [CC BY 4.0 with exceptions](https://www.onetcenter.org/license.html) | Same attribution duties; database and Career Exploration Tools have separate licenses | Consulted for license verification only |
| O*NET Career Exploration Tools / Interest Profiler | Separate tool license, not the database license | Not reviewed for reuse because no tool/item reuse is needed | Explicitly excluded |
| India's National Qualification Register (NQR/NCVET) pages and PDFs | Government-hosted; no blanket public-domain assumption was found | Copyright/terms for wholesale reuse are not sufficiently clear for importing content | Used only to verify that named qualifications exist and to link to official records; no PDF text, curriculum, or scoring content copied |
| Job boards (LinkedIn, Indeed, AmbitionBox, Glassdoor, etc.) | Platform-specific terms; often restrict scraping/republication | Ambiguous or unsuitable for a maintained commercial dataset without an agreement | Excluded. No scraping and no demand/salary values imported |
| NSDC/NASSCOM/RBI reports | Each report has its own copyright/terms; Indian government publication does not automatically mean public domain | Must verify per document before copying or deriving a distributable dataset | No values imported |

## Official role references consulted

These links establish recognized job/qualification names, not metro vacancy volume or salary:

- [Customer Care Executive, Domestic Voice, SSC/Q2210](https://www.nqr.gov.in/qualification/file/QF_SSC2210_Customer%20Care%20Executive%20Domestic%20Voice_V3.0_Eng.pdf)
- [Customer Care Executive, Domestic Non-Voice, SSC/Q2211](https://www.nqr.gov.in/qualification/file/QF_SSC2211_Customer%20Care%20Executive%20Domestic%20Non%20Voice_V3.0_Eng.pdf)
- [Domestic Data Entry Operator](https://nqr.gov.in/qualifications/2580)
- [Field Sales Executive, TEL/Q0200](https://nqr.gov.in/sites/default/files/QF_TELQ0200_Field%20Sales%20Executive.pdf)
- [Retail Sales Associate](https://www.nqr.gov.in/qualification/file/Retail%20Sales%20Associate)
- [Debt Recovery Agent](https://www.nqr.gov.in/qualification/file/BFSI_SSC_Debt%20Recovery%20Agent_BSC_Q2303_Qfile_English.pdf)
- [Telehealth Services Coordinator](https://nqr.gov.in/qualifications/14082)

Only titles, identifiers, and URLs are recorded. If task/eligibility text is later imported, the relevant NQR terms must first be obtained and recorded.

## 2026-06-19 candidate-catalog expansion

Thirty candidate roles were registered in `src/data/role-candidates.seed.json`. Each row stores its exact source URL and review date. Sources are used only to establish the factual existence of a title or qualification; none is treated as vacancy-volume, salary, curriculum, question or scoring data.

| Source | Candidate records | Rights decision |
|---|---|---|
| National Qualification Register (NQR/NCVET) | Retail Sales, Retail Cashier, Store Operations, Banking Sales, Recruitment, Payroll, Logistics, Courier, Warehouse, Supply Chain, Software Testing, Web Development, Digital Cataloguer, Merchant Relationship, Graphic Design, Digital Content, Video Editing, Hotel Front Office, F&B Service, Housekeeping, Kitchen, Preschool/Daycare, EV Service | No blanket reusable-content license verified. Store factual title, record URL and identifier only; do not copy prose, curricula, tables or assessment content |
| National Skill Development Corporation (NSDC) | Domestic Non-Voice Support, Field Sales, Domestic IT Helpdesk | No reusable-content license relied on. Store factual title and URL only |
| BFSI Sector Skill Council | Credit Processing, Insurance Sales, Microfinance, GST Assistant | Site states all rights reserved. Store factual title/source reference only; no prose, curriculum or assessment reuse |

Commercial modification and redistribution permission for source content is not established. The product's requirements and separator signals are original provisional abstractions and require recruiter review. Market priors remain null. Qualification existence does not demonstrate current metro demand.

## Software evaluated but not added

Licenses were verified against canonical repository files on 2026-06-18.

| Project | Repository license | Permissions | Obligations / notices | Decision |
|---|---|---|---|---|
| scikit-learn | [BSD-3-Clause](https://github.com/scikit-learn/scikit-learn/blob/main/COPYING) | Commercial use, modification, source/binary redistribution | Retain copyright/license/disclaimer; no endorsement | Future offline modeling only |
| Microsoft Recommenders | [MIT](https://github.com/recommenders-team/recommenders/blob/main/LICENSE) | Commercial use, modification, distribution, sublicensing | Retain copyright and permission notice | Reference only |
| RecBole | [MIT](https://github.com/RUCAIBox/RecBole/blob/master/LICENSE) | Same MIT permissions | Retain notice | Too heavy/no interactions |
| Cornac | [Apache-2.0](https://github.com/PreferredAI/cornac/blob/master/LICENSE) | Commercial use/modification/redistribution; patent grant | Provide license, preserve notices, mark changes, carry NOTICE if present; patent-termination clause | Too heavy/no interactions |
| LensKit/lkpy | [MIT](https://github.com/lenskit/lkpy/blob/main/LICENSE.md) | Commercial use/modification/distribution | Retain notice | Future evaluation option |
| LightFM | [Apache-2.0](https://github.com/lyst/lightfm/blob/master/LICENSE) | Commercial use/modification/redistribution; patent grant | Apache license/notice/change duties | No interaction data |

Because none was installed, no new transitive dependency or attribution file was introduced.

## Academic publications

The papers/books listed in `ALGORITHM_RESEARCH.md` are generally publisher-copyrighted publications or author preprints, not software dependencies. Only bibliographic facts and short original summaries are used. No figures, tables, substantial quotations, source code, datasets, questionnaire items, or supplementary material were copied. Publication availability is not a software/data license.

## Existing dependency audit

`package-lock.json` was scanned on 2026-06-18:

- 1,219 installed package entries expose a license field.
- No new dependency was added by this work.
- Existing `sharp` platform packages declare Apache-2.0 and/or LGPL-3.0-or-later because of bundled/linked libvips components. These predate this task and require distribution review if binaries are redistributed outside the normal npm deployment model.
- `posthog-js` says `SEE LICENSE IN LICENSE`; its installed LICENSE is Apache-2.0 and also carries notices for embedded MIT-licensed components.
- Package metadata is not a complete legal audit; nested assets and optional binaries may carry additional notices.

The parallel draft's package table was not retained because it listed packages/versions absent from the actual `package.json` (for example `openai`, `nodemailer`, Next 14, Jest 29, and Sentry 8).

## Salary and demand decision

The parallel implementation introduced exact salary ranges and 0-100 demand numbers without a dated, reusable source. Typing a number manually does not cure source/terms ambiguity. V3 therefore:

- does not consume those demand values;
- stores `marketPrior.value = null` for every role;
- sets `marketPolicy = disabled-until-sourced`;
- removes exact salary figures from the results UI and asks users to verify the current employer listing.

Before enabling a prior, each record must include geography, observation period, source URL, exact data license/contract, extraction method, sample definition, and update owner. A licensed employer/job-feed aggregate or an official reusable dataset is preferred.

## Patent and assessment-IP notes

- No proprietary instrument (SDS, Strong Interest Inventory, MBTI, DISC, etc.) was used or adapted.
- All production assessment wording remains original repository content.
- Apache-2.0 projects include contributor patent grants, but none is linked or copied.
- No patent search was performed. Learning-to-rank, recommender, psychometric, and ranking methods may have patent history. Non-use of third-party code and use of standard mathematics reduce some risk but do not establish freedom to operate.

## Ongoing obligations

1. Run a dependency-license scan before adding any package and manually review flagged/unknown entries.
2. Keep market priors disabled until every row has reusable provenance.
3. Record dataset licenses separately from code licenses.
4. Preserve required LICENSE/NOTICE files for any future dependency reuse.
5. Obtain legal review before shipping imported labor-market data or a licensed psychometric instrument.
