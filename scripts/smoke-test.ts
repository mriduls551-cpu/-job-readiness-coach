import {
  scoreAssessment,
  getNextQuestions,
  ROUTING_QUESTIONS,
  TIE_BREAKER_QUESTION,
  BRANCH_QUESTIONS,
  ROLE_DEFINITIONS,
  ROLE_ORDER,
  ASSESSMENT_QUESTIONS,
} from './src/lib/assessment-engine';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log('  ✅ ' + label);
    passed++;
  } else {
    console.error('  ❌ FAIL: ' + label);
    failed++;
  }
}

// ─── 1. Structure checks ────────────────────────────────────────────────────
console.log('\n[1] Structure');
assert(ROUTING_QUESTIONS.length === 5, 'ROUTING_QUESTIONS has 5 questions');
assert(ASSESSMENT_QUESTIONS === ROUTING_QUESTIONS, 'ASSESSMENT_QUESTIONS is alias for ROUTING_QUESTIONS');
assert(TIE_BREAKER_QUESTION.id === 'rtb', 'Tie-breaker id is rtb');
assert(Object.keys(BRANCH_QUESTIONS).length === 4, 'BRANCH_QUESTIONS has 4 clusters');
for (const cluster of ['people-facing','desk-ops','analytical','creative'] as const) {
  assert(BRANCH_QUESTIONS[cluster].length === 5, `${cluster} has 5 branch questions`);
}
assert(Object.keys(ROLE_DEFINITIONS).length === ROLE_ORDER.length, 'active roles defined');
for (const [id, role] of Object.entries(ROLE_DEFINITIONS)) {
  assert(role.vector.length === 6, `${id} vector is 6D`);
}

// ─── 2. getNextQuestions adaptive routing ────────────────────────────────────
console.log('\n[2] getNextQuestions adaptive routing');
const q0 = getNextQuestions({});
assert(q0.length === 5, 'Empty responses → 5 routing questions');
const partial = { r1: 'r1_a', r2: 'r2_a', r3: 'r3_d' };
const q1 = getNextQuestions(partial);
assert(q1.length === 5, 'Partial answers → still 5 routing questions');

// ─── 3. Correct option paths for each cluster ─────────────────────────────────
// Scoring from diagnose:
//   PF:  r1_a(pf+3)+r2_a(pf+3)+r3_d(pf+2)+r4_a(pf+3)+r5_d(pf+3) = 14 pf, margin≥8 → no tb
//   DO:  r1_c(do+3)+r2_d(do+3)+r3_b(do+1)+r4_b(do+1,pf+1)+r5_c(do+3) = 11 do, margin≥8 → no tb
//   AN:  r1_d(an+3)+r2_b(do+2,an+1)+r3_a(an+2,do+2)+r4_c(an+2)+r5_b(an+3) = 11 an vs 5 do → margin=6 may need tb
//   CR:  r2_c(cr+2)+r5_a(cr+3) = 5 max → always needs tie-breaker (cr_tb_a routes to creative)

const PF = { r1: 'r1_a', r2: 'r2_a', r3: 'r3_d', r4: 'r4_a', r5: 'r5_d' };
const DO = { r1: 'r1_c', r2: 'r2_d', r3: 'r3_b', r4: 'r4_b', r5: 'r5_c' };
const AN = { r1: 'r1_d', r2: 'r2_b', r3: 'r3_a', r4: 'r4_c', r5: 'r5_b' };
const CR_routing = { r1: 'r1_a', r2: 'r2_c', r3: 'r3_b', r4: 'r4_d', r5: 'r5_a' };

// ─── 3a. PF path — no tie-breaker ────────────────────────────────────────────
console.log('\n[3a] People-facing adaptive path');
const pfQ = getNextQuestions(PF);
const pfHasTB = pfQ.some(q => q.id === 'rtb');
assert(!pfHasTB, `PF clear path → no tie-breaker (got ${pfQ.length} qs)`);
assert(pfQ.length === 9, `PF path → exactly 9 questions (got ${pfQ.length})`);

// ─── 3b. DO path — no tie-breaker ────────────────────────────────────────────
console.log('\n[3b] Desk-ops adaptive path');
const doQ = getNextQuestions(DO);
const doHasTB = doQ.some(q => q.id === 'rtb');
assert(!doHasTB, `DO clear path → no tie-breaker (got ${doQ.length} qs)`);
assert(doQ.length === 9, `DO path → exactly 9 questions (got ${doQ.length})`);

