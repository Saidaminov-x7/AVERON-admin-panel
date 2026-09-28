// src/pages/system/SystemHealthPage.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { getSystemHealthApi } from '../../lib/extendedAdminApi';
import { Activity, Database, Cpu, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

const SystemHealthPage: React.FC = () => {
  const { t } = useTranslation();
  const { data, refetch, isFetching, isError } = useQuery({
    queryKey: ['admin', 'system-health'],
    queryFn: getSystemHealthApi,
    refetchInterval: 10000,
  });

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}д ${h}ч ${m}м`;
  };

  return (
    <Layout title={t('system.healthTitle', 'Мониторинг здоровья инфраструктуры')}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-muted">
            Статус критических сервисов бэкенда, latency базы данных PostgreSQL, Redis и потребление оперативной памяти.
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

        {isError && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-500">Не удалось получить состояние сервисов. Проверьте соединение с API и повторите обновление.</div>}

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
              <div className="text-sm text-muted">Общее состояние системы</div>
              <div className="text-xl font-bold text-app">
                {data?.status === 'HEALTHY' ? 'Все системы работают штатно' : 'Обнаружена деградация сервисов'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">Аптайм сервера</div>
            <div className="text-lg font-mono font-bold text-primary-600 dark:text-primary-400">
              {data ? formatUptime(data.uptimeSeconds) : '...'}
            </div>
          </div>
        </div>

        {/* Компоненты */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="text-xs text-muted">Задержка выполнения ping-запроса к БД</div>
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
            <div className="text-xs text-muted">Задержка ответа кэша и очереди</div>
          </div>

          {/* Node.js Memory */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between text-muted">
              <span className="text-xs font-semibold uppercase flex items-center gap-1.5">
                <Cpu size={16} className="text-purple-500" /> Память Node.js
              </span>
              <span className="text-xs font-mono text-muted">{data?.nodeVersion}</span>
            </div>
            <div className="text-2xl font-mono font-bold text-app">
              {data?.memory.heapUsedMb ?? 0} / {data?.memory.heapTotalMb ?? 0} MB
            </div>
            <div className="text-xs text-muted">RSS: {data?.memory.rssMb ?? 0} MB</div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SystemHealthPage;
