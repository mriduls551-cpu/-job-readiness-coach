import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';
import {
  ASSESSMENT_QUESTIONS,
  getNextQuestions,
  scoreAssessment,
} from '@/lib/assessment-engine';
import { MATCHING_CATALOG } from '@/lib/matcher/catalog';

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

  it('keeps credential demotion non-excluding for professional-level personas', () => {
    const lowBandRoleIds = new Set(
      MATCHING_CATALOG.roles
        .filter((role) => ['secondary', 'diploma'].includes(role.typicalEducationBand.max))
        .map((role) => role.id)
    );

    fc.assert(
      fc.property(completeAssessmentArbitrary(), (responses) => {
        const result = scoreAssessment(
          responses,
          { degreeName: 'MBBS', educationStream: 'healthcare' },
          'en'
        );
        const directRolePreference = responses.rf?.startsWith('rf_')
          ? responses.rf.slice(3)
          : null;

        expect(Object.keys(result.allScores).sort()).toEqual([...ROLE_IDS].sort());

        for (const match of result.topRoles) {
          if (lowBandRoleIds.has(match.roleId)) {
            expect(match.roleId).toBe(directRolePreference);
          }
        }
      }),
      {
        numRuns: 75,
        seed: 20260719,
      }
    );
  });

  it('keeps stream relevance and education demotion non-excluding across full rankings', () => {
    fc.assert(
      fc.property(completeAssessmentArbitrary(), (responses) => {
        const result = scoreAssessment(
          responses,
          { degreeName: '12th pass', educationStream: 'open' },
          'en'
        );

        expect(result.rankedRoles.map((role) => role.roleId).sort()).toEqual([...ROLE_IDS].sort());
        expect(Object.keys(result.allScores).sort()).toEqual([...ROLE_IDS].sort());
      }),
      {
        numRuns: 75,
        seed: 20260720,
      }
    );
  });

  it('leaves rankings inert when no education stream or level signal exists', () => {
    fc.assert(
      fc.property(completeAssessmentArbitrary(), (responses) => {
        const emptyProfile = scoreAssessment(responses, {}, 'en');
        const unknownDegreeProfile = scoreAssessment(
          responses,
          { degreeName: 'unclear credential text' },
          'en'
        );

        expect(unknownDegreeProfile.rankedRoles).toEqual(emptyProfile.rankedRoles);
        expect(unknownDegreeProfile.topRoles).toEqual(emptyProfile.topRoles);
        expect(unknownDegreeProfile.allScores).toEqual(emptyProfile.allScores);
      }),
      {
        numRuns: 75,
        seed: 20260721,
      }
    );
  });

  it('never applies new education demotions to the finalist-selected role', () => {
    const secondaryToLegal = scoreAssessment(
      {
        r1: 'r1_c',
        r2: 'r2_b',
        r3: 'r3_b',
        r4: 'r4_c',
        r5: 'r5_c',
        b1: 'do_b1_c',
        b2: 'do_b2_c',
        b3: 'do_b3_c',
        b4: 'do_b4_c',
        rf: 'rf_legal-compliance-operations',
      },
      { degreeName: '12th pass', educationStream: 'open' },
      'en'
    );
    const professionalToDataEntry = scoreAssessment(
      {
        r1: 'r1_c',
        r2: 'r2_b',
        r3: 'r3_a',
        r4: 'r4_c',
        r5: 'r5_c',
        b1: 'do_b1_a',
        b2: 'do_b2_a',
        b3: 'do_b3_a',
        b4: 'do_b4_a',
        rf: 'rf_data-entry-mis',
      },
      { degreeName: 'MBBS', educationStream: 'healthcare' },
      'en'
    );

    const legal = secondaryToLegal.rankedRoles.find(
      (role) => role.roleId === 'legal-compliance-operations'
    );
    const dataEntry = professionalToDataEntry.rankedRoles.find((role) => role.roleId === 'data-entry-mis');

    expect(legal?.eligibility).not.toBe('conditional');
    expect(legal?.backgroundFit.educationDemoted).toBe(false);
    expect(dataEntry?.eligibility).not.toBe('conditional');
    expect(dataEntry?.backgroundFit.educationDemoted).toBe(false);
  });

  it('keeps secondary candidates away from advanced education bands unless directly requested', () => {
    const advancedBandRoleIds = new Set(
      MATCHING_CATALOG.roles
        .filter((role) => {
          const minIndex = EDUCATION_LEVEL_RANK[role.typicalEducationBand.min];
          return minIndex - EDUCATION_LEVEL_RANK.secondary >= 2;
        })
        .map((role) => role.id)
    );

    fc.assert(
      fc.property(completeAssessmentArbitrary(), (responses) => {
        const result = scoreAssessment(
          responses,
          { degreeName: '12th pass', educationStream: 'open' },
          'en'
        );
        const directRolePreference = responses.rf?.startsWith('rf_') ? responses.rf.slice(3) : null;

        for (const match of result.topRoles) {
          if (advancedBandRoleIds.has(match.roleId)) {
            expect(match.roleId).toBe(directRolePreference);
          }
        }
      }),
      {
        numRuns: 75,
        seed: 20260722,
      }
    );
  });
});

const ROLE_IDS = MATCHING_CATALOG.roles.map((role) => role.id);
const EDUCATION_LEVEL_RANK = {
  secondary: 0,
  diploma: 1,
  undergraduate: 2,
  postgraduate: 3,
  professional: 4,
} as const;