// ─── 3c. Analytical path ─────────────────────────────────────────────────────
console.log('\n[3c] Analytical path');
const anQ = getNextQuestions(AN);
const anHasTB = anQ.some(q => q.id === 'rtb');
console.log(`    AN questions: ${anQ.length}, tb=${anHasTB}`);
if (anHasTB) {
  // Answer tie-breaker to get analytical branch
  const anWithTB = getNextQuestions({ ...AN, rtb: 'rtb_c' }); // c = analytical option
  assert(anWithTB.length === 10, `AN path with tb → 10 questions (got ${anWithTB.length})`);
} else {
  assert(anQ.length === 9, `AN path → 9 questions (got ${anQ.length})`);
}

// ─── 3d. Creative path — tie-breaker always fires ────────────────────────────
console.log('\n[3d] Creative path (tie-breaker expected)');
const crQ = getNextQuestions(CR_routing);
const crHasTB = crQ.some(q => q.id === 'rtb');
assert(crHasTB, `CR path always triggers tie-breaker (by design)`);
// Answer tie-breaker with creative preference
const crWithTB = getNextQuestions({ ...CR_routing, rtb: 'rtb_b' }); // b = creative option
assert(crWithTB.length === 10, `CR path with tb → 10 questions (got ${crWithTB.length})`);
console.log(`    TB branch ids: ${crWithTB.slice(6).map((q:any)=>q.id).join(', ')}`);

// ─── 4. scoreAssessment — 4 cluster paths ────────────────────────────────────
console.log('\n[4] scoreAssessment — 4 cluster paths');

// PF full
const pfFull: Record<string,string> = { ...PF, b1: 'pf_b1_a', b2: 'pf_b2_a', b3: 'pf_b3_a', b4: 'pf_b4_a', rf: 'rf_customer-support' };
const pfResult = scoreAssessment(pfFull, {}, 'en');
assert(pfResult.cluster === 'people-facing', `PF cluster = people-facing (got ${pfResult.cluster})`);
assert(pfResult.topRoles.length === 3, 'PF topRoles = 3');
assert(pfResult.topRoles[0].score > 0, `PF top score = ${pfResult.topRoles[0].score}`);
console.log(`    → ${pfResult.topRoles.map(r => `${r.roleId}(${r.score})`).join(', ')}`);

// DO full
const doFull: Record<string,string> = { ...DO, b1: 'do_b1_a', b2: 'do_b2_a', b3: 'do_b3_a', b4: 'do_b4_a', rf: 'rf_data-entry-mis' };
const doResult = scoreAssessment(doFull, {}, 'en');
assert(doResult.cluster === 'desk-ops', `DO cluster = desk-ops (got ${doResult.cluster})`);
assert(doResult.topRoles.length === 3, 'DO topRoles = 3');
assert(doResult.topRoles[0].score > 0, `DO top score = ${doResult.topRoles[0].score}`);
console.log(`    → ${doResult.topRoles.map(r => `${r.roleId}(${r.score})`).join(', ')}`);

// AN full — with or without tie-breaker
const anFull: Record<string,string> = { ...AN, b1: 'an_b1_a', b2: 'an_b2_a', b3: 'an_b3_a', b4: 'an_b4_a', rf: 'rf_operations-analyst' };
const anBase = getNextQuestions(AN);
const anNeedsTB = anBase.some((q:any) => q.id === 'rtb');
const anFullWithTB = anNeedsTB ? { ...AN, rtb: 'rtb_c', b1: 'an_b1_a', b2: 'an_b2_a', b3: 'an_b3_a', b4: 'an_b4_a', rf: 'rf_operations-analyst' } : anFull;
const anResult = scoreAssessment(anFullWithTB, {}, 'en');
assert(anResult.cluster === 'analytical', `AN cluster = analytical (got ${anResult.cluster})`);
assert(anResult.topRoles.length === 3, 'AN topRoles = 3');
assert(anResult.topRoles[0].score > 0, `AN top score = ${anResult.topRoles[0].score}`);
console.log(`    → ${anResult.topRoles.map(r => `${r.roleId}(${r.score})`).join(', ')}`);

// CR full (needs tb=rtb_b to route to creative)
const crFull: Record<string,string> = { ...CR_routing, rtb: 'rtb_b', b1: 'cr_b1_a', b2: 'cr_b2_a', b3: 'cr_b3_a', b4: 'cr_b4_a', rf: 'rf_content-writer' };
const crResult = scoreAssessment(crFull, {}, 'en');
assert(crResult.cluster === 'creative', `CR cluster = creative (got ${crResult.cluster})`);
assert(crResult.topRoles.length === 3, 'CR topRoles = 3');
assert(crResult.topRoles[0].score > 0, `CR top score = ${crResult.topRoles[0].score}`);
console.log(`    → ${crResult.topRoles.map(r => `${r.roleId}(${r.score})`).join(', ')}`);

