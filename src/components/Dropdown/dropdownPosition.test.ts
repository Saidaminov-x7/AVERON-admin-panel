import { describe, expect, it } from 'vitest';
import { getDropdownPosition } from './dropdownPosition';

describe('getDropdownPosition', () => {
  it('keeps a dropdown inside the viewport and aligns it to the right edge', () => {
    expect(getDropdownPosition({
      anchor: { top: 40, right: 390, bottom: 80, left: 330 },
      panelWidth: 180,
      panelHeight: 140,
      viewportWidth: 400,
      viewportHeight: 800,
      align: 'right',
    })).toEqual({ top: 86, left: 210, maxHeight: 140, maxWidth: 384 });
  });

  it('flips above an anchor near the bottom of the viewport', () => {
    expect(getDropdownPosition({
      anchor: { top: 700, right: 250, bottom: 740, left: 200 },
      panelWidth: 160,
      panelHeight: 180,
      viewportWidth: 320,
      viewportHeight: 760,
      align: 'left',
    })).toEqual({ top: 514, left: 152, maxHeight: 180, maxWidth: 304 });
  });

  it('limits tall content and clamps the panel to narrow viewports', () => {
    const result = getDropdownPosition({
      anchor: { top: 80, right: 310, bottom: 110, left: 280 },
      panelWidth: 360,
      panelHeight: 900,
      viewportWidth: 320,
      viewportHeight: 500,
      align: 'right',
    });

    expect(result.maxHeight).toBe(376);
    expect(result.left).toBe(8);
    expect(result.top).toBe(116);
    expect(result.maxWidth).toBe(304);
  });
});
