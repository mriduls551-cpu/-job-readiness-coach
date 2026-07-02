/**
 * Maps existing quiz answers (assessment-engine.ts response format) into the
 * new PersonProfile (RIASEC + aptitude + hard constraints).
 *
 * MAPPING APPROACH
 * ─────────────────
 * The quiz was built for a 6-dim vector model, not RIASEC. The mapping below is
 * a structural translation — documented, not hidden. Each answer is mapped to the
 * RIASEC dimensions it most plausibly signals based on Holland theory:
 *
 *   R (Realistic)     ← no quiz question directly probes this in the current quiz.
 *                       Entry-level white-collar roles in this catalog are low-R anyway.
 *                       GAP: R is unprobed; all persons get R = BASE_R = 15.
 *
 *   I (Investigative) ← "analytical / research" answers (r1_d, r2_c, r4_c, r5_b,
 *                       an_b1_a, an_b2_a, an_b3_a, cr_b1_a)
 *
 *   A (Artistic)      ← "creative / writing / campaign" answers (r5_a, cr_* options)
 *
 *   S (Social)        ← "helping / empathy / people" answers (r1_a, r2_a, r4_a/b,
 *                       r5_d, pf_b1_a/b, pf_b2_a/b)
 *
 *   E (Enterprising)  ← "persuasion / outbound / sales" answers (r4_a outbound,
 *                       cr_b1_c, cr_b2_c, cr_b3_c, cr_b4_c)
 *
 *   C (Conventional)  ← "process / data / structure / accuracy" answers (r1_b/c,
 *                       r2_d, r3_a/b, r5_c, do_b* options)
 *
 * APTITUDE GAPS (documented)
 * ──────────────────────────
 * - numeracy:           directly signalled by r3 (numbers confidence), an_b2
 * - writtenEnglish:     partially signalled by branch questions (cr_b*, pf_b4) but
 *                       the routing questions don't ask about written English skill.
 *                       GAP: writtenEnglish is under-probed in Phase 1. The current
 *                       quiz relies on profilePatch (writingConfidence), set only in
 *                       the creative branch. Non-creative users may have incorrect default.
 * - spokenCommunication: partially signalled by r4 (outbound comfort) and profilePatch
 *                        (speakingConfidence). Somewhat reliable.
 *
 * HARD CONSTRAINT GAPS
 * ──────────────────────
 * - educationStream:    taken directly from profileSeed.educationStream.
 * - englishLevel:       derived from profileSeed.englishLevel if provided; otherwise
 *                       inferred from spokenCommunication signal. The quiz does not
 *                       ask an explicit English-level question, so this is an estimate.
 *                       GAP: no explicit quiz question for English proficiency level.
 * - certifications:     not probed by the quiz at all.
 *                       GAP: quiz never asks about Tally or other certs. Accounting
 *                       role hard-filter currently requires no certs (seed has []) so
 *                       this doesn't cause failures, but if requiredCerts ever gets
 *                       populated the quiz must gain a corresponding question.
 */

import type { PersonProfile, StreamId, EnglishLevel, PersonRiasec, PersonAptitude, PersonHardConstraints } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Subset of AssessmentProfile fields this mapper reads (no import from assessment-engine). */
export interface QuizSeed {
  educationStream?: string;
  englishLevel?: string;
  speakingConfidence?: string;
  numbersConfidence?: string;
  writingConfidence?: string;
  city?: string;
}

// ─── RIASEC signal weights per answer id ─────────────────────────────────────
// Each entry: [R, I, A, S, E, C] contribution (additive, unnormalised)

