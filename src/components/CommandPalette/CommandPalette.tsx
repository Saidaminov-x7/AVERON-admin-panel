// src/components/CommandPalette/CommandPalette.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { searchProductsApi, searchUsersApi } from '../../lib/searchApi';
import {
  Home,
  List,
  Kanban,
  AlertTriangle,
  Calendar,
  Users,
  Image,
  FileText,
  BarChart2,
  TrendingUp,
  MapPin,
  FileDown,
  Layers,
  Search,
  Tag,
  DollarSign,
  Activity,
  Webhook,
  Database,
  Sliders,
  Settings,
  Shield,
  Palette,
  User,
  History,
  AlertCircle,
} from 'lucide-react';

interface StaticRoute {
  label: string;
  labelKey: string;
  path: string;
  keywords: string[];
  icon: React.ReactNode;
}

const STATIC_ROUTES: StaticRoute[] = [
  { label: 'Главная', labelKey: 'nav.dashboard', path: '/', keywords: ['главная', 'dashboard', 'bosh', 'stats', 'статистика'], icon: <Home size={16} /> },
  { label: 'Товары', labelKey: 'nav.listings', path: '/products', keywords: ['товары', 'products', 'каталог'], icon: <List size={16} /> },
  { label: 'Канбан модерации', labelKey: 'nav.kanban', path: '/moderation/kanban', keywords: ['канбан', 'kanban', 'модерация', 'доска'], icon: <Kanban size={16} /> },
  { label: 'Жалобы', labelKey: 'nav.reports', path: '/reports', keywords: ['жалобы', 'reports', 'shikoyat', 'нарушения'], icon: <AlertTriangle size={16} /> },
  { label: 'Заявки на просмотр', labelKey: 'nav.viewingRequests', path: '/viewing-requests', keywords: ['заявки', 'просмотр', 'viewing', 'bron'], icon: <Calendar size={16} /> },
  { label: 'Пользователи', labelKey: 'nav.users', path: '/users', keywords: ['пользователи', 'users', 'foydalanuvchilar', 'клиенты'], icon: <Users size={16} /> },
  { label: 'Медиабиблиотека', labelKey: 'nav.media', path: '/media', keywords: ['медиа', 'библиотека', 'media', 'фото', 'файлы'], icon: <Image size={16} /> },
  { label: 'Страницы сайта', labelKey: 'nav.pages', path: '/pages', keywords: ['страницы', 'pages', 'cms', 'контент'], icon: <FileText size={16} /> },
  { label: 'Конструктор страниц', labelKey: 'nav.pageBuilder', path: '/pages/builder', keywords: ['конструктор', 'builder', 'page builder', 'секции'], icon: <Layers size={16} /> },
  { label: 'Общая аналитика', labelKey: 'nav.analytics', path: '/analytics', keywords: ['аналитика', 'analytics', 'метрики', 'графики'], icon: <BarChart2 size={16} /> },
  { label: 'Аналитика трафика', labelKey: 'nav.trafficAnalytics', path: '/analytics/traffic', keywords: ['трафик', 'traffic', 'посещения', 'просмотры'], icon: <TrendingUp size={16} /> },
  { label: 'Аналитика городов', labelKey: 'nav.cityAnalytics', path: '/analytics/cities', keywords: ['города', 'география', 'cities', 'регионы'], icon: <MapPin size={16} /> },
  { label: 'Экспорт отчетов', labelKey: 'nav.exportReports', path: '/analytics/export', keywords: ['экспорт', 'отчеты', 'csv', 'excel', 'export'], icon: <FileDown size={16} /> },
  { label: 'Тепловая карта цен', labelKey: 'nav.heatmap', path: '/analytics/heatmap', keywords: ['тепловая карта', 'карта', 'heatmap', 'цены'], icon: <MapPin size={16} /> },
  { label: 'Поисковые запросы', labelKey: 'nav.searchQueries', path: '/analytics/search-queries', keywords: ['запросы', 'поиск', 'search queries', 'спрос'], icon: <Search size={16} /> },
  { label: 'Промокоды и скидки', labelKey: 'nav.promoCodes', path: '/monetization/promo-codes', keywords: ['промокоды', 'скидки', 'promo', 'купоны'], icon: <Tag size={16} /> },
  { label: 'Выручка и финансы', labelKey: 'nav.revenue', path: '/monetization/revenue', keywords: ['выручка', 'финансы', 'revenue', 'деньги', 'доход'], icon: <DollarSign size={16} /> },
  { label: 'Здоровье системы', labelKey: 'nav.health', path: '/system/health', keywords: ['здоровье', 'health', 'redis', 'postgres', 'uptime'], icon: <Activity size={16} /> },
  { label: 'Вебхуки', labelKey: 'nav.webhooks', path: '/system/webhooks', keywords: ['вебхуки', 'webhooks', 'интеграции'], icon: <Webhook size={16} /> },
  { label: 'Резервные копии', labelKey: 'nav.backups', path: '/system/backups', keywords: ['бэкапы', 'backups', 'дамп', 'снапшот', 'копии'], icon: <Database size={16} /> },
  { label: 'Журнал ошибок', labelKey: 'nav.errors', path: '/errors', keywords: ['ошибки', 'errors', 'логи', 'logs'], icon: <AlertCircle size={16} /> },
  { label: 'Основные настройки', labelKey: 'nav.generalSettings', path: '/settings/general', keywords: ['настройки', 'settings', 'логотип', 'контакты'], icon: <Settings size={16} /> },
  { label: 'Параметры и Feature Flags', labelKey: 'nav.appSettings', path: '/settings/app', keywords: ['feature flags', 'флаги', 'параметры', 'модерация'], icon: <Sliders size={16} /> },
  { label: 'Внешний вид и тема', labelKey: 'nav.appearance', path: '/settings/appearance', keywords: ['внешний вид', 'тема', 'дизайн', 'цвета', 'appearance'], icon: <Palette size={16} /> },
  { label: 'Сотрудники и роли', labelKey: 'nav.staff', path: '/settings/staff', keywords: ['сотрудники', 'staff', 'роли', 'администраторы', 'rbac'], icon: <Shield size={16} /> },
  { label: 'Мой профиль', labelKey: 'nav.profile', path: '/profile', keywords: ['профиль', 'profile', 'пароль', 'аккаунт'], icon: <User size={16} /> },
  { label: 'Журнал аудита', labelKey: 'nav.audit', path: '/audit-log', keywords: ['аудит', 'audit', 'журнал', 'безопасность'], icon: <History size={16} /> },
];

