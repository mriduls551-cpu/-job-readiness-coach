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

type MockUser = {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
};

let mockUser: MockUser | null = null;
let mockLocale: 'en' | 'hi' = 'en';
let syncStoreLocale: ((locale: 'en' | 'hi') => void) | null = null;
const mockSetStoredLocale = jest.fn<(l: 'en' | 'hi') => void>((l) => {
  mockLocale = l;
  syncStoreLocale?.(l);
});

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

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      language: 'Language',
      english: 'English',
      hindi: 'Hindi',
      languageTooltip: 'Choose English or Hindi for this workspace',
    };
    return messages[key] || key;
  },
}));

const { useAppStore } = require('@/lib/store') as typeof import('@/lib/store');
const { Navigation } = require('@/components/Navigation') as typeof import('@/components/Navigation');
syncStoreLocale = (locale) => useAppStore.setState({ locale });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function syncStore() {
  useAppStore.setState({
    user: mockUser,
    locale: mockLocale,
    latestAssessment: null,
    selectedRole: null,
  });
}

function asGuest() {
  mockUser = null;
  syncStore();
}

function asUser() {
  mockUser = {
    id: 'user-priya',
    name: 'Priya',
    email: 'priya@example.com',
    role: 'user',
  };
  syncStore();
}
function atPath(path: string) { mockPathname.mockReturnValue(path); }

function renderNavigation() {
  return render(<Navigation />);
}

// ─── HIDE_PATHS ───────────────────────────────────────────────────────────────

describe('HIDE_PATHS', () => {
  beforeEach(() => asUser());

  it('renders nothing on /', () => {
    atPath('/');
    const { container } = renderNavigation();
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing on /login', () => {
    atPath('/login');
    const { container } = renderNavigation();
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing on /register', () => {
    atPath('/register');
    const { container } = renderNavigation();
    expect(container.firstChild).toBeNull();
  });
});

// ─── Top nav ──────────────────────────────────────────────────────────────────

describe('Top nav', () => {
  beforeEach(() => { asUser(); atPath('/dashboard'); });

  it('renders the brand wordmark', () => {
    renderNavigation();
    expect(screen.getByTestId('brand-wordmark')).toBeInTheDocument();
  });

  it('renders the language selector', () => {
    renderNavigation();
    expect(screen.getByRole('combobox', { name: /language/i })).toBeInTheDocument();
  });

  it('language selector has stable touch target height', () => {
    renderNavigation();
    const languageSelect = screen.getByRole('combobox', { name: /language/i });
    expect(languageSelect.className).toMatch(/min-h-\[40px\]/);
  });
});

// ─── Guest state ──────────────────────────────────────────────────────────────

describe('Guest user', () => {
  beforeEach(() => { asGuest(); atPath('/career-fit-check'); });

  it('shows Sign in link', () => {
    renderNavigation();
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows Create free account link', () => {
    renderNavigation();
    expect(screen.getByRole('link', { name: /create free account/i })).toBeInTheDocument();
  });

  it('does not render mobile bottom nav', () => {
    renderNavigation();
    expect(screen.queryByRole('navigation', { name: /main navigation/i })).toBeNull();
  });
});

// ─── Authenticated state ──────────────────────────────────────────────────────

describe('Authenticated user', () => {
  beforeEach(() => { asUser(); atPath('/dashboard'); });

  it('shows user name button', () => {
    renderNavigation();
    expect(screen.getByRole('button', { name: /priya/i })).toBeInTheDocument();
  });

  it('does not show Sign in link', () => {
    renderNavigation();
    expect(screen.queryByRole('link', { name: /sign in/i })).toBeNull();
  });

  it('renders bottom nav with aria-label="Main navigation"', () => {
    renderNavigation();
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
  });

  it('bottom nav contains exactly 5 tab links', () => {
    renderNavigation();
    const bottomNav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(bottomNav.querySelectorAll('a').length).toBe(5);
  });

  it('active path link has aria-current="page"', () => {
    atPath('/dashboard');
    renderNavigation();
    const bottomNav = screen.getByRole('navigation', { name: /main navigation/i });
    const activeLink = bottomNav.querySelector('[aria-current="page"]');
    expect(activeLink).not.toBeNull();
    expect(activeLink?.getAttribute('href')).toBe('/dashboard');
  });

  it('non-active links do not have aria-current', () => {
    atPath('/dashboard');
    renderNavigation();
    const bottomNav = screen.getByRole('navigation', { name: /main navigation/i });
    const inactiveLinks = bottomNav.querySelectorAll('a:not([aria-current="page"])');
    inactiveLinks.forEach((link) => {
      expect(link.getAttribute('aria-current')).toBeNull();
    });
  });
});

// ─── Locale toggle ────────────────────────────────────────────────────────────

describe('Locale toggle', () => {
  beforeEach(() => { mockLocale = 'en'; asUser(); atPath('/dashboard'); });

  it('shows English as the active language when locale is en', () => {
    renderNavigation();
    const languageSelect = screen.getByRole('combobox', { name: /language/i });
    expect(languageSelect).toHaveTextContent(/english/i);
  });
});
