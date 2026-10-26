import { describe, expect, it } from 'vitest';
import { formatCommerceNumber, getCommerceNumberLocale } from './commerceDashboardFormat';

describe('commerce dashboard number formatting', () => {
  it.each([
    ['ru', 'ru-RU'],
    ['uz', 'uz-UZ'],
    ['uz-UZ', 'uz-UZ'],
    ['en', 'en-US'],
    ['en-US', 'en-US'],
  ])('maps %s to the correct number locale', (language, locale) => {
    expect(getCommerceNumberLocale(language)).toBe(locale);
  });

  it('formats grouped amounts and refuses invalid numeric values', () => {
    expect(formatCommerceNumber(1234567, 'en')).toBe('1,234,567');
    expect(formatCommerceNumber('1234567.25', 'en')).toBe('1,234,567.25');
    expect(formatCommerceNumber('1234567.25', 'ru')).toBe('1 234 567,25');
    expect(formatCommerceNumber('not-an-amount', 'ru')).toBe('—');
  });
});
