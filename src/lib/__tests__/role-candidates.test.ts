/** @jest-environment node */

import { describe, expect, it } from '@jest/globals';
import {
  ROLE_DEFINITIONS,
  ROLE_ORDER,
  isActiveRoleId,
} from '@/lib/product';
import {
  RETIRED_ROLE_IDS,
  ROLE_CANDIDATES,
  ROLE_CANDIDATE_COUNT,
} from '@/lib/role-candidates';

describe('governed role catalog expansion', () => {
  it('manages 30 new candidates alongside the active catalog', () => {
    expect(ROLE_CANDIDATES).toHaveLength(30);
    expect(ROLE_CANDIDATE_COUNT).toBe(30);
    expect(ROLE_ORDER).toHaveLength(11 + ROLE_CANDIDATE_COUNT);
  });

  it('activates every reviewed candidate while keeping retired roles out', () => {
    for (const role of ROLE_CANDIDATES) {
      expect(isActiveRoleId(role.id)).toBe(true);
      expect(ROLE_DEFINITIONS).toHaveProperty(role.id);
    }
    expect(RETIRED_ROLE_IDS).toEqual(
      expect.arrayContaining(['patient-care-coordinator', 'telemedicine-coordinator'])
    );
    expect(ROLE_ORDER).not.toContain('patient-care-coordinator');
    expect(ROLE_DEFINITIONS).not.toHaveProperty('patient-care-coordinator');
  });

  it('has unique canonical IDs and case-insensitive aliases', () => {
    const ids = ROLE_CANDIDATES.map((role) => role.id);
    expect(new Set(ids).size).toBe(ids.length);

    const aliases = ROLE_CANDIDATES.flatMap((role) => role.aliases).map((alias) =>
      alias.trim().toLocaleLowerCase('en-IN')
    );
    expect(new Set(aliases).size).toBe(aliases.length);
  });

  it('records a separating signal, requirement, objective check and title source', () => {
    for (const role of ROLE_CANDIDATES) {
      expect(role.requirements.length).toBeGreaterThan(0);
      expect(role.separatorSignals.length).toBeGreaterThan(0);
      expect(role.objectiveSignals.length).toBeGreaterThan(0);
      expect(role.titleEvidence.url).toMatch(/^https:\/\//);
      expect(role.titleEvidence.reviewedAt).toBe('2026-06-19');
      expect(role.name.en.length).toBeGreaterThan(2);
      expect(role.name.hi.length).toBeGreaterThan(2);
    }
  });

  it('does not invent demand and lists every unresolved validation warning', () => {
    for (const role of ROLE_CANDIDATES) {
      expect(role.marketPrior).toBeNull();
      expect(role.validationWarnings).toEqual(
        expect.arrayContaining([
          'licensed metro vacancy-volume evidence',
          'recruiter-reviewed eligibility rules',
          'three expert-authored cases',
          'reviewed bilingual result and explanation content',
        ])
      );
      if (role.status === 'gated') {
        expect(role.validationWarnings).toContain(
          'verified credential, portfolio, or practical-task gate'
        );
      }
    }
  });
});
