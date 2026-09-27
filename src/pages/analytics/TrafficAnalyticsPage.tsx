// src/pages/analytics/TrafficAnalyticsPage.tsx
// Детальная аналитика посещаемости и уникальных визитов

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Layout from '../../components/Layout';
import { getVisitorsStatsApi } from '../../lib/analyticsApi';

const TrafficAnalyticsPage: React.FC = () => {
  const [days, setDays] = useState(30);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'visitors', days],
    queryFn: () => getVisitorsStatsApi({ days }),
  });

  const daily = stats?.daily || [];
  const total = stats?.totalVisitors || 0;

  return (
    <Layout title="Посещаемость сайта">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Переключатель периода */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {[7, 14, 30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  days === d
                    ? 'bg-primary-500 text-white'
                    : 'border border-app text-muted hover:text-app hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                {d} дней
              </button>
            ))}
          </div>

          <div className="text-sm font-semibold text-app">
            Всего уникальных посетителей: <span className="text-primary-500 text-lg font-bold">{total}</span>
          </div>
        </div>

        {/* График визитов */}
        <div className="card">
          <h3 className="text-base font-semibold text-app mb-4">Уникальные визиты по дням</h3>
          {isLoading ? (
            <div className="h-72 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="visitorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                  }
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: 'var(--color-text)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="visitors"
                  name="Уникальные посетители"
                  stroke="#14b8a6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#visitorGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Таблица данных по дням */}
        <div className="card overflow-hidden p-0">
          <div className="px-6 py-4 border-b border-app font-bold text-sm text-app">
            Посуточный журнал визитов
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-white/5 border-b border-app text-xs uppercase text-muted font-semibold sticky top-0">
                <tr>
                  <th className="px-6 py-3">Дата</th>
                  <th className="px-6 py-3">Уникальных устройств</th>
                  <th className="px-6 py-3 text-right">% от общего за период</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app">
                {daily.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-muted">
                      Нет данных о визитах за выбранный период
                    </td>
                  </tr>
                ) : (
                  [...daily].reverse().map((item) => {
                    const pct = total > 0 ? ((item.visitors / total) * 100).toFixed(1) : '0';
                    return (
                      <tr key={item.date} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                        <td className="px-6 py-3 font-medium text-app">
                          {new Date(item.date).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            weekday: 'short',
                          })}
                        </td>
                        <td className="px-6 py-3 font-bold text-primary-600 dark:text-primary-400">
                          {item.visitors}
                        </td>
                        <td className="px-6 py-3 text-right text-xs text-muted font-mono">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TrafficAnalyticsPage;
