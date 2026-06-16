/** @jest-environment node */

import { describe, expect, it } from '@jest/globals';
import {
  ASSESSMENT_QUESTIONS,
  BRANCH_QUESTIONS,
  ROLE_DEFINITIONS,
  TIE_BREAKER_QUESTION,
  getLocaleValue,
  getNextQuestions,
  scoreAssessment,
} from '@/lib/assessment-engine';

// ─── Fixture response builders ────────────────────────────────────────────────

function peopleFacingPhase1(): Record<string, string> {
  return { r1: 'r1_a', r2: 'r2_a', r3: 'r3_a', r4: 'r4_a', r5: 'r5_a' };
}

function deskOpsFullResponse(): Record<string, string> {
  return {
    r1: 'r1_c', r2: 'r2_b', r3: 'r3_b', r4: 'r4_b', r5: 'r5_b',
    b1: 'do_b1_a', b2: 'do_b2_a', b3: 'do_b3_a', b4: 'do_b4_a',
  };
}

function peopleFacingFullResponse(): Record<string, string> {
  return {
    ...peopleFacingPhase1(),
    b1: 'pf_b1_a', b2: 'pf_b2_a', b3: 'pf_b3_a', b4: 'pf_b4_a',
  };
}

// ─── getNextQuestions ─────────────────────────────────────────────────────────

describe('getNextQuestions', () => {
  it('returns Phase 1 questions when no responses are given', () => {
    const questions = getNextQuestions({});
    expect(questions).toEqual(ASSESSMENT_QUESTIONS);
    expect(questions.length).toBeGreaterThan(0);
  });

  it('returns Phase 1 questions when Phase 1 is partially answered', () => {
    const questions = getNextQuestions({ r1: 'r1_a', r2: 'r2_a' });
    expect(questions).toEqual(ASSESSMENT_QUESTIONS);
  });

  it('returns Phase 2 branch questions once Phase 1 is complete', () => {
    // Phase 1 alone rarely clears the margin≥8 threshold, so the engine asks
    // the tie-breaker first. Supply it so we reach the branch questions.
    const questions = getNextQuestions({ ...peopleFacingPhase1(), rtb: 'rtb_a' });
    expect(questions).not.toEqual(ASSESSMENT_QUESTIONS);
    const nonRoutingIds = questions
      .filter((q) => !ASSESSMENT_QUESTIONS.some((rq) => rq.id === q.id))
      .filter((q) => q.id !== TIE_BREAKER_QUESTION.id);
    expect(nonRoutingIds.length).toBe(4);
  });

  it('every returned question id belongs to a known question set', () => {
    const evenResponses = { r1: 'r1_a', r2: 'r2_c', r3: 'r3_a', r4: 'r4_b', r5: 'r5_c' };
    const questions = getNextQuestions(evenResponses);
    const routingAndTieBreakerIds = [...ASSESSMENT_QUESTIONS.map((q) => q.id), TIE_BREAKER_QUESTION.id];
    questions.forEach((q) => {
      const isBranchQ = Object.values(BRANCH_QUESTIONS).flat().some((bq) => bq.id === q.id);
      expect(routingAndTieBreakerIds.includes(q.id) || isBranchQ).toBe(true);
    });
  });
});

// ─── scoreAssessment — output shape ──────────────────────────────────────────