const ACTIVE_PATHS = new Set([
  '/', '/products', '/imports', '/orders', '/finance', '/media', '/users',
  '/audit-log', '/profile', '/settings/general', '/settings/staff', '/system/health',
]);

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Глобальный хоткей: ⌘K / Ctrl+K и кастомный event 'open-command-palette'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'л' || e.key === 'Л')) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    const handleCustomOpen = () => {
      setOpen(true);
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleCustomOpen);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleCustomOpen);
    };
  }, []);

  const deferredQuery = query.trim();

  // Поиск по объявлениям и пользователям при длине запроса >= 2
  const { data: listingResults = [], isLoading: isListingsLoading } = useQuery({
    queryKey: ['cmdk-products', deferredQuery],
    queryFn: () => searchProductsApi(deferredQuery),
    enabled: deferredQuery.length >= 2,
  });

  const { data: userResults = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ['cmdk-users', deferredQuery],
    queryFn: () => searchUsersApi(deferredQuery),
    enabled: deferredQuery.length >= 2,
  });

  const go = useCallback(
    (path: string) => {
      navigate(path);
      setOpen(false);
      setQuery('');
    },
    [navigate],
  );

  const filteredRoutes = STATIC_ROUTES.filter((r) => ACTIVE_PATHS.has(r.path)).filter((r) => {
    if (!deferredQuery) return true;
    const q = deferredQuery.toLowerCase();
    const translated = t(r.labelKey, r.label).toLowerCase();
    const rawLabel = r.label.toLowerCase();
    return (
      rawLabel.includes(q) ||
      translated.includes(q) ||
      r.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-surface border border-app rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          label="Глобальный поиск"
          className="flex flex-col h-full overflow-hidden"
          shouldFilter={false}
        >
          {/* Инпут поиска */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-app">
            <Search size={20} className="text-muted shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder={t('common.searchPlaceholder', 'Поиск разделов, объявлений, пользователей... (нажмите Esc для закрытия)')}
              className="w-full bg-transparent text-app placeholder:text-muted outline-none text-base"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-xs text-muted hover:text-app px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10"
              >
                Очистить
              </button>
            )}
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-mono rounded bg-gray-100 dark:bg-white/10 text-muted border border-app">
              ESC
            </kbd>
          </div>

          {/* Результаты поиска */}
          <Command.List className="overflow-y-auto p-2 space-y-3 flex-1 scrollbar-thin">
            {/* Пустое состояние */}
            {filteredRoutes.length === 0 &&
              listingResults.length === 0 &&
              userResults.length === 0 &&
              !isListingsLoading &&
              !isUsersLoading && (
                <Command.Empty className="text-muted text-sm py-12 text-center">
                  Ничего не найдено по запросу &laquo;{query}&raquo;
                </Command.Empty>
              )}

            {/* Группа: Разделы платформы */}
            {filteredRoutes.length > 0 && (
              <Command.Group
                heading="Разделы платформы"
                className="text-xs font-semibold text-muted px-2 py-1 select-none"
              >
                <div className="space-y-1 mt-1">
                  {filteredRoutes.map((r) => (
                    <Command.Item
                      key={r.path}
                      onSelect={() => go(r.path)}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-app hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/5 text-muted">
                          {r.icon}
                        </span>
                        <span className="text-sm font-medium">
                          {t(r.labelKey, r.label)}
                        </span>
                      </div>
                      <span className="text-xs text-muted font-mono opacity-60">
                        {r.path}
                      </span>
                    </Command.Item>
                  ))}
                </div>
              </Command.Group>
            )}

            {/* Группа: Товары */}
            {listingResults.length > 0 && (
              <Command.Group
                heading="Товары"
                className="text-xs font-semibold text-muted px-2 py-1 select-none border-t border-app pt-3"
              >
                <div className="space-y-1 mt-1">
                  {listingResults.map((l) => (
                    <Command.Item
                      key={l.id}
                      onSelect={() => go(`/products?highlight=${l.id}`)}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-app hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0">
                          <List size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{l.title}</p>
                          <p className="text-xs text-muted">
                            {(l.price || 0).toLocaleString('ru-RU')} сум
                          </p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-muted shrink-0">
                        {l.status || 'ACTIVE'}
                      </span>
                    </Command.Item>
                  ))}
                </div>
              </Command.Group>
            )}

            {/* Группа: Пользователи */}
            {userResults.length > 0 && (
              <Command.Group
                heading="Пользователи"
                className="text-xs font-semibold text-muted px-2 py-1 select-none border-t border-app pt-3"
              >
                <div className="space-y-1 mt-1">
                  {userResults.map((u) => (
                    <Command.Item
                      key={u.id}
                      onSelect={() => go(`/users/${u.id}`)}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-app hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                          <User size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{u.name}</p>
                          <p className="text-xs text-muted truncate">{u.email}</p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-muted shrink-0">
                        {u.role || 'USER'}
                      </span>
                    </Command.Item>
                  ))}
                </div>
              </Command.Group>
            )}
          </Command.List>

          {/* Футер палитры */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-app text-xs text-muted bg-gray-50/50 dark:bg-white/5 select-none">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="font-mono bg-surface px-1.5 py-0.5 rounded border border-app">↑</kbd>{' '}
                <kbd className="font-mono bg-surface px-1.5 py-0.5 rounded border border-app">↓</kbd> Навигация
              </span>
              <span>
                <kbd className="font-mono bg-surface px-1.5 py-0.5 rounded border border-app">↵</kbd> Выбрать
              </span>
            </div>
            <span>AVERON Command Center</span>
          </div>
        </Command>
      </div>
    </div>
  );
};
