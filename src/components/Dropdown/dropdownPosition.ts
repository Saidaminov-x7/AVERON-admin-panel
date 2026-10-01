export interface DropdownPositionInput {
  anchor: { top: number; right: number; bottom: number; left: number };
  panelWidth: number;
  panelHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  align: 'left' | 'right';
}

export interface DropdownPosition {
  top: number;
  left: number;
  maxHeight: number;
  maxWidth: number;
}

export function getDropdownPosition({
  anchor,
  panelWidth,
  panelHeight,
  viewportWidth,
  viewportHeight,
  align,
}: DropdownPositionInput): DropdownPosition {
  const margin = 8;
  const gap = 6;
  const maxWidth = Math.max(0, viewportWidth - margin * 2);
  const width = Math.min(panelWidth, maxWidth);
  const spaceBelow = Math.max(0, viewportHeight - anchor.bottom - gap - margin);
  const spaceAbove = Math.max(0, anchor.top - gap - margin);
  const openAbove = panelHeight > spaceBelow && spaceAbove > spaceBelow;
  const maxHeight = Math.min(panelHeight, openAbove ? spaceAbove : spaceBelow);
  const height = maxHeight;
  const top = openAbove
    ? Math.max(margin, anchor.top - gap - height)
    : anchor.bottom + gap;
  const desiredLeft = align === 'right' ? anchor.right - width : anchor.left;
  const left = Math.min(Math.max(margin, desiredLeft), Math.max(margin, viewportWidth - margin - width));

  return { top, left, maxHeight, maxWidth };
}
