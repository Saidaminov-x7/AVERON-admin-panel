import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, X, Package, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import {
  approveImport,
  getImports,
  isProductCountry,
  PRODUCT_COUNTRIES,
  rejectImport,
  type ImportedProduct,
  type ProductCountry,
} from '../../lib/commerceApi';
import { EmptyState, Modal, Input, Button, Select, Textarea } from '../../components/ui';

export default function ImportsPage() {
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const [approveItem, setApproveItem] = useState<ImportedProduct | null>(null);
  const [rejectItem, setRejectItem] = useState<ImportedProduct | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [country, setCountry] = useState<ProductCountry | ''>('');
  const [rejectReason, setRejectReason] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['imports', 'PENDING_REVIEW'],
    queryFn: () => getImports(),
  });

  const refresh = () => client.invalidateQueries({ queryKey: ['imports'] });

  const approveMutation = useMutation({
    mutationFn: ({ id, price, country: productCountry }: { id: string; price: number; country: ProductCountry }) =>
      approveImport(id, price, 1800, productCountry),
    onSuccess: () => {
      toast.success(t('imports.toastPublished', 'Товар опубликован'));
      setApproveItem(null);
      setPriceInput('');
      setCountry('');
      refresh();
    },
    onError: () => toast.error(t('imports.toastPublishError', 'Ошибка публикации')),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectImport(id, reason),
    onSuccess: () => {
      toast.success(t('imports.toastRejected', 'Импорт отклонён'));
      setRejectItem(null);
      setRejectReason('');
      refresh();
    },
    onError: () => toast.error(t('imports.toastRejectError', 'Ошибка отклонения')),
  });

  const openApprove = (item: ImportedProduct) => {
    setApproveItem(item);
    setPriceInput(item.suggestedPriceUzs ? String(Math.round(Number(item.suggestedPriceUzs))) : '');
    setCountry('');
  };

  const currencyLocale = i18n.language?.startsWith('en') ? 'en-US' : 'ru-RU';
  const countryOptions = PRODUCT_COUNTRIES.map(({ code, flag, translationKey }) => ({
    value: code,
    label: `${flag} ${t(translationKey)}`,
  }));

  return (
    <Layout title={t('imports.title', 'Импорт · Очередь проверки')}>
      <div className="space-y-6">
        {/* Заголовок */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest text-amber-500">{t('imports.queueSubtitle', 'AI IMPORT QUEUE')}</p>
            <h1 className="text-2xl font-black text-app">{t('imports.queueTitle', 'Ожидают проверки')}</h1>
          </div>
          {data.length > 0 && (
            <span className="badge-warning">{t('imports.itemsCount', { count: data.length, defaultValue: `${data.length} товаров` })}</span>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-32 animate-pulse" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={<Package size={32} />}
            title={t('imports.emptyTitle', 'Очередь пуста')}
            description={t('imports.emptyDesc', 'Новые товары из парсера появятся здесь автоматически')}
          />
        ) : (
          <div className="grid gap-4">
            {data.map((item) => (
              <article key={item.id} className="card">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                  {/* Изображение */}
                  {item.imageUrl && (
                    <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800">
                      <img
                        src={item.imageUrl}
                        alt={item.originalTitle}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  )}

                  {/* Информация */}
                  <div className="flex-1 min-w-0">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="badge-info">{item.source}</span>
                      <span className="badge-warning">PENDING REVIEW</span>
                    </div>
                    <h2 className="font-bold text-app truncate">{item.originalTitle}</h2>
                    <div className="mt-2 text-sm text-muted">
                      {t('imports.cost', 'Закупка')}: <strong className="text-app">¥{item.sourcePriceCny}</strong>
                      {' · '}
                      {t('imports.suggestedPrice', 'Рекомендуемая цена')}:{' '}
                      <strong className="text-app">
                        {Number(item.suggestedPriceUzs || 0).toLocaleString(currencyLocale)} {t('commerce.currencySuffix', 'сум')}
                      </strong>
                    </div>
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm text-primary-500 hover:underline"
                    >
                      {t('imports.source', 'Источник')} <ExternalLink size={14} />
                    </a>
                  </div>

                  {/* Действия */}
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Check size={15} />}
                      onClick={() => openApprove(item)}
                    >
                      {t('imports.approve', 'Одобрить')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<X size={15} />}
                      className="text-red-500 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => { setRejectItem(item); setRejectReason(''); }}
                    >
                      {t('imports.reject', 'Отклонить')}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Модал: Одобрить */}
      <Modal
        isOpen={!!approveItem}
        onClose={() => { setApproveItem(null); setPriceInput(''); setCountry(''); }}
        title={t('imports.approveModalTitle', 'Одобрить товар')}
        subtitle={approveItem?.originalTitle}
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => { setApproveItem(null); setPriceInput(''); setCountry(''); }}>
              {t('common.cancel', 'Отмена')}
            </Button>
            <Button
              loading={approveMutation.isPending}
              leftIcon={<Check size={15} />}
              disabled={!priceInput || Number(priceInput) <= 0 || !country}
              onClick={() => {
                if (approveItem && Number(priceInput) > 0 && isProductCountry(country)) {
                  approveMutation.mutate({ id: approveItem.id, price: Number(priceInput), country });
                }
              }}
            >
              {t('imports.publishAction', 'Опубликовать')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>
              {t('imports.approveHint', {
                price: approveItem ? Number(approveItem.suggestedPriceUzs || 0).toLocaleString(currencyLocale) : 0,
                defaultValue: `Укажите финальную цену продажи в сумах. Рекомендованная: ${approveItem ? Number(approveItem.suggestedPriceUzs || 0).toLocaleString(currencyLocale) : 0} сум`,
              })}
            </span>
          </div>
          <Input
            label={t('imports.salePriceLabel', 'Цена продажи (UZS)')}
            type="number"
            min={1}
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder={t('imports.salePricePlaceholder', 'Например: 450000')}
          />
          <Select
            label={t('products.countryLabel')}
            placeholder={t('products.countryPlaceholder')}
            value={country}
            options={countryOptions}
            onChange={(value) => setCountry(isProductCountry(value) ? value : '')}
          />
        </div>
      </Modal>

      {/* Модал: Отклонить */}
      <Modal
        isOpen={!!rejectItem}
        onClose={() => { setRejectItem(null); setRejectReason(''); }}
        title={t('imports.rejectModalTitle', 'Отклонить импорт')}
        subtitle={rejectItem?.originalTitle}
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => { setRejectItem(null); setRejectReason(''); }}>
              {t('common.cancel', 'Отмена')}
            </Button>
            <Button
              variant="danger"
              loading={rejectMutation.isPending}
              leftIcon={<X size={15} />}
              disabled={rejectReason.trim().length < 3}
              onClick={() => {
                if (rejectItem && rejectReason.trim().length >= 3) {
                  rejectMutation.mutate({ id: rejectItem.id, reason: rejectReason.trim() });
                }
              }}
            >
              {t('imports.reject', 'Отклонить')}
            </Button>
          </div>
        }
      >
        <Textarea
          label={t('imports.rejectReasonLabel', 'Причина отклонения')}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder={t('imports.rejectReasonPlaceholder', 'Укажите причину (минимум 3 символа)...')}
          rows={3}
          helperText={t('imports.rejectReasonHelper', 'Минимум 3 символа')}
        />
      </Modal>
    </Layout>
  );
}
