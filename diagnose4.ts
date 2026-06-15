import { ROUTING_QUESTIONS } from './src/lib/assessment-engine';
// Print the actual question prompts + option labels (EN only)
for (const q of ROUTING_QUESTIONS) {
  console.log(`\n${q.id}: ${q.prompt.en}`);
  for (const o of q.options) {
    const cs = o.clusterScores ? JSON.stringify(o.clusterScores) : '—';
    console.log(`  ${o.id}: "${o.label.en}" → ${cs}`);
  }
}
