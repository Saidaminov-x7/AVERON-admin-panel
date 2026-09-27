// src/pages/ErrorLogsPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { getErrorReportsApi, resolveErrorReportApi, type ClientErrorReportItem } from '../lib/errorReportsApi';
import Badge from '../components/Badge/Badge';
import { AlertTriangle, CheckCircle, Clock, Globe, Laptop, Terminal } from 'lucide-react';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

const ErrorLogsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);
  const [severity, setSeverity] = useState<'error' | 'warning' | 'info' | undefined>(undefined);
  const [resolvedFilter, setResolvedFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  const [selectedError, setSelectedError] = useState<ClientErrorReportItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'error-reports', page, severity, resolvedFilter],
    queryFn: () =>
      getErrorReportsApi({
        page,
        limit: 20,
        severity,
        resolved: resolvedFilter === 'resolved' ? true : resolvedFilter === 'unresolved' ? false : undefined,
      }),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => resolveErrorReportApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'error-reports'] });
      if (selectedError) {
        setSelectedError((prev) => (prev ? { ...prev, resolved: true } : null));
      }
    },
  });

  const currentLocale = i18n.language === 'en' ? enUS : ru;

  return (
    <Layout title={t('system.errorLogsTitle', 'Ошибки фронтенда')}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Фильтры */}
        <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-xl border border-app overflow-hidden text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setResolvedFilter('unresolved'); setPage(1); }}
                className={`px-3 py-1.5 transition-colors cursor-pointer ${
                  resolvedFilter === 'unresolved' ? 'bg-primary-500 text-white' : 'text-muted hover:text-app'
                }`}
              >
                {t('common.pending', 'Нерешённые')}
              </button>
              <button
                type="button"
                onClick={() => { setResolvedFilter('resolved'); setPage(1); }}
                className={`px-3 py-1.5 transition-colors cursor-pointer ${
                  resolvedFilter === 'resolved' ? 'bg-primary-500 text-white' : 'text-muted hover:text-app'
                }`}
              >
                {t('reports.resolved', 'Решённые')}
              </button>
              <button
                type="button"
                onClick={() => { setResolvedFilter('all'); setPage(1); }}
                className={`px-3 py-1.5 transition-colors cursor-pointer ${
                  resolvedFilter === 'all' ? 'bg-primary-500 text-white' : 'text-muted hover:text-app'
                }`}
              >
                {t('common.all', 'Все')}
              </button>
            </div>

            <select
              value={severity || ''}
              onChange={(e) => {
                setSeverity((e.target.value as any) || undefined);
                setPage(1);
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-app bg-surface text-app cursor-pointer outline-none"
            >
              <option value="">Все уровни (Severity)</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          <div className="text-xs text-muted">
            {t('common.total', { count: data?.meta?.total ?? 0, defaultValue: `Всего записей: ${data?.meta?.total ?? 0}` })}
          </div>
        </div>

        {/* Список ошибок */}
        <div className="card p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted">{t('common.loading', 'Загрузка ошибок...')}</div>
          ) : !data?.items || data.items.length === 0 ? (
            <div className="p-8 text-center text-muted">
              <CheckCircle size={32} className="mx-auto text-emerald-500 mb-2" />
              {t('common.noData', 'Ошибок не обнаружено')}
            </div>
          ) : (
            <div className="divide-y divide-app">
              {data.items.map((err) => (
                <div
                  key={err.id}
                  onClick={() => setSelectedError(err)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                    err.resolved ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 mt-0.5">
                        <AlertTriangle
                          size={18}
                          className={
                            err.severity === 'error'
                              ? 'text-rose-500'
                              : err.severity === 'warning'
                              ? 'text-amber-500'
                              : 'text-blue-500'
                          }
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={
                              err.severity === 'error'
                                ? 'danger'
                                : err.severity === 'warning'
                                ? 'warning'
                                : 'info'
                            }
                            className="text-xs font-mono"
                          >
                            {err.severity.toUpperCase()}
                          </Badge>
                          {err.resolved && (
                            <Badge variant="success" className="text-xs">
                              {t('reports.resolved', 'Решено')}
                            </Badge>
                          )}
                          <span className="font-semibold text-app truncate text-sm">
                            {err.message}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted mt-1">
                          <div className="flex items-center gap-1">
                            <Globe size={13} />
                            <span className="truncate max-w-xs">{err.url}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={13} />
                            <span>
                              {format(new Date(err.createdAt), 'd MMM yyyy, HH:mm:ss', { locale: currentLocale })}
                            </span>
                          </div>
                          {err.ip && <span className="font-mono">{err.ip}</span>}
                        </div>
                      </div>
                    </div>

                    {!err.resolved && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          resolveMutation.mutate(err.id);
                        }}
                        disabled={resolveMutation.isPending}
                        className="btn-ghost text-xs py-1 px-2.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                      >
                        {t('reports.resolved', 'Решено')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Пагинация */}
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted">
            <div>
              Страница {data.meta.page} из {data.meta.totalPages}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-ghost py-1 px-3 disabled:opacity-40"
              >
                Назад
              </button>
              <button
                type="button"
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-ghost py-1 px-3 disabled:opacity-40"
              >
                Вперёд
              </button>
            </div>
          </div>
        )}

        {/* Модальное окно деталей ошибки */}
        {selectedError && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setSelectedError(null)}
          >
            <div
              className="bg-surface border border-app rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-app flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      selectedError.severity === 'error'
                        ? 'danger'
                        : selectedError.severity === 'warning'
                        ? 'warning'
                        : 'info'
                    }
                    className="text-xs font-mono"
                  >
                    {selectedError.severity.toUpperCase()}
                  </Badge>
                  <h3 className="font-bold text-app text-base">{t('auditLog.details', 'Детали ошибки')}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedError(null)}
                  className="text-muted hover:text-app text-sm p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-sm flex-1">
                <div>
                  <div className="text-xs text-muted mb-1 font-medium">Сообщение:</div>
                  <div className="font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-200 dark:border-rose-900/30 break-words">
                    {selectedError.message}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 border border-app rounded-xl bg-app">
                    <div className="text-muted mb-1 flex items-center gap-1">
                      <Globe size={13} /> URL
                    </div>
                    <div className="font-mono break-all text-app">{selectedError.url}</div>
                  </div>
                  <div className="p-3 border border-app rounded-xl bg-app">
                    <div className="text-muted mb-1 flex items-center gap-1">
                      <Clock size={13} /> {t('common.date', 'Время')}
                    </div>
                    <div className="text-app">
                      {format(new Date(selectedError.createdAt), 'd MMMM yyyy, HH:mm:ss', { locale: currentLocale })}
                    </div>
                  </div>
                </div>

                {selectedError.userAgent && (
                  <div className="p-3 border border-app rounded-xl bg-app text-xs">
                    <div className="text-muted mb-1 flex items-center gap-1">
                      <Laptop size={13} /> User Agent
                    </div>
                    <div className="text-app font-mono break-all">{selectedError.userAgent}</div>
                  </div>
                )}

                {selectedError.stack && (
                  <div>
                    <div className="text-xs text-muted mb-1 font-medium flex items-center gap-1">
                      <Terminal size={13} /> Stack Trace:
                    </div>
                    <pre className="p-3 bg-stone-950 text-rose-300 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap border border-app">
                      {selectedError.stack}
                    </pre>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-app flex items-center justify-between">
                <div>
                  {!selectedError.resolved ? (
                    <button
                      type="button"
                      onClick={() => resolveMutation.mutate(selectedError.id)}
                      disabled={resolveMutation.isPending}
                      className="btn-primary text-xs py-2 px-4 cursor-pointer"
                    >
                      Пометить как решённую
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle size={14} /> Ошибка помечена как решённая
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedError(null)}
                  className="btn-ghost text-xs py-2 px-4 cursor-pointer"
                >
                  {t('common.cancel', 'Закрыть')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ErrorLogsPage;