describe('scoreAssessment', () => {
  describe('output shape', () => {
    it('returns all required fields', () => {
      const result = scoreAssessment(peopleFacingFullResponse(), {}, 'en');
      expect(result).toHaveProperty('profile');
      expect(result).toHaveProperty('cluster');
      expect(result).toHaveProperty('confidenceScore');
      expect(result).toHaveProperty('topRoles');
      expect(result).toHaveProperty('allScores');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('dimensionSnapshot');
    });

    it('topRoles contains between 1 and 3 entries', () => {
      const result = scoreAssessment(peopleFacingFullResponse(), {}, 'en');
      expect(result.topRoles.length).toBeGreaterThanOrEqual(1);
      expect(result.topRoles.length).toBeLessThanOrEqual(3);
    });

    it('all scores are clamped 0–99', () => {
      const result = scoreAssessment(peopleFacingFullResponse(), {}, 'en');
      Object.values(result.allScores).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(99);
      });
    });

    it('allScores contains exactly 12 roles', () => {
      const result = scoreAssessment(peopleFacingFullResponse(), {}, 'en');
      expect(Object.keys(result.allScores).length).toBe(12);
    });

    it('dimensionSnapshot has all 6 dimensions', () => {
      const result = scoreAssessment(peopleFacingFullResponse(), {}, 'en');
      const dims = ['numerical', 'people-reactive', 'people-proactive', 'process-ops', 'creative-output', 'analytical-output'];
      dims.forEach((dim) => {
        expect(result.dimensionSnapshot).toHaveProperty(dim);
      });
    });

    it('topRoles are sorted descending by score', () => {
      const result = scoreAssessment(peopleFacingFullResponse(), {}, 'en');
      for (let i = 1; i < result.topRoles.length; i++) {
        expect(result.topRoles[i - 1].score).toBeGreaterThanOrEqual(result.topRoles[i].score);
      }
    });
  });

  describe('cluster routing', () => {
    it('routes to people-facing given people-facing signals', () => {
      const result = scoreAssessment(peopleFacingFullResponse(), {}, 'en');
      expect(result.cluster).toBe('people-facing');
    });

    it('routes to desk-ops given desk-ops signals', () => {
      const result = scoreAssessment(deskOpsFullResponse(), {}, 'en');
      expect(result.cluster).toBe('desk-ops');
    });

    it('cluster is always a valid ClusterId', () => {
      const valid = ['people-facing', 'desk-ops', 'analytical', 'creative'];
      const result = scoreAssessment(peopleFacingFullResponse(), {}, 'en');
      expect(valid).toContain(result.cluster);
    });
  });

  describe('bilingual output', () => {
    it('summary.en is a non-empty string', () => {
      const result = scoreAssessment(peopleFacingFullResponse(), {}, 'en');
      expect(typeof result.summary.en).toBe('string');
      expect(result.summary.en.length).toBeGreaterThan(0);
    });

    it('summary.hi is a non-empty string', () => {
      const result = scoreAssessment(peopleFacingFullResponse(), {}, 'hi');
      expect(typeof result.summary.hi).toBe('string');
      expect(result.summary.hi.length).toBeGreaterThan(0);
    });

    it('topRoles have localized names in EN and HI', () => {
      const result = scoreAssessment(peopleFacingFullResponse(), {}, 'en');
      result.topRoles.forEach((match) => {
        expect(match.role.name.en.length).toBeGreaterThan(0);
        expect(match.role.name.hi.length).toBeGreaterThan(0);
      });
    });

    it('rationale is localized in both languages', () => {
      const result = scoreAssessment(peopleFacingFullResponse(), {}, 'en');
      result.topRoles.forEach((match) => {
        expect(typeof match.rationale.en).toBe('string');
        expect(typeof match.rationale.hi).toBe('string');
      });
    });
  });

  describe('profile patching', () => {
    it('merges profileSeed into returned profile', () => {
      const seed = { fullName: 'Priya Singh', city: 'Mumbai' };
      const result = scoreAssessment(peopleFacingFullResponse(), seed, 'en');
      expect(result.profile.fullName).toBe('Priya Singh');
      expect(result.profile.city).toBe('Mumbai');
    });

    it('preserves locale from arguments', () => {
      const result = scoreAssessment(peopleFacingFullResponse(), { locale: 'hi' }, 'hi');
      expect(result.profile.locale).toBe('hi');
    });
  });

  describe('empty / missing responses', () => {
    it('does not throw when responses is empty', () => {
      expect(() => scoreAssessment({}, {}, 'en')).not.toThrow();
    });

    it('returns a valid result shape even with empty responses', () => {
      const result = scoreAssessment({}, {}, 'en');
      expect(result).toHaveProperty('topRoles');
      expect(result).toHaveProperty('cluster');
      expect(Array.isArray(result.topRoles)).toBe(true);
    });
  });

  describe('ROLE_DEFINITIONS integrity', () => {
    it('every role has a 6-element vector', () => {
      Object.values(ROLE_DEFINITIONS).forEach((role) => {
        expect(role.vector).toHaveLength(6);
      });
    });

    it('every role has a 6-element dimensionWeights', () => {
      Object.values(ROLE_DEFINITIONS).forEach((role) => {
        expect(role.dimensionWeights).toHaveLength(6);
      });
    });

    it('all vector values are in [0, 9]', () => {
      // Vectors use a 0–9 intensity scale, not 0–1 normalised.
      Object.values(ROLE_DEFINITIONS).forEach((role) => {
        role.vector.forEach((v) => {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(9);
        });
      });
    });

    it('every role has non-empty EN and HI name, summary, salaryRange', () => {
      Object.values(ROLE_DEFINITIONS).forEach((role) => {
        expect(role.name.en.length).toBeGreaterThan(0);
        expect(role.name.hi.length).toBeGreaterThan(0);
        expect(role.summary.en.length).toBeGreaterThan(0);
        expect(role.summary.hi.length).toBeGreaterThan(0);
        expect(role.salaryRange.en.length).toBeGreaterThan(0);
        expect(role.salaryRange.hi.length).toBeGreaterThan(0);
      });
    });
  });
});

