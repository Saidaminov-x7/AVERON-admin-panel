const DEFAULT_SIDEBAR_WIDTH = 256;
const MIN_SIDEBAR_WIDTH = 232;
const MAX_SIDEBAR_WIDTH = 320;

export function getSidebarWidthPreference(savedWidth: string | null): number {
  if (savedWidth === null || savedWidth.trim() === "") return DEFAULT_SIDEBAR_WIDTH;

  const width = Number(savedWidth);
  if (!Number.isFinite(width)) return DEFAULT_SIDEBAR_WIDTH;

  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
}
