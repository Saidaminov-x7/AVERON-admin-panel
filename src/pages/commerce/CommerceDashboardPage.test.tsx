import { createElement, type ComponentProps, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CommerceDashboardPage from './CommerceDashboardPage';
import type { DashboardData } from '../../lib/commerceApi';
import enMessages from '../../messages/en.json';
import ruMessages from '../../messages/ru.json';
import uzMessages from '../../messages/uz.json';

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  language: 'en',
  buttonProps: null as unknown,
}));

const localeMessages = { en: enMessages, ru: ruMessages, uz: uzMessages };

vi.mock('@tanstack/react-query', () => ({ useQuery: mocks.useQuery }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | { defaultValue?: string }) => {
      const [namespace, messageKey] = key.split('.');
      const messages = localeMessages[mocks.language as keyof typeof localeMessages];
      const namespaceMessages = namespace in messages ? messages[namespace as keyof typeof messages] : undefined;
      const translation = namespaceMessages && messageKey in namespaceMessages
        ? namespaceMessages[messageKey as keyof typeof namespaceMessages]
        : undefined;
      return translation ?? (typeof fallback === 'string' ? fallback : fallback?.defaultValue ?? key);
    },
    i18n: { language: mocks.language },
  }),
}));
vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => createElement('main', null, children),
}));
vi.mock('../../components/ui', () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => createElement('section', { className }, children),
  Button: (props: ComponentProps<'button'> & {
    loading?: boolean;
    leftIcon?: ReactNode;
    variant?: string;
    size?: string;
  }) => {
    mocks.buttonProps = props;
    return createElement(
      'button',
      {
        type: 'button',
        className: props.className,
        disabled: props.disabled || props.loading,
        'aria-busy': props['aria-busy'],
        onClick: props.onClick,
      },
      props.leftIcon,
      props.children,
    );
  },
}));

function dashboardData(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    products: { published: 0, pendingReview: 0, rejected: 0, ...overrides.products },
    orders: { total: 0, ...overrides.orders },
    users: { total: 0, ...overrides.users },
    finance: { revenue: 0, netProfit: 0, expenses: 0, ...overrides.finance },
  };
}

function renderPage() {
  return renderToStaticMarkup(createElement(CommerceDashboardPage));
}

function countMatches(value: string, pattern: RegExp) {
  return value.match(pattern)?.length ?? 0;
}

describe('commerce dashboard data states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.language = 'en';
    mocks.buttonProps = null;
    mocks.useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });
  });

  it('keeps the six-card grid while announcing the initial loading state', () => {
    mocks.useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      isFetching: true,
      refetch: vi.fn(),
    });

    const markup = renderPage();

    expect(markup).toContain('role="status"');
    expect(markup).toContain(enMessages.commerce.dashboardLoading);
    expect(countMatches(markup, /h-8 w-32 animate-pulse motion-reduce:animate-none bg-surface-soft/g)).toBe(6);
    expect(markup).not.toContain('0 UZS');
    expect(markup).not.toContain('Revenue');
  });

  it('hides metrics and offers a retry when the initial request fails', () => {
    mocks.useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch: vi.fn(),
    });

    const markup = renderPage();

    expect(markup).toContain('role="alert"');
    expect(markup).toContain(enMessages.commerce.dashboardUnavailableTitle);
    expect(markup).toContain(enMessages.commerce.dashboardUnavailableDescription);
    expect(markup).toContain(enMessages.commerce.retry);
    expect(markup).not.toContain('0 UZS');
    expect(markup).not.toContain('Revenue');
    expect(mocks.buttonProps).toMatchObject({ loading: false, disabled: false });
  });

  it('shows zeros only when the API returned actual zero values', () => {
    mocks.useQuery.mockReturnValue({
      data: dashboardData(),
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    const markup = renderPage();

    expect(countMatches(markup, />0 UZS<\/div>/g)).toBe(2);
    expect(countMatches(markup, />0<\/div>/g)).toBe(4);
    expect(markup).toContain(enMessages.commerce.revenue);
    expect(markup).toContain(enMessages.commerce.orders);
  });

  it('formats nonzero metrics with the active locale', () => {
    mocks.language = 'en';
    mocks.useQuery.mockReturnValue({
      data: dashboardData({
        products: { published: 24, pendingReview: 3, rejected: 0 },
        orders: { total: 12 },
        users: { total: 11 },
        finance: { revenue: 1_234_567, netProfit: 234_000, expenses: 1_000 },
      }),
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    const englishMarkup = renderPage();
    expect(englishMarkup).toContain('1,234,567 UZS');
    expect(englishMarkup).toContain('234,000 UZS');
    expect(englishMarkup).toContain('>12</div>');
    expect(englishMarkup).toContain('>24</div>');

    mocks.language = 'uz';
    const uzbekMarkup = renderPage();
    expect(uzbekMarkup).toMatch(/1[\s\u00a0\u202f]234[\s\u00a0\u202f]567/);
  });

  it('keeps successfully loaded metrics visible and marks them stale after a refetch error', () => {
    mocks.useQuery.mockReturnValue({
      data: dashboardData({
        products: { published: 7, pendingReview: 2, rejected: 0 },
        orders: { total: 5 },
        users: { total: 3 },
        finance: { revenue: 80_000, netProfit: 25_000, expenses: 55_000 },
      }),
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch: vi.fn(),
    });

    const markup = renderPage();

    expect(markup).toContain('role="status"');
    expect(markup).toContain(enMessages.commerce.dashboardStaleWarning);
    expect(markup).toContain('80,000 UZS');
    expect(markup).toContain('>5</div>');
    expect(markup).not.toContain('role="alert"');
  });

  it('calls retry once and disables it while a retry is pending', () => {
    const refetch = vi.fn();
    mocks.useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch,
    });

    renderPage();
    const idleButton = mocks.buttonProps as ComponentProps<'button'> & { loading?: boolean };
    expect(idleButton).toMatchObject({ loading: false, disabled: false });
    (idleButton.onClick as () => void)();
    expect(refetch).toHaveBeenCalledTimes(1);

    mocks.useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: true,
      refetch,
    });
    const pendingMarkup = renderPage();
    const pendingButton = mocks.buttonProps as ComponentProps<'button'> & { loading?: boolean };
    expect(pendingButton).toMatchObject({ loading: true, disabled: true, 'aria-busy': true });
    expect(pendingMarkup).toContain('disabled=""');
  });

  it('has loading, error, retry and stale copy in all supported locales', () => {
    for (const messages of [enMessages, ruMessages, uzMessages]) {
      expect(messages.commerce.dashboardLoading).toBeTruthy();
      expect(messages.commerce.dashboardUnavailableTitle).toBeTruthy();
      expect(messages.commerce.dashboardUnavailableDescription).toBeTruthy();
      expect(messages.commerce.dashboardStaleWarning).toBeTruthy();
      expect(messages.commerce.retry).toBeTruthy();
    }
  });
});
