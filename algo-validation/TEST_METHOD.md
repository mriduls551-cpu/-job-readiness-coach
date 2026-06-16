# Career-Match Algorithm — Validation Test Method

## What this test is (and is not)
This is a **synthetic persona sanity + coverage + stability test**. It runs 20 hand-built,
realistic tier-2/3 India candidate profiles through the *real* assessment engine
(`scoreAssessment`) exactly as the live UI does, and checks whether the algorithm behaves
sensibly.

**It CAN prove:** the engine is stable/deterministic, every role is reachable, clusters
route correctly, disqualifier rules fire, and the score *distribution* is healthy (not
collapsed onto one answer). It catches structural breakage.

**It CANNOT prove:** that a recommendation is *correct for a real human*. Synthetic personas
are authored by us, so "expected role" is our own hypothesis, not ground truth. Real accuracy
still requires the **back-test against already-employed people** (see "Next test" below).

## How it runs
1. Each persona supplies registration data (`educationStream`, city) + answer choices for the
   5 routing questions, a tie-breaker preference, and branch answers for their likely cluster.
2. The harness calls `getNextQuestions()` after routing — if the engine inserts the
   tie-breaker (cluster margin < 8) it answers it, then answers whatever branch questions the
   engine serves. If the engine routes the persona to an *unexpected* cluster, the persona's
   branch answers won't match and we flag a **cluster mismatch**.
3. `scoreAssessment()` is called with the full response set + profile seed.
4. Every persona is scored **twice** with identical input to confirm determinism.

## Metrics captured per persona
- **Cluster hit** — did the engine route to the expected family?
- **Role Top-1 / Top-3 hit** — did the expected role land 1st / in the top 3?
- **Expected-role rank** (1–12 across all roles)
- **Confidence margin** between the top two clusters
- **Tie-breaker fired?**, **warning text**, **stability**

## Aggregate metrics
Cluster hit rate, Top-1 / Top-3 role hit rate, tie-breaker frequency, instability count,
low-confidence count, assigned-cluster distribution, Top-1 role distribution, and role coverage
(how many of 12 roles ever appear).

## The 20 personas
12 map one-to-one to the 12 roles; 8 are deliberate stress cases: ambiguous all-rounders
(low-confidence test), disqualifier conflicts (wants finance but weak at numbers; wants sales
but low speaking confidence), and stream-vs-choice tension (healthcare grad who wants desk work).

## Next test (the one that proves accuracy)
Recruit 30–50 **already-employed, reasonably happy** people across roles, have them take the
assessment blind, and measure: *was their actual job in the engine's top 3?* That hit rate is
the real accuracy number. This synthetic test is the cheap pre-check you run first.
