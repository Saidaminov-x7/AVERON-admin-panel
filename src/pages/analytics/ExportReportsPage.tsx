// src/pages/analytics/ExportReportsPage.tsx
// Страница выгрузки и экспорта аналитических отчётов в CSV

import React, { useState } from 'react';
import Layout from '../../components/Layout';
import { api } from '../../lib/axios';

const reportTypes = [
  {
    id: 'traffic',
    title: 'Сводный отчёт по трафику',
    desc: 'Посуточная статистика уникальных посетителей, новых объявлений и регистраций за выбранный период.',
    icon: '📈',
  },
  {
    id: 'visitors',
    title: 'Журнал уникальных посетителей',
    desc: 'Точный реестр ежедневных посещений без задваивания по уникальным устройствам.',
    icon: '👥',
  },
  {
    id: 'listings',
    title: 'Реестр опубликованных объявлений',
    desc: 'Полный список объектов, созданных за указанный период (ID, название, город, цена, статус).',
    icon: '🏠',
  },
];

const ExportReportsPage: React.FC = () => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(monthAgoStr);
  const [dateTo, setDateTo] = useState(todayStr);
  const [selectedType, setSelectedType] = useState('traffic');
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    try {
      const { data } = await api.get('/admin/analytics/export', {
        params: { from: dateFrom, to: dateTo, type: selectedType },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedType}-report-${dateFrom}-${dateTo}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Не удалось скачать отчёт. Попробуйте ещё раз.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Layout title="Экспорт отчётов">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="card">
          <h3 className="text-base font-bold text-app mb-1">Параметры выгрузки данных</h3>
          <p className="text-xs text-muted mb-6">
            Выберите тип отчёта и необходимый временной интервал для формирования CSV-файла (совместим с Microsoft Excel).
          </p>

          {/* Выбор типа отчета */}
          <div className="space-y-3 mb-6">
            <label className="block text-xs font-semibold text-app mb-2">Тип отчёта</label>
            <div className="grid grid-cols-1 gap-3">
              {reportTypes.map((r) => (
                <label
                  key={r.id}
                  className={`
                    flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all
                    ${
                      selectedType === r.id
                        ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-950/40 ring-2 ring-primary-500/20'
                        : 'border-app hover:bg-gray-50 dark:hover:bg-white/5'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="reportType"
                    value={r.id}
                    checked={selectedType === r.id}
                    onChange={() => setSelectedType(r.id)}
                    className="mt-1 accent-primary-500 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <div className="flex items-center gap-2 font-bold text-sm text-app">
                      <span>{r.icon}</span>
                      <span>{r.title}</span>
                    </div>
                    <p className="text-xs text-muted mt-1 leading-relaxed">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Выбор дат */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 pt-4 border-t border-app">
            <div>
              <label className="block text-xs font-semibold text-app mb-1.5">Дата начала</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-app mb-1.5">Дата окончания</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Кнопка скачивания */}
          <div className="flex justify-end">
            {error && <p className="mr-4 self-center text-sm text-red-500">{error}</p>}
            <button
              onClick={handleDownload}
              disabled={isDownloading || !dateFrom || !dateTo || dateFrom > dateTo}
              className="btn-primary flex items-center gap-2 px-6"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {isDownloading ? 'Формирование...' : 'Сформировать и скачать CSV'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ExportReportsPage;
