/** @jest-environment node */

import { describe, expect, it } from '@jest/globals';
import {
  AssessmentValidationError,
  BRANCH_QUESTIONS,
  ROLE_ORDER,
  getNextQuestions,
  scoreAssessment,
  validateAssessmentResponses,
  type ClusterId,
  type RoleId,
} from '@/lib/assessment-engine';
import { MATCHING_CATALOG } from '@/lib/matcher/catalog';
import { scoreEvidence } from '@/lib/matcher/scorer';
import type { PersonEvidence } from '@/lib/matcher/types';

const routes = {
  people: { r1: 'r1_a', r2: 'r2_a', r3: 'r3_c', r4: 'r4_a', r5: 'r5_a' },
  desk: { r1: 'r1_c', r2: 'r2_b', r3: 'r3_a', r4: 'r4_c', r5: 'r5_c' },
  analytical: { r1: 'r1_d', r2: 'r2_d', r3: 'r3_a', r4: 'r4_c', r5: 'r5_b' },
  creative: { r1: 'r1_d', r2: 'r2_c', r3: 'r3_c', r4: 'r4_d', r5: 'r5_d' },
};

function completePath(
  routing: Record<string, string>,
  optionIds: string[],
  tieBreaker?: string
) {
  const responses = { ...routing };
  let questions = getNextQuestions(responses);
  if (questions.some((question) => question.id === 'rtb')) {
    responses.rtb = tieBreaker || 'rtb_a';
    questions = getNextQuestions(responses);
  }
  const branch = questions.filter((question) => question.id.startsWith('b') || question.id === 'rf');
  const roleTotals = new Map<string, number>();
  for (const optionId of optionIds.slice(0, 4)) {
    const option = branch.flatMap((question) => question.options).find((item) => item.id === optionId);
    for (const [roleId, points] of Object.entries(option?.roleScores || {})) {
      roleTotals.set(roleId, (roleTotals.get(roleId) || 0) + points);
    }
  }
  const inferredRole = [...roleTotals].sort((left, right) => right[1] - left[1])[0]?.[0];
  branch.forEach((question, index) => {
    const requested =
      optionIds[index] || (question.id === 'rf' && inferredRole ? `rf_${inferredRole}` : undefined);
    if (!requested || !question.options.some((option) => option.id === requested)) {
      throw new Error(`Invalid test fixture option ${requested} for ${question.id}`);
    }
    responses[question.id] = requested;
  });
  return responses;
}

const customer = completePath(routes.people, ['pf_b1_a', 'pf_b2_a', 'pf_b3_a', 'pf_b4_a']);
const finance = completePath(routes.analytical, ['an_b1_b', 'an_b2_b', 'an_b3_b', 'an_b4_b']);
const analyst = completePath(routes.analytical, ['an_b1_a', 'an_b2_a', 'an_b3_a', 'an_b4_a']);
const dataEntry = completePath(routes.desk, ['do_b1_a', 'do_b2_a', 'do_b3_a', 'do_b4_a']);
const creativeWriter = completePath(
  routes.creative,
  ['cr_b1_a', 'cr_b2_a', 'cr_b3_a', 'cr_b4_a'],
  'rtb_c'
);

const CORE_ASSESSMENT_ROLE_IDS = new Set<RoleId>([
  'customer-support',
  'sales-support',
  'academic-counsellor',
  'hr-coordinator',
  'data-entry-mis',
  'back-office-operations',
  'operations-analyst',
  'accounting-finance-assistant',
  'digital-marketing-executive',
  'content-writer',
  'legal-compliance-operations',
]);

