import { describe, expect, it } from '@jest/globals';
import { scoreAssessment } from '@/lib/assessment-engine';

// Regression tests locking in the four scoring fixes (see algo-validation/).
// If any of these fail, one of the fixes has been reverted.

// Analytical persona who picks ACCOUNTING on every branch question.
const accountingResponses = {
  r1: 'r1_d', r2: 'r2_d', r3: 'r3_a', r4: 'r4_c', r5: 'r5_b',
  b1: 'an_b1_b', b2: 'an_b2_b', b3: 'an_b3_b', b4: 'an_b4_b', rf: 'rf_accounting-finance-assistant',
};

// Wants finance but is weak at numbers (r3_d -> numbersConfidence low) — disqualifier case.
const numbersWeakResponses = {
  r1: 'r1_d', r2: 'r2_d', r3: 'r3_d', r4: 'r4_c', r5: 'r5_b',
  b1: 'an_b1_b', b2: 'an_b2_b', b3: 'an_b3_b', b4: 'an_b4_b', rf: 'rf_accounting-finance-assistant',
};

// Clear writer who also thinks analytically; picks the creative tie-breaker.
const creativeResponses = {
  r1: 'r1_d', r2: 'r2_c', r3: 'r3_c', r4: 'r4_d', r5: 'r5_d',
  rtb: 'rtb_c',
  b1: 'cr_b1_a', b2: 'cr_b2_a', b3: 'cr_b3_a', b4: 'cr_b4_a', rf: 'rf_content-writer',
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

describe('Issue 2 — contradictory roles are not surfaced', () => {
  it('does not surface finance after explicit low number comfort', () => {
    const r = scoreAssessment(numbersWeakResponses, { educationStream: 'commerce' }, 'en');
    expect(r.topRoles.map((role) => role.roleId)).not.toContain('accounting-finance-assistant');
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
