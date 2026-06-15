import { ROUTING_QUESTIONS, BRANCH_QUESTIONS } from './src/lib/assessment-engine';

// Show each routing question's options and their clusterScores
for (const q of ROUTING_QUESTIONS) {
  console.log(`\n${q.id}:`);
  for (const o of q.options) {
    const cs = o.clusterScores ? JSON.stringify(o.clusterScores) : 'none';
    console.log(`  ${o.id}: clusterScores=${cs}`);
  }
}

console.log('\nBRANCH question option IDs:');
for (const [cluster, qs] of Object.entries(BRANCH_QUESTIONS)) {
  console.log(`\n  [${cluster}]`);
  for (const q of qs) {
    console.log(`    ${q.id}: ${q.options.map(o => o.id).join(', ')}`);
  }
}
