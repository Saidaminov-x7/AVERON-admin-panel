// src/pages/system/SystemHealthPage.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { getSystemHealthApi } from '../../lib/extendedAdminApi';
import { Activity, Database, Cpu, RefreshCw, CheckCircle2, AlertTriangle, Server } from 'lucide-react';

const SystemHealthPage: React.FC = () => {
  const { t } = useTranslation();
  const { data, refetch, isFetching, isLoading, isError } = useQuery({
    queryKey: ['admin', 'system-health'],
    queryFn: getSystemHealthApi,
    refetchInterval: 10000,
  });

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}${t('system.unitDay', 'д')} ${h}${t('system.unitHour', 'ч')} ${m}${t('system.unitMin', 'м')}`;
  };

  return (
    <Layout title={t('system.healthTitle', 'Мониторинг здоровья инфраструктуры')}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-muted">
            {t('system.healthSubtitle', 'Статус критических сервисов бэкенда, latency базы данных PostgreSQL, Redis и потребление оперативной памяти.')}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn btn-secondary flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} /> {t('common.refresh', 'Обновить')}
          </button>
        </div>

        {isError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-500">
            {t('system.healthError', 'Не удалось получить состояние сервисов. Проверьте соединение с API и повторите обновление.')}
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label={t('common.loading', 'Загрузка...')}>
            {[0, 1, 2, 3].map((item) => <div key={item} className="card h-36 animate-pulse bg-gray-100 dark:bg-white/5" />)}
          </div>
        )}

        {/* Общий статус */}
        <div className="card p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                data?.status === 'HEALTHY'
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50'
                  : 'bg-amber-100 text-amber-600 dark:bg-amber-950/50'
              }`}
            >
              {data?.status === 'HEALTHY' ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}
            </div>
            <div>
              <div className="text-sm text-muted">{t('system.serverStatus', 'Общее состояние системы')}</div>
              <div className="text-xl font-bold text-app">
                {data?.status === 'HEALTHY'
                  ? t('system.statusHealthy', 'Все системы работают штатно')
                  : t('system.statusDegraded', 'Обнаружена деградация сервисов')}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">{t('system.uptime', 'Аптайм сервера')}</div>
            <div className="text-lg font-mono font-bold text-primary-600 dark:text-primary-400">
              {data ? formatUptime(data.uptimeSeconds) : '...'}
            </div>
          </div>
        </div>

        {/* Компоненты */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold uppercase flex items-center gap-1.5">
                <Server size={16} className="text-emerald-500" /> Backend API
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${data?.backend.status === 'UP' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40' : 'bg-rose-100 text-rose-600 dark:bg-rose-950/40'}`}>
                {data?.backend.status ?? 'DOWN'}
              </span>
            </div>
            <div className="text-2xl font-mono font-bold text-app">{data?.backend.latencyMs ?? 0} ms</div>
            <div className="text-xs text-muted">{t('system.backendDesc', 'Время выполнения серверной проверки')}</div>
          </div>

          {/* PostgreSQL */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold uppercase flex items-center gap-1.5">
                <Database size={16} className="text-blue-500" /> PostgreSQL
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold ${
                  data?.database.status === 'UP'
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40'
                    : 'bg-rose-100 text-rose-600 dark:bg-rose-950/40'
                }`}
              >
                {data?.database.status ?? 'DOWN'}
              </span>
            </div>
            <div className="text-2xl font-mono font-bold text-app">
              {data?.database.latencyMs ?? 0} ms
            </div>
            <div className="text-xs text-muted">{t('system.databaseDesc', 'Задержка ping-запроса к БД')}</div>
          </div>

          {/* Redis */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold uppercase flex items-center gap-1.5">
                <Activity size={16} className="text-rose-500" /> Redis Cache
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold ${
                  data?.redis.status === 'UP'
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40'
                    : 'bg-rose-100 text-rose-600 dark:bg-rose-950/40'
                }`}
              >
                {data?.redis.status ?? 'DOWN'}
              </span>
            </div>
            <div className="text-2xl font-mono font-bold text-app">
              {data?.redis.latencyMs ?? 0} ms
            </div>
            <div className="text-xs text-muted">{t('system.redisDesc', 'Задержка ответа кэша и очереди')}</div>
          </div>

          {/* Node.js Memory */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold uppercase flex items-center gap-1.5">
                <Cpu size={16} className="text-purple-500" /> {t('system.nodeMemory', 'Память Node.js')}
              </span>
              <span className="text-xs font-mono text-muted">{data?.nodeVersion}</span>
            </div>
            <div className="text-2xl font-mono font-bold text-app">
              {data?.memory.heapUsedMb ?? 0} / {data?.memory.heapTotalMb ?? 0} MB
            </div>
            <div className="text-xs text-muted">RSS: {data?.memory.rssMb ?? 0} MB</div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
              <div
                className={`h-full rounded-full ${(data?.memory.heapUsagePercent ?? 0) > 85 ? 'bg-rose-500' : (data?.memory.heapUsagePercent ?? 0) > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(data?.memory.heapUsagePercent ?? 0, 100)}%` }}
              />
            </div>
            <div className="text-xs text-muted">
              {t('system.heapUsed', 'Использовано heap')}: {data?.memory.heapUsagePercent ?? 0}%
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SystemHealthPage;
