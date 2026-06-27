# Product & Market Research Brief — Job Readiness Coach

**A note on method before anything else:** the request was "a usability test for the entire product" plus seven questions. Only some of those questions are usability-testable (watching 5-8 people use the product). Questions 3 and 5 specifically ask whether the product matches *real, current market conditions and sentiment* — that's a market/desk-research question, not something you learn by watching someone click through screens. So this document is two things stitched together: (a) real desk research, grounded in current reports, for the market-fit questions, and (b) an extension of the existing `USABILITY_TEST_PLAN.md` for the questions that genuinely are usability questions. Don't read this as a single research method — it isn't one.

---

## Q1 — How beneficial is it for the first-time user?

**The problem it targets is real and large, not assumed.** Per the *State of Working India 2026* report (Azim Premji University), **nearly 40% of youth aged 15-25 are unemployed**, and India produces ~5 million graduates a year against only ~2.8 million graduate-level jobs. Per NIIT's *India Skills Gap Report 2026*, there's a measurable **confidence gap**: senior professionals rate fresh-graduate job-readiness at **82/100**; students rate themselves at **57/100**. That 25-point gap — not a raw skills shortage — is the specific problem.

This product's positioning ("Your first job should not feel like a guessing game," "Free to use. About 5 minutes to your first useful recommendation," the explicit trust bullets "No payment required" / "Made for first-job seekers") is aimed squarely at that confidence gap, not at teaching skills from zero. That's the right target — match the actual diagnosis (readiness/confidence/translation gap) rather than building another generic course-and-credential product.

**Where the benefit is unproven, not absent:** the fit-check → resume → plan → applications chain only delivers real benefit if a user trusts the role match enough to act on it. That trust is not something this document can confirm — it requires the moderated usability study (`USABILITY_TEST_PLAN.md`) asking directly: *"Would you actually build your real resume around this suggested role, or would you go back to a generic template?"* That question isn't currently in the task script — see §6 below, it should be added.

---

## Q2 — How intuitive is the UI?

This has already been investigated in depth earlier in this engagement — don't re-derive it, reference it:

- `REDESIGN_SPEC.md` — the full design-consistency audit (color tokens, fonts, bilingual gaps, heading scale).
- `USER_JOURNEY_WALKTHROUGH.md` — a live, driven walkthrough that found and fixed 3 real blocking bugs (mock-auth/DB persistence wiped by hot-reload, and a logic bug that made the *final* fit-check question permanently unanswerable) plus 3 still-open findings (no language toggle on the auth screens themselves, a progress counter that silently jumps 5→10 questions mid-flow, a value-prop sentence that may be too dense to recall).

Net read: once the 3 blocking bugs were fixed, the core flow is structurally sound and the visual design (after the redesign-spec fixes) is coherent. The open intuitiveness risks are specific and named above, not vague — fold them into the moderated study's task list rather than treating this as a fresh open question.

---

## Q3 — Does it actually capture the current market scenario, and the future one?

**Current scenario — strong alignment, with one real gap.** Per Naukri's *JobSpeak* reports (Jan-Mar 2026), entry-level (0-3 years) hiring grew **16% YoY — the highest growth rate of any experience bracket**, and the demand is concentrated in **non-IT sectors**: Hospitality (+21% YoY), BPO/ITES (+18%), Oil & Gas (+15%), Education (+15%), Real Estate (+14%). Growth is also shifting toward **tier-2 cities** (Coimbatore, Gandhinagar, Surat all posted sustained double-digit growth through FY26).

This product's 12-role MVP catalog (per `system-design.md`: support, operations, MIS, finance, HR, counselling, marketing, content, healthcare coordination, compliance) maps closely onto exactly these growing non-IT, entry-level categories. That's a genuinely good fit, not a coincidence worth dismissing — it should be stated as a deliberate strength in any pitch, with the JobSpeak numbers cited.

**The gap:** per NIIT's Skills Gap Report, **45% of employers and candidates now rank a portfolio of work** as a top job-readiness signal, and the broader hiring shift is explicitly described as moving from credential-based to **skills-first hiring**, with 2026 called the "tipping point year" as AI evaluation tools make skills-first hiring feasible at scale. This product's fit-check engine is philosophically already skills/dimension-based (people/structure/numbers/creative, not degree-based) — that's well-positioned. But the **resume builder output is traditional** (summary, skills list, experience, education, certifications) with **no portfolio/proof-of-work section**. The product's own underlying logic is ahead of its output format.

**Future scenario:** the direction (skills-first, AI-assisted evaluation, vernacular-language inclusion via national infrastructure like Bhashini) is one this product can credibly grow into, but isn't fully there yet — see Q5 and Q7.