describe('versioned matching catalog', () => {
  it('matches the production role universe exactly', () => {
    expect(MATCHING_CATALOG.roles.map((role) => role.id)).toEqual(ROLE_ORDER);
  });

  it('uses one six-dimensional target per role', () => {
    for (const role of MATCHING_CATALOG.roles) {
      expect(role.preferenceTarget).toHaveLength(6);
      role.preferenceTarget.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(9);
      });
    }
  });

  it('keeps market demand disabled while priors are unsourced', () => {
    expect(MATCHING_CATALOG.marketPolicy).toBe('disabled-until-sourced');
    expect(MATCHING_CATALOG.roles.every((role) => role.marketPrior.value === null)).toBe(true);
  });

  it('defines a typical education band for every expanded catalog role', () => {
    for (const role of MATCHING_CATALOG.roles) {
      expect(role.typicalEducationBand.min).toBeTruthy();
      expect(role.typicalEducationBand.max).toBeTruthy();
    }
  });

  it('defines stream relevance for every expanded catalog role', () => {
    for (const role of MATCHING_CATALOG.roles) {
      expect(role.streamRelevance.length).toBeGreaterThan(0);
    }
    expect(MATCHING_CATALOG.roles.find((role) => role.id === 'gst-assistant')?.streamRelevance).toEqual([
      'commerce',
    ]);
    expect(MATCHING_CATALOG.roles.find((role) => role.id === 'web-development-associate')?.streamRelevance).toEqual([
      'science',
    ]);
    expect(MATCHING_CATALOG.roles.find((role) => role.id === 'customer-support')?.streamRelevance).toEqual([
      'open',
    ]);
  });
});

describe('strict adaptive-path validation', () => {
  it.each([
    ['empty', {}],
    ['unknown question', { ...customer, q_fake: 'x' }],
    ['invalid option', { ...customer, r1: 'not-an-option' }],
    ['missing routing', Object.fromEntries(Object.entries(customer).filter(([key]) => key !== 'r2'))],
    ['missing branch', Object.fromEntries(Object.entries(customer).filter(([key]) => key !== 'b4'))],
    ['wrong branch option', { ...finance, b1: 'do_b1_a' }],
  ])('rejects %s submissions', (_label, responses) => {
    expect(() => validateAssessmentResponses(responses)).toThrow(AssessmentValidationError);
    expect(() => scoreAssessment(responses)).toThrow(AssessmentValidationError);
  });

  it('rejects an inactive stale tie-breaker', () => {
    expect(() => validateAssessmentResponses({ ...customer, rtb: 'rtb_a' })).toThrow(
      'Tie-breaker answer is not active'
    );
  });

  it('returns a canonical complete path', () => {
    const validated = validateAssessmentResponses(finance);
    expect(validated.cluster).toBe('analytical');
    expect(validated.requiredAnswerCount).toBe(Object.keys(finance).length);
    expect(validated.canonicalResponses).toEqual(finance);
  });

  it('accepts every routing combination and each legally active tie-breaker', () => {
    const routingQuestions = getNextQuestions({});
    let checkedPaths = 0;

    function visit(index: number, responses: Record<string, string>) {
      if (index < routingQuestions.length) {
        const question = routingQuestions[index];
        for (const option of question.options) {
          visit(index + 1, { ...responses, [question.id]: option.id });
        }
        return;
      }

      const questions = getNextQuestions(responses);
      const tieQuestion = questions.find((question) => question.id === 'rtb');
      const variants = tieQuestion ? tieQuestion.options.map((option) => option.id) : [undefined];
      for (const tieOption of variants) {
        const withTie: Record<string, string> = tieOption
          ? { ...responses, rtb: tieOption }
          : { ...responses };
        const fullQuestions = getNextQuestions(withTie);
        const completed: Record<string, string> = { ...withTie };
        fullQuestions
          .filter((question) => question.id.startsWith('b') || question.id === 'rf')
          .forEach((question) => {
            completed[question.id] = question.options[0].id;
          });
        expect(() => validateAssessmentResponses(completed)).not.toThrow();
        checkedPaths += 1;
      }
    }

    visit(0, {});
    expect(checkedPaths).toBeGreaterThanOrEqual(4 ** routingQuestions.length);
  });

  it('accepts every authored branch option on its active path', () => {
    const routeByCluster: Record<ClusterId, Record<string, string>> = {
      'people-facing': routes.people,
      'desk-ops': routes.desk,
      analytical: routes.analytical,
      creative: routes.creative,
    };
    const tieByCluster: Record<ClusterId, string> = {
      'people-facing': 'rtb_a',
      'desk-ops': 'rtb_b',
      analytical: 'rtb_d',
      creative: 'rtb_c',
    };

    for (const cluster of Object.keys(BRANCH_QUESTIONS) as ClusterId[]) {
      BRANCH_QUESTIONS[cluster].forEach((question, questionIndex) => {
        question.options.forEach((option) => {
          const selections = BRANCH_QUESTIONS[cluster].map(
            (item, index) => (index === questionIndex ? option.id : item.options[0].id)
          );
          const responses = completePath(
            routeByCluster[cluster],
            selections,
            tieByCluster[cluster]
          );
          expect(validateAssessmentResponses(responses).cluster).toBe(cluster);
        });
      });
    }
  });
});

