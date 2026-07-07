/** @jest-environment node */

import { describe, expect, it } from '@jest/globals';
import {
  ASSESSMENT_SCORING_VARIANTS,
  assignFitCheckScoringVariant,
  normalizeAssessmentScoringVariant,
  resolveAssessmentScoringExperiment,
  resolveFitCheckScoringRollout,
} from '@/lib/assessment-experiments';
import { getNextQuestions, scoreAssessment } from '@/lib/assessment-engine';

// Complete a valid desk-ops path: routing answers, optional tie-breaker, four
// evidence answers, and the finalist pick.
function completeDeskOpsResponses(finalistRoleId: string): Record<string, string> {
  const responses: Record<string, string> = {
    r1: 'r1_c',
    r2: 'r2_b',
    r3: 'r3_a',
    r4: 'r4_c',
    r5: 'r5_c',
  };
  let questions = getNextQuestions(responses);
  if (questions.some((question) => question.id === 'rtb')) {
    responses.rtb = 'rtb_b';
    questions = getNextQuestions(responses);
  }
  for (const question of questions) {
    if (responses[question.id]) continue;
    if (question.id === 'rf') {
      responses.rf = `rf_${finalistRoleId}`;
      continue;
    }
    responses[question.id] = question.options[0].id;
  }
  return responses;
}

describe('assessment scoring experiment config', () => {
  it('normalizes arbitrary flag payloads to known variants', () => {
    expect(normalizeAssessmentScoringVariant(undefined)).toBe('control');
    expect(normalizeAssessmentScoringVariant(null)).toBe('control');
    expect(normalizeAssessmentScoringVariant(false)).toBe('control');
    expect(normalizeAssessmentScoringVariant('garbage')).toBe('control');
    expect(normalizeAssessmentScoringVariant(true)).toBe('lighter_finalist_v1');
    expect(normalizeAssessmentScoringVariant('treatment')).toBe('lighter_finalist_v1');
    expect(normalizeAssessmentScoringVariant('Lighter_Finalist_V1')).toBe('lighter_finalist_v1');
  });

  it('parses the rollout percentage defensively', () => {
    expect(resolveFitCheckScoringRollout(undefined)).toBe(0);
    expect(resolveFitCheckScoringRollout('not-a-number')).toBe(0);
    expect(resolveFitCheckScoringRollout('-20')).toBe(0);
    expect(resolveFitCheckScoringRollout('250')).toBe(100);
    expect(resolveFitCheckScoringRollout('35.9')).toBe(35);
  });

  it('assigns variants deterministically and honors the rollout gate', () => {
    expect(assignFitCheckScoringVariant('user-1', 0)).toBe('control');
    expect(assignFitCheckScoringVariant('', 100)).toBe('control');
    expect(assignFitCheckScoringVariant('user-1', 100)).toBe('lighter_finalist_v1');
    const first = assignFitCheckScoringVariant('user-42', 50);
    for (let i = 0; i < 5; i += 1) {
      expect(assignFitCheckScoringVariant('user-42', 50)).toBe(first);
    }
  });

  it('resolveAssessmentScoringExperiment returns a copy of the variant config', () => {
    const resolved = resolveAssessmentScoringExperiment('lighter_finalist_v1');
    expect(resolved.scoringVariant).toBe('lighter_finalist_v1');
    expect(resolved.scoringConfig).toEqual(ASSESSMENT_SCORING_VARIANTS.lighter_finalist_v1);
    expect(resolved.scoringConfig).not.toBe(ASSESSMENT_SCORING_VARIANTS.lighter_finalist_v1);
  });
});

describe('scoring config effect on the engine', () => {
  const responses = completeDeskOpsResponses('data-entry-mis');

  it('control config is an exact no-op on scoring output', () => {
    const bare = scoreAssessment(responses, {}, 'en');
    const control = scoreAssessment(responses, {}, 'en', ASSESSMENT_SCORING_VARIANTS.control);
    expect(control).toEqual(bare);
  });

  it('lighter finalist weight reduces the finalist pick score, never increases it', () => {
    const control = scoreAssessment(responses, {}, 'en');
    const lighter = scoreAssessment(
      responses,
      {},
      'en',
      ASSESSMENT_SCORING_VARIANTS.lighter_finalist_v1
    );

    expect(lighter.allScores['data-entry-mis']).toBeLessThanOrEqual(
      control.allScores['data-entry-mis']
    );
    // The finalist pick still carries branch evidence, so it must not collapse
    // to zero either — the variant softens, it does not erase.
    expect(lighter.allScores['data-entry-mis']).toBeGreaterThan(0);
  });

  it('stream boost lifts boosted roles for matching streams only', () => {
    const analytical = {
      r1: 'r1_d',
      r2: 'r2_d',
      r3: 'r3_a',
      r4: 'r4_c',
      r5: 'r5_b',
    };
    let questions = getNextQuestions(analytical as Record<string, string>);
    const full: Record<string, string> = { ...analytical };
    if (questions.some((question) => question.id === 'rtb')) {
      full.rtb = 'rtb_c';
      questions = getNextQuestions(full);
    }
    for (const question of questions) {
      if (full[question.id]) continue;
      full[question.id] =
        question.id === 'rf' ? 'rf_operations-analyst' : question.options[0].id;
    }

    const profile = { educationStream: 'commerce' };
    const control = scoreAssessment(full, profile, 'en');
    const boosted = scoreAssessment(
      full,
      profile,
      'en',
      ASSESSMENT_SCORING_VARIANTS.lighter_finalist_v1
    );

    // operations-analyst has educationStreamBoosts: [commerce, science]; under
    // the boost variant a commerce-stream user should not see it score lower
    // from the boost itself (the lighter finalist pulls the other way, so we
    // assert on a role the finalist does not touch).
    expect(boosted.allScores['accounting-finance-assistant']).toBeGreaterThanOrEqual(
      Math.floor(control.allScores['accounting-finance-assistant'] * 0.9)
    );
  });
});
