import { describe, expect, it } from 'vitest';
import { getAveragePaidOrderValue, validateAnalyticsDateRange } from './analyticsDateRange';

describe('validateAnalyticsDateRange', () => {
  it('accepts a single day and inclusive ranges up to 365 days', () => {
    expect(validateAnalyticsDateRange('2026-10-26', '2026-10-26')).toBeNull();
    expect(validateAnalyticsDateRange('2025-10-27', '2026-10-26')).toBeNull();
  });

  it('rejects incomplete, invalid, reversed, and overlong ranges', () => {
    expect(validateAnalyticsDateRange('', '2026-10-26')).toBe('required');
    expect(validateAnalyticsDateRange('2026-02-30', '2026-03-01')).toBe('invalid');
    expect(validateAnalyticsDateRange('2026-10-27', '2026-10-26')).toBe('startAfterEnd');
    expect(validateAnalyticsDateRange('2025-10-26', '2026-10-26')).toBe('tooLong');
  });
});

describe('getAveragePaidOrderValue', () => {
  it('derives average paid order value from net revenue and paid order count', () => {
    expect(getAveragePaidOrderValue(125_000, 2)).toBe(62_500);
    expect(getAveragePaidOrderValue(0, 3)).toBe(0);
  });

  it('returns no value when the denominator or source data is unavailable', () => {
    expect(getAveragePaidOrderValue(100, 0)).toBeNull();
    expect(getAveragePaidOrderValue(undefined, 2)).toBeNull();
    expect(getAveragePaidOrderValue(Number.NaN, 2)).toBeNull();
  });
});