---

## Q4 — How will different users from around India use it?

Three concrete, evidence-based gaps, not general "India is diverse" hand-waving:

1. **Language coverage stops at two.** The product is English/Hindi only. India has 22 scheduled languages, and the hiring growth data above shows tier-2/tier-3 cities (Coimbatore — Tamil-majority; Surat, Gandhinagar — Gujarati-majority) becoming *more* important to entry-level hiring, not less. A Tamil-primary or Gujarati-primary first-job seeker is currently served no better than an English-only product would serve them, despite the "India-first, bilingual" positioning. The government's **Bhashini platform** offers free APIs/models for all 22 scheduled languages specifically to solve this; Indic NLP models (**MuRIL, IndicBERT, Vakyansh**) exist precisely for this gap. This is a real, citable extension path, not a hypothetical.
2. **Connectivity and device assumptions are already handled well.** `system-design.md`'s explicit LCP < 2.5s on 3G target and the mobile-first layout work (already audited in `REDESIGN_SPEC.md`) correctly anticipate that a large share of first-time job seekers are on budget Android devices with inconsistent connectivity. This is a strength, not a gap — worth stating so it doesn't get re-litigated.
3. **Role economics are probably national, not regional.** Worth direct verification (not confirmed in this document): do the role definitions' salary ranges reflect Mumbai/Bengaluru-level pay or a single national average? A "Customer Support Associate" salary band means something very different in a metro vs. a tier-3 town. If it's a single national figure, that's a known simplification worth stating plainly to users rather than presenting as precise.

---

## Q5 — Does it capture the sentiment from the latest surveys and reports on jobs?

**Yes, on the core emotional read** — and this is worth saying confidently, not hedged: the *State of Working India 2026* and NIIT Skills Gap data both converge on a **confidence/readiness gap**, not a raw skills deficit. This product's tone (warm, reassuring, "you don't need to know your final career path yet" per the earlier product audit notes, plain-language rationale instead of opaque scores) is built for exactly that emotional reality. That's a deliberate, correct read of the market sentiment.

**No, on the skills-evidence shift** — see Q3. If 45% of employers now look for portfolios/proof-of-work and the market is explicitly moving to skills-first evaluation, a product whose resume output is a traditional CV format is capturing yesterday's sentiment on *output format*, even while correctly capturing today's sentiment on *emotional tone*. These are two different things and it's worth being precise about which one is and isn't current.

---

## Q6 — What more questions should there be? How can the product get better?

