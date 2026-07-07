/** @jest-environment node */

import { beforeAll, describe, expect, it } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as postEvent } from '../events/route';
import { POST as register } from '@/app/api/auth/register/route';
import { POST as login } from '@/app/api/auth/login/route';
import { getDB } from '@/lib/db';

let authCookie = '';

beforeAll(async () => {
  process.env.ENABLE_LOCAL_AUTH = 'true';
  process.env.ALLOW_IN_MEMORY_DB = 'true';
  process.env.NEXTAUTH_SECRET = 'assessment-test-secret-32-characters';

  const email = `analytics-api-${Date.now()}@test.example`;
  const password = 'AssessmentPass1!';
  const registerResponse = await register(
    new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.52.0.1' },
      body: JSON.stringify({ email, password, name: 'Analytics API Test' }),
    })
  );
  await registerResponse.json();
  const loginResponse = await login(
    new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.52.0.2' },
      body: JSON.stringify({ email, password }),
    })
  );
  const token = loginResponse.headers.get('set-cookie')?.match(/auth-token=([^;]+)/)?.[1];
  if (!token) throw new Error('Could not establish authenticated analytics test session');
  authCookie = `auth-token=${token}`;
});

describe('POST /api/analytics/events', () => {
  it('stores a funnel event for the authenticated user', async () => {
    const response = await postEvent(
      new NextRequest('http://localhost/api/analytics/events', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: authCookie,
          'x-forwarded-for': '10.52.0.3',
        },
        body: JSON.stringify({
          eventName: 'results_viewed',
          properties: {
            locale: 'en',
            selected_role_id: 'customer-support',
          },
        }),
      })
    );

    expect(response.status).toBe(200);

    const summary = await getDB().getFunnelSummary();
    expect(summary.eventsByName.results_viewed).toBeGreaterThanOrEqual(1);
  });
});
