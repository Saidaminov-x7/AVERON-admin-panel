// src/pages/analytics/CityAnalyticsPage.tsx
// Географическая аналитика объявлений по городам

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Layout from '../../components/Layout';
import { getRangeAnalyticsApi } from '../../lib/analyticsApi';

const PERIODS = [
  { label: '7 дней', value: 7 },
  { label: '30 дней', value: 30 },
  { label: '90 дней', value: 90 },
  { label: 'Все время', value: 0 },
];

const CityAnalyticsPage: React.FC = () => {
  const [periodDays, setPeriodDays] = useState(30);

  // Используем тот же эндпоинт, что и Overview (единый источник данных)
  const { data: rangeData, isLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'range', periodDays],
    queryFn: () => periodDays === 0
      ? getRangeAnalyticsApi({ from: '2020-01-01', to: new Date().toISOString().slice(0, 10) })
      : getRangeAnalyticsApi({ days: periodDays }),
  });

  const byCity = rangeData?.byCity || [];

  const totalListings = byCity.reduce((acc, c) => acc + c.count, 0);

  return (
    <Layout title="Объявления по городам">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Переключатель периода */}
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriodDays(p.value)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                periodDays === p.value
                  ? 'bg-primary-500 text-white'
                  : 'border border-app text-muted hover:text-app hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-app mb-4">
            Распределение активных объектов по городам
          </h3>
          {isLoading ? (
            <div className="h-80 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />
          ) : byCity.length === 0 ? (
            <p className="text-muted text-sm text-center py-16">
              В базе данных пока нет активных объявлений
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={byCity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="city" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: 'var(--color-text)',
                  }}
                />
                <Bar dataKey="count" name="Количество объявлений" fill="#14b8a6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Таблица распределения */}
        <div className="card overflow-hidden p-0">
          <div className="px-6 py-4 border-b border-app font-bold text-sm text-app">
            Детализация по регионам
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-white/5 border-b border-app text-xs uppercase text-muted font-semibold">
              <tr>
                <th className="px-6 py-3">Город</th>
                <th className="px-6 py-3">Количество объектов</th>
                <th className="px-6 py-3 text-right">Доля в каталоге</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {byCity.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-muted">
                    Нет активных объявлений
                  </td>
                </tr>
              ) : (
                byCity.map((c) => {
                  const pct = totalListings > 0 ? ((c.count / totalListings) * 100).toFixed(1) : '0';
                  return (
                    <tr key={c.city} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                      <td className="px-6 py-3.5 font-bold text-app">{c.city}</td>
                      <td className="px-6 py-3.5 font-semibold text-primary-600 dark:text-primary-400">
                        {c.count}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono text-muted text-xs">
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
    </Layout>
  );
};

export default CityAnalyticsPage;
