import { ROUTING_QUESTIONS } from './src/lib/assessment-engine';

// Find options that set numbersConfidence, speakingConfidence, dataConfidence
for (const q of ROUTING_QUESTIONS) {
  for (const o of q.options) {
    if (o.profilePatch) {
      console.log(`${q.id} / ${o.id}: profilePatch = ${JSON.stringify(o.profilePatch)}`);
    }
  }
}
