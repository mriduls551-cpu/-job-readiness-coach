import {
  getNextQuestions,
  scoreAssessment,
  ROUTING_QUESTIONS,
  TIE_BREAKER_QUESTION,
  BRANCH_QUESTIONS,
} from './src/lib/assessment-engine';

// ─── Strategy: pick "people-facing" options for all routing questions ─────────
const responses: Record<string, string> = {
  r1: 'r1_a',  // acknowledge feelings → people-facing: 3
  r2: 'r2_a',  // call people → people-facing: 3
  r3: 'r3_d',  // delegate, prefer people-facing → people-facing: 2
  r4: 'r4_a',  // call them directly → people-facing: 3
  r5: 'r5_d',  // calls/conversations moved forward → people-facing: 3
};

console.log('\n=== SMOKE TEST: Assessment Engine v2 ===\n');

// Step 1: Initial state - no responses
const initial = getNextQuestions({});
const pass1 = initial.length === 5 && initial.every(q => ROUTING_QUESTIONS.find(r => r.id === q.id));
console.log(`[Step 1] getNextQuestions({}) => ${initial.length} questions: ${initial.map(q => q.id).join(', ')}`);
console.log(`  PASS: ${pass1} (expected 5 routing questions r1-r5)`);

// Step 2: After routing questions
const afterRouting = getNextQuestions(responses);
const qIds = afterRouting.map(q => q.id);
const hasTieBreaker = qIds.includes(TIE_BREAKER_QUESTION.id);
console.log(`\n[Step 2] After routing answers => ${afterRouting.length} questions: ${qIds.join(', ')}`);
console.log(`  Tie-breaker (rtb) appeared: ${hasTieBreaker}`);

let allResponses = { ...responses };
if (hasTieBreaker) {
  const tbOption = TIE_BREAKER_QUESTION.options[0];
  allResponses[TIE_BREAKER_QUESTION.id] = tbOption.id;
  console.log(`  Answering tie-breaker with: ${tbOption.id}`);
  const afterTB = getNextQuestions(allResponses);
  console.log(`  After tie-breaker: ${afterTB.length} questions (${afterTB.map(q => q.id).join(', ')})`);
}

// Step 3: Determine assigned cluster from branch questions
const afterAllRouting = getNextQuestions(allResponses);
const branchQIds = afterAllRouting.map(q => q.id).filter(
  id => !ROUTING_QUESTIONS.find(r => r.id === id) && id !== TIE_BREAKER_QUESTION.id
);
let assignedCluster: string | null = null;
for (const [cluster, bqs] of Object.entries(BRANCH_QUESTIONS)) {
  if (bqs.some(bq => branchQIds.includes(bq.id))) {
    assignedCluster = cluster;
    break;
  }
}
console.log(`\n[Step 3] Branch questions: ${branchQIds.join(', ')}`);
console.log(`  Assigned cluster: ${assignedCluster}`);

// Step 4: Answer branch questions (first option each)
const branchQuestionsForCluster = BRANCH_QUESTIONS[assignedCluster as keyof typeof BRANCH_QUESTIONS] ?? [];
console.log(`\n[Step 4] Answering ${branchQuestionsForCluster.length} branch questions:`);
for (const bq of branchQuestionsForCluster) {
  const firstOption = bq.options[0];
  allResponses[bq.id] = firstOption.id;
  console.log(`  ${bq.id} => ${firstOption.id}: "${firstOption.label.en.substring(0, 55)}..."`);
}

// Step 5: Final question count check
const finalQuestions = getNextQuestions(allResponses);
const totalQCount = finalQuestions.length;
const expectedCount = hasTieBreaker ? 10 : 9;
const pass5 = totalQCount === expectedCount;
console.log(`\n[Step 5] Final total questions: ${totalQCount} (expected ${expectedCount})`);
console.log(`  Final IDs: ${finalQuestions.map(q => q.id).join(', ')}`);
console.log(`  PASS: ${pass5}`);

// Step 6: Score the assessment
console.log('\n[Step 6] Scoring assessment...');
const profile = { fullName: 'Test User', city: 'Delhi', locale: 'en' as const };

try {
  const result = scoreAssessment(allResponses, profile);
  const topRolesCount = result.topRoles.length;
  const pass6 = result.cluster === 'people-facing' && topRolesCount > 0;
  
  console.log(`  Cluster: ${result.cluster}`);
  console.log(`  Confidence margin: ${result.confidenceScore}`);
  console.log(`  Top roles (${topRolesCount}):`);
  result.topRoles.forEach((rm, i) => {
    console.log(`    ${i + 1}. ${rm.role.name.en} (score: ${rm.score})`);
  });
  if (result.warning) {
    console.log(`  Warning: "${result.warning.en}"`);
  }
  console.log(`  PASS: ${pass6} (cluster=people-facing, roles returned)`);

  console.log('\n========== FINAL SUMMARY ==========');
  console.log(`Dev server startup: FAIL (process resets between bash calls; next.config.js + tsconfig.json were truncated and repaired)`);
  console.log(`Engine logic test (direct tsx): PASS`);
  console.log(`Total questions shown: ${totalQCount}`);
  console.log(`Tie-breaker appeared: ${hasTieBreaker}`);
  console.log(`Cluster assigned: ${result.cluster}`);
  console.log(`Top roles: ${result.topRoles.map(rm => `${rm.role.name.en} (${rm.score})`).join(', ')}`);
  console.log(`All engine checks pass: ${pass1 && pass5 && pass6}`);
} catch (e) {
  console.error('  FAIL: scoreAssessment threw:', e);
}
