# Role Expansion Proposal

Date: 2026-07-20
Branch: `feat/curation-phase3`
Baseline observed: current `main` at `5060229`

## Stop Point

This is a research and proposal document only. No catalog, scorer, question, benchmark, or UI code has been changed.

## Source Notes

- Authoritative occupation taxonomy: Directorate General of Employment, Ministry of Labour & Employment, NCO-2015 portal and downloadable NCO-2015 volumes, rechecked on 2026-07-20.
- Demand context: National Career Service is the official job-search/matching platform. PIB reported 3.43 crore vacancies mobilised on NCS in FY 2025-26 and NCS search exposes live sectors including operations/support, finance/insurance, wholesale/retail, health, transport/storage, IT/communication, hotels, food service/catering, education, and manufacturing. Rechecked on 2026-07-20.
- Private-market context used directionally: 2025 hiring reports consistently identify retail, e-commerce/quick commerce, logistics, BFSI, healthcare, hospitality/travel, customer support, and IT-enabled operations as high-volume entry-level demand pools, especially outside metros.

## Implementation Baseline Caveat

The prompt assumes Phase 1 and Phase 2 are merged into `main`. In this checkout, `main` still has:

- `scoringVersion: evidence-hybrid-v6`
- `preferredEducationStreams` and `educationStreamBoosts`
- no `streamRelevance` field in seed data
- no Phase 2 reachability fixes

This proposal therefore records `streamRelevance` as the intended Phase 1 target shape, but it does not edit data.

## Target Catalog Size

Recommendation: grow from 41 to 66 roles in Phase 3, adding 25 roles.

Why 66:
- Enough to cover major Indian entry-level lanes by education tier without turning the finalist question into an unscannable directory.
- Adds missing high-volume non-graduate, diploma/ITI, healthcare-ops, pharmacy/lab, BFSI ops, legal/audit, and MBA/MBBS coherent options.
- Keeps implementation feasible in five batches of about five roles, with one benchmark persona per new role and mobile finalist validation per batch.

Do not go past ~75 roles until the finalist UI has grouping/search or a better role-selection surface. A flat finalist list per cluster will become the limiting factor before scoring does.

## Current Catalog NCO-2015 Mapping

The mapping below uses the closest NCO-2015 division/group and, where useful, a representative 8-digit occupation. Some app roles are modern platform/job-board labels; those are mapped to the nearest NCO family rather than treated as exact title matches.

