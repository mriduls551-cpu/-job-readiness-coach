import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('next/link', () => {
  const MockLink = ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...(props as object)}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

jest.mock('@/components/BrandWordmark', () => ({
  BrandWordmark: () => <span data-testid="brand-wordmark">JRC</span>,
}));

jest.mock('@/lib/client-session', () => ({
  setStoredLocale: jest.fn(),
}));

jest.mock('@/components/auth/AuthScaffold', () => ({
  AuthScaffold: ({
    eyebrow,
    title,
    subtitle,
    children,
  }: {
    eyebrow: string;
    title: string;
    subtitle: string;
    children: React.ReactNode;
  }) => (
    <main>
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </main>
  ),
}));

jest.mock('@/components/auth/RegisterForm', () => ({
  RegisterForm: () => <form aria-label="register form" />,
}));

const { useAppStore } = require('@/lib/store') as typeof import('@/lib/store');
const { default: HomeReferencePage } =
  require('@/components/home/HomeReferencePage') as typeof import('@/components/home/HomeReferencePage');
const { RegisterPageContent } =
  require('@/components/auth/RegisterPageContent') as typeof import('@/components/auth/RegisterPageContent');

function resetStore() {
  useAppStore.setState({
    user: null,
    locale: 'en',
    latestAssessment: null,
    selectedRole: null,
  });
}

describe('Product entry points', () => {
  beforeEach(() => {
    resetStore();
    window.history.replaceState({}, '', '/');
  });

  it('sends first-time users from the home primary CTA into the fit check', () => {
    render(<HomeReferencePage />);

    expect(screen.getByRole('link', { name: /find my best-fit roles/i })).toHaveAttribute(
      'href',
      '/career-fit-check'
    );
  });

  it('frames registration as saving results after a completed fit-check', async () => {
    window.history.replaceState(
      {},
      '',
      '/register?next=%2Fcareer-fit-check%3Fresume%3D1'
    );

    render(<RegisterPageContent />);

    await waitFor(() => {
      expect(screen.getByText(/save your answers, then see your realistic role matches/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/save and see results/i)).toBeInTheDocument();
    expect(screen.queryByText(/unlock the fit check/i)).not.toBeInTheDocument();
  });
});
