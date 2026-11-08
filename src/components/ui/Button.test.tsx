import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('supports storefront variants and retains the admin primary alias', () => {
    const variants = ['default', 'primary', 'outline', 'ghost', 'link', 'danger'] as const;
    for (const variant of variants) {
      const markup = renderToStaticMarkup(createElement(Button, { variant }, 'Action'));
      expect(markup).toContain('Action');
      expect(markup).toContain('focus-visible:ring-2');
    }
    expect(renderToStaticMarkup(createElement(Button, { variant: 'primary' }, 'Save')))
      .toContain('bg-[var(--color-action-bg)]');
  });

  it('preserves legacy sizes and disables itself while loading', () => {
    for (const size of ['sm', 'md', 'default', 'lg', 'icon'] as const) {
      expect(renderToStaticMarkup(createElement(Button, { size }, 'Action'))).toContain('Action');
    }
    const markup = renderToStaticMarkup(createElement(Button, { loading: true }, 'Saving'));
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('Saving');
    expect(renderToStaticMarkup(createElement(Button, { loading: true, loadingLabel: 'Please wait' }, 'Saving')))
      .toContain('Please wait');
  });
});