// ─── getLocaleValue ───────────────────────────────────────────────────────────

describe('getLocaleValue', () => {
  const text = { en: 'Hello', hi: 'नमस्ते' };

  it('returns English for en locale', () => {
    expect(getLocaleValue(text, 'en')).toBe('Hello');
  });

  it('returns Hindi for hi locale', () => {
    expect(getLocaleValue(text, 'hi')).toBe('नमस्ते');
  });
});

// ─── Cluster-forcing response sets (all 4 clusters) ───────────────────────────
//
// Scores confirmed via tsx probe (see tech-debt work log):
//   people-facing : r1_a(pf:3) r2_a(pf:3) r3_d(pf:2) r4_a(pf:3) r5_d(pf:3) → pf=14
//   desk-ops      : r1_c(desk:3) r2_d(desk:3) r3_b(desk:1) r4_b(desk:1+pf:1) r5_c(desk:3) → desk=11
//   analytical    : r1_d(ana:3) r2_b(desk:2+ana:1) r3_c(ana:2) r4_c(ana:2) r5_b(ana:3) → ana=11
//   creative      : no 5-answer clean win; needs tie-breaker via rtb_c

function peopleFacingClusterResponses(): Record<string, string> {
  return { r1: 'r1_a', r2: 'r2_a', r3: 'r3_d', r4: 'r4_a', r5: 'r5_d' };
}

function deskOpsClusterResponses(): Record<string, string> {
  return { r1: 'r1_c', r2: 'r2_d', r3: 'r3_b', r4: 'r4_b', r5: 'r5_c' };
}

function analyticalClusterResponses(): Record<string, string> {
  return { r1: 'r1_d', r2: 'r2_b', r3: 'r3_c', r4: 'r4_c', r5: 'r5_b' };
}

function creativeClusterResponses(): Record<string, string> {
  // Last options on all routing Qs trigger the tie-breaker; rtb_c forces creative
  return { r1: 'r1_d', r2: 'r2_d', r3: 'r3_d', r4: 'r4_d', r5: 'r5_d', rtb: 'rtb_c' };
}

