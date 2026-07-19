/** @jest-environment node */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from '@jest/globals';
import {
  BRANCH_QUESTIONS,
  ROLE_DEFINITIONS,
  ROLE_ORDER,
  ROUTING_QUESTIONS,
  TIE_BREAKER_QUESTION,
  getNextQuestions,
  scoreAssessment,
  type AssessmentOption,
  type ClusterId,
  type RoleId,
} from '@/lib/assessment-engine';
import { PERSONAS } from '../../../algo-validation/personas';
import { MATCHING_CATALOG } from '@/lib/matcher/catalog';

const allOptions = [
  ...ROUTING_QUESTIONS,
  TIE_BREAKER_QUESTION,
  ...Object.values(BRANCH_QUESTIONS).flat(),
].flatMap((question) => question.options);

function buildResponses(persona: (typeof PERSONAS)[number]) {
  const responses: Record<string, string> = { ...persona.routing };
  let questions = getNextQuestions(responses);
  if (questions.some((question) => question.id === 'rtb')) {
    responses.rtb = persona.tieBreaker || 'rtb_a';
    questions = getNextQuestions(responses);
  }
  for (const question of questions.filter((item) => item.id.startsWith('b') || item.id === 'rf')) {
    responses[question.id] =
      persona.branch[question.id] ||
      question.options.find((option) => option.roleScores?.[persona.expectedRole as RoleId])?.id ||
      question.options[0].id;
  }
  return responses;
}

function selectedOptions(responses: Record<string, string>) {
  return Object.values(responses)
    .map((optionId) => allOptions.find((option) => option.id === optionId))
    .filter((option): option is AssessmentOption => Boolean(option));
}

function rankSimpleAdditive(responses: Record<string, string>) {
  const totals = Object.fromEntries(ROLE_ORDER.map((roleId) => [roleId, 0])) as Record<RoleId, number>;
  for (const option of selectedOptions(responses)) {
    for (const [roleId, points] of Object.entries(option.roleScores || {})) {
      totals[roleId as RoleId] += points;
    }
  }
  return [...ROLE_ORDER].sort(
    (left, right) => totals[right] - totals[left] || ROLE_ORDER.indexOf(left) - ROLE_ORDER.indexOf(right)
  );
}

function cosine(left: number[], right: number[]) {
  const dot = left.reduce((sum, value, index) => sum + value * right[index], 0);
  const leftNorm = Math.sqrt(left.reduce((sum, value) => sum + value * value, 0));
  const rightNorm = Math.sqrt(right.reduce((sum, value) => sum + value * value, 0));
  return !leftNorm || !rightNorm ? 0 : dot / (leftNorm * rightNorm);
}

function rankGlobalContent(responses: Record<string, string>) {
  const vector = [0, 0, 0, 0, 0, 0];
  for (const option of selectedOptions(responses)) {
    option.vector.forEach((value, index) => {
      vector[index] += value;
    });
  }
  return [...ROLE_ORDER].sort((left, right) => {
    const difference = cosine(vector, ROLE_DEFINITIONS[right].vector) - cosine(vector, ROLE_DEFINITIONS[left].vector);
    return difference || ROLE_ORDER.indexOf(left) - ROLE_ORDER.indexOf(right);
  });
}

function metrics(rank: (responses: Record<string, string>, persona: (typeof PERSONAS)[number]) => RoleId[]) {
  let top1 = 0;
  let top3 = 0;
  const reachedTop1 = new Set<RoleId>();
  const reached = new Set<RoleId>();
  for (const persona of PERSONAS) {
    const ranked = rank(buildResponses(persona), persona);
    if (ranked[0] === persona.expectedRole) top1 += 1;
    if (ranked.slice(0, 3).includes(persona.expectedRole as RoleId)) top3 += 1;
    if (ranked[0]) reachedTop1.add(ranked[0]);
    ranked.slice(0, 3).forEach((roleId) => reached.add(roleId));
  }
  return {
    cases: PERSONAS.length,
    top1,
    top3,
    top1Rate: top1 / PERSONAS.length,
    top3Rate: top3 / PERSONAS.length,
    rolesInTop1: reachedTop1.size,
    rolesInTop3: reached.size,
  };
}

