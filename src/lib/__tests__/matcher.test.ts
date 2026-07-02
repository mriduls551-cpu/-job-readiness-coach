/** @jest-environment node */

import { describe, expect, it } from '@jest/globals';
import {
  ASSESSMENT_SCORING_VARIANTS,
  DEFAULT_ASSESSMENT_SCORING_CONFIG,
} from '@/lib/assessment-experiments';
import {
  AssessmentValidationError,
  BRANCH_QUESTIONS,
  CORE_ROLE_ORDER,
  ROLE_ORDER,
  getNextQuestions,
  scoreAssessment,
  validateAssessmentResponses,
  type ClusterId,
  type RoleId,
} from '@/lib/assessment-engine';
import { MATCHING_CATALOG } from '@/lib/matcher/catalog';

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
  const scoredBranchQuestions = branch.filter((question) => question.id !== 'rf');
  for (const optionId of optionIds.slice(0, scoredBranchQuestions.length)) {
    const option = branch.flatMap((question) => question.options).find((item) => item.id === optionId);
    for (const [roleId, points] of Object.entries(option?.roleScores || {})) {
      roleTotals.set(roleId, (roleTotals.get(roleId) || 0) + points);
    }
  }
  const inferredRole = [...roleTotals].sort((left, right) => right[1] - left[1])[0]?.[0];
  branch.forEach((question, index) => {
    const requested =
      optionIds[index] ||
      (question.id === 'rf' && inferredRole ? `rf_${inferredRole}` : question.options[0]?.id);
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
const creativeLowWriting = completePath(
  routes.creative,
  ['cr_b1_a', 'cr_b2_a', 'cr_b3_a', 'cr_b4_c'],
  'rtb_c'
);
const customerSupportMixedEvidence = completePath(
  routes.people,
  ['pf_b1_b', 'pf_b2_b', 'pf_b3_d', 'pf_b4_c']
);

const CORE_ASSESSMENT_ROLE_IDS = new Set<RoleId>(CORE_ROLE_ORDER);
const ROUTE_BY_CLUSTER: Record<ClusterId, Record<string, string>> = {
  'people-facing': routes.people,
  'desk-ops': routes.desk,
  analytical: routes.analytical,
  creative: routes.creative,
};
const TIE_BY_CLUSTER: Record<ClusterId, string> = {
  'people-facing': 'rtb_a',
  'desk-ops': 'rtb_b',
  analytical: 'rtb_d',
  creative: 'rtb_c',
};

function witnessPath(roleId: RoleId) {
  const policy = MATCHING_CATALOG.roles.find((role) => role.id === roleId);
  if (!policy) throw new Error(`Unknown policy ${roleId}`);

  const cluster = policy.cluster as ClusterId;
  const questions = BRANCH_QUESTIONS[cluster];
  const routing =
    roleId === 'sales-support'
      ? { r1: 'r1_a', r2: 'r2_c', r3: 'r3_c', r4: 'r4_a', r5: 'r5_d' }
      : ROUTE_BY_CLUSTER[cluster];

  return completePath(
    routing,
    questions.map((question) =>
      question.id === 'rf'
        ? `rf_${roleId}`
        : question.options.find((option) => option.roleScores?.[roleId])?.id ||
          question.options[0].id
    ),
    TIE_BY_CLUSTER[cluster]
  );
}

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

  it('keeps the content-writer path ready when writing confidence is high', () => {
    const result = scoreAssessment(creativeWriter, { educationStream: 'arts-humanities' });
    expect(result.topRoles[0].roleId).toBe('content-writer');
    expect(result.topRoles[0].eligibility).toBe('ready');
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

  it('uses a neutral adjustment when education stream is missing', () => {
    const withoutStream = scoreAssessment(finance);
    const withMismatchedStream = scoreAssessment(finance, { educationStream: 'arts-humanities' });

    expect(withoutStream.allScores['accounting-finance-assistant']).toBeGreaterThan(
      withMismatchedStream.allScores['accounting-finance-assistant']
    );
  });

  it('uses softened copy for a mismatched education stream without penalizing a missing stream', () => {
    const withoutStream = scoreAssessment(finance);
    const withMismatchedStream = scoreAssessment(finance, { educationStream: 'arts-humanities' });
    const financeMatchWithoutStream = withoutStream.topRoles.find(
      (role) => role.roleId === 'accounting-finance-assistant'
    );
    const financeMatchWithMismatch = withMismatchedStream.topRoles.find(
      (role) => role.roleId === 'accounting-finance-assistant'
    );

    expect(financeMatchWithoutStream?.eligibility).toBe('ready');
    expect(financeMatchWithMismatch?.eligibility).toBe('insufficient-evidence');
    expect(financeMatchWithMismatch?.eligibilityReasons).toContain(
      'Your education stream is not the usual background for this role; relevant experience or training may still qualify.'
    );
  });

  it('boosts commerce and science on the finance and operations analytical paths', () => {
    const financeWithoutStream = scoreAssessment(finance);
    const financeWithCommerce = scoreAssessment(finance, { educationStream: 'commerce' });
    const financeWithScience = scoreAssessment(finance, { educationStream: 'science' });

    expect(financeWithCommerce.allScores['accounting-finance-assistant']).toBeGreaterThan(
      financeWithoutStream.allScores['accounting-finance-assistant']
    );
    expect(financeWithScience.allScores['accounting-finance-assistant']).toBeGreaterThan(
      financeWithoutStream.allScores['accounting-finance-assistant']
    );

    const analystWithoutStream = scoreAssessment(analyst);
    const analystWithCommerce = scoreAssessment(analyst, { educationStream: 'commerce' });
    const analystWithScience = scoreAssessment(analyst, { educationStream: 'science' });

    expect(analystWithCommerce.allScores['operations-analyst']).toBeGreaterThan(
      analystWithoutStream.allScores['operations-analyst']
    );
    expect(analystWithScience.allScores['operations-analyst']).toBeGreaterThan(
      analystWithoutStream.allScores['operations-analyst']
    );
  });

  it('boosts law specifically for legal-compliance witness paths', () => {
    const legalWitness = witnessPath('legal-compliance-operations');
    const withoutStream = scoreAssessment(legalWitness);
    const withCommerce = scoreAssessment(legalWitness, { educationStream: 'commerce' });
    const withLaw = scoreAssessment(legalWitness, { educationStream: 'law' });

    expect(withLaw.topRoles[0].roleId).toBe('legal-compliance-operations');
    expect(withLaw.allScores['legal-compliance-operations']).toBeGreaterThan(
      withoutStream.allScores['legal-compliance-operations']
    );
    expect(withLaw.allScores['legal-compliance-operations']).toBeGreaterThan(
      withCommerce.allScores['legal-compliance-operations']
    );
  });

  it('does not surface content-writer when the creative branch ends in low writing confidence', () => {
    const result = scoreAssessment(creativeLowWriting, { educationStream: 'arts-humanities' });

    expect(result.cluster).toBe('creative');
    expect(result.topRoles.map((role) => role.roleId)).not.toContain('content-writer');
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

  it('supports a lighter finalist experiment on mixed people-facing evidence', () => {
    const control = scoreAssessment(
      customerSupportMixedEvidence,
      {},
      'en',
      DEFAULT_ASSESSMENT_SCORING_CONFIG
    );
    const lighterFinalist = scoreAssessment(
      customerSupportMixedEvidence,
      {},
      'en',
      ASSESSMENT_SCORING_VARIANTS.lighter_finalist_v1
    );

    // The mixed discriminators infer `academic-counsellor` as the finalist
    // (rf_academic-counsellor), so that is the role whose finalist weight the
    // experiment scales down. `customer-support` receives no finalist points
    // and is unchanged across variants.
    expect(control.allScores['academic-counsellor']).toBeGreaterThan(0);
    expect(lighterFinalist.allScores['academic-counsellor']).toBeLessThan(
      control.allScores['academic-counsellor']
    );
  });

  it('reduces the analytical stream boost under the lighter finalist experiment', () => {
    const control = scoreAssessment(
      finance,
      { educationStream: 'commerce' },
      'en',
      DEFAULT_ASSESSMENT_SCORING_CONFIG
    );
    const lighterFinalist = scoreAssessment(
      finance,
      { educationStream: 'commerce' },
      'en',
      ASSESSMENT_SCORING_VARIANTS.lighter_finalist_v1
    );

    expect(lighterFinalist.allScores['accounting-finance-assistant']).toBeLessThan(
      control.allScores['accounting-finance-assistant']
    );
  });
});

describe('question and catalog coverage', () => {
  it('has five evidence questions and one finalist question for each reachable cluster', () => {
    for (const cluster of Object.keys(BRANCH_QUESTIONS) as ClusterId[]) {
      expect(BRANCH_QUESTIONS[cluster]).toHaveLength(6);
      const candidateQuestion = BRANCH_QUESTIONS[cluster].find((question) => question.id === 'b5');
      expect(candidateQuestion).toBeTruthy();
      expect(
        candidateQuestion?.options.some((option) =>
          Object.keys(option.roleScores || {}).some((roleId) => !CORE_ASSESSMENT_ROLE_IDS.has(roleId as RoleId))
        )
      ).toBe(true);
    }
  });

  it('scores all catalog roles for every complete assessment', () => {
    expect(Object.keys(scoreAssessment(customer).allScores)).toEqual(
      expect.arrayContaining(ROLE_ORDER)
    );
  });

  it('gives every core role a valid witness path and scores every expanded catalog role', () => {
    for (const policy of MATCHING_CATALOG.roles) {
      const responses = witnessPath(policy.id as RoleId);
      const result = scoreAssessment(responses);
      const visible = result.topRoles.map((role) => role.roleId);
      const adjacent = result.adjacentRoles?.map((role) => role.roleId) || [];
      expect(result.allScores[policy.id as RoleId]).toBeGreaterThanOrEqual(0);
      if (CORE_ASSESSMENT_ROLE_IDS.has(policy.id as RoleId)) {
        expect(visible).toContain(policy.id);
        expect(visible[0]).toBe(policy.id);
      } else {
        expect(adjacent).toContain(policy.id);
      }
      if (policy.lifecycleStatus === 'gated' && visible.includes(policy.id as RoleId)) {
        expect(result.topRoles.find((role) => role.roleId === policy.id)?.eligibility).toBe(
          'insufficient-evidence'
        );
      }
      if (policy.lifecycleStatus === 'gated' && adjacent.includes(policy.id as RoleId)) {
        expect(
          result.adjacentRoles?.find((role) => role.roleId === policy.id)?.eligibility
        ).not.toBe('ready');
      }
    }
  });

  it('scores 250 assessments within a 20ms-per-assessment server budget', () => {
    for (let index = 0; index < 10; index += 1) scoreAssessment(customer);
    const started = Date.now();
    for (let index = 0; index < 250; index += 1) scoreAssessment(customer);
    expect(Date.now() - started).toBeLessThan(5000);
  });
});