| App role | Closest NCO-2015 mapping | Division / group | Notes |
| --- | --- | --- | --- |
| `customer-support` | 5244.0301 Customer Care Executive / 5244 Contact Centre Salespersons | Service and Sales Workers / Other Sales Workers | Voice/chat support is closest to contact-centre customer-care work. |
| `sales-support` | 5249.0200 Salesman, Wholesale Trade / 5249 Sales Workers NEC | Service and Sales Workers / Other Sales Workers | Inside sales/support maps better to sales workers NEC than retail shop sales. |
| `academic-counsellor` | 2359 Education Professionals NEC / 2423 Personnel and Careers Professionals | Professionals / Teaching or Business professionals | NCO has counselling-adjacent professional groups; app role is entry-level sales/counselling hybrid. |
| `hr-coordinator` | 4416.0101 Associate - HRO / 4416 Personnel Clerks | Clerical Support Workers / Other Clerical Support Workers | Entry HR coordination is clerical HRO more than HR manager/professional. |
| `data-entry-mis` | 4131.0600 Computer Operator / 4131 Typists and Word Processing Operators | Clerical Support Workers / Keyboard Operators | MIS/data entry aligns to keyboard/computer operator. |
| `back-office-operations` | 4110.0100 Clerk, General / 4110 General Office Clerks | Clerical Support Workers / General Office Clerks | General process/documentation operations. |
| `operations-analyst` | 3314 Statistical, Mathematical and Related Associate Professionals | Technicians and Associate Professionals / Financial and Mathematical Associate Professionals | Entry analyst is associate-professional analytical work. |
| `accounting-finance-assistant` | 4311.0101 Bookkeeper/Accounts Executive / 4311 Accounting and Bookkeeping Clerks | Clerical Support Workers / Numerical Clerks | Direct match. |
| `digital-marketing-executive` | 2431.0503 Market Research Associate - Product Marketing / 2431 Advertising and Marketing Professionals | Professionals / Sales, Marketing and PR Professionals | Entry marketing maps to marketing associate/professional family. |
| `content-writer` | 2641 Authors and Related Writers | Professionals / Authors, Journalists and Linguists | Entry content writing is writer/editor family. |
| `legal-compliance-operations` | 3411 Legal and Related Associate Professionals | Technicians and Associate Professionals / Legal, Social and Religious Associate Professionals | Compliance ops is legal associate/clerical hybrid. |
| `non-voice-support-associate` | 4222.0101 Technical Support Executive - Non-Voice / 4222 Contact Centre Information Clerks | Clerical Support Workers / Client Information Workers | Direct non-voice support match. |
| `field-sales-executive` | 5249.0200 Salesman, Wholesale Trade / 5249 Sales Workers NEC | Service and Sales Workers / Other Sales Workers | Field sales outside a shop. |
| `retail-sales-associate` | 5223.0100 Shop Assistant / 5223 Shop Salespersons | Service and Sales Workers / Shop Salespersons | Direct match. |
| `retail-cashier` | 4211.0301 Cashier, Cash Counter / 4211 Bank Tellers and Related Clerks | Clerical Support Workers / Tellers, Money Collectors and Related Clerks | Retail POS cashier. |
| `retail-store-operations-assistant` | 5223.0105 Trainee Associate / 5223 Shop Salespersons | Service and Sales Workers / Shop Salespersons | Store-floor and stock support. |
| `banking-sales-executive` | 5249 Sales Workers NEC plus 4211 Bank Tellers/Clerks | Service/Sales and Clerical | Product sales with banking documentation. |
| `credit-processing-associate` | 4311.0200 Bank Clerk / 4311 Numerical Clerks | Clerical Support Workers / Numerical Clerks | Loan/credit document processing. |
| `insurance-sales-associate` | 3321 Insurance Representatives / 5249 Sales Workers NEC | Associate Professionals or Sales Workers | Needs certification gate. |
| `microfinance-executive` | 3312 Credit and Loans Officers / 5249 Sales Workers NEC | Associate Professionals or Sales Workers | Field credit/collections hybrid. |
| `gst-assistant` | 4311.0500 Audit Clerk / 4311 Accounting and Bookkeeping Clerks | Clerical Support Workers / Numerical Clerks | Tax filing assistant with tool gate. |
| `recruitment-executive` | 4416.0101 Associate - HRO / 4416 Personnel Clerks | Clerical Support Workers / Other Clerical Support Workers | Candidate screening/scheduling. |
| `payroll-employee-data-assistant` | 4416 Personnel Clerks and 4311 Accounting Clerks | Clerical Support Workers | Payroll is HR plus numerical records. |
| `logistics-operations-coordinator` | 4323 Transport Clerks / 4221 Travel/Transport Clerks | Clerical Support Workers / Material Recording or Client Information | Shipment/transport coordination. |
| `courier-operations-executive` | 4323 Transport Clerks / 9333 Freight Handlers | Clerical Support or Elementary | Dispatch exceptions plus data entry. |
| `warehouse-associate` | 9333 Freight Handlers / 8344 Lift Truck Operators | Elementary or Plant/Machine Operators | Warehouse role may be scanner/handler depending employer. |
| `supply-chain-executive` | 3323.0602 Supply Chain Field Assistant / 3323 Buyers | Associate Professionals / Sales and Purchasing Agents | Direct supply-chain field assistant match. |
| `it-helpdesk-associate` | 3512 ICT User Support Technicians / 5244.0302 Remote Helpdesk Technician | Technicians / ICT Technicians | Technical support/helpdesk. |
| `software-testing-assistant` | 2519 Software and Applications Developers and Analysts NEC | Professionals / ICT Professionals | Junior QA with proof gate. |
| `web-development-associate` | 2513 Web and Multimedia Developers / 2514 Applications Programmers | Professionals / ICT Professionals | Junior web developer with portfolio gate. |
| `digital-cataloguer` | 4131 Computer Operator / 4419 Clerical Support Workers NEC | Clerical Support Workers | E-commerce listing/catalog data work. |
| `merchant-relationship-executive` | 3322 Commercial Sales Representatives / 5249 Sales Workers NEC | Associate Professionals or Sales Workers | Merchant onboarding/relationship role. |
| `junior-graphic-designer` | 2166 Graphic and Multimedia Designers | Professionals / Architects, Planners, Surveyors and Designers | Portfolio gate appropriate. |
| `digital-content-developer` | 2166 Graphic/Multimedia Designers plus 2641 Writers | Professionals | Multimedia content hybrid. |
| `junior-video-editor` | 3521 Broadcasting and Audio-visual Technicians / 2654 Film Directors etc. | Technicians or Professionals | Entry editing requires sample/software gate. |
| `hotel-front-office-associate` | 4224.0100 Receptionist (Hotel)/Front Office Associate | Clerical Support Workers / Client Information Workers | Direct match. |
| `food-beverage-service-associate` | 5131 Waiters / 5132 Bartenders | Service and Sales Workers / Waiters and Bartenders | Restaurant/F&B service. |
| `housekeeping-associate` | 5151.0202 Room Attendant / 9112 Cleaners and Helpers | Service Workers or Elementary | Depends whether attendant vs cleaner. |
| `kitchen-trainee` | 5120 Cooks / 7512 Bakers etc. | Service Workers or Craft Workers | Food-safety gate appropriate. |
| `preschool-daycare-facilitator` | 5311 Child Care Workers / 2342 Early Childhood Educators | Service Workers or Professionals | Safeguarding gate appropriate. |
| `ev-service-technician` | 3115 Mechanical Engineering Technicians / 7231 Motor Vehicle Mechanics | Technicians or Craft Workers | Training/practical gate appropriate. |

