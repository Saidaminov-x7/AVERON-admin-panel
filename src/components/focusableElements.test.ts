import { describe, expect, it, vi } from 'vitest';
import { getVisibleFocusableElements } from './focusableElements';

describe('getVisibleFocusableElements', () => {
  it('excludes responsive controls hidden at the current breakpoint', () => {
    const visible = { getClientRects: () => [{ width: 44, height: 44 }] } as unknown as HTMLElement;
    const hidden = { getClientRects: () => [] } as unknown as HTMLElement;
    const container = {
      querySelectorAll: vi.fn(() => [visible, hidden]),
    } as unknown as HTMLElement;

    expect(getVisibleFocusableElements(container)).toEqual([visible]);
  });

  it('returns no focus targets when the drawer has no visible controls', () => {
    const container = {
      querySelectorAll: vi.fn(() => []),
    } as unknown as HTMLElement;

    expect(getVisibleFocusableElements(container)).toEqual([]);
  });
});
