// src/components/Header/Header.tsx
// Верхняя панель — поиск, переключатели языка/темы и переход на сайт

import React from 'react';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import Dropdown from '../Dropdown/Dropdown';

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

interface HeaderProps {
  title?: string;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
  mobileMenuTriggerRef?: React.Ref<HTMLButtonElement>;
}

const Header: React.FC<HeaderProps> = ({ title, onToggleMobileMenu, isMobileMenuOpen = false, mobileMenuTriggerRef }) => {
  const { t, i18n } = useTranslation();

  // Получаем реальный рабочий URL сайта из переменных окружения
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://averon.uz';

  return (
    <header
      className="
        averon-admin-topbar h-16 w-full
        bg-surface border-b border-app
        flex-shrink-0 transition-colors duration-200 relative z-30
      "
    >
      <div className="mx-auto flex h-full w-full items-center justify-between">
      {/* Заголовок страницы + Гамбургер на мобилке */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="shrink-0 text-sm font-black tracking-[.18em] text-app lg:hidden">AVERON</span>
        {title && <h1 className="min-w-0 truncate border-l border-app pl-3 text-sm font-semibold text-app sm:text-xl lg:border-0 lg:pl-0">{title}</h1>}
      </div>

      {/* Правая часть */}
      <div className="admin-header-actions ml-auto flex shrink-0 items-center gap-2">
        {onToggleMobileMenu && (
          <button
            ref={mobileMenuTriggerRef}
            type="button"
            onClick={onToggleMobileMenu}
            aria-label={t(isMobileMenuOpen ? 'header.closeMenu' : 'header.openMenu')}
            aria-expanded={isMobileMenuOpen}
            aria-controls="admin-mobile-navigation"
            data-action-id="admin.sidebar.toggle-mobile-navigation"
            className="inline-flex h-11 w-11 items-center justify-center rounded border border-app bg-surface text-app transition-colors hover:bg-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:hidden"
          >
            {isMobileMenuOpen ? (
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m18 6-12 12M6 6l12 12" /></svg>
            ) : (
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            )}
          </button>
        )}
        <div className="hidden items-center gap-1.5 lg:flex sm:gap-2">
        {/* Поиск / Command Palette */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          id="header-search-btn"
          className="
            hidden sm:flex items-center gap-2 pl-9 pr-3 h-11 text-sm rounded w-52 md:w-64
            bg-gray-50 dark:bg-white/5
            border border-app hover:border-[var(--color-text-secondary)]
            text-muted hover:text-app
            transition-all duration-150 relative cursor-pointer group
          "
        >
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-hover:text-app transition-colors">
            <SearchIcon />
          </span>
          <span className="truncate text-xs md:text-sm">{t('common.search', 'Поиск по панели...')}</span>
          <kbd className="ml-auto text-[11px] font-mono px-1.5 py-0.5 bg-gray-200 dark:bg-white/10 text-muted opacity-80 group-hover:opacity-100">
            ⌘K
          </kbd>
        </button>

        {/* Языковой переключатель (RU / UZ / EN) через кастомный Dropdown */}
        <Dropdown
          align="right"
          scrollable={false}
          trigger={
            <div data-action-id="admin.header.language-indicator" className="flex items-center justify-between gap-1.5 h-11 px-3 text-xs font-semibold bg-surface border border-app text-app hover:border-primary-500 transition-colors cursor-pointer select-none">
              <span>{(i18n.language?.slice(0, 2) || 'ru').toUpperCase()}</span>
              <span className="sr-only">{t('common.language', 'Язык')}</span>
            </div>
          }
          contentClassName="w-32 p-1 border border-app rounded bg-surface shadow-xl"
        >
          {([
            { code: 'ru', label: 'Русский' },
            { code: 'uz', label: 'Oʻzbek' },
            { code: 'en', label: 'English' },
          ] as const).map((lang) => {
            const active = (i18n.language?.slice(0, 2) || 'ru') === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                data-action-id={`admin.header.select-language.${lang.code}`}
                onClick={() => {
                  i18n.changeLanguage(lang.code);
                  localStorage.setItem('i18nextLng', lang.code);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm text-xs font-medium text-left transition-colors cursor-pointer ${
                  active ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] font-semibold' : 'text-app hover:bg-[var(--color-surface-soft)]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-7 text-[11px] font-semibold tracking-wide text-muted">{lang.code.toUpperCase()}</span>
                  {({ ru: 'Русский', uz: 'Oʻzbek', en: 'English' } as const)[lang.code]}
                </span>
              </button>
            );
          })}
        </Dropdown>

        {/* Переключатель темы */}
        <ThemeToggle />

        {/* Кнопка "Перейти на сайт" */}
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          id="go-to-site-btn"
          className="
            hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm font-medium
            text-primary-600 dark:text-primary-400
            border border-primary-500
            hover:bg-primary-50 dark:hover:bg-primary-900/20
            transition-all duration-150 cursor-pointer
          "
        >
          {t('header.goToSite', 'Перейти на сайт')}
          <ExternalLinkIcon />
        </a>
        </div>
      </div>
      </div>
    </header>
  );
};

export default Header;