describe('production constrained hybrid', () => {
  it('is deterministic including tie ordering', () => {
    const first = scoreAssessment(finance, { educationStream: 'commerce' });
    for (let index = 0; index < 10; index += 1) {
      expect(scoreAssessment(finance, { educationStream: 'commerce' })).toEqual(first);
    }
  });

  it('returns version and evidence metadata', () => {
    const result = scoreAssessment(customer);
    expect(result.scoringVersion).toBe(MATCHING_CATALOG.scoringVersion);
    expect(result.catalogVersion).toBe(MATCHING_CATALOG.catalogVersion);
    expect(['low', 'medium', 'high']).toContain(result.confidenceBand);
    expect(result.topRoles.every((role) => role.eligibility !== undefined)).toBe(true);
  });

  it('ranks strong within-branch preferences as intended', () => {
    expect(scoreAssessment(customer).topRoles[0].roleId).toBe('customer-support');
    expect(scoreAssessment(finance, { educationStream: 'commerce' }).topRoles[0].roleId).toBe(
      'accounting-finance-assistant'
    );
    expect(scoreAssessment(analyst).topRoles[0].roleId).toBe('operations-analyst');
    expect(scoreAssessment(dataEntry).topRoles[0].roleId).toBe('data-entry-mis');
    expect(scoreAssessment(creativeWriter).topRoles[0].roleId).toBe('content-writer');
  });

  it('prevents an explicit low-numbers contradiction from leading finance', () => {
    const lowNumbers = completePath(
      { ...routes.analytical, r3: 'r3_d' },
      ['an_b1_b', 'an_b2_b', 'an_b3_b', 'an_b4_b'],
      'rtb_d'
    );
    const result = scoreAssessment(lowNumbers, { educationStream: 'commerce' });
    expect(result.topRoles[0].roleId).not.toBe('accounting-finance-assistant');
    expect(result.topRoles.some((role) => role.eligibility === 'conditional')).toBe(false);
  });

  it('demotes roles far below a professional education level without removing them', () => {
    const dataEntryPolicy = MATCHING_CATALOG.roles.find((role) => role.id === 'data-entry-mis');
    expect(dataEntryPolicy?.typicalEducationBand.max).toBe('undergraduate');

    const person: PersonEvidence = {
      preferenceVector: [7, 1, 1, 9, 1, 3],
      branchRoleScores: { 'data-entry-mis': 24 },
      selectedAnswerCount: 1,
      requiredAnswerCount: 1,
      readiness: { numbers: 'high', dataAccuracy: 'high' },
      educationStream: 'healthcare',
      educationLevel: 'professional',
      objectiveEvidence: { accuracy: 100, spreadsheet: 100 },
    };

    const result = scoreEvidence(person, MATCHING_CATALOG);
    const dataEntry = result.rankedRoles.find((role) => role.roleId === 'data-entry-mis');

    expect(dataEntry).toBeDefined();
    expect(dataEntry?.eligibility).toBe('conditional');
    expect(result.rankedRoles.map((role) => role.roleId)).toContain('data-entry-mis');
    expect(result.rankedRoles.slice(0, 3).map((role) => role.roleId)).not.toContain('data-entry-mis');
  });

  it('does not credential-demote the directly selected finalist role', () => {
    const person: PersonEvidence = {
      preferenceVector: [7, 1, 1, 9, 1, 3],
      branchRoleScores: { 'data-entry-mis': 24 },
      selectedAnswerCount: 1,
      requiredAnswerCount: 1,
      readiness: { numbers: 'high', dataAccuracy: 'high' },
      educationStream: 'healthcare',
      educationLevel: 'professional',
      directRolePreference: 'data-entry-mis',
      objectiveEvidence: { accuracy: 100, spreadsheet: 100 },
    };

    const result = scoreEvidence(person, MATCHING_CATALOG);
    const dataEntry = result.rankedRoles.find((role) => role.roleId === 'data-entry-mis');

    expect(dataEntry?.eligibility).not.toBe('conditional');
    expect(result.rankedRoles[0].roleId).toBe('data-entry-mis');
  });

  it('demotes roles far above a secondary education level without removing them', () => {
    const person: PersonEvidence = {
      preferenceVector: [6, 1, 1, 9, 1, 5],
      branchRoleScores: { 'legal-compliance-operations': 24 },
      selectedAnswerCount: 1,
      requiredAnswerCount: 1,
      readiness: { numbers: 'high', dataAccuracy: 'high' },
      educationStream: 'open',
      educationLevel: 'secondary',
      objectiveEvidence: { accuracy: 100, writing: 100 },
    };

    const result = scoreEvidence(person, MATCHING_CATALOG);
    const legal = result.rankedRoles.find((role) => role.roleId === 'legal-compliance-operations');

    expect(legal).toBeDefined();
    expect(legal?.eligibility).toBe('conditional');
    expect(legal?.eligibilityReasons.join(' ')).toContain(
      'This role typically asks for more formal education'
    );
    expect(result.rankedRoles.map((role) => role.roleId)).toContain('legal-compliance-operations');
  });

  it('uses stream relevance as a mild score nudge and keeps it inert without a stream', () => {
    const person: PersonEvidence = {
      preferenceVector: [9, 1, 1, 7, 1, 5],
      branchRoleScores: {},
      selectedAnswerCount: 1,
      requiredAnswerCount: 1,
      readiness: { numbers: 'high', dataAccuracy: 'high' },
      educationLevel: 'undergraduate',
      objectiveEvidence: { accuracy: 80, spreadsheet: 80 },
    };

    const noStream = scoreEvidence(person, MATCHING_CATALOG);
    const commerce = scoreEvidence({ ...person, educationStream: 'commerce' }, MATCHING_CATALOG, {
      finalistWeight: 24,
      streamBoostFactor: 1.1,
      streamMismatchFactor: 0.9,
    });
    const science = scoreEvidence({ ...person, educationStream: 'science' }, MATCHING_CATALOG, {
      finalistWeight: 24,
      streamBoostFactor: 1.1,
      streamMismatchFactor: 0.9,
    });

    expect(noStream.rankedRoles).toEqual(scoreEvidence(person, MATCHING_CATALOG).rankedRoles);
    expect(commerce.rankedRoles.find((role) => role.roleId === 'accounting-finance-assistant')?.score)
      .toBeGreaterThan(
        science.rankedRoles.find((role) => role.roleId === 'accounting-finance-assistant')?.score || 0
      );
  });

  it('uses objective evidence without penalizing missing evidence', () => {
    const withoutCheck = scoreAssessment(analyst);
    const withCheck = scoreAssessment(analyst, {
      objectiveEvidence: { spreadsheet: 100, accuracy: 100 },
    });
    const before = withoutCheck.allScores['operations-analyst'];
    const after = withCheck.allScores['operations-analyst'];
    expect(after).toBeGreaterThanOrEqual(before);
    expect(withCheck.topRoles[0].demonstratedAbilityScore).toBe(100);
  });

  it('combines partial external work samples with scenario proof evidence', () => {
    const partial = scoreAssessment(analyst, {
      objectiveEvidence: { spreadsheet: 100 },
    });
    expect(partial.topRoles[0].demonstratedAbilityScore).toBeGreaterThanOrEqual(95);
    expect(partial.confidenceReasons).not.toContain(
      'Only part of the relevant objective evidence is available.'
    );
  });

  it('ignores out-of-range objective evidence', () => {
    const invalid = scoreAssessment(analyst, {
      objectiveEvidence: { spreadsheet: 101, accuracy: Number.NaN },
    });
    expect(invalid.topRoles[0].demonstratedAbilityScore).toBe(85);
    expect(invalid.confidenceReasons).not.toContain('No objective work sample is available yet.');
  });

  it('can call a complete scenario-proof path high confidence', () => {
    expect(scoreAssessment(finance, { educationStream: 'commerce' }).confidenceBand).toBe('high');
  });

  it('does not collapse every archetype at the ceiling', () => {
    const results = [customer, finance, analyst, dataEntry, creativeWriter].map((responses) =>
      scoreAssessment(responses).topRoles[0].score
    );
    expect(new Set(results).size).toBeGreaterThan(1);
    expect(results.filter((score) => score >= 99).length).toBeLessThan(results.length);
  });
});