**Research questions missing from the current usability test plan** (add these to `USABILITY_TEST_PLAN.md`'s wrap-up probes, don't write a separate study):
- *"Would you actually build your real resume around this suggested role, or would you go back to a generic template?"* — directly tests whether the role-match output is trusted enough to act on (the real measure of Q1's "benefit," not just task completion).
- *"If this were in [your regional language], would you use it instead of English/Hindi?"* — asked specifically to non-Hindi-primary participants, to size the Q4 language gap rather than assume it.
- *"Did you expect AI to write any of this for you? Where?"* — asked during the resume task, to directly test the Q7 gap below without leading the participant.
- *"Would you refer this to a friend in the next 2 weeks?"* — a forward-looking intent question current task-completion metrics don't capture.
- Funnel-level, not interview-level: **what fraction of real users abandon mid-fit-check, and at which question?** (The product already wires up `captureProductEvent`/PostHog analytics — this is an analytics-dashboard question, not a new interview, and it's a more reliable signal than 6-8 people's self-reports.)

**Concrete product improvements, each tied to a specific finding above, not generic polish suggestions:**
1. **Add a lightweight "proof of work" prompt to the resume builder** (a short project/task description field, distinct from "Experience") — directly answers the 45%-employers-want-portfolios finding (Q3) without redesigning the whole resume model.
2. **Scope a Bhashini-based language expansion** beyond EN/HI for at least the tier-2-city-heavy regional languages (Tamil, Gujarati per the growth-city data in Q3/Q4) — a real extension path exists via free government APIs, not a from-scratch NLP project.
3. **State salary-range scope explicitly** ("estimated, varies by city") if ranges are currently national averages — cheap, removes a credibility risk for free.
4. **Close the Q7 gap below** before any messaging change — don't market "AI resume co-writing" until there's an actual AI action inside the resume editor, or soften the copy to match what's actually delivered today.

---

## Q7 — How does the user get the most value through AI on this?

**Verified directly in source, not assumed:** the product's *own* architecture (`system-design.md`) is explicit that the core fit-check/scoring engine is **deliberately not AI** — "a structured, deterministic system with an AI coach layer on top... not a chatbot." That's a defensible, smart choice: a free-to-use product serving cost-sensitive, first-time users in India benefits from a scoring engine that's fast, free of hallucination risk, and doesn't burn LLM tokens on every fit-check submission. **AI is positioned as the conversational/qualitative layer, not the core recommendation engine — that's correct, not a gap.**

**The actual gap, found while writing this brief:** `resume/page.tsx` is labeled **"Resume co-writer"** (English) / **"रिज्यूमे को-राइटर"** (Hindi) in its own eyebrow copy — but a direct search of that file for any AI/generate/suggest action turns up **zero matches**. The "starter" resume content comes from `buildStarterResume()`, a deterministic template function (confirmed by reading `lib/product.ts`'s usage pattern earlier in this engagement), not an LLM call. Every field in the actual resume editor is a plain manual text input. **The only real AI touchpoint in the entire product is the floating `CoachWidget` chat** (calls `/api/agent/chat`), which is a generic, un-contextualized assistant — it doesn't know it's sitting on the resume page, doesn't offer an inline "improve this bullet point" action, and isn't wired into the resume form at all.

**So: today, a user gets AI value from exactly one place — asking the floating chat widget a question.** They get zero AI value *inside* the resume-writing flow itself, despite that flow being explicitly branded as AI co-writing. This is the single most concrete, fixable finding in this whole brief: either (a) add a real AI action to the resume editor (e.g., "Improve this description" next to each experience block, calling the same `/api/agent/chat` infrastructure already built), or (b) change "Resume co-writer" to language that matches what's actually delivered (a role-aware template + optional open-ended chat help). Shipping (a) is the higher-value fix since the branding promise is good — it's the delivery that's missing.

---

## Sources

- [UPSC Editorial Analysis: State of Working India 2026](https://www.insightsonindia.com/2026/03/23/upsc-editorial-analysis-state-of-working-india-2026/)
- [Skills Overtake Degrees As Workforce Readiness Gap Reshapes Job Market — BW Education](https://www.bweducation.com/article/skills-overtake-degrees-as-workforce-readiness-gap-reshapes-job-market-601258)
- [Unemployment Rate In India 2026: Latest Data, Trends And State-wise Analysis](https://pwonlyias.com/unemployment-rate-in-india/)
- [India's Educated Youth & Job Market Challenges: 2026 Report](https://www.newkerala.com/news/a/indias-young-workforce-growing-getting-more-educated-state-962.htm)
- [Naukri JobSpeak March 2026: 9% rise in white-collar hiring, FY26 closes at 8%](https://www.naukri.com/blog/naukri-jobspeak-march-26-records-a-9-rise-in-white-collar-hiring-as-fy26-closes-at-8-the-strongest-job-growth-in-three-years/)
- [Naukri JobSpeak Jan 2026: Non-IT drives growth, fresher hiring](https://www.naukri.com/blog/naukri-jobspeak-white-collar-hiring-opens-2026-with-3-yoy-growth-driven-by-non-it-sectors-and-fresher-hiring/)
- [Naukri JobSpeak Feb 2026: IT hiring recovers, AI momentum](https://www.naukri.com/blog/naukri-jobspeak-it-hiring-shows-meaningful-recovery-and-ai-momentum-continues-white-collar-market-posts-12-yoy-growth-in-february-2026/)
- [Naukri JobSpeak Oct 2025: Fresher hiring double-digit jump](https://www.naukri.com/blog/understanding-hiring-trends-with-naukri-jobspeak-report-oct-2025/)
- [AI for Local Language — Inclusion through Vernacular Models (IBEF)](https://www.ibef.org/blogs/ai-for-local-language-inclusion-through-vernacular-models)
- [AI Career Roadmap India 2026: Zero to First Job in 6–12 Months](https://beincareer.com/ai-career-roadmap-india-2026/)
- [AI Recruitment Platforms in India: The Complete Guide (2026)](https://www.thehirehub.ai/guides/ai-recruitment-india)

---

## How this fits with the other documents

- `USABILITY_TEST_PLAN.md` — add the Q6 questions above to its wrap-up section before running it; nothing else needs to change structurally.
- `USER_JOURNEY_WALKTHROUGH.md` — the bugs and open findings there are Q2 evidence; this brief doesn't repeat them, it cites them.
- `REDESIGN_SPEC.md` — if the Q6 product improvements (portfolio field, salary-range disclosure copy) get scoped, they should become a new sprint in that document, following its existing ticket format (exact file/line, exact diff, exact verification) rather than a new ad hoc change.
