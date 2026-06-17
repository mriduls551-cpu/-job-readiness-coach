# Role Research Review — Assessment Engine v2

First-pass validation of the 12 roles in `src/lib/assessment-engine.ts` against the
real Indian entry-level (graduate, first-job) market, plus an audit of the
6-dimension vector logic. Purpose: give you researched answers to feed into the
algorithm-design prompt, so you walk in with decisions instead of blanks.

Market figures are fresher / entry-level ranges as of 2025–2026, drawn from
Glassdoor, PayScale, Indeed, AmbitionBox-derived blogs, and SalaryExpert.
Treat them as directional — public salary data is noisy and metro vs non-metro
swings are large (metros pay ~20–40% more).

---

## 1. Headline verdict

The role *set* is sound: all 12 are real, recognisable entry-level white-collar
roles that a non-elite Indian graduate can realistically land. Coverage of the
"first office job" market is good, and the people / desk / analytical / creative
spread is sensible.

Three things need attention:

1. **A few salary ranges are optimistic at the edges** — mostly floors set too
   high (data-entry, sales, telemedicine) and one ceiling that assumes a
   *qualified* candidate (accounting). Details in §2.
2. **One role is weak as a named title** — `telemedicine-coordinator`. The
   real-world equivalent is "patient care coordinator"; telemedicine-specific
   listings are thin. See §3.
3. **The vectors barely separate roles within a cluster** — this is the single
   most important finding and it directly explains the "everything is a possible
   fit" feel. See §4. This is a methodology issue, not a content one.

---

## 2. Salary validation (engine vs market)

"Engine" = the hardcoded `salaryRange`. "Realistic fresher" = my read of the
market data for a true first-job graduate (not qualified/CA/ACCA, non-metro to
metro band).

| Role | Engine range | Realistic fresher | Verdict |
|---|---|---|---|
| Customer Support | ₹2.4–4.2L | ₹2.0–4.1L | Accurate |
| Sales Support | ₹2.8–4.8L | ₹1.8–3.3L (+incentives) | Floor too high |
| Academic Counsellor | ₹2.6–4.8L | ₹2.2–3.6L (fresher) | Slightly high |
| HR Coordinator | ₹2.8–4.8L | ₹2.5–4.5L | Accurate |
| Data Entry / MIS | ₹2.2–4.0L | ₹1.2–2.7L | Floor too high |
| Back-Office Ops | ₹2.5–4.3L | ₹1.8–3.0L | Slightly high |
| Operations Analyst | ₹3.2–5.6L | ₹3.0–5.0L | Accurate |
| Accounting & Finance | ₹2.8–5.0L | ₹2.0–3.6L (unqualified) | Ceiling assumes qualified |
| Digital Marketing | ₹2.8–5.2L | ₹2.5–4.5L | Slightly high ceiling |
| Content Writer | ₹2.4–4.8L | ₹2.5–4.0L | Accurate |
| Telemedicine Coord. | ₹2.8–4.8L | ₹1.8–3.7L | Floor too high |
| Legal & Compliance Ops | ₹3.0–5.4L | ₹3.0–5.0L | Accurate |

**The bigger structural issue:** salary is a single fixed national range per role
with no city adjustment. Because metros pay 20–40% more, a fixed range reads as
"wrong" to users at both ends — too high for a tier-3 town, too low for someone in
Bangalore. For a product whose whole promise is "realistic guidance," a stale or
mis-located number is a fast credibility hit. Options: (a) widen ranges and label
them "national, varies by city," (b) add a coarse metro / non-metro multiplier, or
(c) move salary into data you can update without a code deploy. Decision needed —
see §5.

---

## 3. Role-validity notes

- **Telemedicine Coordinator** is the one I'd reconsider. As a distinct fresher
  title it barely exists in Indian listings; the actual market title is "Patient
  Care Coordinator," with telemedicine as one context. Recommend either renaming
  to the broader, more searchable title or folding it into a general
  healthcare-coordination role. Otherwise users who match into it won't find jobs
  by that name — which undermines trust.
- **Sales Support** in the real market is heavily incentive-based; the fixed-salary
  framing understates the variable component. Consider noting "base + incentives."
- **Accounting & Finance Assistant** spans two very different candidates: the
  unqualified commerce grad (₹2–3.5L) and the ACCA/CA-track candidate (₹5L+). The
  engine's ceiling reflects the latter. If your audience is mostly the former,
  pull the ceiling down or split the framing.
- The remaining 8 roles are accurate, in-demand, and well-named. No concerns.

---

## 4. Vector logic audit (the important one)

Dimensions: `[numerical, people-reactive, people-proactive, process-ops,
creative-output, analytical-output]`.

**Finding: within a cluster, the role vectors are nearly parallel, so the cosine
component cannot meaningfully separate them.** Examples:

- *Desk / analytical roles* — data-entry-mis `[7,1,1,9,1,3]`, back-office
  `[3,2,2,9,1,4]`, operations-analyst `[6,2,2,7,1,9]`, accounting `[9,1,1,7,1,5]`,
  legal-compliance `[6,1,1,9,1,5]`. All process-dominant with numerical/analytical
  secondary. Under weighted cosine (which measures *direction*), these will score
  within a few points of each other for almost any "desk-leaning" user.
