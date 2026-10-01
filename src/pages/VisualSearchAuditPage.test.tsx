import { createElement, type ComponentProps, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import VisualSearchAuditPage from './VisualSearchAuditPage';

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn() }));
vi.mock('../lib/visualSearchAuditApi', () => ({ getVisualSearchAuditApi: vi.fn() }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string | { defaultValue?: string }) =>
      typeof fallback === 'string' ? fallback : fallback?.defaultValue ?? _key,
    i18n: { language: 'en' },
  }),
}));
vi.mock('../components/Layout', () => ({
  default: ({ children, title }: { children: ReactNode; title: string }) =>
    createElement('div', { 'data-title': title }, children),
}));
vi.mock('../components/ui', () => ({
  Button: ({
    children,
    disabled,
    loading,
    leftIcon,
    onClick,
  }: ComponentProps<'button'> & { loading?: boolean; leftIcon?: ReactNode }) =>
    createElement('button', { type: 'button', disabled, onClick, 'aria-busy': loading }, leftIcon, children),
  Card: ({ children }: { children: ReactNode }) => createElement('section', null, children),
  Skeleton: () => createElement('div', { 'aria-hidden': true }),
}));

describe('VisualSearchAuditPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('announces the loading state', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      isRefetching: false,
      refetch: vi.fn(),
    } as never);

    const markup = renderToStaticMarkup(createElement(VisualSearchAuditPage));
    expect(markup).toContain('role="status"');
    expect(markup).toContain('Loading…');
  });

  it('shows an accessible error and retry action', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isRefetching: false,
      refetch: vi.fn(),
    } as never);

    const markup = renderToStaticMarkup(createElement(VisualSearchAuditPage));
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Try again');
  });

  it('renders an empty state when there is no history', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { items: [], page: 1, limit: 25, total: 0 },
      isLoading: false,
      isError: false,
      isRefetching: false,
      refetch: vi.fn(),
    } as never);

    const markup = renderToStaticMarkup(createElement(VisualSearchAuditPage));
    expect(markup).toContain('No Visual Search activity yet');
    expect(markup).toContain('Completed or failed operations will appear here.');
  });

  it('renders safe operational metadata and omits vectors', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: {
        items: [{
          id: 'event-1',
          operation: 'VISUAL_SEARCH',
          timestamp: '2026-10-01T12:00:00.000Z',
          productId: null,
          status: 'success',
          resultCount: 4,
          durationMs: 52,
          provider: 'configured-provider',
          model: 'model-v1',
          embeddingStatus: 'INDEXED',
        }],
        page: 1,
        limit: 25,
        total: 30,
      },
      isLoading: false,
      isError: false,
      isRefetching: false,
      refetch: vi.fn(),
    } as never);

    const markup = renderToStaticMarkup(createElement(VisualSearchAuditPage));
    expect(markup).toContain('configured-provider / model-v1');
    expect(markup).toContain('INDEXED');
    expect(markup).toContain('4');
    expect(markup).toContain('52 ms');
    expect(markup).not.toContain('embedding');
    expect(markup).toContain('1 / 2');
    expect(markup).toContain('Next');
  });
});
