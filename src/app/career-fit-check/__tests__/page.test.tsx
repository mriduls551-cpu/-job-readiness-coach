/** @jest-environment jsdom */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();
let mockUser:
  | {
      id: string;
      name: string;
      email: string;
      role: 'user' | 'admin';
    }
  | null = null;
const mockGetStoredLocale = jest.fn(() => 'en');
const mockSetStoredLocale = jest.fn();
const mockSetLatestAssessment = jest.fn();
const mockSetSelectedRole = jest.fn();
const mockCaptureProductEvent = jest.fn();
const mockGetProductFeatureFlagVariant = jest.fn<
  (flagKey: string, timeoutMs?: number) => Promise<string | boolean | null>
>();
let fetchMock: jest.MockedFunction<typeof fetch>;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key),
  }),
}));

jest.mock('@/lib/analytics', () => ({
  captureProductEvent: (...args: unknown[]) => mockCaptureProductEvent(...args),
  getProductFeatureFlagVariant: (flagKey: string, timeoutMs?: number) =>
    mockGetProductFeatureFlagVariant(flagKey, timeoutMs),
}));

jest.mock('@/lib/client-session', () => ({
  getStoredLocale: () => mockGetStoredLocale(),
  getStoredUser: () => mockUser,
  setLatestAssessment: (result: unknown) => mockSetLatestAssessment(result),
  setSelectedRole: (roleId: unknown) => mockSetSelectedRole(roleId),
  setStoredLocale: (locale: 'en' | 'hi') => mockSetStoredLocale(locale),
}));

const { default: CareerFitCheckPage } =
  require('@/app/career-fit-check/page') as typeof import('@/app/career-fit-check/page');
const {
  useFitCheckDraftStore,
  createEmptyFitCheckDraft,
} = require('@/lib/stores/fitcheck-draft') as typeof import('@/lib/stores/fitcheck-draft');
const { getNextQuestions } = require('@/lib/product') as typeof import('@/lib/product');

const completeDeskOpsResponses = {
  r1: 'r1_c',
  r2: 'r2_b',
  r3: 'r3_a',
  r4: 'r4_c',
  r5: 'r5_c',
  rtb: 'rtb_b',
  b1: 'do_b1_a',
  b2: 'do_b2_a',
  b3: 'do_b3_a',
  b4: 'do_b4_a',
  b5: 'do_b5_a',
  rf: 'rf_data-entry-mis',
};

function seedDraft(
  overrides: Partial<import('@/lib/stores/fitcheck-draft').FitCheckDraftSnapshot> = {}
) {
  useFitCheckDraftStore.setState({
    ...createEmptyFitCheckDraft(),
    hydrated: true,
    ...overrides,
  });
}

describe('Career fit check page', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    mockCaptureProductEvent.mockReset();
    mockGetProductFeatureFlagVariant.mockReset();
    mockGetProductFeatureFlagVariant.mockResolvedValue(null);
    mockSetStoredLocale.mockReset();
    mockSetLatestAssessment.mockReset();
    mockSetSelectedRole.mockReset();
    mockSearchParams = new URLSearchParams();
    mockUser = null;
    seedDraft();
    fetchMock = jest.fn(async () => new Response()) as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;
  });

  it('renders accessible radio controls without redirecting guests on first load', async () => {
    render(<CareerFitCheckPage />);

    expect(await screen.findByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getAllByRole('radio').length).toBeGreaterThan(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('gates guests at submit and preserves the replay path', async () => {
    const questionCount = getNextQuestions(completeDeskOpsResponses).length;
    seedDraft({
      responses: completeDeskOpsResponses,
      currentIndex: questionCount - 1,
    });

    render(<CareerFitCheckPage />);

    fireEvent.click(screen.getByRole('button', { name: /see my top matches/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/register?next=%2Fcareer-fit-check%3Fresume%3D1'
      );
    });
  });

  it('replays a saved completed draft after auth and routes to results', async () => {
    const questionCount = getNextQuestions(completeDeskOpsResponses).length;
    mockUser = {
      id: 'user-1',
      name: 'Priya',
      email: 'priya@example.com',
      role: 'user',
    };
    mockSearchParams = new URLSearchParams('resume=1');
    seedDraft({
      responses: completeDeskOpsResponses,
      currentIndex: questionCount - 1,
      profile: {
        fullName: 'Priya',
        city: 'Indore',
        degreeName: 'BCom',
      },
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          result: {
            topRoles: [{ roleId: 'data-entry-mis' }],
          },
        },
      }),
    } as Response);

    render(<CareerFitCheckPage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/assessment/fit-check',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
    const [, requestOptions] = fetchMock.mock.calls[0];
    expect(JSON.parse(requestOptions?.body as string)).toEqual(
      expect.objectContaining({
        scoringVariant: 'control',
        scoringConfig: { finalistWeight: 8, streamBoostFactor: 1.1 },
      })
    );
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/results');
    });
    expect(mockSetLatestAssessment).toHaveBeenCalled();
    expect(mockSetSelectedRole).toHaveBeenCalledWith('data-entry-mis');
  });
});
