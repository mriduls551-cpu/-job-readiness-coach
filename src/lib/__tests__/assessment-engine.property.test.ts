import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';
import {
  ASSESSMENT_QUESTIONS,
  getNextQuestions,
  scoreAssessment,
} from '@/lib/assessment-engine';

function completeAssessmentArbitrary() {
  const routingArbitrary = ASSESSMENT_QUESTIONS.reduce(
    (responsesArbitrary, question) =>
      responsesArbitrary.chain((responses) =>
        fc.constantFrom(...question.options.map((option) => option.id)).map((optionId) => ({
          ...responses,
          [question.id]: optionId,
        }))
      ),
    fc.constant({} as Record<string, string>)
  );

  return routingArbitrary.chain((routingResponses) => {
    const tieQuestion = getNextQuestions(routingResponses).find((question) => question.id === 'rtb');
    const tieArbitrary = tieQuestion
      ? fc
          .integer({ min: 0, max: tieQuestion.options.length - 1 })
          .map((index) => tieQuestion.options[index].id)
      : fc.constant(undefined);

    return tieArbitrary.chain((tieOptionId) => {
      const withTie = tieOptionId
        ? { ...routingResponses, rtb: tieOptionId }
        : routingResponses;
      const branchQuestions = getNextQuestions(withTie).filter(
        (question) => question.id.startsWith('b') || question.id === 'rf'
      );

      return branchQuestions.reduce(
        (responsesArbitrary, question) =>
          responsesArbitrary.chain((responses) =>
            fc.constantFrom(...question.options.map((option) => option.id)).map((optionId) => ({
              ...responses,
              [question.id]: optionId,
            }))
          ),
        fc.constant(withTie)
      );
    });
  });
}

describe('assessment engine invariants', () => {
  it('keeps Sprint 1 trust-layer invariants across valid paths', () => {
    fc.assert(
      fc.property(completeAssessmentArbitrary(), (responses) => {
        const result = scoreAssessment(responses, {}, 'en');
        const rerun = scoreAssessment(responses, {}, 'en');

        const dimensionTotal = Object.values(result.dimensionSnapshot).reduce(
          (sum, value) => sum + value,
          0
        );
        expect(dimensionTotal).toBeGreaterThanOrEqual(99);
        expect(dimensionTotal).toBeLessThanOrEqual(101);

        for (let index = 1; index < result.topRoles.length; index += 1) {
          expect(result.topRoles[index - 1].score).toBeGreaterThanOrEqual(result.topRoles[index].score);
        }

        Object.values(result.allScores).forEach((score) => {
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(99);
        });

        result.topRoles.forEach((match) => {
          const distinctSignals = new Set(
            match.supportingSignals.map((signal) => `${signal.en}__${signal.hi}`)
          );
          expect(distinctSignals.size).toBe(match.supportingSignals.length);
          expect(match.eligibility).not.toBe('conditional');
        });

        expect(rerun).toEqual(result);
      }),
      {
        numRuns: 75,
        seed: 20260628,
      }
    );
  });
});