// ─── 5. Disqualifier rules ───────────────────────────────────────────────────
console.log('\n[5] Disqualifier rules');
// Numbers-avoider: r3_d patches numbersConfidence=low (via profilePatch in routing question)
// Use a path that goes through r3_d
const naPath: Record<string,string> = { ...PF, b1: 'pf_b1_a', b2: 'pf_b2_a', b3: 'pf_b3_a', b4: 'pf_b4_a', rf: 'rf_customer-support' };
// r3_d is already in PF path — profilePatch sets numbersConfidence=low, dataConfidence=low
const naResult = scoreAssessment(naPath, {}, 'en');
const bannedNA = ['accounting-finance-assistant','data-entry-mis','operations-analyst'];
const naScores = bannedNA
  .map((r) => `${r.split('-')[0]}=${naResult.allScores[r as keyof typeof naResult.allScores]}`)
  .join(', ');
console.log(`    Numbers-avoider (via r3_d) banned scores: ${naScores}`);
// All banned roles should be very low (0.15x penalty)
for (const role of bannedNA) {
  const score = naResult.allScores[role as keyof typeof naResult.allScores] || 0;
  assert(score < 30, `${role} score < 30 with numbersConfidence=low (got ${score})`);
}

// Speaking-avoider: r4_d patches speakingConfidence=low
// Use a modified PF path with r4_d instead of r4_a
const saPath: Record<string,string> = { r1: 'r1_a', r2: 'r2_a', r3: 'r3_d', r4: 'r4_d', r5: 'r5_d',
  b1: 'pf_b1_a', b2: 'pf_b2_a', b3: 'pf_b3_a', b4: 'pf_b4_a', rf: 'rf_customer-support' };
const saResult = scoreAssessment(saPath, {}, 'en');
const bannedSA = ['customer-support','sales-support','academic-counsellor'];
const saScores = bannedSA
  .map((r) => `${r.split('-')[0]}=${saResult.allScores[r as keyof typeof saResult.allScores]}`)
  .join(', ');
console.log(`    Speaking-avoider (via r4_d) banned scores: ${saScores}`);
for (const role of bannedSA) {
  const score = saResult.allScores[role as keyof typeof saResult.allScores] || 0;
  assert(score < 40, `${role} score < 40 with speakingConfidence=low (got ${score})`);
}

// Law stream boost: educationStream=law boosts legal-compliance
const lawResult = scoreAssessment(doFull, { educationStream: 'law' }, 'en');
const hasLegal = lawResult.topRoles.some(r => r.roleId === 'legal-compliance-operations');
assert(hasLegal, `Law stream → legal-compliance in top 3`);
console.log(`    law top: ${lawResult.topRoles.map(r => r.roleId).join(', ')}`);

assert(!ROLE_ORDER.some((roleId) => roleId === ('patient-care-coordinator' as never)), 'Patient Care is retired');

// ─── 6. AssessmentResult shape ───────────────────────────────────────────────
console.log('\n[6] AssessmentResult shape');
assert(typeof pfResult.cluster === 'string', 'cluster is string');
assert(typeof pfResult.confidenceScore === 'number', 'confidenceScore is number');
assert(Array.isArray(pfResult.topRoles), 'topRoles is array');
assert(Object.keys(pfResult.allScores).length === ROLE_ORDER.length, 'allScores has all active entries');
assert(Object.keys(pfResult.dimensionSnapshot).length === 6, 'dimensionSnapshot has 6 dims');
assert(pfResult.summary.en.length > 0, 'summary.en non-empty');
assert(pfResult.summary.hi.length > 0, 'summary.hi non-empty');
assert(pfResult.topRoles[0].rationale.en.length > 0, 'rationale.en non-empty');
assert(pfResult.topRoles[0].strengthLabel.en.length > 0, 'strengthLabel present');

// ─── 7. Hindi locale ─────────────────────────────────────────────────────────
console.log('\n[7] Hindi locale');
const hiResult = scoreAssessment(pfFull, {}, 'hi');
assert(hiResult.summary.hi.length > 0, 'summary.hi non-empty');
assert(hiResult.topRoles[0].rationale.hi.length > 0, 'rationale.hi non-empty');
assert(hiResult.profile.locale === 'hi', 'profile.locale = hi');

// ─── 8. All 12 roles have non-zero score on at least one path ─────────────────
console.log('\n[8] All 12 roles reachable (non-zero score on some path)');
const allResults = [pfResult, doResult, anResult, crResult];
for (const roleId of Object.keys(ROLE_DEFINITIONS)) {
  const maxScore = Math.max(
    ...allResults.map((result) => result.allScores[roleId as keyof typeof result.allScores] || 0)
  );
  assert(maxScore > 0, `${roleId} scores > 0 on at least one path (max=${maxScore})`);
}

// ─── Final ────────────────────────────────────────────────────────────────────
console.log(`\n─────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\nSome tests FAILED ❌`);
  process.exit(1);
} else {
  console.log(`\nAll tests passed ✅`);
}