## Coverage Gaps

### Non-graduate, 10th/12th

Current catalog covers retail, contact centre, basic sales, courier/warehouse, hospitality, housekeeping, kitchen, data entry, and microfinance. It under-covers security, last-mile delivery, BPO voice as its own role, reception/front-desk outside hotels/clinics, and field service/collection roles that are common in Tier 2/3 cities.

### Diploma/ITI

Current catalog has IT helpdesk and EV technician, but lacks core ITI/diploma trades: electrician helper, AC/refrigeration technician, manufacturing quality inspector, CNC/machine operator, draughtsman/CAD assistant, lab assistant, and pharmacy/paramedical support.

### Graduate by stream

Commerce and generic analytics are represented. Healthcare is thin: there is no coherent healthcare-ops cluster for B.Pharm/B.Sc Nursing/MBBS-overqualified-but-non-clinical candidates. Banking operations is under-represented versus banking sales. Arts/management have HR, counselling, content, marketing but no general receptionist/admin and no events/travel ops.

### Postgraduate/professional

The catalog has legal/compliance, accounting, operations, and academic counselling, but thin coherent options for MBA/M.Com/LLB/MBBS. Missing roles include audit assistant, business development associate, paralegal/legal research assistant, clinic/healthcare operations coordinator, medical records coordinator, and hospital quality/operations trainee.

## Ranked Expansion Proposals

Rank is expected practical demand + catalog gap severity. `new surface` means new branch or finalist grouping/questions may be needed beyond just adding finalist options.

