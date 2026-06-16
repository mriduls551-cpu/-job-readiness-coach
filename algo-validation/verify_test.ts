import { ASSESSMENT_QUESTIONS, TIE_BREAKER_QUESTION, getNextQuestions, scoreAssessment, ROLE_DEFINITIONS } from '../src/lib/assessment-engine';
const pf1 = { r1:'r1_a',r2:'r2_a',r3:'r3_a',r4:'r4_a',r5:'r5_a' };
const pfFull = { ...pf1, b1:'pf_b1_a',b2:'pf_b2_a',b3:'pf_b3_a',b4:'pf_b4_a' };
const deskFull = { r1:'r1_c',r2:'r2_b',r3:'r3_b',r4:'r4_b',r5:'r5_b', b1:'do_b1_a',b2:'do_b2_a',b3:'do_b3_a',b4:'do_b4_a' };
let pass=0,fail=0; const ok=(n:string,c:boolean)=>{ console.log((c?'PASS':'FAIL')+' :: '+n); c?pass++:fail++; };

// getNextQuestions
ok('empty -> ASSESSMENT_QUESTIONS', JSON.stringify(getNextQuestions({}))===JSON.stringify(ASSESSMENT_QUESTIONS));
const q = getNextQuestions({ ...pf1, rtb:'rtb_a' });
const nonRouting = q.filter(x=>!ASSESSMENT_QUESTIONS.some(r=>r.id===x.id)).filter(x=>x.id!==TIE_BREAKER_QUESTION.id);
ok('phase1+rtb -> exactly 4 branch questions', nonRouting.length===4);

// scoreAssessment shape + routing
const r1 = scoreAssessment(pfFull,{},'en');
ok('has all required fields', ['profile','cluster','confidenceScore','topRoles','allScores','summary','dimensionSnapshot'].every(k=>k in r1));
ok('topRoles 1..3', r1.topRoles.length>=1 && r1.topRoles.length<=3);
ok('allScores has 12 roles', Object.keys(r1.allScores).length===12);
ok('all scores clamped 0..99', Object.values(r1.allScores).every(s=>s>=0&&s<=99));
ok('topRoles sorted desc by score', r1.topRoles.every((m,i)=> i===0 || r1.topRoles[i-1].score>=m.score));
ok('routes people-facing', r1.cluster==='people-facing');
ok('routes desk-ops', scoreAssessment(deskFull,{},'en').cluster==='desk-ops');
ok('summary.en non-empty', typeof r1.summary.en==='string' && r1.summary.en.length>0);
ok('summary.hi non-empty', scoreAssessment(pfFull,{},'hi').summary.hi.length>0);
ok('empty responses no throw + shape', (()=>{try{const r=scoreAssessment({},{},'en');return Array.isArray(r.topRoles)&&!!r.cluster;}catch{return false;}})());
ok('profileSeed merged', (()=>{const r=scoreAssessment(pfFull,{fullName:'Priya Singh',city:'Mumbai'},'en');return r.profile.fullName==='Priya Singh'&&r.profile.city==='Mumbai';})());
ok('ROLE_DEFINITIONS 6-dim vectors', Object.values(ROLE_DEFINITIONS).every(r=>r.vector.length===6 && r.dimensionWeights.length===6));
ok('role vectors in [0,9]', Object.values(ROLE_DEFINITIONS).every(r=>r.vector.every(v=>v>=0&&v<=9)));

console.log(`\n${pass} passed, ${fail} failed`);
if(fail>0) process.exit(1);
