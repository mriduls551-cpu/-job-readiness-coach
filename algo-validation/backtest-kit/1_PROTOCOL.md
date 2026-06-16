# Real-People Back-Test — Protocol

**Goal:** measure whether the engine recommends the *right* job for real people. The synthetic
persona test certified the engine is stable, unbiased in coverage, and free of the major bugs —
but it cannot prove real-world accuracy, because we wrote both the persona and the "right answer."
This test fixes that by using real humans whose correct answer we already know.

## The core idea
Recruit people who are **already employed and reasonably happy** in a job that maps to one of the
engine's 12 roles. Have them take the assessment as if they were new users. Then check: **did the
engine put their actual job in its top 3?**

Their current happy job is the ground truth. If the engine can recover it from their answers, the
matching works.

## Sample
- **30–50 participants.** Fewer than 30 and the percentages are too noisy to trust.
- **Spread across roles.** Aim for at least 2–3 people per role family (people-facing, desk-ops,
  analytical, creative). Don't let 40 of 50 be customer-support, or you've only tested one role.
- **Tier-2/3 background where possible** — your actual target users, so the language and options fit.
- **"Reasonably happy / good fit"** is a recruiting criterion, not a nice-to-have. Someone miserable
  in the wrong job is not ground truth.

## Procedure
1. For each participant, record their **real current job title** and map it to one of the 12 roles
   (use the dropdown in the scoring sheet). If a job maps to none of the 12, exclude it — it's out
   of scope, not a miss.
2. Give them the **blind instructions** (file `2_PARTICIPANT_INSTRUCTIONS.md`) and have them take
   the assessment. Blind = they must NOT know the test is checking whether it finds their current
   job, or they'll subconsciously answer toward it and inflate your score.
3. Record the engine's **Top 1 / Top 2 / Top 3** roles and the confidence margin in the scoring sheet.
4. The sheet auto-computes Top-1 and Top-3 hit rates overall and per role.

## The metric that matters
**Top-3 hit rate** = % of participants whose actual job appeared in the engine's top 3.
Secondary: **Top-1 hit rate** (stricter), and the per-role breakdown (which roles the engine is
weak at).

## How to read the result
| Top-3 hit rate | Reading |
|---|---|
| **≥ 80%** | Strong. The matching genuinely works; safe to put in front of users/partners. |
| **65–79%** | Promising. Usable, but look at the per-role breakdown for which roles drag it down. |
| **50–64%** | Weak. The engine is better than random but not trustworthy yet — iterate before scaling. |
| **< 50%** | Not working. Rethink the questions or the role vectors before launch. |

(Random chance of the right role landing in a top-3 out of 12 is ~25%, so anything near that = noise.)

## Common ways this test goes wrong (avoid these)
- **Un-blinded participants** → inflated scores. Keep the purpose hidden.
- **You recruiting only people like you** → tests one corner of the space. Spread roles deliberately.
- **Counting out-of-scope jobs as misses** → unfair. A schoolteacher maps to none of the 12; exclude, don't penalize.
- **Stopping at n=10** → the number will swing wildly. Get to 30+.
- **Mapping the job loosely** → if you fudge "what role their job really is," you're back to grading
  your own homework. Decide the mapping from the job *before* you see the engine's answer.

## After the test
- If a specific role has a low hit rate, look at that role's vector and its branch questions — that's
  where to tune next, and you can re-run the synthetic persona test (`run-test.ts`) to check changes fast.
- Keep the filled scoring sheet — it's your evidence base for investor/partner conversations.
