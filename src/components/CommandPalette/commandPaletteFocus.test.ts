import { describe, expect, it, vi } from 'vitest';
import { getTabBoundaryTarget, restoreOpenerFocus } from './commandPaletteFocus';

const focusable = (connected = true) => ({
  isConnected: connected,
  focus: vi.fn(),
}) as unknown as HTMLElement;

describe('Command Palette dialog focus management', () => {
  it('wraps Tab and Shift+Tab at the dialog boundaries', () => {
    const first = focusable();
    const middle = focusable();
    const last = focusable();
    const items = [first, middle, last];

    expect(getTabBoundaryTarget(items, last, false)).toBe(first);
    expect(getTabBoundaryTarget(items, first, true)).toBe(last);
    expect(getTabBoundaryTarget(items, middle, false)).toBeNull();
    expect(getTabBoundaryTarget([], null, false)).toBeNull();
  });

  it('restores focus to a connected opener after the dialog closes', () => {
    const opener = focusable();
    restoreOpenerFocus(opener);
    expect(opener.focus).toHaveBeenCalledOnce();
  });

  it('does not focus an opener that was removed during navigation', () => {
    const opener = focusable(false);
    restoreOpenerFocus(opener);
    expect(opener.focus).not.toHaveBeenCalled();
  });
});
