import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Sidebar from './Sidebar/Sidebar';
import Header from './Header/Header';
import { CommandPalette } from './CommandPalette/CommandPalette';
import { useTranslation } from 'react-i18next';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  persistent?: boolean;
}

const PersistentLayoutContext = createContext<((title?: string) => void) | null>(null);

const Layout: React.FC<LayoutProps> = ({ children, title, persistent = false }) => {
  const { t } = useTranslation();
  const updatePersistentTitle = useContext(PersistentLayoutContext);
  const [pageTitle, setPageTitle] = useState(title);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const focusReturnRef = useRef<HTMLElement | null>(null);
  const focusRestoreFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (updatePersistentTitle && !persistent) updatePersistentTitle(title);
  }, [persistent, title, updatePersistentTitle]);

  useEffect(() => {
    if (updatePersistentTitle && !persistent) return;
    const desktopViewport = window.matchMedia('(min-width: 1024px)');
    const closeDrawerOnDesktop = () => {
      if (desktopViewport.matches) setIsMobileMenuOpen(false);
    };
    desktopViewport.addEventListener('change', closeDrawerOnDesktop);
    return () => desktopViewport.removeEventListener('change', closeDrawerOnDesktop);
  }, [persistent, updatePersistentTitle]);

  useLayoutEffect(() => {
    if (updatePersistentTitle && !persistent) return;
    if (!isMobileMenuOpen) return;
    if (focusRestoreFrameRef.current !== null) {
      cancelAnimationFrame(focusRestoreFrameRef.current);
      focusRestoreFrameRef.current = null;
    }
    const previousOverflow = document.body.style.overflow;
      const previouslyFocused = focusReturnRef.current
        ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    document.body.style.overflow = 'hidden';
    let focusDrawer = true;
    let focusFrame = 0;
    const focusInsideDrawer = (attempt = 0) => {
      if (!focusDrawer || !drawerRef.current) return;
      const initialFocusTarget = drawerRef.current.querySelector<HTMLElement>(
        '[data-action-id="admin.sidebar.close-mobile-navigation"], a[href], button:not(:disabled)',
      );
      (initialFocusTarget ?? drawerRef.current).focus({ preventScroll: true });
      if (!drawerRef.current.contains(document.activeElement) && attempt < 5) {
        focusFrame = requestAnimationFrame(() => focusInsideDrawer(attempt + 1));
      }
    };
    focusFrame = requestAnimationFrame(() => focusInsideDrawer());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        if (activeElement?.closest('[data-admin-drawer-portal]')) return;
        event.preventDefault();
        setIsMobileMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const activePortalMenu = activeElement?.closest<HTMLElement>('[data-admin-drawer-portal]');
      if (activePortalMenu?.id) {
        const languageTrigger = Array.from(drawerRef.current.querySelectorAll<HTMLButtonElement>('button[aria-controls]'))
          .find((button) => button.getAttribute('aria-controls') === activePortalMenu.id);
        if (languageTrigger) {
          event.preventDefault();
          languageTrigger.click();
          if (event.shiftKey) {
            languageTrigger.focus();
          } else {
            const drawerFocusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(
              'a[href]:not([tabindex="-1"]), button:not(:disabled):not([tabindex="-1"]), input:not(:disabled):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
            ));
            const triggerIndex = drawerFocusable.indexOf(languageTrigger);
            const next = drawerFocusable[triggerIndex + 1] ?? drawerFocusable[0];
            next?.focus();
          }
          return;
        }
      }
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href]:not([tabindex="-1"]), button:not(:disabled):not([tabindex="-1"]), input:not(:disabled):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) {
        event.preventDefault();
        drawerRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !drawerRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !drawerRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      focusDrawer = false;
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused) {
        focusRestoreFrameRef.current = requestAnimationFrame(() => {
          focusRestoreFrameRef.current = null;
          if (previouslyFocused.isConnected) previouslyFocused.focus();
        });
      }
    };
  }, [isMobileMenuOpen, persistent, updatePersistentTitle]);

  if (updatePersistentTitle && !persistent) return <>{children}</>;

  const shell = (
    <div
      className="averon-admin-shell flex h-dvh overflow-hidden bg-app"
      onClickCapture={(event) => {
        const target = event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-action-id="admin.sidebar.toggle-mobile-navigation"]')
          : null;
        if (target && !isMobileMenuOpen) focusReturnRef.current = target;
        if (target && isMobileMenuOpen) focusReturnRef.current = null;
      }}
    >
      <CommandPalette />
      {/* Глобальная командная строка / Поиск */}
      {/* Затемнение фона для мобильного меню (Backdrop) */}
      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label={t('header.closeMenu')}
          aria-hidden="true"
          tabIndex={-1}
          data-action-id="admin.sidebar.close-mobile-navigation-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 cursor-default bg-black/45 transition-opacity duration-200 ease-out lg:hidden"
        />
      )}

      {/* Боковое меню (Sidebar) с поддержкой мобильного Drawer */}
      <div
        ref={drawerRef}
        id="admin-mobile-navigation"
        data-open={String(isMobileMenuOpen)}
        role={isMobileMenuOpen ? 'dialog' : undefined}
        aria-modal={isMobileMenuOpen ? true : undefined}
        aria-label={isMobileMenuOpen ? t('header.mobileNavigation') : undefined}
        tabIndex={-1}
          className={`admin-mobile-navigation fixed inset-0 z-50 h-dvh w-[min(92vw,400px)] max-w-full transition-[transform,visibility] duration-[280ms] [transition-timing-function:var(--ease-drawer)] lg:visible lg:relative lg:inset-y-0 lg:right-auto lg:h-auto lg:w-[var(--admin-sidebar-width)] lg:max-w-none ${
          isMobileMenuOpen ? 'is-open' : 'is-closed'
        }`}
      >
        <Sidebar isMobileOpen={isMobileMenuOpen} onCloseMobile={() => setIsMobileMenuOpen(false)} />
      </div>

      {/* Основная область */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden" inert={isMobileMenuOpen}>
        {/* Верхняя панель */}
        <Header
          title={persistent ? pageTitle : title}
          onToggleMobileMenu={() => {
            if (!isMobileMenuOpen) {
              focusReturnRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
              setIsMobileMenuOpen(true);
              requestAnimationFrame(() => requestAnimationFrame(() => {
                drawerRef.current?.querySelector<HTMLElement>(
                  '[data-action-id="admin.sidebar.close-mobile-navigation"], a[href], button:not(:disabled)',
                )?.focus();
              }));
            } else {
              setIsMobileMenuOpen(false);
            }
          }}
          isMobileMenuOpen={isMobileMenuOpen}
        />

        {/* Контент страницы */}
        <main className="admin-scroll safe-bottom flex-1 overflow-x-hidden overflow-y-auto p-3 min-[390px]:p-4 sm:p-6 lg:p-8 animate-fade-in">
          <div className="admin-page-frame mx-auto w-full max-w-[1440px] space-y-4 sm:space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
  return persistent
    ? <PersistentLayoutContext.Provider value={setPageTitle}>{shell}</PersistentLayoutContext.Provider>
    : shell;
};

export default Layout;
