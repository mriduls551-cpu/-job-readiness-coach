/** @jest-environment node */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

const mockGetAllUsers = jest.fn<() => Promise<Array<{ id: string }>>>();
const mockGetUserAssessments = jest.fn<(userId: string) => Promise<Array<{
  status: string;
  feedback: 'yes' | 'somewhat' | 'no' | null;
  resultSnapshot?: { cluster?: string };
}>>>();
const mockGetUserApplications = jest.fn<(userId: string) => Promise<Array<{ id: string }>>>();
const mockGetFunnelSummary = jest.fn<() => Promise<Record<string, unknown>>>();
const mockGetShareStats = jest.fn<
  () => Promise<{ totalShares: number; totalVisits: number; visitRate: number }>
>();
const mockGetLogs = jest.fn<() => Array<{ status: string }>>();
const mockGetJobs = jest.fn<
  () => Array<{ id: string; name: string; enabled: boolean; lastRun?: string }>
>();
const mockVerifyAdminRequest = jest.fn<
  (request: NextRequest, adminResourceType: string) => Promise<
    | { authorized: true; user: { id: string; role: 'admin' } }
    | { authorized: false; response: Response }
  >
>();

jest.mock('@/lib/db', () => ({
  getDB: () => ({
    getAllUsers: mockGetAllUsers,
    getUserAssessments: mockGetUserAssessments,
    getUserApplications: mockGetUserApplications,
    getFunnelSummary: mockGetFunnelSummary,
    getShareStats: mockGetShareStats,
  }),
}));

jest.mock('@/lib/email-service', () => ({
  getEmailService: () => ({
    getLogs: mockGetLogs,
  }),
}));

jest.mock('@/lib/cron-service', () => ({
  getCronService: () => ({
    getJobs: mockGetJobs,
  }),
}));

jest.mock('@/lib/auth/authorization', () => ({
  verifyAdminRequest: (request: NextRequest, adminResourceType: string) =>
    mockVerifyAdminRequest(request, adminResourceType),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const { GET } =
  require('@/app/api/admin/stats/route') as typeof import('@/app/api/admin/stats/route');

describe('GET /api/admin/stats', () => {
  beforeEach(() => {
    mockGetAllUsers.mockReset();
    mockGetUserAssessments.mockReset();
    mockGetUserApplications.mockReset();
    mockGetFunnelSummary.mockReset();
    mockGetShareStats.mockReset();
    mockGetLogs.mockReset();
    mockGetJobs.mockReset();
    mockVerifyAdminRequest.mockReset();

    mockVerifyAdminRequest.mockResolvedValue({
      authorized: true,
      user: { id: 'admin-1', role: 'admin' },
    });
    mockGetAllUsers.mockResolvedValue([
      { id: 'user-1' },
      { id: 'user-2' },
    ]);
    mockGetUserAssessments.mockImplementation(async (userId: string) => {
      if (userId === 'user-1') {
        return [
          {
            status: 'completed',
            feedback: 'yes',
            resultSnapshot: { cluster: 'desk-ops' },
          },
          {
            status: 'completed',
            feedback: null,
            resultSnapshot: { cluster: 'analytical' },
          },
        ];
      }

      return [
        {
          status: 'completed',
          feedback: 'somewhat',
          resultSnapshot: { cluster: 'desk-ops' },
        },
        {
          status: 'draft',
          feedback: 'no',
          resultSnapshot: { cluster: 'creative' },
        },
      ];
    });
    mockGetUserApplications
      .mockResolvedValueOnce([{ id: 'app-1' }, { id: 'app-2' }])
      .mockResolvedValueOnce([{ id: 'app-3' }]);
    mockGetFunnelSummary.mockResolvedValue({
      assessmentStarts: 5,
      assessmentCompletions: 3,
      resumeCtaClicks: 2,
      practiceCtaClicks: 1,
    });
    mockGetShareStats.mockResolvedValue({
      totalShares: 4,
      totalVisits: 10,
      visitRate: 2.5,
    });
    mockGetLogs.mockReturnValue([
      { status: 'sent' },
      { status: 'failed' },
      { status: 'sent' },
    ]);
    mockGetJobs.mockReturnValue([
      { id: 'cron-1', name: 'Digest', enabled: true, lastRun: '2026-07-02T10:00:00.000Z' },
    ]);
  });

  it('returns aggregated usage, funnel, and share metrics', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admin/stats'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.totalUsers).toBe(2);
    expect(body.data.totalAssessments).toBe(3);
    expect(body.data.totalApplications).toBe(3);
    expect(body.data.emailsSent).toBe(2);
    expect(body.data.funnel).toEqual({
      assessmentStarts: 5,
      assessmentCompletions: 3,
      resumeCtaClicks: 2,
      practiceCtaClicks: 1,
    });
    expect(body.data.share).toEqual({
      totalShares: 4,
      totalVisits: 10,
      visitRate: 2.5,
    });
  });

  it('returns the authorization response when the request is not allowed', async () => {
    mockVerifyAdminRequest.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ success: false }), { status: 403 }),
    });

    const response = await GET(new NextRequest('http://localhost/api/admin/stats'));

    expect(response.status).toBe(403);
  });
});
