import { describe, expect, it } from 'vitest';
import { getVisiblePageNumbers } from './paginationUtils';

describe('pagination page-number window', () => {
  it('keeps only the active page visible on narrow screens', () => {
    expect(getVisiblePageNumbers(10, 20, 320)).toEqual([10]);
    expect(getVisiblePageNumbers(1, 20, 390)).toEqual([1]);
  });

  it('shows three nearby pages on tablet widths and clamps at either end', () => {
    expect(getVisiblePageNumbers(10, 20, 768)).toEqual([9, 10, 11]);
    expect(getVisiblePageNumbers(1, 20, 900)).toEqual([1, 2, 3]);
    expect(getVisiblePageNumbers(20, 20, 900)).toEqual([18, 19, 20]);
  });

  it('shows five nearby pages on desktop and all pages for a short list', () => {
    expect(getVisiblePageNumbers(10, 20, 1024)).toEqual([8, 9, 10, 11, 12]);
    expect(getVisiblePageNumbers(1, 3, 1440)).toEqual([1, 2, 3]);
  });
});
