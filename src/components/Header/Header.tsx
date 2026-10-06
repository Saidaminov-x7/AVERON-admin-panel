// src/components/Header/Header.tsx
// Верхняя панель — поиск, переключатель темы, реальные уведомления, переход на сайт

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import Dropdown from '../Dropdown/Dropdown';
import { CountBadge } from '../ui/CountBadge';
import { LanguageFlag } from '../ui/LanguageFlag';
import {
  getNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from '../../lib/notificationsApi';
import type { AdminNotificationItem } from '../../lib/notificationsApi';

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const CheckAllIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

interface HeaderProps {
  title?: string;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, onToggleMobileMenu, isMobileMenuOpen = false }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationTriggerRef = useRef<HTMLButtonElement>(null);

  // Получаем реальный рабочий URL сайта из переменных окружения
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://averon.uz';

  // Запрос уведомлений с периодическим обновлением раз в 30 секунд
  const { data: notifData } = useQuery({
    queryKey: ['admin', 'notifications'],
    queryFn: getNotificationsApi,
    refetchInterval: 30000,
  });

  const notifications = notifData?.items || [];
  const unreadCount = notifData?.unreadCount || 0;

  // Мутация: прочитать одно уведомление
  const markReadMutation = useMutation({
    mutationFn: markNotificationReadApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
  });

  // Мутация: прочитать все уведомления
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsReadApi,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'notifications'] });
      const previous = queryClient.getQueryData<{ items: AdminNotificationItem[]; unreadCount: number }>(['admin', 'notifications']);
      queryClient.setQueryData<{ items: AdminNotificationItem[]; unreadCount: number }>(
        ['admin', 'notifications'],
        (current) => current
          ? { ...current, items: current.items.map((item) => ({ ...item, isRead: true })), unreadCount: 0 }
          : current,
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['admin', 'notifications'], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
  });

  // Закрытие дропдауна при клике вне элемента
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsNotifOpen(false);
        notificationTriggerRef.current?.focus();
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNotifOpen]);

  const handleNotificationClick = (item: AdminNotificationItem) => {
    if (!item.isRead) {
      markReadMutation.mutate(item.id);
    }
    if (item.link) {
      navigate(item.link);
      setIsNotifOpen(false);
    }
  };

  return (
    <header
      className="
        h-16 w-full
        bg-surface border-b border-app
        flex-shrink-0 transition-colors duration-200 relative z-30
      "
    >
      <div className="mx-auto flex h-full w-full max-w-[1440px] items-center justify-between px-3 sm:px-6 lg:px-8">
      {/* Заголовок страницы + Гамбургер на мобилке */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="shrink-0 text-sm font-black tracking-[.18em] text-app lg:hidden">AVERON</span>
        {title && <h1 className="min-w-0 truncate border-l border-app pl-3 text-sm font-semibold text-app sm:text-xl lg:border-0 lg:pl-0">{title}</h1>}
      </div>

      {/* Правая часть */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            aria-label={t(isMobileMenuOpen ? 'header.closeMenu' : 'header.openMenu')}
            aria-expanded={isMobileMenuOpen}
            aria-controls="admin-mobile-navigation"
            className="inline-flex h-10 w-10 items-center justify-center rounded border border-app bg-surface text-app transition-colors hover:bg-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:hidden"
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
            hidden sm:flex items-center gap-2 pl-9 pr-3 h-10 text-sm rounded w-52 md:w-64
            bg-gray-50 dark:bg-white/5
            border border-app hover:border-primary-500/50 dark:hover:border-primary-500/50
            text-muted hover:text-app
            transition-all duration-150 relative cursor-pointer group
          "
        >
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-hover:text-primary-500 transition-colors">
            <SearchIcon />
          </span>
          <span className="truncate text-xs md:text-sm">{t('common.search', 'Поиск по панели...')}</span>
          <kbd className="ml-auto text-[11px] font-mono px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-muted opacity-80 group-hover:opacity-100">
            ⌘K
          </kbd>
        </button>

        {/* Языковой переключатель (RU / UZ / EN) через кастомный Dropdown */}
        <Dropdown
          align="right"
          trigger={
            <div className="flex items-center justify-between gap-1.5 h-10 px-3 rounded text-xs font-semibold bg-surface border border-app text-app hover:border-primary-500 transition-colors cursor-pointer select-none">
              <LanguageFlag
                locale={i18n.language?.startsWith('uz') ? 'uz' : i18n.language?.startsWith('en') ? 'en' : 'ru'}
              />
              <span className="sr-only">{t('common.language', 'Язык')}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted">
                <polyline points="6 9 12 15 18 9" />
              </svg>
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
                onClick={() => {
                  i18n.changeLanguage(lang.code);
                  localStorage.setItem('i18nextLng', lang.code);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm text-xs font-medium text-left transition-colors cursor-pointer ${
                  active ? 'bg-primary-500 text-white font-semibold' : 'text-app hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-2">
                  <LanguageFlag locale={lang.code} />
                  {lang.label}
                </span>
              </button>
            );
          })}
        </Dropdown>

        {/* Переключатель темы */}
        <ThemeToggle />

        {/* Дропдаун Уведомлений */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            ref={notificationTriggerRef}
            id="notifications-btn"
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className={`
              relative w-10 h-10 rounded-lg flex items-center justify-center
              transition-all duration-150 cursor-pointer
              ${
                isNotifOpen
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
              }
            `}
            aria-label={t('header.notifications')}
            aria-expanded={isNotifOpen}
            aria-controls="header-notifications-panel"
          >
            <BellIcon />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1">
                <CountBadge count={unreadCount} />
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div id="header-notifications-panel" role="region" aria-label={t('header.notifications')} className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-1.5rem))] sm:w-96 rounded bg-surface border border-app shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 z-50">
              {/* Шапка уведомлений */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-app bg-gray-50/50 dark:bg-white/5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-app">{t('header.notifications', 'Уведомления')}</span>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full font-medium">
                      {t('header.newNotifications', { count: unreadCount, defaultValue: `${unreadCount} новых` })}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <CheckAllIcon />
                    {t('header.markAllRead', 'Прочитать все')}
                  </button>
                )}
              </div>

              {/* Список уведомлений */}
              <div className="max-h-80 overflow-y-auto divide-y divide-app">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-muted text-sm">
                    {t('header.noNotifications', 'Нет новых уведомлений')}
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className={`
                        w-full p-3.5 text-left hover:bg-gray-50 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 transition-colors cursor-pointer flex gap-3
                        ${!n.isRead ? 'bg-primary-50/30 dark:bg-primary-950/10' : ''}
                      `}
                    >
                      <span className="mt-0.5">
                        <span
                          className={`w-2 h-2 rounded-full block ${
                            !n.isRead ? 'bg-primary-500' : 'bg-transparent'
                          }`}
                        />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-semibold text-app truncate">{n.title}</span>
                          <time className="text-[10px] text-muted whitespace-nowrap">
                            {new Date(n.createdAt).toLocaleTimeString(i18n.language?.startsWith('en') ? 'en-US' : i18n.language?.startsWith('uz') ? 'uz-UZ' : 'ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </time>
                        </span>
                        <span className="block text-xs text-muted leading-relaxed line-clamp-2">{n.message}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Кнопка "Перейти на сайт" */}
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          id="go-to-site-btn"
          className="
            hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm font-medium
            text-primary-600 dark:text-primary-400
            border border-primary-500 rounded-lg
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
