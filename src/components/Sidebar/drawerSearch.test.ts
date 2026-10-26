import { afterEach, describe, expect, it, vi } from 'vitest';
import { openDrawerSearch } from './drawerSearch';

describe('openDrawerSearch', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('waits for drawer focus restoration before opening the command palette', () => {
    const order: string[] = [];
    const frames: FrameRequestCallback[] = [];
    const events = new EventTarget();
    vi.stubGlobal('window', events as unknown as Window);
    vi.stubGlobal('CustomEvent', class extends Event {});
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return 1;
    });
    events.addEventListener('open-command-palette', () => order.push('palette'), { once: true });

    openDrawerSearch(() => {
      order.push('close');
      requestAnimationFrame(() => order.push('restore-focus'));
    });
    const flushFrame = () => frames.splice(0).forEach((callback) => callback(0));
    flushFrame();
    expect(order).toEqual(['close', 'restore-focus']);
    flushFrame();

    expect(order).toEqual(['close', 'restore-focus', 'palette']);
  });
});
