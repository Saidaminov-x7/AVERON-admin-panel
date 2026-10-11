import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import IntegrationDiagnosticsPage from './IntegrationDiagnosticsPage';

const { locale } = vi.hoisted(() => ({ locale: { value: 'ru-RU' } }));

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn() }));
vi.mock('../../lib/integrationDiagnosticsApi', () => ({ getIntegrationDiagnostics: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: locale.value } }),
}));
vi.mock('../../components/Layout', () => ({
  default: ({ children, title }: { children: ReactNode; title: string }) =>
    createElement('div', { 'data-title': title }, children),
}));

describe('IntegrationDiagnosticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    locale.value = 'ru-RU';
  });

  it.each([
    ['ru-RU', 'Для интеграций пока нет диагностических данных.'],
    ['uz-UZ', 'Integratsiyalar uchun diagnostika ma’lumotlari hozircha yo‘q.'],
    ['en-US', 'No integration diagnostics are available yet.'],
  ])('explains empty diagnostics in %s', (language, expectedMessage) => {
    locale.value = language;
    vi.mocked(useQuery).mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
    } as never);

    const markup = renderToStaticMarkup(createElement(IntegrationDiagnosticsPage));

    expect(markup).toContain(expectedMessage);
    expect(markup).not.toContain('<ul');
  });

  it('keeps rendering reported integration diagnostics', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: [{
        name: 'Telegram',
        featureEnabled: true,
        configured: false,
        implementationStatus: 'IMPLEMENTED',
        verificationStatus: 'NOT_CONFIGURED',
        degraded: true,
        lastSuccessfulOperation: null,
      }],
      isPending: false,
      isError: false,
    } as never);

    const markup = renderToStaticMarkup(createElement(IntegrationDiagnosticsPage));

    expect(markup).toContain('Telegram');
    expect(markup).toContain('NOT_CONFIGURED');
    expect(markup).toContain('Работает с ограничениями');
  });
});
