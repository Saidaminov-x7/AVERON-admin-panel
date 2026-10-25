export function openDrawerSearch(closeDrawer?: () => void) {
  closeDrawer?.();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('open-command-palette')));
  });
}
