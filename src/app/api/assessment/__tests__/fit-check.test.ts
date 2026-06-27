/** @jest-environment node */

import { beforeAll, describe, expect, it } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, PATCH, POST } from '../fit-check/route';
import { POST as register } from '@/app/api/auth/register/route';
import { POST as login } from '@/app/api/auth/login/route';
import { getDB } from '@/lib/db';

let authCookie = '';
let authenticatedUserId = '';
let ipSequence = 0;

function request(body: unknown) {
  return new NextRequest('http://localhost/api/assessment/fit-check', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: authCookie,
      'x-forwarded-for': `10.40.0.${++ipSequence}`,
    },
    body: JSON.stringify(body),
  });
}

const completePeoplePath = {
  r1: 'r1_a',
  r2: 'r2_a',
  r3: 'r3_d',
  r4: 'r4_a',
  r5: 'r5_d',
  b1: 'pf_b1_a',
  b2: 'pf_b2_a',
  b3: 'pf_b3_a',
  b4: 'pf_b4_a',
  rf: 'rf_customer-support',
};

beforeAll(async () => {
  process.env.ENABLE_LOCAL_AUTH = 'true';
  process.env.ALLOW_IN_MEMORY_DB = 'true';
  process.env.NEXTAUTH_SECRET = 'assessment-test-secret-32-characters';

  const email = `assessment-api-${Date.now()}@test.example`;
  const password = 'AssessmentPass1!';
  const registerResponse = await register(
    new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.41.0.1' },
      body: JSON.stringify({ email, password, name: 'Assessment API Test' }),
    })
  );
  const registered = await registerResponse.json();
  authenticatedUserId = registered.data.user.id;
  const loginResponse = await login(
    new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.41.0.2' },
      body: JSON.stringify({ email, password }),
    })
  );
  const token = loginResponse.headers.get('set-cookie')?.match(/auth-token=([^;]+)/)?.[1];
  if (!token) throw new Error('Could not establish authenticated assessment test session');
  authCookie = `auth-token=${token}`;
});

describe('POST /api/assessment/fit-check validation', () => {
  it.each([
    ['empty', {}],
    ['incomplete', { r1: 'r1_a' }],
    ['unknown question', { ...completePeoplePath, unknown: 'x' }],
    ['invalid option', { ...completePeoplePath, r2: 'not-an-option' }],
    ['stale branch option', { ...completePeoplePath, b1: 'do_b1_a' }],
  ])('rejects %s responses with HTTP 400', async (_label, responses) => {
    const response = await POST(request({ responses, profile: {} }));
    expect(response.status).toBe(400);
  });

  it('rejects client-supplied objective evidence', async () => {
    const response = await POST(
      request({
        responses: completePeoplePath,
        profile: { objectiveEvidence: { communication: 100 } },
      })
    );
    expect(response.status).toBe(400);
  });

  it('rejects unknown education stream values', async () => {
    const response = await POST(
      request({
        responses: completePeoplePath,
        profile: { educationStream: 'astrology' },
      })
    );
    expect(response.status).toBe(400);
  });

  it('rejects retired role selection', async () => {
    for (const roleId of ['patient-care-coordinator', 'telemedicine-coordinator']) {
      const response = await PATCH(request({ roleId }));
      expect(response.status).toBe(400);
    }
  });
});

describe('assessment persistence', () => {
  it('stores canonical responses and a versioned result snapshot', async () => {
    const db = getDB();
    const saved = await db.saveAssessment(
      'assessment-persistence-test-user',
      completePeoplePath,
      { locale: 'en', educationStream: 'arts-humanities' }
    );
    expect(saved.assessment.responses).toEqual(completePeoplePath);
    expect(saved.assessment.resultSnapshot).toEqual(saved.result);
    expect(saved.assessment.scoringVersion).toBe(saved.result.scoringVersion);
    expect(saved.assessment.catalogVersion).toBe(saved.result.catalogVersion);
  });

  it('requires a retake for an incomplete legacy row instead of rescoring it', async () => {
    const db = getDB();
    const inMemory = db as unknown as { assessments: Map<string, unknown> };
    const id = 'legacy-incomplete-assessment';
    inMemory.assessments.set(id, {
      id,
      userId: authenticatedUserId,
      responses: { r1: 'r1_a' },
      profile: { locale: 'en' },
      roleScores: {},
      status: 'completed',
      createdAt: '9999-01-01T00:00:00.000Z',
      updatedAt: '9999-01-01T00:00:00.000Z',
    });

    const response = await GET(
      new NextRequest('http://localhost/api/assessment/fit-check', {
        headers: { cookie: authCookie },
      })
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.result).toBeNull();
    expect(body.data.retakeRequired).toBe(true);
    inMemory.assessments.delete(id);
  });

  it('requires a retake when a snapshot contains a retired role', async () => {
    const db = getDB();
    const saved = await db.saveAssessment(
      authenticatedUserId,
      completePeoplePath,
      { locale: 'en' }
    );
    const retiredSnapshot = structuredClone(saved.result) as unknown as {
      topRoles: Array<{ roleId: string }>;
    };
    retiredSnapshot.topRoles[0].roleId = 'patient-care-coordinator';

    const inMemory = db as unknown as { assessments: Map<string, unknown> };
    const id = 'legacy-retired-role-assessment';
    inMemory.assessments.set(id, {
      ...saved.assessment,
      id,
      userId: authenticatedUserId,
      selectedRole: undefined,
      resultSnapshot: retiredSnapshot,
      createdAt: '9999-02-01T00:00:00.000Z',
      updatedAt: '9999-02-01T00:00:00.000Z',
    });

    const response = await GET(
      new NextRequest('http://localhost/api/assessment/fit-check', {
        headers: { cookie: authCookie },
      })
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.result).toBeNull();
    expect(body.data.retakeRequired).toBe(true);
    inMemory.assessments.delete(id);
  });
});
