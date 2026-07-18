/**
 * @jest-environment jsdom
 */
import { captureProductEvent } from '@/lib/analytics';
import { getStoredUser } from '@/lib/client-session';

jest.mock('@/lib/client-session', () => ({
  getStoredUser: jest.fn(),
}));

const mockGetStoredUser = getStoredUser as jest.MockedFunction<typeof getStoredUser>;

describe('captureProductEvent first-party mirror', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    mockGetStoredUser.mockReset();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('does not POST to /api/analytics/events for anonymous users', async () => {
    mockGetStoredUser.mockReturnValue(null);

    await captureProductEvent('assessment_start', { locale: 'en' });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('POSTs to /api/analytics/events when a user session exists', async () => {
    mockGetStoredUser.mockReturnValue({
      id: 'user-1',
      email: 'asha@example.com',
      name: 'Asha',
      role: 'user',
    } as ReturnType<typeof getStoredUser>);

    await captureProductEvent('assessment_start', { locale: 'en' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('/api/analytics/events');
    expect(JSON.parse((options as RequestInit).body as string)).toEqual({
      eventName: 'assessment_start',
      properties: { locale: 'en' },
    });
  });
});
