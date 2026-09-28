// src/components/Header/Header.tsx
// Верхняя панель — поиск, переключатель темы, реальные уведомления, переход на сайт

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import { CountBadge } from '../ui/CountBadge';
import {
  getNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
} from '../../lib/notificationsApi';
import type { AdminNotificationItem } from '../../lib/notificationsApi';
import { API_URL } from '../../lib/axios';

function useBackendHealth() {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  useEffect(() => {
    const apiUrl = API_URL;
    const check = () =>
      fetch(`${apiUrl}/health`)
        .then((r) => setIsHealthy(r.ok))
        .catch(() => setIsHealthy(false));
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);
  return isHealthy;
}

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
}

const Header: React.FC<HeaderProps> = ({ title, onToggleMobileMenu }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const isBackendHealthy = useBackendHealth();

  return (
    <header
      className="
        flex items-center justify-between px-6 h-16
        bg-surface border-b border-app
        flex-shrink-0 transition-colors duration-200 relative z-30
      "
    >
      {/* Заголовок страницы + Гамбургер на мобилке */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            aria-label="Открыть боковое меню"
            className="order-last ml-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 shadow-xs transition-all duration-200 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900 dark:border-white/10 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-white/20 dark:hover:bg-stone-800 dark:hover:text-white lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
        )}
        {title && <h1 className="min-w-0 truncate text-base font-bold text-app sm:text-xl">{title}</h1>}
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-white/5 border border-app"
          title={
            isBackendHealthy === null
              ? 'Проверка API...'
              : isBackendHealthy
              ? 'API в сети'
              : 'API недоступен'
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isBackendHealthy === null
                ? 'bg-amber-400 animate-pulse'
                : isBackendHealthy
                ? 'bg-emerald-500'
                : 'bg-red-500'
            }`}
          />
          <span className="text-muted hidden sm:inline">
            {isBackendHealthy ? 'API OK' : 'API'}
          </span>
        </div>
      </div>

      {/* Правая часть */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Поиск / Command Palette */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          id="header-search-btn"
          className="
            hidden sm:flex items-center gap-2 pl-9 pr-3 py-2 text-sm rounded-lg w-52 md:w-64
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

        {/* Языковой переключатель (RU / UZ / EN) */}
        <div className="relative group">
          <select
            value={i18n.language?.slice(0, 2) || 'ru'}
            onChange={(e) => {
              const newLang = e.target.value;
              i18n.changeLanguage(newLang);
              localStorage.setItem('i18nextLng', newLang);
            }}
            aria-label="Сменить язык"
            className="
              h-9 px-2.5 rounded-lg text-xs font-semibold
              bg-gray-50 dark:bg-white/5 border border-app
              text-app outline-none cursor-pointer
              hover:border-primary-500 transition-colors
            "
          >
            <option value="ru" className="bg-surface text-app">🇷🇺 RU</option>
            <option value="uz" className="bg-surface text-app">🇺🇿 UZ</option>
            <option value="en" className="bg-surface text-app">🇬🇧 EN</option>
          </select>
        </div>

        {/* Переключатель темы */}
        <ThemeToggle />

        {/* Дропдаун Уведомлений */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="notifications-btn"
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
            aria-label="Уведомления"
          >
            <BellIcon />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1">
                <CountBadge count={unreadCount} />
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-surface border border-app shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 z-50">
              {/* Шапка уведомлений */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-app bg-gray-50/50 dark:bg-white/5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-app">Уведомления</span>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full font-medium">
                      {unreadCount} новых
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
                    Прочитать все
                  </button>
                )}
              </div>

              {/* Список уведомлений */}
              <div className="max-h-80 overflow-y-auto divide-y divide-app">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-muted text-sm">
                    Нет новых уведомлений
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`
                        p-3.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer flex gap-3
                        ${!n.isRead ? 'bg-primary-50/30 dark:bg-primary-950/10' : ''}
                      `}
                    >
                      <div className="mt-0.5">
                        <span
                          className={`w-2 h-2 rounded-full block ${
                            !n.isRead ? 'bg-primary-500' : 'bg-transparent'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <h4 className="text-xs font-semibold text-app truncate">{n.title}</h4>
                          <span className="text-[10px] text-muted whitespace-nowrap">
                            {new Date(n.createdAt).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-muted leading-relaxed line-clamp-2">{n.message}</p>
                      </div>
                    </div>
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
          Перейти на сайт
          <ExternalLinkIcon />
        </a>
      </div>
    </header>
  );
};

export default Header;
