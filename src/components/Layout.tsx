import React, { useState } from 'react';
import Sidebar from './Sidebar/Sidebar';
import Header from './Header/Header';
import { CommandPalette } from './CommandPalette/CommandPalette';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-app">
      <CommandPalette />
      {/* Глобальная командная строка / Поиск */}
      {/* Затемнение фона для мобильного меню (Backdrop) */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden transition-opacity duration-200 ease-out"
        />
      )}

      {/* Боковое меню (Sidebar) с поддержкой мобильного Drawer */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 transform lg:relative lg:translate-x-0 transition-transform duration-[280ms] [transition-timing-function:var(--ease-drawer)]
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar onCloseMobile={() => setIsMobileMenuOpen(false)} />
      </div>

      {/* Основная область */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Верхняя панель */}
        <Header
          title={title}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {/* Контент страницы */}
        <main className="admin-scroll safe-bottom flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
          <div className="mx-auto w-full max-w-[1440px] space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
