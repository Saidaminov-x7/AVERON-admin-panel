// src/pages/AuditLogPage.tsx
// Страница журнала действий (Audit Log) для мониторинга событий безопасности и действий администраторов

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import {
  ShieldCheck,
  RotateCcw,
  Search,
  Activity,
  User as UserIcon,
  Info,
  Trash2,
} from 'lucide-react';
import Layout from '../components/Layout';
import { Card, Badge, Skeleton, EmptyState, Pagination, Input, Select, Button, Modal } from '../components/ui';
import { clearAuditLogsApi, getAuditLogsApi, type AuditLogItem } from '../lib/auditLogApi';
import { useDebounce } from '../hooks/useDebounce';

const ACTION_LABELS: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral' }> = {
  SECURITY_DENIED: { label: 'Отказ в доступе (401/403)', variant: 'danger' },
  USER_BLOCKED: { label: 'Пользователь заблокирован', variant: 'danger' },
  USER_UNBLOCKED: { label: 'Пользователь разблокирован', variant: 'success' },
  USER_ROLE_CHANGED: { label: 'Изменена роль пользователя', variant: 'warning' },
  LISTING_APPROVED: { label: 'Объявление одобрено', variant: 'success' },
  LISTING_REJECTED: { label: 'Объявление отклонено', variant: 'warning' },
  LISTING_CHANGES_REQUESTED: { label: 'Запрошены правки', variant: 'warning' },
  LISTING_VERIFIED: { label: 'Верификация объявления', variant: 'primary' },
  LISTING_DELETED: { label: 'Объявление удалено', variant: 'danger' },
  SETTINGS_UPDATED: { label: 'Настройки сайта обновлены', variant: 'primary' },
  THEME_SETTINGS_UPDATED: { label: 'Дизайн-токены обновлены', variant: 'primary' },
  SITE_LOGO_UPLOADED: { label: 'Логотип обновлён', variant: 'info' },
  SITE_LOGO_REMOVED: { label: 'Логотип удалён', variant: 'warning' },
  ADMIN_PASSWORD_CHANGED: { label: 'Смена пароля администратора', variant: 'warning' },
  ADMIN_PROFILE_UPDATED: { label: 'Профиль администратора обновлён', variant: 'info' },
};