- *People roles* — customer-support `[1,9,3,5,2,1]` and telemedicine
  `[2,8,2,7,1,2]` are nearly collinear.
- *Creative roles* — content-writer `[1,2,2,3,9,4]` and digital-marketing
  `[2,3,5,2,9,5]` share the creative=9 spike.

**What this means for the algorithm:**

1. The real disambiguation inside a cluster comes from the branch-question
   `roleScores` bonus — but that's capped at 30 while cosine gets 70. The 70/30
   split is arguably backwards: the component doing the actual work is the smaller
   one. Worth testing both weightings against an eval set.
2. Reporting a precise 0–99 score per role implies a precision the vectors don't
   have. Two roles shown as "78" and "74" are, mathematically, a near-tie dressed
   up as a ranking. This is a direct source of the "wishy-washy results" feel.
3. **Weights are role-specific**, so each role's cosine is computed on its *own*
   preferred axes. That makes cross-role scores not strictly comparable (you're
   ranking numbers produced by different formulas) and inflates each role's
   self-similarity. Methodologically this is the thing I'd scrutinise hardest in
   the eval harness.
4. `creative-output` is near-zero for 9 of 12 roles, so the 6-D space is unevenly
   used — most signal actually lives in three axes (people-reactive, process-ops,
   numerical). Not wrong, but the model is lower-dimensional than it looks.

None of this means the engine is bad — cluster-first routing is a legitimate
design, and across clusters the vectors separate fine. The takeaway is that the
**vector scores are a coarse cross-cluster sorter, not a fine within-cluster
ranker**, and the UI currently presents them as the latter.

---

## 5. Decisions to feed the coding prompt

The design prompt asks you to decide ground truth and confirm the roles. Here are
my recommended answers, ready to paste/adapt:

1. **Roles:** keep 11 as-is; rename `telemedicine-coordinator` →
   `patient-care-coordinator` (broader, searchable). Confirm before the agent
   touches role definitions.
2. **Salaries:** correct the four flagged ranges (sales, data-entry, accounting,
   telemedicine), add a "varies by city" label, and decide whether salary stays in
   code or moves to editable data. Recommend: fix now, plan to externalise later.
3. **Ground truth:** since there's no outcome data, ground truth = expert-labeled
   personas authored by you. Start with ~30 (2–3 per role) covering clear-cut
   cases plus a few deliberate edge/tie cases.
4. **Scoring question to test, not assume:** whether the cosine/bonus split should
   be 70/30, 50/50, or bonus-led — let the eval set decide.
5. **Calibration:** add an assertion that flags when the top-3 roles fall within N
   points of each other, and reconsider showing raw 0–99 scores vs. banded labels
   ("Strong / Good / Explore").

---

## Sources

Customer support: [Glassdoor](https://www.glassdoor.co.in/Salaries/customer-support-associate-salary-SRCH_KO0,26.htm), [PayScale](https://www.payscale.com/research/IN/Job=Customer_Service_Associate/Salary) ·
Data entry / MIS: [Glassdoor](https://www.glassdoor.co.in/Salaries/data-entry-executive-salary-SRCH_KO0,20.htm), [Collegedunia](https://collegedunia.com/courses/phd-computer-science-and-information-technology/mis-executive-salary) ·
Digital marketing: [Kraftshala](https://www.kraftshala.com/blog/digital-marketing-salary-in-india/), [WsCube](https://www.wscubetech.com/blog/digital-marketing-salary-india/) ·
Accounting: [TIPA](https://tipa.in/career/accountant-salary-india-2025-guide), [Apna](https://apna.co/career-central/accountant-salary-in-india/) ·
Operations analyst: [PayScale](https://www.payscale.com/research/IN/Job=Operations_Analyst/Salary/de88eb91/Entry-Level), [Indeed](https://in.indeed.com/career/operations-analyst/salaries) ·
Telemedicine / patient coordinator: [PayScale](https://www.payscale.com/research/IN/Job=Patient_Coordinator/Salary), [SalaryExpert](https://www.salaryexpert.com/salary/job/patient-care-coordinator/india) ·
Legal & compliance: [Glassdoor](https://www.glassdoor.com/Salaries/india-compliance-associate-salary-SRCH_IL.0,5_IN115_KO6,26.htm) ·
Content writer: [Internshala](https://internshala.com/blog/content-writer-salary-in-india/), [Indeed](https://in.indeed.com/career/content-writer/salaries) ·
Sales executive: [Indeed](https://in.indeed.com/career/entry-level-sales-executive/salaries), [upGrad](https://www.upgrad.com/blog/sales-executive-salary-in-india/) ·
HR executive: [upGrad](https://www.upgrad.com/blog/hr-salary-in-india/) ·
Academic counsellor: [Glassdoor](https://www.glassdoor.co.in/Salaries/academic-counsellor-salary-SRCH_KO0,19.htm), [Indeed](https://in.indeed.com/career/academic-counselor/salaries) ·
Back-office: [Indeed](https://in.indeed.com/career/back-office-executive/salaries)
