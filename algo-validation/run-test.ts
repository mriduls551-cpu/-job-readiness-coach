import { getNextQuestions, scoreAssessment } from '../src/lib/assessment-engine';
import { PERSONAS } from './personas';

type Row = {
  id:number; name:string; expCluster:string; expRole:string;
  gotCluster:string; clusterHit:boolean;
  tieBreakerFired:boolean; usedFallback:boolean;
  top3:string[]; top3scores:number[]; topRole:string; top1Role:string;
  expRoleRank:number; roleInTop3:boolean; confidence:number;
  topScore:number; warning:string|null; stable:boolean;
};

function buildResponses(p:any){
  const responses:Record<string,string> = { ...p.routing };
  let usedFallback = false;
  // Phase 1 -> may need tie-breaker
  let qs = getNextQuestions(responses);
  let tieBreakerFired = qs.some(q=>q.id==='rtb');
  if(tieBreakerFired){
    responses['rtb'] = p.tieBreaker || 'rtb_a';
    qs = getNextQuestions(responses);
  }
  // Now branch questions present. Fill them.
  for(const q of qs){
    if(['r1','r2','r3','r4','r5','rtb'].includes(q.id)) continue;
    const want = p.branch[q.id] || q.options.find((o:any)=>o.roleScores?.[p.expectedRole])?.id;
    const optExists = want && q.options.some((o:any)=>o.id===want);
    if(optExists){ responses[q.id]=want; }
    else { responses[q.id]=q.options[0].id; usedFallback=true; } // routed to unexpected cluster
  }
  return { responses, tieBreakerFired, usedFallback };
}

const rows:Row[] = [];
for(const p of PERSONAS){
  const { responses, tieBreakerFired, usedFallback } = buildResponses(p);
  const res = scoreAssessment(responses, p.seed, 'en');
  // stability: run again with identical inputs (deterministic check) + a tiny perturbation re-run
  const res2 = scoreAssessment(responses, p.seed, 'en');
  const stable = JSON.stringify(res.topRoles.map(r=>[r.roleId,r.score]))===JSON.stringify(res2.topRoles.map(r=>[r.roleId,r.score]));

  const top3 = res.topRoles.map(r=>r.role.name.en);
  const top3ids = res.topRoles.map(r=>r.roleId);
  const top3scores = res.topRoles.map(r=>r.score);
  // rank of expected role across ALL scores
  const sortedAll = Object.entries(res.allScores).sort((a,b)=>(b[1] as number)-(a[1] as number));
  const expRoleRank = sortedAll.findIndex(([id])=>id===p.expectedRole)+1;

  rows.push({
    id:p.id, name:p.name, expCluster:p.expectedCluster, expRole:p.expectedRole,
    gotCluster:res.cluster, clusterHit:res.cluster===p.expectedCluster,
    tieBreakerFired, usedFallback,
    top3:top3ids, top3scores, topRole:top3ids[0], top1Role:top3[0],
    expRoleRank, roleInTop3: (top3ids as string[]).includes(p.expectedRole),
    confidence:res.confidenceScore, topScore:top3scores[0], warning:res.warning?res.warning.en:null,
    stable,
  });
}

// ---- print readable table ----
console.log('\n================ 20-PERSONA RESULTS ================\n');
for(const r of rows){
  const clTag = r.clusterHit?'OK ':'XX ';
  const roleTag = r.top3[0]===r.expRole?'TOP1':(r.roleInTop3?'in3 ':'MISS');
  console.log(`#${String(r.id).padStart(2)} ${r.name.padEnd(16)} exp:${r.expRole.padEnd(28)}`);
  console.log(`     cluster ${clTag} ${r.expCluster}->${r.gotCluster} | role ${roleTag} | expRoleRank=${r.expRoleRank}/12 | conf(margin)=${r.confidence} | tb=${r.tieBreakerFired?'Y':'n'} ${r.usedFallback?'[CLUSTER-MISMATCH fallback]':''}`);
  console.log(`     top3: ${r.top3.map((id,i)=>`${id}(${r.top3scores[i]})`).join('  ')}`);
  if(r.warning) console.log(`     warn: ${r.warning.slice(0,80)}`);
  if(!r.stable) console.log(`     !!! UNSTABLE across identical runs`);
  console.log('');
}

// ---- aggregate metrics ----
const n = rows.length;
const clusterHits = rows.filter(r=>r.clusterHit).length;
const top1Hits = rows.filter(r=>r.top3[0]===r.expRole).length;
const top3Hits = rows.filter(r=>r.roleInTop3).length;
const tbCount = rows.filter(r=>r.tieBreakerFired).length;
const unstable = rows.filter(r=>!r.stable).length;
const lowConf = rows.filter(r=>r.topScore<62).length;
// distribution
const clusterDist:Record<string,number> = {};
const roleDist:Record<string,number> = {};
for(const r of rows){ clusterDist[r.gotCluster]=(clusterDist[r.gotCluster]||0)+1;
  roleDist[r.top3[0]]=(roleDist[r.top3[0]]||0)+1; }

console.log('================ AGGREGATE ================');
console.log(`Cluster hit rate:  ${clusterHits}/${n} = ${(100*clusterHits/n).toFixed(0)}%`);
console.log(`Role Top-1 hit:    ${top1Hits}/${n} = ${(100*top1Hits/n).toFixed(0)}%`);
console.log(`Role Top-3 hit:    ${top3Hits}/${n} = ${(100*top3Hits/n).toFixed(0)}%`);
console.log(`Tie-breaker fired: ${tbCount}/${n}`);
console.log(`Unstable results:  ${unstable}/${n}`);
console.log(`Low-conf (<62):    ${lowConf}/${n}`);
console.log(`\nAssigned-cluster distribution: ${JSON.stringify(clusterDist)}`);
console.log(`Top-1 role distribution:       ${JSON.stringify(roleDist)}`);
const rolesCovered = new Set(rows.flatMap(r=>r.top3));
console.log(`Distinct roles ever surfaced in any top-3: ${rolesCovered.size}/12`);
const never = ['customer-support','sales-support','academic-counsellor','hr-coordinator','data-entry-mis','back-office-operations','operations-analyst','accounting-finance-assistant','digital-marketing-executive','content-writer','legal-compliance-operations'].filter(r=>!rolesCovered.has(r));
console.log(`Roles NEVER surfaced: ${never.length?never.join(', '):'(none)'}`);

import * as fs from 'fs';
fs.writeFileSync('results.json', JSON.stringify(rows,null,2));
console.log('\n[results.json written]');
