/** @jest-environment node */

import { beforeAll, describe, expect, it } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST } from '../shares/route';
import { POST as saveAssessment } from '../fit-check/route';
import { POST as register } from '@/app/api/auth/register/route';
import { POST as login } from '@/app/api/auth/login/route';
import { getDB } from '@/lib/db';

let authCookie = '';
let authenticatedUserId = '';
let ipSequence = 0;

function assessmentRequest(body: unknown) {
  return new NextRequest('http://localhost/api/assessment/fit-check', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: authCookie,
      'x-forwarded-for': `10.52.0.${++ipSequence}`,
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

  const email = `share-api-${Date.now()}@test.example`;
  const password = 'AssessmentPass1!';
  const registerResponse = await register(
    new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.52.0.1' },
      body: JSON.stringify({ email, password, name: 'Share API Test' }),
    })
  );
  const registered = await registerResponse.json();
  authenticatedUserId = registered.data.user.id;
  const loginResponse = await login(
    new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.52.0.2' },
      body: JSON.stringify({ email, password }),
    })
  );
  const token = loginResponse.headers.get('set-cookie')?.match(/auth-token=([^;]+)/)?.[1];
  if (!token) throw new Error('Could not establish authenticated assessment test session');
  authCookie = `auth-token=${token}`;
});

describe('assessment share flow', () => {
  it('creates a public share, rehydrates it, and records visits', async () => {
    const db = getDB();

    const scoreResponse = await saveAssessment(
      assessmentRequest({
        responses: completePeoplePath,
        profile: { educationStream: 'commerce' },
      })
    );
    expect(scoreResponse.status).toBe(200);
    const scoreBody = await scoreResponse.json();
    const selectedRoleId =
      scoreBody.data?.selectedRoleId || scoreBody.data?.result?.topRoles?.[0]?.roleId;
    expect(selectedRoleId).toBeTruthy();

    const createResponse = await POST(
      new NextRequest('http://localhost/api/assessment/shares', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: authCookie,
          'x-forwarded-for': '10.52.0.3',
        },
        body: JSON.stringify({
          selectedRoleId,
        }),
      })
    );

    expect(createResponse.status).toBe(200);
    const createBody = await createResponse.json();
    const share = createBody.data?.share;
    expect(share).toBeTruthy();
    expect(share.publicId).toBeTruthy();
    expect(share.publicUrl).toContain(`/r/${share.publicId}`);

    const stored = await db.getPublicShare(share.publicId);
    expect(stored).not.toBeNull();
    expect(stored?.userId).toBe(authenticatedUserId);
    expect(stored?.visitCount).toBe(0);

    const lookupResponse = await GET(
      new NextRequest(`http://localhost/api/assessment/shares?publicId=${share.publicId}`)
    );
    expect(lookupResponse.status).toBe(200);
    const lookupBody = await lookupResponse.json();
    expect(lookupBody.data?.share.publicId).toBe(share.publicId);
    expect(lookupBody.data?.share.firstName).toBe(share.firstName);

    const updated = await db.recordPublicShareVisit(share.publicId);
    expect(updated?.visitCount).toBe(1);
    expect(updated?.lastVisitedAt).toBeTruthy();
  });
});
