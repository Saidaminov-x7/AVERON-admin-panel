// src/pages/analytics/HeatmapPage.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import { getHeatmapAnalyticsApi } from '../../lib/extendedAdminApi';
import { MapPin, Eye, Layers } from 'lucide-react';

const HeatmapPage: React.FC = () => {
  const [metric, setMetric] = useState<'price' | 'density' | 'demand'>('price');
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'heatmap'],
    queryFn: getHeatmapAnalyticsApi,
  });

  return (
    <Layout title="Тепловая карта цен и спроса">
      <div className="space-y-6">
        {/* Переключатель метрик */}
        <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-primary-500" />
            <span className="font-semibold text-app text-sm">Слой аналитики:</span>
            <div className="flex rounded-lg border border-app overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setMetric('price')}
                className={`px-3 py-1.5 transition-colors ${metric === 'price' ? 'bg-primary-500 text-white' : 'text-muted hover:text-app'}`}
              >
                Средняя цена (сум/мес)
              </button>
              <button
                type="button"
                onClick={() => setMetric('density')}
                className={`px-3 py-1.5 transition-colors ${metric === 'density' ? 'bg-primary-500 text-white' : 'text-muted hover:text-app'}`}
              >
                Плотность предложений
              </button>
              <button
                type="button"
                onClick={() => setMetric('demand')}
                className={`px-3 py-1.5 transition-colors ${metric === 'demand' ? 'bg-primary-500 text-white' : 'text-muted hover:text-app'}`}
              >
                Спрос (Просмотры)
              </button>
            </div>
          </div>

          <div className="text-xs text-muted">
            Всего геоточек: {data?.points?.length || 0}
          </div>
        </div>

        {/* Сводная таблица по районам */}
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-app flex items-center justify-between">
            <h3 className="font-bold text-app text-sm flex items-center gap-2">
              <MapPin size={16} className="text-primary-500" />
              Статистика по районам (Тепловой рейтинг)
            </h3>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-muted">Загрузка данных карты...</div>
          ) : !data?.districts || data.districts.length === 0 ? (
            <div className="p-8 text-center text-muted">Геоданные отсутствуют</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-white/5 border-b border-app text-xs text-muted uppercase">
                  <tr>
                    <th className="p-3">Район</th>
                    <th className="p-3">Город</th>
                    <th className="p-3">Объектов</th>
                    <th className="p-3">Ср. цена</th>
                    <th className="p-3">Суммарный интерес</th>
                    <th className="p-3">Индекс спроса</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app">
                  {data.districts.map((d, i) => {
                    const demandScore = Math.min(100, Math.round((d.views / (d.count || 1)) * 5));
                    return (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="p-3 font-semibold text-app">{d.district}</td>
                        <td className="p-3 text-muted">{d.city}</td>
                        <td className="p-3">{d.count} объявл.</td>
                        <td className="p-3 font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          {d.avgPrice.toLocaleString()} сум
                        </td>
                        <td className="p-3 text-muted flex items-center gap-1">
                          <Eye size={14} /> {d.views}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                              <div
                                className={`h-full ${
                                  demandScore > 70 ? 'bg-rose-500' : demandScore > 40 ? 'bg-amber-500' : 'bg-primary-500'
                                }`}
                                style={{ width: `${demandScore}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono">{demandScore}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default HeatmapPage;
