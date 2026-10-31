import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar/Sidebar';
import Header from './Header/Header';
import { CommandPalette } from './CommandPalette/CommandPalette';
import { useTranslation } from 'react-i18next';
import { resetRouteScroll } from './resetRouteScroll';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  persistent?: boolean;
}

const PersistentLayoutContext = createContext<((title?: string) => void) | null>(null);

const Layout: React.FC<LayoutProps> = ({ children, title, persistent = false }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const updatePersistentTitle = useContext(PersistentLayoutContext);
  const [pageTitle, setPageTitle] = useState(title);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
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

  useEffect(() => {
    if (updatePersistentTitle && !persistent) return;
    resetRouteScroll(mainScrollRef.current);
  }, [location.pathname, persistent, updatePersistentTitle]);

  useLayoutEffect(() => {
    if (!isMobileMenuOpen) return;
    const focusFirstDrawerControl = () => {
      const drawer = drawerRef.current;
      const closeButton = drawer?.querySelector<HTMLElement>('[data-action-id="admin.sidebar.close-mobile-navigation"]');
      const firstVisibleControl = drawer?.querySelectorAll<HTMLElement>(
        'a[href]:not([tabindex="-1"]), button:not(:disabled):not([tabindex="-1"]), input:not(:disabled):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
      );
      (closeButton ?? Array.from(firstVisibleControl ?? []).find((element) => element.getClientRects().length > 0))?.focus({ preventScroll: true });
    };
    focusFirstDrawerControl();
    const frame = requestAnimationFrame(focusFirstDrawerControl);
    return () => cancelAnimationFrame(frame);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (updatePersistentTitle && !persistent) return;
    if (isMobileMenuOpen && focusRestoreFrameRef.current !== null) {
      cancelAnimationFrame(focusRestoreFrameRef.current);
      focusRestoreFrameRef.current = null;
    }
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = mobileMenuTriggerRef.current;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        if (activeElement?.closest('[data-admin-drawer-portal]')) return;
        if (activeElement?.closest('[aria-haspopup="menu"][aria-expanded="true"]')) return;
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
      )).filter((element) => element.getClientRects().length > 0);
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
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (trigger) {
        focusRestoreFrameRef.current = requestAnimationFrame(() => {
          focusRestoreFrameRef.current = null;
          if (trigger.isConnected) trigger.focus({ preventScroll: true });
        });
      }
    };
  }, [isMobileMenuOpen, persistent, updatePersistentTitle]);

  if (updatePersistentTitle && !persistent) return <>{children}</>;

  const toggleMobileMenu = () => {
    const opening = !isMobileMenuOpen;
    setIsMobileMenuOpen(opening);
    if (opening) {
      window.setTimeout(() => {
        const drawer = drawerRef.current;
        if (drawer?.dataset.open !== 'true' || drawer.contains(document.activeElement)) return;
        const closeButton = drawer.querySelector<HTMLElement>('[data-action-id="admin.sidebar.close-mobile-navigation"]');
        const firstVisibleControl = Array.from(drawer.querySelectorAll<HTMLElement>(
          'a[href]:not([tabindex="-1"]), button:not(:disabled):not([tabindex="-1"]), input:not(:disabled):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
        )).find((element) => element.getClientRects().length > 0);
        (closeButton ?? firstVisibleControl)?.focus({ preventScroll: true });
      }, 80);
    }
  };

  const shell = (
    <div className="averon-admin-shell flex h-dvh overflow-hidden bg-app">
      <CommandPalette />
      {/* Глобальная командная строка / Поиск */}
      {/* Затемнение фона для мобильного меню (Backdrop) */}
      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label={t('header.closeMenu')}
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 cursor-default bg-black/45 backdrop-blur-[2px] transition-opacity duration-300 ease-out lg:hidden"
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
        className={`admin-mobile-navigation fixed inset-0 z-50 h-dvh w-screen max-w-full transition-[transform,visibility] duration-300 [transition-timing-function:var(--ease-drawer)] lg:visible lg:relative lg:inset-y-0 lg:right-auto lg:h-auto lg:w-[var(--admin-sidebar-width)] lg:max-w-none ${
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
          onToggleMobileMenu={toggleMobileMenu}
          isMobileMenuOpen={isMobileMenuOpen}
          mobileMenuTriggerRef={mobileMenuTriggerRef}
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
