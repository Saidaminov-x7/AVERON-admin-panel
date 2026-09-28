// src/pages/ModerationKanbanPage.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { getKanbanBoardApi } from '../lib/extendedAdminApi';
import { api } from '../lib/axios';
import { Check, X, Edit3, MapPin, User, Keyboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const ModerationKanbanPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [selectedListingIndex, setSelectedListingIndex] = useState<number>(0);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'kanban-board'],
    queryFn: getKanbanBoardApi,
  });

  const moderateMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => {
      await api.patch(`/admin/listings/${id}/moderation`, {
        moderationStatus: status,
        moderationNote: note,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'kanban-board'] });
      toast.success('Статус модерации обновлен');
    },
  });

  const columns = [
    { key: 'PENDING', title: t('kanban.pendingCol', 'Ожидают проверки'), badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
    { key: 'CHANGES_REQUESTED', title: t('kanban.changesRequestedCol', 'Запрошены правки'), badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
    { key: 'REJECTED', title: t('kanban.rejectedCol', 'Отклоненные'), badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' },
    { key: 'APPROVED_VERIFIED', title: t('kanban.approvedCol', 'Проверено AVERON'), badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  ];

  const pendingItems = data ? (data as any)['PENDING'] || [] : [];

  // [ФИЧА: ХОТКЕИ В КАНБАНЕ] J/K — навигация, A — одобрить, R — отклонить
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем ввод в текстовых полях
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'j' || e.key === 'J' || e.key === 'о') {
        setSelectedListingIndex((prev) => Math.min(prev + 1, Math.max(0, pendingItems.length - 1)));
      } else if (e.key === 'k' || e.key === 'K' || e.key === 'л') {
        setSelectedListingIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'a' || e.key === 'A' || e.key === 'ф') {
        const current = pendingItems[selectedListingIndex];
        if (current) {
          moderateMutation.mutate({ id: current.id, status: 'APPROVED' });
        }
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'к') {
        const current = pendingItems[selectedListingIndex];
        if (current) {
          moderateMutation.mutate({ id: current.id, status: 'REJECTED', note: 'Нарушение правил платформы' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingItems, selectedListingIndex, moderateMutation]);

  return (
    <Layout title={t('kanban.title', 'Канбан модерации')}>
      <div className="space-y-4 max-w-7xl mx-auto pb-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-muted">
            {t('kanban.subtitle', 'Быстрая обработка входящих объявлений. Одобряйте, отклоняйте или запрашивайте правки в 1 клик.')}
          </p>

          <div className="flex items-center gap-2 text-xs text-muted bg-surface px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 shadow-xs select-none">
            <Keyboard size={14} className="text-primary-500" />
            <span>Хоткеи: <kbd className="font-mono bg-gray-100 dark:bg-white/10 px-1 rounded">J</kbd>/<kbd className="font-mono bg-gray-100 dark:bg-white/10 px-1 rounded">K</kbd> карточки • <kbd className="font-mono bg-gray-100 dark:bg-white/10 px-1 rounded">A</kbd> Одобрить • <kbd className="font-mono bg-gray-100 dark:bg-white/10 px-1 rounded">R</kbd> Отклонить</span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-muted">{t('kanban.loading', 'Загрузка доски модерации...')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {columns.map((col) => {
              const items = data ? (data as any)[col.key] || [] : [];
              return (
                <div key={col.key} className="bg-gray-100/80 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-3 flex flex-col gap-3 min-h-[500px]">
                  {/* Заголовок колонки */}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-app uppercase tracking-wide">{col.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.badge}`}>
                      {items.length}
                    </span>
                  </div>

                  {/* Список карточек */}
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1 scrollbar-thin">
                    {items.length === 0 ? (
                      <div className="text-xs text-muted text-center py-10 opacity-70">
                        {t('kanban.empty', 'Нет объявлений')}
                      </div>
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {items.map((item: any, idx: number) => {
                          const isSelectedPending = col.key === 'PENDING' && idx === selectedListingIndex;
                          return (
                            <motion.div
                              layout
                              key={item.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                              className={`p-3 rounded-xl bg-surface shadow-xs hover:shadow-md transition-all flex flex-col gap-2 cursor-pointer border ${
                                isSelectedPending
                                  ? 'border-primary-500 ring-2 ring-primary-500/20'
                                  : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                              }`}
                              onClick={() => navigate(`/listings?highlight=${item.id}`)}
                            >
                              <div className="flex gap-2">
                                {item.images?.[0] ? (
                                  <img
                                    src={item.images[0].url || item.images[0].secure_url}
                                    alt={item.title}
                                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-xs text-muted">
                                    Нет фото
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-bold text-app truncate">{item.title}</h4>
                                  <div className="text-xs font-semibold text-primary-600 dark:text-primary-400 mt-0.5">
                                    {Number(item.price).toLocaleString()} сум
                                  </div>
                                  <div className="text-[11px] text-muted flex items-center gap-1 mt-1 truncate">
                                    <MapPin size={10} /> {item.city}, {item.district || ''}
                                  </div>
                                </div>
                              </div>

                              {/* Автор */}
                              <div className="pt-2 border-t border-app flex items-center justify-between text-[11px] text-muted">
                                <span className="truncate flex items-center gap-1">
                                  <User size={10} /> {item.owner?.name || 'Пользователь'}
                                </span>
                                {item.owner?.verified && (
                                  <span className="text-emerald-500 font-medium text-[10px]">Verified</span>
                                )}
                              </div>

                              {/* Кнопки быстрых действий */}
                              <div className="flex gap-1 pt-1 justify-end" onClick={(e) => e.stopPropagation()}>
                                {col.key !== 'APPROVED_VERIFIED' && (
                                  <button
                                    type="button"
                                    title={t('kanban.approve', 'Одобрить')}
                                    onClick={() => moderateMutation.mutate({ id: item.id, status: 'APPROVED' })}
                                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 cursor-pointer"
                                  >
                                    <Check size={14} />
                                  </button>
                                )}
                                {col.key !== 'CHANGES_REQUESTED' && (
                                  <button
                                    type="button"
                                    title={t('kanban.requestChanges', 'Запросить правки')}
                                    onClick={() => moderateMutation.mutate({ id: item.id, status: 'CHANGES_REQUESTED', note: 'Требуется исправить описание или фото' })}
                                    className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 cursor-pointer"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                )}
                                {col.key !== 'REJECTED' && (
                                  <button
                                    type="button"
                                    title={t('kanban.reject', 'Отклонить')}
                                    onClick={() => moderateMutation.mutate({ id: item.id, status: 'REJECTED', note: 'Нарушение правил платформы' })}
                                    className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 cursor-pointer"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ModerationKanbanPage;