describe('question and catalog coverage', () => {
  it('has four evidence questions and one finalist question for each reachable cluster', () => {
    for (const cluster of Object.keys(BRANCH_QUESTIONS) as ClusterId[]) {
      expect(BRANCH_QUESTIONS[cluster]).toHaveLength(5);
    }
  });

  it('scores all catalog roles for every complete assessment', () => {
    expect(Object.keys(scoreAssessment(customer).allScores)).toEqual(
      expect.arrayContaining(ROLE_ORDER)
    );
  });

  it('gives every core role a valid witness path and scores every expanded catalog role', () => {
    const routeByCluster: Record<ClusterId, Record<string, string>> = {
      'people-facing': routes.people,
      'desk-ops': routes.desk,
      analytical: routes.analytical,
      creative: routes.creative,
    };
    const tieByCluster: Record<ClusterId, string> = {
      'people-facing': 'rtb_a',
      'desk-ops': 'rtb_b',
      analytical: 'rtb_d',
      creative: 'rtb_c',
    };

    for (const policy of MATCHING_CATALOG.roles) {
      const cluster = policy.cluster as ClusterId;
      const questions = BRANCH_QUESTIONS[cluster];
      const routing =
        policy.id === 'sales-support'
          ? { r1: 'r1_a', r2: 'r2_c', r3: 'r3_c', r4: 'r4_a', r5: 'r5_d' }
          : routeByCluster[cluster];
      const responses = completePath(
        routing,
        questions.map((question) =>
          question.id === 'rf'
            ? `rf_${policy.id}`
            : question.options.find(
                (option) => option.roleScores?.[policy.id as RoleId]
              )?.id ||
              question.options[0].id
        ),
        tieByCluster[cluster]
      );
      const result = scoreAssessment(responses);
      const visible = result.topRoles.map((role) => role.roleId);
      expect(result.allScores[policy.id as RoleId]).toBeGreaterThanOrEqual(0);
      if (CORE_ASSESSMENT_ROLE_IDS.has(policy.id as RoleId)) {
        expect(visible).toContain(policy.id);
        expect(visible[0]).toBe(policy.id);
      }
      if (policy.lifecycleStatus === 'gated' && visible.includes(policy.id as RoleId)) {
        expect(result.topRoles.find((role) => role.roleId === policy.id)?.eligibility).toBe(
          'insufficient-evidence'
        );
      }
    }
  });

  it('scores a 250-assessment batch without error and returns well-formed results', () => {
    // Phase 1 shelves materialize the full 41-role ranking per assessment.
    // We smoke-test that repeated scoring stays correct and stable at volume;
    // wall-clock budgets are intentionally NOT asserted here — a timing gate
    // inside the parallel Jest run flakes under CPU contention. True latency
    // belongs in the benchmark, not a unit test.
    for (let index = 0; index < 250; index += 1) {
      const result = scoreAssessment(customer);
      expect(result.topRoles).toHaveLength(3);
      expect(result.topRoles[0].score).toBeGreaterThan(0);
    }
  });
});