export const AuditLogPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedMeta, setSelectedMeta] = useState<{ action: string; meta: Record<string, unknown> } | null>(null);

  const ACTION_FILTER_OPTIONS = [
    { value: '', label: t('common.all', 'Все действия') },
    { value: 'SECURITY_DENIED', label: 'Отказы в доступе (401/403)' },
    { value: 'LISTING_APPROVED', label: 'Одобрение объявлений' },
    { value: 'LISTING_REJECTED', label: 'Отклонение объявлений' },
    { value: 'LISTING_CHANGES_REQUESTED', label: 'Запросы правок' },
    { value: 'LISTING_VERIFIED', label: 'Верификация объявлений' },
    { value: 'LISTING_DELETED', label: 'Удаление объявлений' },
    { value: 'USER_BLOCKED', label: 'Блокировки пользователей' },
    { value: 'USER_UNBLOCKED', label: 'Разблокировки пользователей' },
    { value: 'SETTINGS_UPDATED', label: 'Изменения настроек' },
    { value: 'THEME_SETTINGS_UPDATED', label: 'Обновление темы' },
  ];

  const { data: logs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'audit-logs'],
    queryFn: () => getAuditLogsApi(),
  });

  const filteredLogs = useMemo(() => {
    return logs.filter((log: AuditLogItem) => {
      if (actionFilter && log.action !== actionFilter) return false;
      if (!debouncedSearch.trim()) return true;
      const q = debouncedSearch.toLowerCase();
      const userName = log.user?.name?.toLowerCase() || '';
      const userEmail = log.user?.email?.toLowerCase() || '';
      const action = log.action?.toLowerCase() || '';
      const resource = log.resource?.toLowerCase() || '';
      const resourceId = log.resourceId?.toLowerCase() || '';
      return (
        userName.includes(q) ||
        userEmail.includes(q) ||
        action.includes(q) ||
        resource.includes(q) ||
        resourceId.includes(q)
      );
    });
  }, [logs, actionFilter, debouncedSearch]);

  const totalItems = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page, pageSize]);

  const getActionBadge = (action: string) => {
    const meta = ACTION_LABELS[action] || { label: action, variant: 'neutral' as const };
    return (
      <Badge variant={meta.variant} size="sm">
        {meta.label}
      </Badge>
    );
  };

  const currentLocale = i18n.language === 'en' ? enUS : ru;

  return (
    <Layout title={t('auditLog.title', 'Журнал действий')}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Заголовок страницы */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-app tracking-tight flex items-center gap-2">
              <Activity className="text-primary-500" size={24} />
              {t('auditLog.title', 'Журнал действий и безопасности')}
            </h1>
            <p className="text-sm text-muted mt-1">
              {t('auditLog.subtitle', 'Аудит всех изменений, модераторских решений и событий безопасности')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="danger" size="sm" onClick={async () => { if (window.confirm('Очистить журнал действий? Это действие необратимо.')) { await clearAuditLogsApi(); await refetch(); } }} leftIcon={<Trash2 size={14}/>}>Очистить журнал</Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} loading={isRefetching} leftIcon={<RotateCcw size={14} />}>
              {t('common.refresh', 'Обновить')}
            </Button>
          </div>
        </div>

        {/* Фильтры */}
        <Card className="border-stone-300/70 bg-surface p-4 dark:border-stone-700/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Input
              placeholder={t('auditLog.searchPlaceholder', 'Поиск по пользователю, ресурсу или ID...')}
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              leftIcon={<Search size={16} />}
            />
            <Select
              options={ACTION_FILTER_OPTIONS}
              value={actionFilter}
              onChange={(val) => {
                setActionFilter(val);
                setPage(1);
              }}
            />
          </div>
        </Card>

        {/* Список логов */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={36} />}
            title={t('common.noData', 'Записей не найдено')}
            description={debouncedSearch || actionFilter ? 'Попробуйте изменить параметры поиска или фильтр' : 'Журнал действий пока пуст'}
          />
        ) : (
          <Card className="overflow-hidden border-stone-300/70 bg-surface p-0 shadow-xs dark:border-stone-700/80">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800 bg-gray-50/60 dark:bg-white/[0.02] text-muted font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">{t('auditLog.actor', 'Инициатор')}</th>
                    <th className="py-3.5 px-4">{t('auditLog.action', 'Действие')}</th>
                    <th className="py-3.5 px-4">{t('auditLog.resource', 'Объект / Ресурс')}</th>
                    <th className="py-3.5 px-4">{t('auditLog.details', 'Детали')}</th>
                    <th className="py-3.5 px-4 text-right">{t('auditLog.timestamp', 'Время')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                  {paginatedLogs.map((log: AuditLogItem) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Кто */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-950/50 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xs shrink-0">
                            {log.user?.name?.[0]?.toUpperCase() || <UserIcon size={12} />}
                          </div>
                          <div>
                            <div className="font-semibold text-app">
                              {log.user?.name || (log.action === 'SECURITY_DENIED' ? 'Неавторизованный запрос' : 'Система')}
                            </div>
                            {log.user?.email && (
                              <div className="text-[11px] text-muted">{log.user.email}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Действие */}
                      <td className="py-3 px-4">
                        {getActionBadge(log.action)}
                      </td>

                      {/* Объект / Ресурс */}
                      <td className="py-3 px-4">
                        <div className="text-app font-medium">
                          {log.resource || '—'}
                        </div>
                        {log.resourceId && (
                          <div className="text-[11px] text-muted font-mono truncate max-w-[200px]" title={log.resourceId}>
                            ID: {log.resourceId}
                          </div>
                        )}
                      </td>

                      {/* Детали */}
                      <td className="py-3 px-4">
                        {log.meta && Object.keys(log.meta).length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedMeta({ action: log.action, meta: log.meta! })}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
                          >
                            <Info size={12} /> {t('common.view', 'Посмотреть')}
                          </button>
                        ) : (
                          <span className="text-muted text-[11px]">—</span>
                        )}
                      </td>

                      {/* Когда */}
                      <td className="py-3 px-4 text-right whitespace-nowrap text-muted">
                        <div className="font-medium text-app">
                          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: currentLocale })}
                        </div>
                        <div className="text-[11px]">
                          {new Date(log.timestamp).toLocaleString('ru-RU')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Пагинация */}
            <div className="p-4 border-t border-app">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </div>
          </Card>
        )}

        {/* Модалка с JSON деталями */}
        <Modal
          isOpen={!!selectedMeta}
          onClose={() => setSelectedMeta(null)}
          title={`${t('auditLog.details', 'Детали действия')}: ${selectedMeta?.action || ''}`}
        >
          <div className="p-4">
            <pre className="p-3.5 rounded-xl bg-gray-900 text-emerald-400 dark:bg-black/90 dark:text-emerald-400 text-xs font-mono overflow-x-auto max-h-96 border border-app">
              {JSON.stringify(selectedMeta?.meta, null, 2)}
            </pre>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default AuditLogPage;
