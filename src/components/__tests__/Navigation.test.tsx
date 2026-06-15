import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockPathname = jest.fn<() => string>(() => '/dashboard');

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('next/link', () => {
  const MockLink = ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...(props as object)}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

let mockUser: { name: string; email: string } | null = null;
let mockLocale: 'en' | 'hi' = 'en';
const mockSetStoredLocale = jest.fn<(l: 'en' | 'hi') => void>((l) => { mockLocale = l; });

jest.mock('@/lib/client-session', () => ({
  getStoredUser: () => mockUser,
  getStoredLocale: () => mockLocale,
  setStoredLocale: (l: 'en' | 'hi') => mockSetStoredLocale(l),
  clearStoredUser: jest.fn(),
  refreshStoredUserFromSession: jest.fn<() => Promise<void>>(() => Promise.resolve()),
}));

jest.mock('@/components/BrandWordmark', () => ({
  BrandWordmark: () => <span data-testid="brand-wordmark">JRC</span>,
}));

const { Navigation } = require('@/components/Navigation') as typeof import('@/components/Navigation');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function asGuest() { mockUser = null; }
function asUser() { mockUser = { name: 'Priya', email: 'priya@example.com' }; }
function atPath(path: string) { mockPathname.mockReturnValue(path); }

// ─── HIDE_PATHS ───────────────────────────────────────────────────────────────

describe('HIDE_PATHS', () => {
  beforeEach(() => asUser());

  it('renders nothing on /', () => {
    atPath('/');
    const { container } = render(<Navigation />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing on /login', () => {
    atPath('/login');
    const { container } = render(<Navigation />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing on /register', () => {
    atPath('/register');
    const { container } = render(<Navigation />);
    expect(container.firstChild).toBeNull();
  });
});

// ─── Top nav ──────────────────────────────────────────────────────────────────

describe('Top nav', () => {
  beforeEach(() => { asUser(); atPath('/dashboard'); });

  it('renders the brand wordmark', () => {
    render(<Navigation />);
    expect(screen.getByTestId('brand-wordmark')).toBeInTheDocument();
  });

  it('renders EN and HI locale toggle buttons', () => {
    render(<Navigation />);
    expect(screen.getByRole('button', { name: /switch to english/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /switch to hindi/i })).toBeInTheDocument();
  });

  it('locale toggle buttons have min-h-[36px] class', () => {
    render(<Navigation />);
    const enBtn = screen.getByRole('button', { name: /switch to english/i });
    expect(enBtn.className).toMatch(/min-h-\[36px\]/);
    expect(enBtn.className).toMatch(/min-w-\[36px\]/);
  });
});

// ─── Guest state ──────────────────────────────────────────────────────────────

describe('Guest user', () => {
  beforeEach(() => { asGuest(); atPath('/career-fit-check'); });

  it('shows Sign in link', () => {
    render(<Navigation />);
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows Create free account link', () => {
    render(<Navigation />);
    expect(screen.getByRole('link', { name: /create free account/i })).toBeInTheDocument();
  });

  it('does not render mobile bottom nav', () => {
    render(<Navigation />);
    expect(screen.queryByRole('navigation', { name: /main navigation/i })).toBeNull();
  });
});

// ─── Authenticated state ──────────────────────────────────────────────────────

describe('Authenticated user', () => {
  beforeEach(() => { asUser(); atPath('/dashboard'); });

  it('shows user name button', () => {
    render(<Navigation />);
    expect(screen.getByRole('button', { name: /priya/i })).toBeInTheDocument();
  });

  it('does not show Sign in link', () => {
    render(<Navigation />);
    expect(screen.queryByRole('link', { name: /sign in/i })).toBeNull();
  });

  it('renders bottom nav with aria-label="Main navigation"', () => {
    render(<Navigation />);
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
  });

  it('bottom nav contains exactly 5 tab links', () => {
    render(<Navigation />);
    const bottomNav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(bottomNav.querySelectorAll('a').length).toBe(5);
  });

  it('active path link has aria-current="page"', () => {
    atPath('/dashboard');
    render(<Navigation />);
    const bottomNav = screen.getByRole('navigation', { name: /main navigation/i });
    const activeLink = bottomNav.querySelector('[aria-current="page"]');
    expect(activeLink).not.toBeNull();
    expect(activeLink?.getAttribute('href')).toBe('/dashboard');
  });

  it('non-active links do not have aria-current', () => {
    atPath('/dashboard');
    render(<Navigation />);
    const bottomNav = screen.getByRole('navigation', { name: /main navigation/i });
    const inactiveLinks = bottomNav.querySelectorAll('a:not([aria-current="page"])');
    inactiveLinks.forEach((link) => {
      expect(link.getAttribute('aria-current')).toBeNull();
    });
  });
});

// ─── Locale toggle ────────────────────────────────────────────────────────────

describe('Locale toggle', () => {
  beforeEach(() => { asUser(); atPath('/dashboard'); mockLocale = 'en'; });

  it('EN button has active bg class when locale is en', () => {
    render(<Navigation />);
    const enBtn = screen.getByRole('button', { name: /switch to english/i });
    expect(enBtn.className).toMatch(/bg-\[var\(--brand-ink\)\]/);
  });
});