| Rank | Proposed role | NCO-2015 mapping | Band | streamRelevance | Cluster | Demand rationale | New surface? |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | BPO Voice / Telecaller Associate | 5244.0100 Operator, Call Centre; 5244.0101 CRM Domestic Voice | secondary -> undergraduate | open | people-facing | Very high volume in metros and Tier 2 BPO/sales operations; distinct from support because it is outbound/voice-heavy. | Yes: people-facing branch should separate support vs outbound calling. |
| 2 | General Receptionist / Front Desk Executive | 4226.0100 Reception Clerk/Front Desk Executive | secondary -> undergraduate | open | people-facing | Common in clinics, coaching centres, offices, gyms, salons, and local services across tiers. | Yes: can share front-office/coordination option. |
| 3 | Delivery Associate / Last-mile Executive | 8322 Car/Van Drivers; 9333 Freight Handlers; courier messenger families | secondary -> diploma | open | desk-ops | Quick-commerce/e-commerce and local logistics remain large entry pools in Tier 1-3. | Yes: current questionnaire lacks outdoor mobility/route discipline signal. |
| 4 | Security Guard / CCTV Assistant | 5414.0501 Unarmed Security Guard; 5414.0121 CCTV Supervisor | secondary -> diploma | open | desk-ops | Large non-graduate formal/informal demand across offices, retail, housing, hospitals, and campuses. | Yes: needs shift, vigilance, physical-readiness surface. |
| 5 | Clinic Front Office Coordinator | 4226 Receptionist; 3252 Medical Records/Health Information Technician | secondary -> undergraduate | healthcare, open | people-facing | Fills missing healthcare-ops lane; clinics and diagnostics chains hire front desk/appointment coordinators across cities. | Yes: healthcare front-office option. |
| 6 | Medical Records Coordinator | 3252.0101 Medical Records and Health Information Technician | diploma -> undergraduate | healthcare, science | desk-ops | Coherent for healthcare graduates who prefer records, patient data, documentation, and insurance paperwork. | Yes: healthcare records/documentation surface. |
| 7 | Pharmacy Assistant | 3213.0101 Pharmacy Assistant | diploma -> undergraduate | healthcare, science | desk-ops | High fit for B.Pharm/D.Pharm and retail pharmacy chains; should be gated for registration/employer rules where needed. | Yes: pharma inventory/prescription-care branch. |
| 8 | Laboratory Assistant | 3111.0100 Laboratory Assistant Physical; 2240.0100 Laboratory Assistant Clinical; 3213.0200 Pharmaceutical Lab Assistant | diploma -> undergraduate | science, healthcare | analytical | Diagnostics, pharma, college labs, and manufacturing QC create non-office demand for science/diploma users. | Yes: lab/process/sample accuracy surface. |
| 9 | Electrician Helper / Technician Trainee | 7411 Building and Related Electricians | iti -> diploma | science, open | desk-ops | ITI electrician is a core employability track across construction, facilities, solar, and maintenance. | Yes: hands-on technical branch. |
| 10 | AC/Refrigeration Service Technician | 7127 Air Conditioning and Refrigeration Mechanics | iti -> diploma | science, open | desk-ops | Persistent urban and Tier 2 demand in appliance service, facilities, retail chains, and HVAC contractors. | Yes: hands-on service/field technical branch. |
| 11 | Manufacturing Quality Inspector | 7543 Product Graders/Testers; 3119 Engineering Lab Assistant | diploma -> undergraduate | science | analytical | Manufacturing, auto components, electronics, pharma packaging need QC trainees; good for diploma/B.Sc. | Yes: inspection/QC surface. |
| 12 | CNC / Machine Operator Trainee | 7223 Metal Working Machine Tool Setters/Operators | iti -> diploma | science, open | desk-ops | ITI/manufacturing route; important beyond metro white-collar roles. | Yes: machine-shop, safety, shift surface. |
| 13 | Draughtsman / CAD Assistant | 3118 Draughtspersons / 3112 Civil Engineering Technicians | diploma -> undergraduate | science | analytical | Civil/mechanical diploma holders need a coherent first role beyond generic operations. | Yes: technical drawing/CAD proof gate. |
| 14 | Bank Operations Assistant | 4211 Bank Tellers; 4311 Bank Clerk | undergraduate -> postgraduate | commerce, management | desk-ops | Distinct from banking sales; common fresher role in branches, NBFCs, back offices. | Yes: banking documentation/customer-counter surface. |
| 15 | KYC/AML Documentation Associate | 4311 Bank Clerk; 3312 Credit and Loans Officers | undergraduate -> postgraduate | commerce, law, management | desk-ops | BFSI operations demand in banks, fintech, NBFC, and compliance vendors; coherent for commerce/law. | Yes: document-risk/compliance surface. |
| 16 | Audit Assistant | 4311.0500 Audit Clerk; 2411.0200 Auditor | undergraduate -> postgraduate | commerce | analytical | M.Com/B.Com/CA-inter users need a stronger accounting ladder than generic accounts assistant. | No, can share finance/accounting surface plus finalist. |
| 17 | Tax Assistant / Income Tax Filing Associate | 4311 Accounting Clerks; 2411 Accountants | undergraduate -> postgraduate | commerce | analytical | Common CA-office/tax-consultancy entry role; adjacent to GST but wider and less tool-specific. | No, can share finance/GST surface. |
| 18 | Paralegal / Legal Research Assistant | 3411 Legal and Related Associate Professionals | undergraduate -> professional | law | desk-ops | LLB users need coherent legal-document roles beyond generic compliance ops. | Yes: legal research/drafting surface. |
| 19 | Court Clerk / Legal Filing Assistant | 3411 Legal Associate Professionals; 4110 General Office Clerks | undergraduate -> professional | law | desk-ops | Practical entry lane around chambers, legal process outsourcing, court filing, and documentation. | Yes: legal filing/checklist surface. |
| 20 | Healthcare Operations Coordinator | 3341 Office Supervisors / 3252 Health Information Technician | undergraduate -> professional | healthcare, management | people-facing | Coherent non-clinical option for MBBS/BDS/BAMS/B.Pharm/Nursing who want desk/ops, avoiding incoherent clerical headlines. | Yes: healthcare-ops branch strongly recommended. |
| 21 | Hospital Quality / NABH Documentation Trainee | 3252 Health Information Technician; 3343 Administrative Secretaries | undergraduate -> professional | healthcare, management | analytical | Hospitals and chains need documentation, audit support, quality checklists; coherent for healthcare graduates. | Yes: quality/audit/documentation surface. |
| 22 | Business Development Associate | 3322 Commercial Sales Representatives; 2433 Technical and Medical Sales Professionals | undergraduate -> postgraduate | management, commerce, science, open | creative | High-volume graduate sales path in SaaS, edtech, healthcare, B2B services, and Tier 1/2 companies. | Yes: separates B2B consultative sales from field/telecalling. |
| 23 | Hospitality Management Trainee | 4224 Hotel Receptionists; 5151 Housekeeping Supervisors; 1411 Hotel Managers as long-term family | undergraduate -> postgraduate | management, open | people-facing | Hotel chains and travel/hospitality rebound create graduate trainee demand distinct from F&B/front desk. | Yes: hospitality management/rotation signal. |
| 24 | Travel Operations Executive | 4221 Travel Consultants and Clerks; 5113 Travel Guides | undergraduate -> postgraduate | management, arts-humanities, open | people-facing | Tier 1/2 travel, visa, tour, and booking operations roles; strong communication + process fit. | Yes: travel/booking coordination surface. |
| 25 | MIS / Business Reporting Executive | 4131 Computer Operator; 3314 Statistical Associate Professionals | undergraduate -> postgraduate | commerce, science, management | analytical | Larger employers hire Excel/reporting MIS separately from data entry; useful upgrade path for graduates. | No, can share operations analyst/data surface. |

