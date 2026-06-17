import { describe, expect, it } from '@jest/globals';
import { scoreAssessment } from '@/lib/assessment-engine';

// Regression tests locking in the four scoring fixes (see algo-validation/).
// If any of these fail, one of the fixes has been reverted.

// Analytical persona who picks ACCOUNTING on every branch question.
const accountingResponses = {
  r1: 'r1_d', r2: 'r2_b', r3: 'r3_a', r4: 'r4_c', r5: 'r5_b',
  b1: 'an_b1_b', b2: 'an_b2_b', b3: 'an_b3_b', b4: 'an_b4_b',
};

// Wants finance but is weak at numbers (r3_d -> numbersConfidence low) — disqualifier case.
const numbersWeakResponses = {
  r1: 'r1_d', r2: 'r2_b', r3: 'r3_d', r4: 'r4_c', r5: 'r5_b',
  b1: 'an_b1_b', b2: 'an_b2_b', b3: 'an_b3_b', b4: 'an_b4_b',
};

// Clear writer who also thinks analytically; picks the creative tie-breaker.
const creativeResponses = {
  r1: 'r1_d', r2: 'r2_c', r3: 'r3_c', r4: 'r4_c', r5: 'r5_a',
  rtb: 'rtb_c',
  b1: 'cr_b1_a', b2: 'cr_b2_a', b3: 'cr_b3_a', b4: 'cr_b4_a',
};

describe('Issue 1 — branch roleScores drive within-cluster ranking', () => {
  it('ranks the role the user actually chose in the branches as #1', () => {
    const r = scoreAssessment(accountingResponses, { educationStream: 'commerce' }, 'en');
    expect(r.topRoles[0].roleId).toBe('accounting-finance-assistant');
  });

  it('produces a real score spread (no 99/99/99 collapse)', () => {
    const r = scoreAssessment(accountingResponses, { educationStream: 'commerce' }, 'en');
    const spread = r.topRoles[0].score - r.topRoles[r.topRoles.length - 1].score;
    expect(spread).toBeGreaterThan(5);
  });
});

describe('Issue 2 — ranking is score-first (no disqualified role shown above a higher one)', () => {
  it('topRoles[0] always has the maximum score across all roles', () => {
    const r = scoreAssessment(numbersWeakResponses, { educationStream: 'commerce' }, 'en');
    const maxScore = Math.max(...Object.values(r.allScores));
    expect(r.topRoles[0].score).toBe(maxScore);
  });

  it('top roles are sorted strictly descending by score', () => {
    const r = scoreAssessment(numbersWeakResponses, { educationStream: 'commerce' }, 'en');
    for (let i = 1; i < r.topRoles.length; i++) {
      expect(r.topRoles[i - 1].score).toBeGreaterThanOrEqual(r.topRoles[i].score);
    }
  });
});

describe('Issues 3 & 4 — creative is reachable and the tie-breaker is honored', () => {
  it('routes an analytical-leaning writer to creative when they pick the creative tie-breaker', () => {
    const r = scoreAssessment(creativeResponses, { educationStream: 'arts-humanities' }, 'en');
    expect(r.cluster).toBe('creative');
    expect(r.topRoles[0].roleId).toBe('content-writer');
  });
});
