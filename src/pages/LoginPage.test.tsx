import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { useAuth } from '../hooks/useAuth';
import LoginPage from './LoginPage';

vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => createElement('span', { 'data-redirect-to': to }),
  useNavigate: () => vi.fn(),
}));
vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../store/authStore', () => ({ useAuthStore: () => ({ setAuth: vi.fn() }) }));
vi.mock('../lib/authApi', () => ({
  loginApi: vi.fn(),
  verify2faApi: vi.fn(),
  resend2faApi: vi.fn(),
  verifyAdminTotpLoginApi: vi.fn(),
}));
vi.mock('../components/ThemeToggle/ThemeToggle', () => ({
  default: () => createElement('button', { type: 'button' }, 'Theme'),
}));

describe('LoginPage accessibility', () => {
  it('redirects an already authenticated administrator to the panel', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isAdmin: true,
      isInitialized: true,
      user: null,
      accessToken: null,
      logout: vi.fn(),
    });

    const markup = renderToStaticMarkup(createElement(LoginPage));

    expect(markup).toContain('data-redirect-to="/"');
    expect(markup).not.toContain('Вход в панель');
  });

  it('exposes a keyboard-accessible, named password visibility toggle', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isAdmin: false,
      isInitialized: true,
      user: null,
      accessToken: null,
      logout: vi.fn(),
    });

    const markup = renderToStaticMarkup(createElement(LoginPage));

    expect(markup).toContain('aria-label="Показать пароль"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain('h-8 w-8');
    expect(markup).not.toContain('tabindex="-1"');
  });

  it('uses the theme-aware foreground for the primary brand badge', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isAdmin: false,
      isInitialized: true,
      user: null,
      accessToken: null,
      logout: vi.fn(),
    });

    const markup = renderToStaticMarkup(createElement(LoginPage));

    expect(markup).toContain('text-[var(--color-on-primary)]">ADMIN</span>');
  });
});
