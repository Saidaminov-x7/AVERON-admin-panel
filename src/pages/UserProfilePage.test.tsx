import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import UserProfilePage from './UserProfilePage';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: 'test-user' }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('../components/Layout', () => ({
  default: ({ children, title }: { children: ReactNode; title: string }) =>
    createElement('main', { 'data-title': title }, children),
}));

describe('UserProfilePage tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQuery).mockReturnValue({
      data: {
        id: 'test-user',
        name: 'Test Buyer',
        email: 'buyer@example.invalid',
        phone: '',
        role: 'USER',
        isBlocked: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        lastLoginAt: null,
      },
      isLoading: false,
    } as never);
  });

  it('renders localized tabs with a valid panel association and one roving tab stop', () => {
    const markup = renderToStaticMarkup(createElement(UserProfilePage));

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('aria-label="users.profileSections"');
    expect((markup.match(/role="tab"/g) ?? []).length).toBe(5);
    for (const tab of ['info', 'ai', 'activity', 'history', 'sessions']) {
      expect(markup).toContain(`id="user-profile-tab-${tab}"`);
      expect(markup).toContain(`aria-controls="user-profile-panel-${tab}"`);
      expect(markup).toContain(`id="user-profile-panel-${tab}"`);
    }
    expect(markup).toContain('aria-selected="true"');
    expect((markup.match(/role="tabpanel"/g) ?? []).length).toBe(5);
    expect(markup).toContain('aria-labelledby="user-profile-tab-info"');
    expect(markup).toContain('tabindex="0"');
    expect((markup.match(/tabindex="-1"/g) ?? []).length).toBe(4);
    expect(markup).not.toContain('overflow-x-auto pb-1');
  });

  it('uses singular copy when the requested user does not exist', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false } as never);

    const markup = renderToStaticMarkup(createElement(UserProfilePage));

    expect(markup).toContain('users.userMissing');
    expect(markup).not.toContain('users.userNotFound');
  });
});