describe('All 4 clusters are reachable via routing + tie-breaker', () => {
  it('routes to people-facing cluster', () => {
    const phase1 = peopleFacingClusterResponses();
    const questions = getNextQuestions(phase1);
    // Should now offer branch questions (Phase 2)
    const routingIds = new Set(ASSESSMENT_QUESTIONS.map((q) => q.id));
    const branchQs = questions.filter((q) => !routingIds.has(q.id) && q.id !== TIE_BREAKER_QUESTION.id);
    expect(branchQs.length).toBeGreaterThan(0);

    const branchAnswers: Record<string, string> = {};
    branchQs.forEach((q) => {
      branchAnswers[q.id] = q.options[0].id;
    });
    const result = scoreAssessment(phase1, branchAnswers, 'en');
    expect(result.cluster).toBe('people-facing');
  });

  it('routes to desk-ops cluster', () => {
    const phase1 = deskOpsClusterResponses();
    const questions = getNextQuestions(phase1);
    const routingIds = new Set(ASSESSMENT_QUESTIONS.map((q) => q.id));
    const branchQs = questions.filter((q) => !routingIds.has(q.id) && q.id !== TIE_BREAKER_QUESTION.id);
    expect(branchQs.length).toBeGreaterThan(0);

    const branchAnswers: Record<string, string> = {};
    branchQs.forEach((q) => {
      branchAnswers[q.id] = q.options[0].id;
    });
    const result = scoreAssessment(phase1, branchAnswers, 'en');
    expect(result.cluster).toBe('desk-ops');
  });

  it('routes to analytical cluster', () => {
    const phase1 = analyticalClusterResponses();
    const questions = getNextQuestions(phase1);
    const routingIds = new Set(ASSESSMENT_QUESTIONS.map((q) => q.id));
    const branchQs = questions.filter((q) => !routingIds.has(q.id) && q.id !== TIE_BREAKER_QUESTION.id);
    expect(branchQs.length).toBeGreaterThan(0);

    const branchAnswers: Record<string, string> = {};
    branchQs.forEach((q) => {
      branchAnswers[q.id] = q.options[0].id;
    });
    const result = scoreAssessment(phase1, branchAnswers, 'en');
    expect(result.cluster).toBe('analytical');
  });

  it('routes to creative cluster via tie-breaker (rtb_c)', () => {
    const allResponses = creativeClusterResponses();
    // Phase 1 + tie-breaker answers together
    const phase1WithTB = { ...allResponses };
    const questions = getNextQuestions(phase1WithTB);
    const routingIds = new Set(ASSESSMENT_QUESTIONS.map((q) => q.id));
    const branchQs = questions.filter((q) => !routingIds.has(q.id) && q.id !== TIE_BREAKER_QUESTION.id);

    const branchAnswers: Record<string, string> = {};
    branchQs.forEach((q) => {
      branchAnswers[q.id] = q.options[0].id;
    });
    const result = scoreAssessment(phase1WithTB, branchAnswers, 'en');
    expect(result.cluster).toBe('creative');
  });
});

// ─── Tie-breaker trigger ──────────────────────────────────────────────────────
describe('Tie-breaker question', () => {
  it('is included in getNextQuestions when top-2 cluster margin is < 5', () => {
    // The last-option set creates a narrow spread requiring the tie-breaker
    const tiedPhase1 = { r1: 'r1_d', r2: 'r2_d', r3: 'r3_d', r4: 'r4_d', r5: 'r5_d' };
    const questions = getNextQuestions(tiedPhase1);
    const hasTB = questions.some((q) => q.id === TIE_BREAKER_QUESTION.id);
    expect(hasTB).toBe(true);
  });

  it('is NOT included when a cluster wins by a clear margin', () => {
    // People-facing dominates with pf=14; no tie-breaker needed
    const clearWin = peopleFacingClusterResponses();
    const questions = getNextQuestions(clearWin);
    const hasTB = questions.some((q) => q.id === TIE_BREAKER_QUESTION.id);
    expect(hasTB).toBe(false);
  });
});

// ─── Hindi locale assertions on scored results ────────────────────────────────
describe('scoreAssessment – Hindi locale', () => {
  it('returns hi-locale strings in topRoles names', () => {
    const phase1 = peopleFacingClusterResponses();
    const questions = getNextQuestions(phase1);
    const routingIds = new Set(ASSESSMENT_QUESTIONS.map((q) => q.id));
    const branchQs = questions.filter((q) => !routingIds.has(q.id) && q.id !== TIE_BREAKER_QUESTION.id);

    const branchAnswers: Record<string, string> = {};
    branchQs.forEach((q) => {
      branchAnswers[q.id] = q.options[0].id;
    });

    const result = scoreAssessment(phase1, branchAnswers, 'hi');
    expect(result.topRoles.length).toBeGreaterThan(0);
    // Each topRole carries a role definition with localized name and rationale
    result.topRoles.forEach((match) => {
      expect(typeof match.role.name.hi).toBe('string');
      expect(match.role.name.hi.length).toBeGreaterThan(0);
      // rationale also has hi locale
      expect(typeof match.rationale.hi).toBe('string');
      expect(match.rationale.hi.length).toBeGreaterThan(0);
    });
  });
});
