/** @jest-environment jsdom */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockPush = jest.fn();
const mockCaptureProductEvent = jest.fn();
const mockPersistSelectedRole = jest.fn();
const mockPersistAssessmentFeedback = jest.fn();
let mockFeedback: 'helpful' | 'unhelpful' | null = null;

const mockAssessment = {
  summary: {
    en: 'You are strongest in structured coordination and follow-through.',
    hi: 'आप structured coordination और follow-through में सबसे मजबूत हैं।',
  },
  warning: null,
  cluster: 'operators',
  confidenceBand: 'medium',
  dimensionSnapshot: {
    numerical: 58,
    'people-reactive': 64,
    'people-proactive': 42,
    'process-ops': 77,
    'creative-output': 28,
    'analytical-output': 61,
  },
  topRoles: [
    {
      roleId: 'data-entry-mis',
      role: {
        name: { en: 'Data Entry / MIS', hi: 'डेटा एंट्री / एमआईएस' },
        shortLabel: { en: 'Data Entry / MIS', hi: 'डेटा एंट्री / एमआईएस' },
        summary: {
          en: 'Structured data work with accuracy and consistency.',
          hi: 'सही और लगातार structured data work.',
        },
        salaryRange: { en: '₹2.2L - ₹3.5L', hi: '₹2.2L - ₹3.5L' },
      },
      strengthLabel: { en: 'Clear fit', hi: 'स्पष्ट fit' },
      rationale: {
        en: 'You showed structured follow-through and comfort with routine accuracy.',
        hi: 'आपने structured follow-through और routine accuracy के साथ comfort दिखाया।',
      },
      supportingSignals: [
        { en: 'Process discipline', hi: 'Process discipline' },
        { en: 'Accuracy', hi: 'Accuracy' },
      ],
      eligibility: 'ready',
      eligibilityReasons: [],
    },
  ],
  adjacentRoles: [],
} as unknown as import('@/lib/product').AssessmentResult;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/lib/analytics', () => ({
  captureProductEvent: (...args: unknown[]) => mockCaptureProductEvent(...args),
}));

jest.mock('@/lib/client-session', () => ({
  getStoredLocale: () => 'en',
  getStoredUser: () => ({ id: 'user-1', name: 'Priya', email: 'priya@example.com', role: 'user' }),
  persistSelectedRole: (...args: unknown[]) => mockPersistSelectedRole(...args),
  persistAssessmentFeedback: (...args: unknown[]) => mockPersistAssessmentFeedback(...args),
}));

jest.mock('@/hooks/useAssessmentState', () => ({
  useAssessmentState: () => ({
    assessment: mockAssessment,
    selectedRoleId: 'data-entry-mis',
    feedback: mockFeedback,
    loading: false,
  }),
}));

const { default: ResultsPage } =
  require('@/app/results/page') as typeof import('@/app/results/page');

describe('Results page feedback capture', () => {
  const fetchMock = jest.fn<typeof fetch>();

  beforeEach(() => {
    mockPush.mockReset();
    mockCaptureProductEvent.mockReset();
    mockPersistSelectedRole.mockReset();
    mockPersistAssessmentFeedback.mockReset();
    mockFeedback = null;
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('captures a feedback response and reflects the saved choice', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) } as Response);

    render(<ResultsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Not quite' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/assessment/feedback',
        expect.objectContaining({ method: 'POST' })
      );
    });
    const [, requestOptions] = fetchMock.mock.calls[0];
    expect(JSON.parse(requestOptions?.body as string)).toEqual(
      expect.objectContaining({ rating: 'unhelpful' })
    );

    expect(await screen.findByText('Thanks. Your feedback is saved.')).toBeInTheDocument();
    expect(mockCaptureProductEvent).toHaveBeenCalledWith(
      'feedback_submitted',
      expect.objectContaining({
        rating: 'unhelpful',
        has_comment: false,
        locale: 'en',
      })
    );
  });

  it('shows an error when feedback cannot be saved', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) } as Response);

    render(<ResultsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Helpful' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send feedback' }));

    expect(
      await screen.findByText('We could not save that feedback right now.')
    ).toBeInTheDocument();
  });
});
