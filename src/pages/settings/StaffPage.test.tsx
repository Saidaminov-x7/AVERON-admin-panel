import { createElement, type ComponentProps, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StaffPage from './StaffPage';
import enMessages from '../../messages/en.json';
import ruMessages from '../../messages/ru.json';
import uzMessages from '../../messages/uz.json';
import type { AdminUser } from '../../store/authStore';

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  language: 'ru',
}));

const localeMessages = { en: enMessages, ru: ruMessages, uz: uzMessages };

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQuery,
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) => {
      const messages = localeMessages[mocks.language as keyof typeof localeMessages] as Record<string, unknown>;
      const value = key.split('.').reduce<unknown>((current, part) =>
        current && typeof current === 'object' ? (current as Record<string, unknown>)[part] : undefined, messages);
      if (typeof value !== 'string') return key;
      return Object.entries(options ?? {}).reduce((text, [name, replacement]) =>
        text.replace(`{{${name}}}`, replacement), value);
    },
    i18n: { language: mocks.language },
  }),
}));

vi.mock('../../components/Layout', () => ({
  default: ({ children, title }: { children: ReactNode; title: string }) =>
    createElement('main', { 'data-title': title }, children),
}));

vi.mock('../../components/ui', () => ({
  Button: ({ children, type, form }: ComponentProps<'button'>) =>
    createElement('button', { type, form }, children),
  Modal: () => null,
  Select: ({ value, options, ariaLabel }: {
    value: string;
    ariaLabel?: string;
    options: Array<{ value: string; label: string }>;
  }) => createElement(
    'button',
    { type: 'button', 'aria-label': ariaLabel },
    options.find((option) => option.value === value)?.label,
  ),
}));

vi.mock('../../store/authStore', () => ({
  useAuthStore: (selector: (state: { user: AdminUser }) => unknown) => selector({
    user: { id: 'qa-admin', email: 'qa@example.invalid', name: 'QA Admin', role: 'ADMIN', adminRole: 'SUPER_ADMIN' },
  }),
}));

const staff: AdminUser[] = [{
  id: 'staff-1',
  email: 'moderator@example.invalid',
  name: 'QA Moderator',
  role: 'ADMIN',
  adminRole: 'MODERATOR',
  lastLoginAt: null,
}];

describe('StaffPage localization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.language = 'ru';
    mocks.useQuery.mockReturnValue({ data: staff, isLoading: false });
  });

  it.each([
    ['ru', 'Сотрудники и роли', 'Отозвать доступ', 'Модератор', 'Никогда', 'Роль сотрудника QA Moderator'],
    ['uz', 'Xodimlar va rollar', 'Kirish huquqini bekor qilish', 'Moderator', 'Hech qachon', 'QA Moderator xodimining roli'],
    ['en', 'Staff and roles', 'Revoke access', 'Moderator', 'Never', 'Role for QA Moderator'],
  ])('renders staff route copy in %s', (language, title, revoke, moderator, never, roleName) => {
    mocks.language = language;
    const markup = renderToStaticMarkup(createElement(StaffPage));

    expect(markup).toContain(title);
    expect(markup).toContain(revoke);
    expect(markup).toContain(moderator);
    expect(markup).toContain(never);
    expect(markup).toContain(`aria-label="${roleName}"`);
    if (language !== 'ru') expect(markup).not.toContain('Роль в панели');
  });

  it('keeps the empty state localized when there are no staff records', () => {
    mocks.language = 'en';
    mocks.useQuery.mockReturnValue({ data: [], isLoading: false });
    const markup = renderToStaticMarkup(createElement(StaffPage));

    expect(markup).toContain('No staff members found');
    expect(markup).not.toContain('Сотрудники не найдены');
  });
});
