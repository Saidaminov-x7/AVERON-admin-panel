// src/pages/monetization/PromoCodesPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { Button, Modal } from '../../components/ui';
import { getPromoCodesApi, createPromoCodeApi, deletePromoCodeApi } from '../../lib/extendedAdminApi';
import { Ticket, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

const PromoCodesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(15);
  const [maxUses, setMaxUses] = useState(100);

  const { data: promoCodes, isLoading } = useQuery({
    queryKey: ['admin', 'promo-codes'],
    queryFn: getPromoCodesApi,
  });

  const createMutation = useMutation({
    mutationFn: createPromoCodeApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'promo-codes'] });
      setIsOpenModal(false);
      setCode('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePromoCodeApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'promo-codes'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    createMutation.mutate({
      code,
      discountPercent: Number(discountPercent),
      maxUses: Number(maxUses),
    });
  };

  const currentLocale = i18n.language === 'en' ? enUS : ru;

  return (
    <Layout title={t('monetization.promoCodesTitle', 'Управление промокодами и скидками')}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-muted">
            Создавайте промокоды на скидку для продвижения объявлений арендодателей (TOP, VIP, Срочно).
          </p>
          <button
            type="button"
            onClick={() => setIsOpenModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> {t('monetization.addPromoCode', 'Создать промокод')}
          </button>
        </div>

        {/* Список промокодов */}
        <div className="card p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted">{t('common.loading', 'Загрузка промокодов...')}</div>
          ) : !promoCodes || promoCodes.length === 0 ? (
            <div className="p-8 text-center text-muted">{t('common.noData', 'Промокодов пока нет')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-white/5 border-b border-app text-xs text-muted uppercase">
                  <tr>
                    <th className="p-3">{t('monetization.code', 'Код')}</th>
                    <th className="p-3">{t('monetization.discount', 'Скидка')}</th>
                    <th className="p-3">{t('monetization.uses', 'Использовано')}</th>
                    <th className="p-3">{t('common.status', 'Статус')}</th>
                    <th className="p-3">{t('common.date', 'Дата создания')}</th>
                    <th className="p-3 text-right">{t('common.actions', 'Действия')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app">
                  {promoCodes.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono font-bold text-app flex items-center gap-2">
                        <Ticket size={16} className="text-primary-500" />
                        {p.code}
                      </td>
                      <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">
                        {p.discountPercent}%
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-app">{p.usedCount}</span> / {p.maxUses}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 w-fit">
                          <CheckCircle2 size={12} /> {t('common.active', 'Активен')}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-muted">
                        {format(new Date(p.createdAt), 'd MMM yyyy', { locale: currentLocale })}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(p.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title={t('common.delete', 'Удалить')}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Модалка создания */}
        <Modal
          isOpen={isOpenModal}
          onClose={() => setIsOpenModal(false)}
          title={t('monetization.addPromoCode', 'Создать промокод')}
          size="md"
          fullscreenOnMobile
          closeLabel={t('common.close', 'Закрыть')}
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsOpenModal(false)} disabled={createMutation.isPending}>
                {t('common.cancel', 'Отмена')}
              </Button>
              <Button type="submit" form="promo-code-create-form" loading={createMutation.isPending}>
                {createMutation.isPending ? t('common.saving', 'Сохранение...') : t('common.create', 'Создать')}
              </Button>
            </>
          }
        >
              <form id="promo-code-create-form" onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">{t('monetization.code', 'Код (например, SUMMER25)')}</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="SUMMER25"
                    className="w-full px-3 py-2 rounded-xl border border-app bg-app text-app font-mono text-sm uppercase outline-none focus:border-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">{t('monetization.discount', 'Скидка (%)')}</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-app bg-app text-app text-sm outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted mb-1">{t('monetization.maxUses', 'Лимит использований')}</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={maxUses}
                      onChange={(e) => setMaxUses(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-app bg-app text-app text-sm outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

              </form>
        </Modal>
      </div>
    </Layout>
  );
};

export default PromoCodesPage;