## Suggested Approval Batches

### Batch A - high-volume non-graduate and service coverage

1. BPO Voice / Telecaller Associate
2. General Receptionist / Front Desk Executive
3. Delivery Associate / Last-mile Executive
4. Security Guard / CCTV Assistant
5. Clinic Front Office Coordinator

Reason: fixes the biggest 10th/12th and service-market gaps first.

### Batch B - healthcare operations and science/diploma

6. Medical Records Coordinator
7. Pharmacy Assistant
8. Laboratory Assistant
9. Electrician Helper / Technician Trainee
10. AC/Refrigeration Service Technician

Reason: adds the missing healthcare/science/diploma spine.

### Batch C - ITI/manufacturing/diploma depth

11. Manufacturing Quality Inspector
12. CNC / Machine Operator Trainee
13. Draughtsman / CAD Assistant
14. Bank Operations Assistant
15. KYC/AML Documentation Associate

Reason: balances non-office technical and BFSI operations roles.

### Batch D - commerce/law/professional coherence

16. Audit Assistant
17. Tax Assistant / Income Tax Filing Associate
18. Paralegal / Legal Research Assistant
19. Court Clerk / Legal Filing Assistant
20. Healthcare Operations Coordinator

Reason: gives M.Com/CA-track/LLB/MBBS users coherent non-generic paths.

