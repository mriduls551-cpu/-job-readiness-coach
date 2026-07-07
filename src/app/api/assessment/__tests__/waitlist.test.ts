/** @jest-environment node */

import { beforeAll, describe, expect, it } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as saveAssessment } from '../fit-check/route';
import { POST as saveWaitlist } from '../waitlist/route';
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
      'x-forwarded-for': `10.51.0.${++ipSequence}`,
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

  const email = `waitlist-api-${Date.now()}@test.example`;
  const password = 'AssessmentPass1!';
  const registerResponse = await register(
    new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.51.0.1' },
      body: JSON.stringify({ email, password, name: 'Waitlist API Test' }),
    })
  );
  const registered = await registerResponse.json();
  authenticatedUserId = registered.data.user.id;
  const loginResponse = await login(
    new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.51.0.2' },
      body: JSON.stringify({ email, password }),
    })
  );
  const token = loginResponse.headers.get('set-cookie')?.match(/auth-token=([^;]+)/)?.[1];
  if (!token) throw new Error('Could not establish authenticated assessment test session');
  authCookie = `auth-token=${token}`;
});

describe('D1 waitlist', () => {
  it('stores the latest assessment and contact opt-in for the authenticated user', async () => {
    const db = getDB();

    const scoreResponse = await saveAssessment(
      assessmentRequest({
        responses: completePeoplePath,
        profile: { educationStream: 'commerce' },
      })
    );
    expect(scoreResponse.status).toBe(200);

    const waitlistResponse = await saveWaitlist(
      new NextRequest('http://localhost/api/assessment/waitlist', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: authCookie,
          'x-forwarded-for': '10.51.0.3',
        },
        body: JSON.stringify({
          selectedRoleId: 'customer-support',
          contactConsent: true,
          note: 'I want guided practice for the same role.',
        }),
      })
    );

    expect(waitlistResponse.status).toBe(200);

    const waitlist = await db.getD1Waitlist(authenticatedUserId);
    expect(waitlist).not.toBeNull();
    expect(waitlist?.userId).toBe(authenticatedUserId);
    expect(waitlist?.selectedRoleId).toBe('customer-support');
    expect(waitlist?.contactConsent).toBe(true);
    expect(waitlist?.note).toBe('I want guided practice for the same role.');
  });

  it('rejects missing contact consent', async () => {
    const response = await saveWaitlist(
      new NextRequest('http://localhost/api/assessment/waitlist', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: authCookie,
          'x-forwarded-for': '10.51.0.4',
        },
        body: JSON.stringify({
          selectedRoleId: 'customer-support',
          note: 'No consent here',
        }),
      })
    );

    expect(response.status).toBe(400);
  });
});
