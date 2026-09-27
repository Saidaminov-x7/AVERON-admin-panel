// src/pages/system/BackupsPage.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { getBackupsInfoApi } from '../../lib/extendedAdminApi';
import { api } from '../../lib/axios';
import { Download, Database, Users, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

const BackupsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const { data } = useQuery({
    queryKey: ['admin', 'backups-info'],
    queryFn: getBackupsInfoApi,
  });

  const handleDownloadSnapshot = async () => {
    try {
      setIsExporting(true);
      const res = await api.get('/admin/system/backups/export-snapshot', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ijarauz-snapshot-${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Ошибка при скачивании дампа данных');
    } finally {
      setIsExporting(false);
    }
  };

  const currentLocale = i18n.language === 'en' ? enUS : ru;

  return (
    <Layout title={t('system.backupsTitle', 'Резервные копии и Snapshot-менеджер')}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-muted">
            Ежедневные автоматические снимки базы данных и ручной экспорт полного JSON-дампа платформы.
          </p>
          <button
            type="button"
            onClick={handleDownloadSnapshot}
            disabled={isExporting}
            className="btn btn-primary flex items-center gap-2"
          >
            <Download size={16} /> {isExporting ? 'Формирование дампа...' : t('system.downloadBackup', 'Скачать JSON-снимок')}
          </button>
        </div>

        {/* Карточка последнего бэкапа / проверки */}
        <div className="card p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-950/50 text-primary-600 flex items-center justify-center">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <div className="text-sm text-muted">
                {data?.lastBackupType === 'MANUAL' ? 'Последний ручной экспорт' : 'Последняя проверка целостности'}
              </div>
              <div className="text-xl font-bold text-app">
                {data?.lastAutomaticBackup
                  ? format(new Date(data.lastAutomaticBackup), 'd MMMM yyyy, HH:mm', { locale: currentLocale })
                  : 'Снапшоты пока не создавались'}
              </div>
              <div className="text-xs text-muted mt-0.5">
                Полноценное резервное копирование и Point-in-Time Recovery обеспечиваются инфраструктурой Railway Postgres
              </div>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
            {data?.lastAutomaticBackup ? 'Снимок готов' : 'Ожидание первого снимка'}
          </span>
        </div>

        {/* Статистика базы данных */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <Database size={20} />
            </div>
            <div>
              <div className="text-xs text-muted">Объявлений в дампе</div>
              <div className="text-xl font-bold text-app">{data?.snapshotStats.listings ?? 0} шт.</div>
            </div>
          </div>

          <div className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <div className="text-xs text-muted">Пользователей</div>
              <div className="text-xl font-bold text-app">{data?.snapshotStats.users ?? 0} чел.</div>
            </div>
          </div>

          <div className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="text-xs text-muted">Жалоб и отчетов</div>
              <div className="text-xl font-bold text-app">{data?.snapshotStats.reports ?? 0} записей</div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BackupsPage;
