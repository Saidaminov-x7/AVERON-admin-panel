import { describe, expect, it } from 'vitest';
import { resetRouteScroll } from './resetRouteScroll';

describe('resetRouteScroll', () => {
  it('returns the shared route viewport to its origin', () => {
    const region = { scrollTop: 910, scrollLeft: 36 };

    resetRouteScroll(region);

    expect(region).toEqual({ scrollTop: 0, scrollLeft: 0 });
  });

  it('safely ignores a missing scroll region', () => {
    expect(() => resetRouteScroll(null)).not.toThrow();
    expect(() => resetRouteScroll(undefined)).not.toThrow();
  });
});
