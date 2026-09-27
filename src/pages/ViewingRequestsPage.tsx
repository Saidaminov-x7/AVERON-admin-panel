// src/pages/ViewingRequestsPage.tsx

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { getViewingRequestsApi, updateViewingStatusApi, type ViewingRequestItem, type ViewingStatus } from '../lib/listingsApi';
import { toast } from 'sonner';
import { Calendar, CheckCircle2, XCircle, Clock, User, ExternalLink } from 'lucide-react';

import { Tabs } from '../components/ui';

type TabKey = 'ALL' | 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'COMPLETED';

const ViewingRequestsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState<TabKey>('ALL');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin', 'viewing-requests'],
    queryFn: getViewingRequestsApi,
  });

  const TABS = [
    { id: 'ALL' as const, label: t('common.all', 'Все') },
    { id: 'PENDING' as const, label: t('viewingRequests.pending', 'В ожидании') },
    { id: 'CONFIRMED' as const, label: t('viewingRequests.confirmed', 'Подтверждены') },
    { id: 'DECLINED' as const, label: t('viewingRequests.rejected', 'Отклонены') },
    { id: 'COMPLETED' as const, label: t('viewingRequests.completed', 'Завершены') },
  ];

  const filteredRequests = React.useMemo(() => {
    if (activeTab === 'ALL') return requests;
    return requests.filter((r) => r.status === activeTab);
  }, [requests, activeTab]);

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ViewingStatus }) =>
      updateViewingStatusApi(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'viewing-requests'] });
      const previous = queryClient.getQueryData<ViewingRequestItem[]>(['admin', 'viewing-requests']);
      if (previous) {
        queryClient.setQueryData<ViewingRequestItem[]>(['admin', 'viewing-requests'], (old) =>
          old ? old.map((item) => (item.id === id ? { ...item, status } : item)) : [],
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['admin', 'viewing-requests'], context.previous);
      }
      toast.error(t('common.error', 'Не удалось обновить статус заявки'));
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.status === 'CONFIRMED'
          ? t('viewingRequests.confirmed', 'Заявка подтверждена')
          : variables.status === 'DECLINED'
          ? t('viewingRequests.rejected', 'Заявка отклонена')
          : t('common.saved', 'Статус заявки обновлён'),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'viewing-requests'] });
    },
  });

  const statusBadge = (status: ViewingStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-1 rounded-full"><CheckCircle2 size={13} /> {t('viewingRequests.confirmed', 'Подтверждена')}</span>;
      case 'DECLINED':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 px-2.5 py-1 rounded-full"><XCircle size={13} /> {t('viewingRequests.rejected', 'Отклонена')}</span>;
      case 'COMPLETED':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400 px-2.5 py-1 rounded-full"><CheckCircle2 size={13} /> {t('viewingRequests.completed', 'Просмотр завершён')}</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 px-2.5 py-1 rounded-full"><Clock size={13} /> {t('viewingRequests.pending', 'В ожидании')}</span>;
    }
  };

  return (
    <Layout title={t('viewingRequests.title', 'Заявки на просмотр')}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-app tracking-tight">
              {t('viewingRequests.title', 'Заявки на просмотр')}
            </h1>
            <p className="text-xs text-muted mt-0.5">
              {t('common.total', { count: requests.length, defaultValue: `Всего заявок: ${requests.length}` })}
            </p>
          </div>
        </div>

        {/* Tabs Filter */}
        <Tabs
          tabs={TABS}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab)}
        />

        {isLoading ? (
          <div className="p-12 text-center text-muted">{t('common.loading', 'Загрузка заявок...')}</div>
        ) : filteredRequests.length === 0 ? (
          <div className="card p-12 text-center text-muted">{t('viewingRequests.noRequests', 'Заявок в этой категории пока нет')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRequests.map((item: ViewingRequestItem) => (
              <div key={item.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-app pb-3">
                  <div>
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1">
                      <Calendar size={13} />
                      {item.listing.title}
                    </span>
                    <div className="text-[11px] text-muted mt-0.5">
                      {t('common.date', 'Дата')}: {new Date(item.createdAt).toLocaleString('ru-RU')}
                    </div>
                  </div>
                  <div>{statusBadge(item.status)}</div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-app font-medium">
                    <User size={13} className="text-muted" />
                    <span>{t('viewingRequests.client', 'Заявитель')}: <strong>{item.requester.name}</strong> ({item.requester.phone || item.requester.email})</span>
                  </div>
                  {item.preferredDate && (
                    <div className="text-app">
                      {t('viewingRequests.preferredDate', 'Желаемая дата')}: <strong>{new Date(item.preferredDate).toLocaleString('ru-RU')}</strong>
                    </div>
                  )}
                  {item.message && (
                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-white/5 text-muted text-[11px] italic">
                      "{item.message}"
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-app">
                  {item.status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        onClick={() => updateMutation.mutate({ id: item.id, status: 'CONFIRMED' })}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-xs transition-colors cursor-pointer"
                      >
                        {t('viewingRequests.confirmAction', 'Подтвердить')}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateMutation.mutate({ id: item.id, status: 'DECLINED' })}
                        className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-medium text-xs transition-colors cursor-pointer"
                      >
                        {t('viewingRequests.rejectAction', 'Отклонить')}
                      </button>
                    </>
                  )}
                  {item.status === 'CONFIRMED' && (
                    <button
                      type="button"
                      onClick={() => updateMutation.mutate({ id: item.id, status: 'COMPLETED' })}
                      className="px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium text-xs transition-colors cursor-pointer"
                    >
                      {t('viewingRequests.completeAction', 'Завершить просмотр')}
                    </button>
                  )}
                  <a
                    href={`/catalog/${item.listingId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-app hover:bg-gray-100 dark:hover:bg-white/5 text-muted hover:text-app text-xs inline-flex items-center gap-1 transition-colors"
                  >
                    {t('viewingRequests.listing', 'Объект')} <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ViewingRequestsPage;