function catalogWitness(roleId: string, cluster: ClusterId) {
  const routeByCluster: Record<ClusterId, Record<string, string>> = {
    'people-facing': { r1: 'r1_a', r2: 'r2_a', r3: 'r3_c', r4: 'r4_a', r5: 'r5_a' },
    'desk-ops': { r1: 'r1_c', r2: 'r2_b', r3: 'r3_a', r4: 'r4_c', r5: 'r5_c' },
    analytical: { r1: 'r1_d', r2: 'r2_d', r3: 'r3_a', r4: 'r4_c', r5: 'r5_b' },
    creative: { r1: 'r1_d', r2: 'r2_c', r3: 'r3_c', r4: 'r4_d', r5: 'r5_d' },
  };
  const responses = {
    ...(roleId === 'sales-support'
      ? { r1: 'r1_a', r2: 'r2_c', r3: 'r3_c', r4: 'r4_a', r5: 'r5_d' }
      : routeByCluster[cluster]),
  };
  let questions = getNextQuestions(responses);
  if (questions.some((question) => question.id === 'rtb')) {
    responses.rtb =
      cluster === 'people-facing'
        ? 'rtb_a'
        : cluster === 'desk-ops'
          ? 'rtb_b'
          : cluster === 'creative'
            ? 'rtb_c'
            : 'rtb_d';
    questions = getNextQuestions(responses);
  }
  for (const question of questions.filter((item) => item.id.startsWith('b') || item.id === 'rf')) {
    responses[question.id] =
      question.id === 'rf'
        ? `rf_${roleId}`
        : question.options.find((option) => option.roleScores?.[roleId as RoleId])?.id ||
          question.options[0].id;
  }
  return responses;
}

describe('algorithm benchmark artifact', () => {
  it('compares frozen production and three simpler/current models', () => {
    const hybridMetrics = metrics((responses, persona) =>
      scoreAssessment(responses, persona.seed).topRoles.map((role) => role.roleId)
    );
    const hybridTopScores = PERSONAS.map((persona) =>
      scoreAssessment(buildResponses(persona), persona.seed).topRoles[0].score
    );
    const reachability = MATCHING_CATALOG.roles.map((policy) => {
      const result = scoreAssessment(catalogWitness(policy.id, policy.cluster as ClusterId));
      const visible = result.topRoles.map((role) => role.roleId);
      return {
        roleId: policy.id,
        lifecycleStatus: policy.lifecycleStatus,
        topOne: visible[0] === policy.id,
        topThree: visible.includes(policy.id as RoleId),
      };
    });

    const output = {
      generatedAt: new Date().toISOString(),
      scoringVersion: scoreAssessment(buildResponses(PERSONAS[0]), PERSONAS[0].seed).scoringVersion,
      warning: 'Synthetic personas test structure only; these rates are not predictive validity.',
      catalogReachability: {
        roles: reachability.length,
        rolesInTopOneOnWitnessPath: reachability.filter((item) => item.topOne).length,
        rolesInTopThreeOnWitnessPath: reachability.filter((item) => item.topThree).length,
        gatedRoles: reachability.filter((item) => item.lifecycleStatus === 'gated').length,
      },
      models: {
        frozenProductionV2: {
          cases: 20,
          top1: 17,
          top3: 17,
          top1Rate: 0.85,
          top3Rate: 0.85,
          rolesInTop1: 12,
          rolesInTop3: 12,
          topScoreAt99: 14,
          source: 'CURRENT_SYSTEM_AUDIT.md baseline run on 2026-06-18',
        },
        simpleNormalizedAdditive: metrics((responses) => rankSimpleAdditive(responses)),
        globallyWeightedContent: metrics((responses) => rankGlobalContent(responses)),
        evidenceHybridV6: {
          ...hybridMetrics,
          topScoreAt99: hybridTopScores.filter((score) => score === 99).length,
          meanTopScore: hybridTopScores.reduce((sum, score) => sum + score, 0) / hybridTopScores.length,
        },
      },
    };

    writeFileSync(
      join(process.cwd(), 'algo-validation', 'BENCHMARK_RESULTS.json'),
      `${JSON.stringify(output, null, 2)}\n`,
      'utf8'
    );

    expect(output.models.evidenceHybridV6.topScoreAt99).toBeLessThan(
      output.models.frozenProductionV2.topScoreAt99
    );
    expect(output.models.evidenceHybridV6.rolesInTop3).toBeGreaterThanOrEqual(10);
    expect(output.models.evidenceHybridV6.rolesInTop1).toBeGreaterThanOrEqual(10);
    expect(output.catalogReachability.rolesInTopThreeOnWitnessPath).toBeGreaterThanOrEqual(35);
    expect(output.catalogReachability.rolesInTopThreeOnWitnessPath).toBeLessThanOrEqual(ROLE_ORDER.length);
  });
});
