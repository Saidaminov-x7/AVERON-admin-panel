// src/pages/analytics/SearchAnalyticsPage.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import { getSearchAnalyticsApi } from '../../lib/extendedAdminApi';
import { Search, AlertCircle, TrendingUp, Clock, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const SearchAnalyticsPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'search-queries'],
    queryFn: getSearchAnalyticsApi,
  });

  return (
    <Layout title="Поисковые запросы и ненайденный спрос">
      <div className="space-y-6">
        {/* KPI карточки */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase">Всего поисков</span>
              <Search size={18} className="text-primary-500" />
            </div>
            <div className="text-2xl font-bold text-app">
              {data?.stats?.totalSearches ?? 0}
            </div>
            <div className="text-xs text-muted mt-1">Все поисковые сессии арендаторов</div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase">Ненайденный спрос (0 рез.)</span>
              <AlertCircle size={18} className="text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {data?.stats?.zeroResultsCount ?? 0}
            </div>
            <div className="text-xs text-muted mt-1">Пользователи ничего не нашли по фильтрам</div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between text-muted mb-2">
              <span className="text-xs font-semibold uppercase">Доля дефицита</span>
              <TrendingUp size={18} className="text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-app">
              {data?.stats?.unmetDemandPercent ?? 0}%
            </div>
            <div className="text-xs text-muted mt-1">Потенциальные арендаторы без предложений</div>
          </div>
        </div>

        {/* Таблица последних поисковых запросов */}
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-app flex items-center justify-between">
            <h3 className="font-bold text-app text-sm flex items-center gap-2">
              <Filter size={16} className="text-primary-500" />
              Журнал поисковых запросов в реальном времени
            </h3>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-muted">Загрузка запросов...</div>
          ) : !data?.recentSearches || data.recentSearches.length === 0 ? (
            <div className="p-8 text-center text-muted">Поисковых запросов пока не зафиксировано</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-white/5 border-b border-app text-xs text-muted uppercase">
                  <tr>
                    <th className="p-3">Текст / Запрос</th>
                    <th className="p-3">Локация (Город / Район)</th>
                    <th className="p-3">Комнаты</th>
                    <th className="p-3">Ценовой диапазон</th>
                    <th className="p-3">Найдено объектов</th>
                    <th className="p-3">Дата</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app">
                  {data.recentSearches.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-3 font-medium text-app">
                        {s.query ? `"${s.query}"` : <span className="text-muted italic">Поиск по фильтрам</span>}
                      </td>
                      <td className="p-3 text-muted">
                        {s.city || 'Ташкент'}{s.district ? `, ${s.district}` : ''}
                      </td>
                      <td className="p-3">{s.rooms ? `${s.rooms} комн.` : 'Любое'}</td>
                      <td className="p-3 font-mono text-xs">
                        {s.minPrice || s.maxPrice
                          ? `${s.minPrice ? s.minPrice.toLocaleString() : '0'} - ${
                              s.maxPrice ? s.maxPrice.toLocaleString() : '∞'
                            } сум`
                          : 'Не задан'}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            s.resultsCount === 0
                              ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                              : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {s.resultsCount} шт.
                        </span>
                      </td>
                      <td className="p-3 text-xs text-muted flex items-center gap-1">
                        <Clock size={12} />
                        {format(new Date(s.createdAt), 'd MMM, HH:mm:ss', { locale: ru })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default SearchAnalyticsPage;