### Batch E - graduate/postgraduate market breadth

21. Hospital Quality / NABH Documentation Trainee
22. Business Development Associate
23. Hospitality Management Trainee
24. Travel Operations Executive
25. MIS / Business Reporting Executive

Reason: rounds out higher-education and Tier 1/2 service-economy roles.

## Roles Not Recommended Yet

- Government exam tracks: too broad and not employer-role matching.
- Teacher/Tutor as a broad category: already partially covered by academic counsellor/preschool; needs a separate education product decision.
- Nurse/doctor clinical roles: regulated and not entry-level job-readiness matching in this product; use healthcare operations roles instead.
- Gig driver as a standalone role: include delivery/last-mile first; avoid turning the catalog into platform-specific listings.
- Civil construction site supervisor: useful but needs safety/travel/field supervision surface; lower priority than ITI technician roles for this phase.

## Product Decisions Needed

1. Approve target size: 66 total roles, or cap at a smaller subset.
2. Approve whether to add a new `healthcare-ops` branch/cluster or map healthcare-ops roles into existing `people-facing`, `desk-ops`, and `analytical` clusters. My recommendation: do not add a fifth cluster yet; add healthcare-specific branch options inside existing clusters first.
3. Approve gated policy for regulated/proof-heavy additions:
   - likely gated: Pharmacy Assistant, Laboratory Assistant, Electrician Helper, AC Technician, CNC Operator, Draughtsman, Hospital Quality Trainee
   - likely active-with-warning: BPO Voice, Receptionist, Delivery Associate, Security/CCTV, Clinic Front Office, Bank Ops, KYC/AML, Audit Assistant, Tax Assistant, Paralegal, Business Development, Travel Ops, MIS Reporting
4. Approve whether non-graduate physical/field roles should appear in the same top-three card design or need clearer caveat copy for shift/field/physical work.

## References

- Directorate General of Employment, Ministry of Labour & Employment, NCO-2015 portal and volumes: https://www.dge.gov.in/nco-2015
- DGE NCO search pages used for occupation codes, including contact-centre, retail, security, pharmacy, lab, hotel reception, bank teller, personnel clerk, and general office clerk families: https://www.dge.gov.in/nat
- PIB, Ministry of Labour & Employment, NCS platform and employment facilitation, 05 Feb 2026: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2223849&lang=1&reg=1
- NCS job-search surface, sectors and education filters: https://www.ncs.gov.in/job-seeker/Pages/Search.aspx