const ANSWER_RIASEC: Record<string, [number, number, number, number, number, number]> = {
  // ── Routing Q1: reaction to upset customer ──
  r1_a: [0,  0,  5, 15,  5,  5],  // calm empathy → S, slight E/C
  r1_b: [0,  5,  0,  5,  5, 10],  // structured lookup → C, I
  r1_c: [0,  0,  0,  0,  0, 15],  // follow the process → C dominant
  r1_d: [0, 15,  0,  0,  0,  5],  // root-cause thinking → I dominant

  // ── Routing Q2: free 2 hours ──
  r2_a: [0,  0,  0, 10, 10,  0],  // outbound calls → E, S
  r2_b: [0,  5,  0,  0,  0, 15],  // fix Excel → C, I
  r2_c: [0, 10, 10,  5,  0,  0],  // research+write → I, A, S
  r2_d: [0,  5,  0,  0,  0, 15],  // clean up process → C, I

  // ── Routing Q3: numbers check ──
  r3_a: [0, 10,  0,  0,  0, 15],  // loves it → I, C (high numeracy)
  r3_b: [0,  5,  0,  0,  0,  5],  // does it carefully → moderate C
  r3_c: [0, 10,  0,  0,  0,  0],  // wants pattern first → I
  r3_d: [0,  0,  0, 10,  5,  0],  // delegates, wants people-facing → S, E

  // ── Routing Q4: outreach list ──
  r4_a: [0,  0,  0,  5, 15,  0],  // calls directly → E (proactive)
  r4_b: [0,  0,  0, 10,  5, 10],  // structured email → S, C, E
  r4_c: [0, 15,  0,  5,  0,  0],  // research first → I, S
  r4_d: [0,  0,  0, 10,  0,  5],  // prefers inbound → S (reactive)

  // ── Routing Q5: what to show manager ──
  r5_a: [0,  5, 15,  5, 10,  0],  // campaign/content → A, E, I
  r5_b: [0, 15,  0,  0,  5, 10],  // report/dashboard → I, C, E
  r5_c: [0,  5,  0,  0,  0, 15],  // process improved → C, I
  r5_d: [0,  0,  5, 15,  5,  0],  // conversations moved → S, A, E

  // ── Tie-breaker ──
  rtb_a: [0,  0,  0, 15,  5,  5],  // support work → S
  rtb_b: [0,  5,  0,  0,  5, 15],  // operations/MIS → C
  rtb_c: [0,  5, 15,  5, 10,  0],  // marketing/content → A, E
  rtb_d: [0, 10,  0,  0,  5, 15],  // accounts/compliance → C, I

  // ── People-facing branch ──
  pf_b1_a: [0,  0,  5, 15,  0,  5],  // listen + calm → S
  pf_b1_b: [0,  5,  5, 10,  5,  5],  // structured guidance → S, I
  pf_b1_c: [0,  5,  0, 10,  5, 10],  // coordinate next steps → S, C
  pf_b2_a: [0,  0,  0, 15,  0,  0],  // drained+fulfilled (empathy) → S
  pf_b2_b: [0,  0,  5, 10, 10,  0],  // energised by good conversations → S, E
  pf_b2_c: [0,  0,  0, 10,  5, 10],  // ready for coordination → S, C
  pf_b3_a: [0,  0,  0, 15,  5, 10],  // customer queries → S, C
  pf_b3_b: [0,  5, 10, 15,  5,  5],  // education guidance → S, A, I
  pf_b3_c: [0,  0,  0, 10,  5, 15],  // HR/team logistics → C, S
  pf_b3_d: [0,  0,  0, 15,  0, 10],  // healthcare appointments → S, C
  pf_b4_a: [0,  0,  5, 10,  5,  5],  // short customer replies → S
  pf_b4_b: [0,  5,  5, 10,  0, 10],  // guidance notes → S, C, I
  pf_b4_c: [0,  0,  0, 10,  0, 15],  // medical documentation → C, S

  // ── Desk-ops branch ──
  do_b1_a: [0,  5,  0,  0,  0, 15],  // fix+double-check → C
  do_b1_b: [0,  5,  0,  0,  0, 15],  // log+process fix → C, I
  do_b1_c: [0, 15,  0,  0,  0, 10],  // investigate cause → I, C
  do_b2_a: [0,  5,  0,  0,  0, 20],  // data accuracy → C
  do_b2_b: [0,  5,  0,  0,  0, 15],  // process ops → C
  do_b2_c: [0, 10,  0,  0,  0, 15],  // compliance/rules → C, I
  do_b3_a: [0,  5,  0,  0,  0, 15],  // deep desk work → C
  do_b3_b: [0,  5,  0,  5,  0, 10],  // cross-team ops → C, S
  do_b3_c: [0, 10,  0,  0,  0, 15],  // doc review → C, I
  do_b4_a: [0, 10,  0,  0,  0, 15],  // spreadsheet mastery → C, I
  do_b4_b: [0,  5,  0,  5,  0, 15],  // ops mastery → C
  do_b4_c: [0, 15,  0,  0,  0, 15],  // legal/compliance mastery → C, I

  // ── Analytical branch ──
  an_b1_a: [0, 15,  0,  0,  5, 10],  // dashboard/report → I, C
  an_b1_b: [0, 10,  0,  0,  0, 20],  // reconciled accounts → C, I
  an_b2_a: [0, 20,  0,  0,  0,  5],  // trends/models → I
  an_b2_b: [0, 10,  0,  0,  0, 15],  // ledgers/invoices → C, I
  an_b3_a: [0, 15,  0,  0,  5, 10],  // pivot/dashboard → I, C
  an_b3_b: [0, 10,  0,  0,  0, 20],  // Tally/bookkeeping → C, I
  an_b4_a: [0, 15,  0,  0,  5, 10],  // ops/reporting growth → I, C
  an_b4_b: [0, 10,  0,  0,  0, 20],  // finance growth → C, I

  // ── Creative branch ──
  cr_b1_a: [0, 10, 20,  5,  0,  5],  // content/article → A, I
  cr_b1_b: [0,  5, 15,  5, 15,  0],  // campaign/ad → A, E
  cr_b1_c: [0,  0, 10,  5, 20,  0],  // pitch/sales → E, A
  cr_b2_a: [0,  5, 20,  5,  0,  5],  // clarity writing → A
  cr_b2_b: [0, 10, 15,  5, 15,  0],  // audience attention → A, E
  cr_b2_c: [0,  0, 10,  5, 20,  0],  // persuasion → E, A
  cr_b3_a: [0, 10, 15,  5,  0, 10],  // content quality → A, I
  cr_b3_b: [0, 10, 10,  0, 15,  5],  // campaign perf → A, E
  cr_b3_c: [0,  5,  5,  0, 20,  5],  // outreach/conversion → E
  cr_b4_a: [0, 15, 20,  0,  0,  5],  // research+publish → A, I
  cr_b4_b: [0, 10, 10,  0, 15,  5],  // plan+analyse campaign → A, E
  cr_b4_c: [0,  0, 10,  5, 20,  0],  // pipeline+close → E, A
};

