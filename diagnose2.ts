import { scoreAssessment } from './src/lib/assessment-engine';

// Check AssessmentProfile fields by scoring with different profiles
const base: Record<string,string> = {
  r1: 'r1_b', r2: 'r2_b', r3: 'r3_b', r4: 'r4_b', r5: 'r5_c',
  b1: 'do_b1_a', b2: 'do_b2_a', b3: 'do_b3_a', b4: 'do_b4_a',
};

// Test 1: without disqualifier
const r1 = scoreAssessment(base, {}, 'en');
console.log('Without disqualifier:');
console.log('  ops-analyst:', r1.allScores['operations-analyst']);
console.log('  acct-finance:', r1.allScores['accounting-finance-assistant']);

// Test 2: with numbersConfidence: low
const r2 = scoreAssessment(base, { numbersConfidence: 'low' } as any, 'en');
console.log('With numbersConfidence=low:');
console.log('  ops-analyst:', r2.allScores['operations-analyst']);
console.log('  acct-finance:', r2.allScores['accounting-finance-assistant']);

// Show what fields AssessmentProfile has
console.log('\nprofile from seed:', JSON.stringify(r2.profile));
