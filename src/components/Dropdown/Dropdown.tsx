import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getDropdownPosition } from './dropdownPosition';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  contentClassName?: string;
  portal?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  align = 'left',
  className = '',
  contentClassName = '',
  portal = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; maxHeight: number; maxWidth: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = React.useId();

  const updatePosition = useCallback(() => {
    const triggerElement = triggerRef.current;
    const panelElement = panelRef.current;
    if (!triggerElement || !panelElement) return;

    const rect = triggerElement.getBoundingClientRect();
    const panelRect = panelElement.getBoundingClientRect();
    const drawer = portal ? triggerElement.closest<HTMLElement>('.admin-mobile-navigation') : null;
    const drawerFooter = drawer?.querySelector<HTMLElement>('[data-admin-drawer-footer]');
    const drawerFooterTop = drawerFooter?.getBoundingClientRect().top;
    setPosition(getDropdownPosition({
      anchor: { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left },
      panelWidth: panelRect.width,
      panelHeight: panelElement.scrollHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: typeof drawerFooterTop === 'number' && drawerFooterTop > 0
        ? Math.min(window.innerHeight, drawerFooterTop)
        : window.innerHeight,
      align,
    }));
  }, [align, portal]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) return;
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
      ) ?? []);
      if (!items.length) return;
      event.preventDefault();
      const activeIndex = items.indexOf(document.activeElement as HTMLElement);
      const nextIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowUp'
            ? (activeIndex <= 0 ? items.length - 1 : activeIndex - 1)
            : (activeIndex + 1) % items.length;
      items[nextIndex].focus();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const openAndFocus = () => {
    setIsOpen(true);
    requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')?.focus();
    });
  };

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-haspopup="menu"
        onClick={() => isOpen ? setIsOpen(false) : openAndFocus()}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            openAndFocus();
          }
        }}
        className="w-full"
      >
        {trigger}
      </button>

      {isOpen && (() => {
        const panel = (
        <div
          ref={panelRef}
          id={panelId}
          role="menu"
          data-admin-drawer-portal={portal ? '' : undefined}
          className={`fixed z-50 w-48 overflow-y-auto overscroll-contain rounded-xl border border-app bg-surface shadow-xl animate-fade-in ${contentClassName}`}
          style={{
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            maxHeight: position?.maxHeight ?? 'calc(100vh - 1rem)',
            maxWidth: position?.maxWidth ?? 'calc(100vw - 1rem)',
            visibility: position ? 'visible' : 'hidden',
          }}
          onClick={() => {
            setIsOpen(false);
            triggerRef.current?.focus();
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOpen(false);
          }}
        >
          {children}
        </div>
        );
        return portal ? createPortal(panel, document.body) : panel;
      })()}
    </div>
  );
};

export default Dropdown;
