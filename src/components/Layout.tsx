import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
    if (focusRestoreFrameRef.current !== null) {
      cancelAnimationFrame(focusRestoreFrameRef.current);
      focusRestoreFrameRef.current = null;
    }
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => {
      drawerRef.current?.querySelector<HTMLElement>('a[href], button:not(:disabled)')?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsMobileMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;
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
      cancelAnimationFrame(frame);
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
    <div className="averon-admin-shell flex h-dvh overflow-hidden bg-app">
      <CommandPalette />
      {/* Глобальная командная строка / Поиск */}
      {/* Затемнение фона для мобильного меню (Backdrop) */}
      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label={t('header.closeMenu')}
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 cursor-default bg-black/55 backdrop-blur-sm transition-opacity duration-200 ease-out lg:hidden"
        />
      )}

      {/* Боковое меню (Sidebar) с поддержкой мобильного Drawer */}
      <div
        ref={drawerRef}
        id="admin-mobile-navigation"
        role={isMobileMenuOpen ? 'dialog' : undefined}
        aria-modal={isMobileMenuOpen ? true : undefined}
        aria-label={isMobileMenuOpen ? t('header.mobileNavigation') : undefined}
        tabIndex={-1}
        className={`admin-mobile-navigation fixed inset-y-0 right-0 z-50 transition-[transform,visibility] duration-[280ms] [transition-timing-function:var(--ease-drawer)] lg:visible lg:relative ${
          isMobileMenuOpen ? 'is-open' : 'is-closed'
        }`}
      >
        <Sidebar onCloseMobile={() => setIsMobileMenuOpen(false)} />
      </div>

      {/* Основная область */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden" inert={isMobileMenuOpen}>
        {/* Верхняя панель */}
        <Header
          title={persistent ? pageTitle : title}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMobileMenuOpen={isMobileMenuOpen}
        />

        {/* Контент страницы */}
        <main className="admin-scroll safe-bottom flex-1 overflow-x-hidden overflow-y-auto p-3 min-[390px]:p-4 sm:p-6 lg:p-8 animate-fade-in">
          <div className="admin-page-frame mx-auto w-full max-w-[1320px] space-y-4 sm:space-y-6">
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
