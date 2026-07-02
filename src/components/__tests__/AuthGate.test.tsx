import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';

const mockPathname = jest.fn<() => string>(() => '/career-fit-check');
const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ replace: mockReplace }),
}));

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

jest.mock('@/lib/client-session', () => ({
  getStoredUser: () => null,
  refreshStoredUserFromSession: () => Promise.resolve(null),
}));

jest.mock('@/components/BrandWordmark', () => ({
  BrandWordmark: () => <span>JRC</span>,
}));

const { AuthGate } = require('@/components/AuthGate') as typeof import('@/components/AuthGate');

describe('AuthGate', () => {
  it('allows guests to answer the career fit check before authentication', () => {
    mockPathname.mockReturnValue('/career-fit-check');

    render(
      <AuthGate>
        <div>Fit check questions</div>
      </AuthGate>
    );

    expect(screen.getByText('Fit check questions')).toBeInTheDocument();
    expect(screen.queryByText('Account required')).not.toBeInTheDocument();
  });

  it('keeps results protected for guests', async () => {
    mockPathname.mockReturnValue('/results');

    render(
      <AuthGate>
        <div>Private results</div>
      </AuthGate>
    );

    await waitFor(() => expect(screen.getByText('Account required')).toBeInTheDocument());
    expect(screen.queryByText('Private results')).not.toBeInTheDocument();
  });
});
