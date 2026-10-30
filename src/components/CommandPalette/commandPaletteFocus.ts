export const getTabBoundaryTarget = (
  focusable: HTMLElement[],
  activeElement: Element | null,
  backwards: boolean,
): HTMLElement | null => {
  if (focusable.length === 0) return null;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (backwards && (activeElement === first || !focusable.includes(activeElement as HTMLElement))) return last;
  if (!backwards && (activeElement === last || !focusable.includes(activeElement as HTMLElement))) return first;
  return null;
};

export const restoreOpenerFocus = (opener: HTMLElement | null) => {
  if (opener?.isConnected) opener.focus();
};
