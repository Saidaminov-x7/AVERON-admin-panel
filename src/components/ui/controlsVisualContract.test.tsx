import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { Input } from './Input';
import { Select } from './Select';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'select.choose': 'Choose...',
      'select.clear': 'Clear selected value',
      'select.searchPlaceholder': 'Search...',
      'select.noOptions': 'No results found',
      'common.clearField': 'Clear field',
    }[key] ?? key),
  }),
}));

describe('shared admin control visual and semantic contract', () => {
  it('renders square primary and checkbox controls with neutral brand tokens', () => {
    const button = renderToStaticMarkup(createElement(Button, null, 'Save'));
    const checkbox = renderToStaticMarkup(createElement(Checkbox, { label: 'Enabled', checked: true }));

    expect(button).toContain('rounded-none');
    expect(button).toContain('bg-[var(--color-primary)]');
    expect(button).toContain('text-[var(--color-on-primary)]');
    expect(checkbox).toContain('rounded-none');
    expect(checkbox).toContain('h-11 w-11');
    expect(checkbox).toContain('h-[18px] w-[18px]');
    expect(checkbox).toContain('peer-checked:bg-[var(--color-primary)]');
    expect(checkbox).not.toContain('peer-checked:bg-primary-500');
  });

  it('renders the Select clear action as a separate named button', () => {
    const markup = renderToStaticMarkup(createElement(Select, {
      label: 'Status',
      value: 'active',
      options: [{ value: 'active', label: 'Active' }],
      clearable: true,
      onChange: () => undefined,
    }));

    expect(markup).toContain('aria-label="Status: Clear selected value"');
    expect(markup).toContain('title="Clear selected value"');
    expect(markup).not.toContain('role="button"');
    expect(markup).toContain('rounded-none');
  });

  it('renders a localized clear button for populated search inputs', () => {
    const markup = renderToStaticMarkup(createElement(Input, {
      type: 'search',
      value: 'shirt',
      clearable: true,
      onClear: () => undefined,
      onChange: () => undefined,
    }));

    expect(markup).toContain('aria-label="Clear field"');
    expect(markup).toContain('title="Clear field"');
    expect(markup).toContain('type="search"');
    expect(markup).toContain('rounded-none');
  });
});
