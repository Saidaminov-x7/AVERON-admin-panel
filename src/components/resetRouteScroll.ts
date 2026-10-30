export function resetRouteScroll(region: Pick<HTMLElement, 'scrollTop' | 'scrollLeft'> | null | undefined) {
  if (!region) return;
  region.scrollTop = 0;
  region.scrollLeft = 0;
}
