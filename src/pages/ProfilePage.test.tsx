import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import ProfilePage from './ProfilePage';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('../components/Layout', () => ({
  default: ({ children, title }: { children: ReactNode; title: string }) =>
    createElement('main', { 'data-title': title }, children),
}));
vi.mock('../components/security/AdminSecuritySection', () => ({
  AdminSecuritySection: () => createElement('section', { 'data-testid': 'security' }),
}));

describe('ProfilePage localization and form semantics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false } as never);
  });

  it('uses translation keys for profile copy and connects each form label to its field', () => {
    const markup = renderToStaticMarkup(createElement(ProfilePage));

    for (const key of [
      'profile.title',
      'profile.personalData',
      'profile.name',
      'profile.emailReadOnly',
      'profile.phone',
      'profile.telegramId',
      'profile.changePassword',
      'profile.currentPassword',
      'profile.newPassword',
      'profile.confirmPassword',
      'profile.passwordRequirements',
    ]) {
      expect(markup).toContain(key);
    }

    for (const id of [
      'profile-name',
      'profile-email',
      'profile-phone',
      'profile-telegram-id',
      'profile-current-password',
      'profile-new-password',
      'profile-confirm-password',
    ]) {
      expect(markup).toContain(`for="${id}"`);
      expect(markup).toContain(`id="${id}"`);
    }
    expect(markup).toContain('minLength="8"');
    expect(markup).toContain('data-testid="security"');
  });
});