// ─── Aptitude signal from answers ─────────────────────────────────────────────
// Returns partial aptitude overrides inferred from specific answers.
// These supplement (and can be overridden by) profileSeed fields.

interface AptitudeSignal {
  numeracy?: number;
  writtenEnglish?: number;
  spokenCommunication?: number;
}

const ANSWER_APTITUDE: Record<string, AptitudeSignal> = {
  // Numeracy (r3 is the clearest signal)
  r3_a: { numeracy: 85 },   // loves numbers
  r3_b: { numeracy: 55 },   // does it but doesn't love it
  r3_c: { numeracy: 55 },   // needs pattern first → moderate
  r3_d: { numeracy: 20 },   // avoids numbers

  // Speaking confidence (r4 is a proxy)
  r4_a: { spokenCommunication: 80 },  // calls directly
  r4_b: { spokenCommunication: 60 },  // email+follow-up
  r4_c: { spokenCommunication: 50 },  // researches first
  r4_d: { spokenCommunication: 35 },  // prefers inbound

  // Written English — only probed deeply in creative branch
  cr_b2_a: { writtenEnglish: 75 },    // clarity-first writing
  cr_b3_a: { writtenEnglish: 75 },    // quality-first content
  cr_b4_a: { writtenEnglish: 80 },    // research+draft+publish
  pf_b4_b: { writtenEnglish: 65 },    // structured guidance notes
  do_b3_c: { writtenEnglish: 65 },    // doc review with comms
  do_b4_c: { writtenEnglish: 70 },    // legal mastery goal

  // Analytical branch signals numeracy too
  an_b2_a: { numeracy: 75 },   // trends/models
  an_b2_b: { numeracy: 80 },   // ledgers reconciliation
  an_b3_b: { numeracy: 80 },   // Tally comfort
  an_b1_b: { numeracy: 80 },   // reconciled accounts
};

// ─── Helper ───────────────────────────────────────────────────────────────────

const DEFAULT_RIASEC = { R: 15, I: 30, A: 15, S: 30, E: 20, C: 30 };
const DEFAULT_APTITUDE = { numeracy: 40, writtenEnglish: 50, spokenCommunication: 50 };

function normaliseRiasec(raw: PersonRiasec): PersonRiasec {
  // Scale so max dimension = 100; preserves relative shape.
  const max = Math.max(raw.R, raw.I, raw.A, raw.S, raw.E, raw.C, 1);
  const factor = 100 / max;
  return {
    R: Math.round(raw.R * factor),
    I: Math.round(raw.I * factor),
    A: Math.round(raw.A * factor),
    S: Math.round(raw.S * factor),
    E: Math.round(raw.E * factor),
    C: Math.round(raw.C * factor),
  };
}

