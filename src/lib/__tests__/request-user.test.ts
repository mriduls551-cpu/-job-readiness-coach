import { describe, expect, it } from '@jest/globals';
import { NextRequest } from 'next/server';
import { getClientIp } from '@/lib/request-user';

function mockRequest(headers: Record<string, string>): NextRequest {
  return {
    headers: new Map(Object.entries(headers)) as unknown as NextRequest['headers'],
  } as NextRequest;
}

describe('getClientIp', () => {
  it('returns the first IP from a comma-separated x-forwarded-for list', () => {
    const req = mockRequest({ 'x-forwarded-for': '203.0.113.1, 198.51.100.2, 192.0.2.3' });
    expect(getClientIp(req)).toBe('203.0.113.1');
  });

  it('returns a single x-forwarded-for IP as-is', () => {
    const req = mockRequest({ 'x-forwarded-for': '203.0.113.42' });
    expect(getClientIp(req)).toBe('203.0.113.42');
  });

  it('trims whitespace from the first x-forwarded-for entry', () => {
    const req = mockRequest({ 'x-forwarded-for': '  203.0.113.1 , 198.51.100.2' });
    expect(getClientIp(req)).toBe('203.0.113.1');
  });

  it('falls back to x-real-ip when x-forwarded-for is missing', () => {
    const req = mockRequest({ 'x-real-ip': '10.0.0.1' });
    expect(getClientIp(req)).toBe('10.0.0.1');
  });

  it('prefers x-forwarded-for over x-real-ip when both are present', () => {
    const req = mockRequest({
      'x-forwarded-for': '203.0.113.1',
      'x-real-ip': '10.0.0.1',
    });
    expect(getClientIp(req)).toBe('203.0.113.1');
  });

  it('returns "unknown" when no IP headers are present', () => {
    const req = mockRequest({});
    expect(getClientIp(req)).toBe('unknown');
  });

  it('returns "unknown" when x-forwarded-for is an empty string', () => {
    const req = mockRequest({ 'x-forwarded-for': '' });
    expect(getClientIp(req)).toBe('unknown');
  });

  it('returns "unknown" when x-forwarded-for contains only commas/whitespace', () => {
    const req = mockRequest({ 'x-forwarded-for': ' , , ' });
    expect(getClientIp(req)).toBe('unknown');
  });
});