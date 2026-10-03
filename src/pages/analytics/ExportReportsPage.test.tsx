import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ExportReportsPage from './ExportReportsPage';

vi.mock('../../components/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => createElement('main', null, children),
}));
vi.mock('../../lib/axios', () => ({ api: { get: vi.fn() } }));

describe('analytics report exports', () => {
  it('offers the supported products report instead of the retired listings report', () => {
    const markup = renderToStaticMarkup(createElement(ExportReportsPage));

    expect(markup).toContain('Статистика опубликованных товаров');
    expect(markup).toContain('value="products"');
    expect(markup).not.toContain('value="listings"');
    expect(markup).not.toContain('объявлений');
  });
});