function streamFromSeed(raw: string | undefined): StreamId {
  const valid: StreamId[] = [
    'open', 'open-switch', 'commerce', 'management',
    'arts-humanities', 'science', 'healthcare', 'law',
  ];
  if (raw && (valid as string[]).includes(raw)) return raw as StreamId;
  return 'open';
}

function englishLevelFromSeed(raw: string | undefined, spokenScore: number): EnglishLevel {
  if (raw === 'basic' || raw === 'functional' || raw === 'proficient') return raw;
  // Infer from spoken communication score (imperfect — see GAP note in file header)
  if (spokenScore >= 70) return 'functional';
  if (spokenScore >= 50) return 'functional';
  return 'basic';
}

// ─── Main mapper ──────────────────────────────────────────────────────────────

/**
 * Converts quiz responses + optional seed fields into a PersonProfile.
 *
 * @param responses  - Same format as scoreAssessment() responses: { questionId: optionId }
 * @param seed       - Optional profile fields from registration/onboarding form
 */
export function mapAnswersToProfile(
  responses: Record<string, string>,
  seed: QuizSeed = {}
): PersonProfile {
  // Accumulate RIASEC from all selected answers
  const acc: PersonRiasec = { ...DEFAULT_RIASEC };
  const aptAcc: PersonAptitude = { ...DEFAULT_APTITUDE };
  let aptHints = 0;

  for (const optionId of Object.values(responses)) {
    const riasecDelta = ANSWER_RIASEC[optionId];
    if (riasecDelta) {
      acc.R += riasecDelta[0];
      acc.I += riasecDelta[1];
      acc.A += riasecDelta[2];
      acc.S += riasecDelta[3];
      acc.E += riasecDelta[4];
      acc.C += riasecDelta[5];
    }
    const aptSignal = ANSWER_APTITUDE[optionId];
    if (aptSignal) {
      if (aptSignal.numeracy !== undefined) {
        aptAcc.numeracy = Math.round((aptAcc.numeracy + aptSignal.numeracy) / (aptHints === 0 ? 1 : 2));
      }
      if (aptSignal.writtenEnglish !== undefined) {
        aptAcc.writtenEnglish = aptSignal.writtenEnglish;
      }
      if (aptSignal.spokenCommunication !== undefined) {
        aptAcc.spokenCommunication = aptSignal.spokenCommunication;
      }
      aptHints++;
    }
  }

  // Seed overrides (explicit fields from registration form win over quiz inferences)
  if (seed.numbersConfidence === 'high') aptAcc.numeracy = Math.max(aptAcc.numeracy, 75);
  if (seed.numbersConfidence === 'medium') aptAcc.numeracy = Math.max(aptAcc.numeracy, 50);
  if (seed.numbersConfidence === 'low') aptAcc.numeracy = Math.min(aptAcc.numeracy, 30);

  if (seed.writingConfidence === 'high') aptAcc.writtenEnglish = Math.max(aptAcc.writtenEnglish, 75);
  if (seed.writingConfidence === 'medium') aptAcc.writtenEnglish = Math.max(aptAcc.writtenEnglish, 55);
  if (seed.writingConfidence === 'low') aptAcc.writtenEnglish = Math.min(aptAcc.writtenEnglish, 35);

  if (seed.speakingConfidence === 'high') aptAcc.spokenCommunication = Math.max(aptAcc.spokenCommunication, 75);
  if (seed.speakingConfidence === 'medium') aptAcc.spokenCommunication = Math.max(aptAcc.spokenCommunication, 55);
  if (seed.speakingConfidence === 'low') aptAcc.spokenCommunication = Math.min(aptAcc.spokenCommunication, 30);

  const riasec = normaliseRiasec(acc);
  const englishLevel = englishLevelFromSeed(seed.englishLevel, aptAcc.spokenCommunication);

  const hardConstraints: PersonHardConstraints = {
    educationStream: streamFromSeed(seed.educationStream),
    englishLevel,
    certifications: [],
  };

  return {
    riasec,
    aptitude: {
      numeracy: Math.min(100, Math.max(0, aptAcc.numeracy)),
      writtenEnglish: Math.min(100, Math.max(0, aptAcc.writtenEnglish)),
      spokenCommunication: Math.min(100, Math.max(0, aptAcc.spokenCommunication)),
    },
    hardConstraints,
  };
}
