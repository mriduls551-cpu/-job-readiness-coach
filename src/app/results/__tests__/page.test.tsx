/** @jest-environment jsdom */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockPush = jest.fn();
const mockCaptureProductEvent = jest.fn();
const mockPersistSelectedRole = jest.fn();
const mockPersistAssessmentFeedback = jest.fn();
let mockFeedback: import('@/lib/product').AssessmentFeedback | null = null;

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
  beforeEach(() => {
    mockPush.mockReset();
    mockCaptureProductEvent.mockReset();
    mockPersistSelectedRole.mockReset();
    mockPersistAssessmentFeedback.mockReset();
    mockFeedback = null;
    mockPersistAssessmentFeedback.mockImplementation(async (feedback: unknown) => {
      mockFeedback = feedback as import('@/lib/product').AssessmentFeedback;
      return {
        result: mockAssessment,
        selectedRoleId: 'data-entry-mis',
        feedback: mockFeedback,
      };
    });
  });

  it('captures a feedback response and reflects the saved choice', async () => {
    render(<ResultsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Somewhat' }));

    await waitFor(() => {
      expect(mockPersistAssessmentFeedback).toHaveBeenCalledWith('somewhat');
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Somewhat' })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    });

    expect(screen.getByText('Saved: Partly right, but not exact.')).toBeInTheDocument();
    expect(mockCaptureProductEvent).toHaveBeenCalledWith(
      'results_feedback_submitted',
      expect.objectContaining({
        feedback: 'somewhat',
        role_id: 'data-entry-mis',
        cluster: 'operators',
        confidence_band: 'medium',
      })
    );
  });

  it('shows an error when feedback cannot be saved', async () => {
    mockPersistAssessmentFeedback.mockImplementationOnce(async () => null);

    render(<ResultsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'No' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'We could not save your feedback right now. Please try again.'
      );
    });
  });
});
