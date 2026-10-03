import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, ExternalLink, Eye, ImagePlus, Package, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { CountryFlag } from '../../components/commerce/CountryFlag';
import {
  approveImport,
  getImports,
  isProductCountry,
  PRODUCT_COUNTRIES,
  rejectImport,
  type ImportedProduct,
  type ProductCountry,
  type ProductLocale,
} from '../../lib/commerceApi';
import { uploadProductPhotoApi, type MediaItem } from '../../lib/mediaApi';
import {
  applyProductAiSuggestions,
  getProductAiSuggestionsApi,
  type ProductAiSuggestions,
  type ProductLocalizedContent,
} from '../../lib/productAiApi';
import { useAdminCapabilities } from '../../hooks/useAdminCapabilities';
import { useDebounce } from '../../hooks/useDebounce';
import { EmptyState, Input, Button, Select, Textarea, Modal, Pagination } from '../../components/ui';

type ImportStatus = ImportedProduct['status'];
type LocalizedDraft = Record<ProductLocale, ProductLocalizedContent & { characteristics: Record<string, string> }>;

const locales: ProductLocale[] = ['ru', 'uz', 'en'];
const statusOptions: Array<{ value: ImportStatus; label: string }> = [
  { value: 'PENDING_REVIEW', label: 'Ожидают проверки' },
  { value: 'APPROVED', label: 'Одобрены' },
  { value: 'REJECTED', label: 'Отклонены' },
];
const providerOptions = [
  { value: 'SOURCE_1688', label: '1688' },
  { value: 'TAOBAO', label: 'Taobao' },
  { value: 'ALIBABA', label: 'Alibaba' },
  { value: 'ALIEXPRESS', label: 'AliExpress' },
  { value: 'MANUAL', label: 'Manual' },
];

function imageUrls(item: ImportedProduct): string[] {
  const values = item.normalizedPayload?.sourceImages ?? item.normalizedPayload?.images ?? [];
  return values.flatMap((value) => {
    const url = typeof value === 'string' ? value : value?.url;
    if (!url) return [];
    try {
      return new URL(url).protocol === 'https:' ? [url] : [];
    } catch {
      return [];
    }
  }).slice(0, 15);
}

function sourceProvider(item: ImportedProduct): string {
  const provider = item.normalizedPayload?.provider
    ?? item.sourceMetadata?.provider
    ?? item.source;
  return typeof provider === 'string' ? provider.replace(/^SOURCE_/, '') : item.source;
}

function ImagePreview({ url, title }: { url: string; title: string }) {
  const [failed, setFailed] = useState(false);
  return failed
    ? <div className="grid h-24 w-24 shrink-0 place-items-center rounded-xl bg-surface-muted text-muted"><Package size={24} /></div>
    : <img
      src={url}
      alt={title}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="h-24 w-24 shrink-0 rounded-xl bg-surface-muted object-cover"
      onError={() => setFailed(true)}
    />;
}

export default function ImportsPage() {
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const capabilities = useAdminCapabilities();
  const [status, setStatus] = useState<ImportStatus>('PENDING_REVIEW');
  const [provider, setProvider] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const debouncedQuery = useDebounce(query, 250);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [detailsItem, setDetailsItem] = useState<ImportedProduct | null>(null);
  const [approveItem, setApproveItem] = useState<ImportedProduct | null>(null);
  const [rejectItem, setRejectItem] = useState<ImportedProduct | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [exchangeRateInput, setExchangeRateInput] = useState('');
  const [country, setCountry] = useState<ProductCountry | ''>('');
  const [publishNow, setPublishNow] = useState(false);
  const [localizedDraft, setLocalizedDraft] = useState<LocalizedDraft>({
    ru: { title: '', description: '', characteristics: {} },
    uz: { title: '', description: '', characteristics: {} },
    en: { title: '', description: '', characteristics: {} },
  });
  const [uploadedImages, setUploadedImages] = useState<MediaItem[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<ProductAiSuggestions | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const currencyLocale = i18n.language?.startsWith('en') ? 'en-US' : 'ru-RU';

  const filters = useMemo(() => ({
    status,
    ...(provider ? { provider } : {}),
    ...(isProductCountry(countryFilter) ? { country: countryFilter } : {}),
    ...(debouncedQuery.trim() ? { q: debouncedQuery.trim() } : {}),
    ...(fromDate ? { from: new Date(`${fromDate}T00:00:00.000Z`).toISOString() } : {}),
    ...(toDate ? { to: new Date(`${toDate}T23:59:59.999Z`).toISOString() } : {}),
    page,
    limit: pageSize,
  }), [status, provider, countryFilter, debouncedQuery, fromDate, toDate, page]);
  const importsQuery = useQuery({
    queryKey: ['imports', filters],
    queryFn: () => getImports(filters),
  });
  const items = importsQuery.data?.items ?? [];
  const pagination = importsQuery.data?.pagination;
  const sourceCountryOptions = PRODUCT_COUNTRIES.map(({ code, translationKey }) => ({
    value: code,
    label: t(translationKey),
    icon: <CountryFlag country={code} />,
  }));

  const refresh = () => client.invalidateQueries({ queryKey: ['imports'] });
  const approveMutation = useMutation({
    mutationFn: ({ item, form }: { item: ImportedProduct; form: {
      translations: Partial<Record<ProductLocale, { title?: string; description?: string; characteristics?: Record<string, string> }>>;
      salePriceUzs: number;
      exchangeRate?: number;
      country: ProductCountry;
      mediaIds: string[];
      publish: boolean;
    } }) => approveImport(item.id, form),
    onSuccess: () => {
      toast.success(publishNow
        ? t('imports.toastPublished', 'Товар одобрен и опубликован')
        : t('imports.toastDraft', 'Товар одобрен и сохранён как черновик'));
      setApproveItem(null);
      setUploadedImages([]);
      setAiSuggestions(null);
      setPublishNow(false);
      refresh();
    },
    onError: () => toast.error(t('imports.toastPublishError', 'Не удалось одобрить импорт')),
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectImport(id, reason),
    onSuccess: () => {
      toast.success(t('imports.toastRejected', 'Импорт отклонён'));
      setRejectItem(null);
      setRejectReason('');
      refresh();
    },
    onError: () => toast.error(t('imports.toastRejectError', 'Ошибка отклонения')),
  });
  const aiMutation = useMutation({
    mutationFn: async () => {
      if (!approveItem || !isProductCountry(country)) throw new Error('A product country is required');
      const snapshot = approveItem.normalizedPayload;
      const characteristics = Object.fromEntries(
        Object.entries(snapshot?.sourceAttributes ?? {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(', ') : value]),
      );
      return getProductAiSuggestionsApi(capabilities.data, {
        mediaIds: uploadedImages.map(({ id }) => id),
        sourceTitle: approveItem.originalTitle,
        ...(snapshot?.sourceDescription ? { sourceDescription: snapshot.sourceDescription.slice(0, 5000) } : {}),
        country,
        ...(snapshot?.sourceCategory ? { categoryName: snapshot.sourceCategory } : {}),
        characteristics,
        variants: (snapshot?.variants ?? []).map(({ color, size }) => ({ color, size })),
      });
    },
    onSuccess: ({ suggestions }) => setAiSuggestions(suggestions),
    onError: () => toast.error(t('imports.aiError', 'Не удалось подготовить AI-предложение')),
  });

  const resetFilters = () => setPage(1);
  const openApprove = (item: ImportedProduct) => {
    const productCountry = item.normalizedPayload?.country;
    setApproveItem(item);
    setPriceInput(item.suggestedPriceUzs ? String(Math.round(Number(item.suggestedPriceUzs))) : '');
    setExchangeRateInput('');
    setCountry(isProductCountry(productCountry) ? productCountry : '');
    setPublishNow(false);
    setUploadedImages([]);
    setAiSuggestions(null);
    setLocalizedDraft({
      ru: { title: item.originalTitle, description: '', characteristics: {} },
      uz: { title: '', description: '', characteristics: {} },
      en: { title: '', description: '', characteristics: {} },
    });
  };
  const setLocalizedField = (locale: ProductLocale, field: 'title' | 'description', value: string) => {
    setLocalizedDraft((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }));
  };
  const applySuggestionsToEmptyFields = () => {
    if (!aiSuggestions) return;
    const content: Record<ProductLocale, ProductLocalizedContent> = {
      ru: localizedDraft.ru,
      uz: localizedDraft.uz,
      en: localizedDraft.en,
    };
    const applied = applyProductAiSuggestions(content, {}, aiSuggestions);
    setLocalizedDraft((current) => ({
      ...current,
      ru: { ...current.ru, ...applied.translations.ru, characteristics: { ...current.ru.characteristics, ...aiSuggestions.ru.characteristics } },
      uz: { ...current.uz, ...applied.translations.uz, characteristics: { ...current.uz.characteristics, ...aiSuggestions.uz.characteristics } },
      en: { ...current.en, ...applied.translations.en, characteristics: { ...current.en.characteristics, ...aiSuggestions.en.characteristics } },
    }));
    setAiSuggestions(null);
  };
  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = Math.max(0, 15 - uploadedImages.length);
    const selected = Array.from(files).slice(0, remaining);
    if (Array.from(files).length > remaining) toast.error(t('imports.maxImages', 'Можно прикрепить не более 15 изображений'));
    try {
      const uploads = await Promise.all(selected.map((file) => uploadProductPhotoApi(file)));
      setUploadedImages((current) => [...current, ...uploads]);
    } catch {
      toast.error(t('imports.uploadError', 'Не удалось загрузить изображения'));
    }
  };
  const countryOptions = sourceCountryOptions;
  const activeStatusLabel = statusOptions.find((item) => item.value === status)?.label;

  return (
    <Layout title={t('imports.title', 'Импорт · Очередь проверки')}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-widest text-primary-600">{t('imports.queueSubtitle', 'PARSER IMPORTS')}</p>
            <h1 className="text-2xl font-black text-app">{t('imports.queueTitle', 'Импортированные товары')}</h1>
          </div>
          {pagination && <span className="badge-info">{pagination.total} {t('imports.itemsCountLabel', 'импортов')}</span>}
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('imports.statusFilter', 'Фильтр статуса')}>
          {statusOptions.map((item) => (
            <Button
              key={item.value}
              variant={status === item.value ? 'primary' : 'outline'}
              size="sm"
              role="tab"
              aria-selected={status === item.value}
              onClick={() => { setStatus(item.value); resetFilters(); }}
            >
              {t(`imports.status.${item.value}`, item.label)}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label={t('common.search', 'Поиск')}
            value={query}
            onChange={(event) => { setQuery(event.target.value); resetFilters(); }}
            placeholder={t('imports.searchPlaceholder', 'Название или ID источника')}
          />
          <Select
            label={t('imports.providerFilter', 'Провайдер')}
            value={provider}
            options={[{ value: '', label: t('common.all', 'Все') }, ...providerOptions]}
            onChange={(value) => { setProvider(value); resetFilters(); }}
          />
          <Select
            label={t('imports.countryFilter', 'Страна товара')}
            value={countryFilter}
            options={[{ value: '', label: t('common.all', 'Все') }, ...countryOptions]}
            onChange={(value) => { setCountryFilter(value); resetFilters(); }}
          />
          <Input label={t('imports.fromDate', 'С даты')} type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); resetFilters(); }} />
          <Input label={t('imports.toDate', 'По дату')} type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); resetFilters(); }} />
        </div>

        {importsQuery.isLoading ? (
          <div className="grid gap-4" aria-label={t('common.loading', 'Загрузка')}>
            {[1, 2, 3].map((index) => <div key={index} className="card h-32 animate-pulse" />)}
          </div>
        ) : importsQuery.isError ? (
          <EmptyState
            icon={<AlertCircle size={32} />}
            title={t('imports.loadErrorTitle', 'Не удалось загрузить импорты')}
            description={t('imports.loadErrorDescription', 'Проверьте соединение и попробуйте ещё раз.')}
            actionLabel={t('common.retry', 'Повторить')}
            onAction={() => void importsQuery.refetch()}
          />
        ) : !items.length ? (
          <EmptyState
            icon={<Package size={32} />}
            title={t('imports.emptyTitle', 'Импорты не найдены')}
            description={t('imports.emptyDesc', `В категории «${activeStatusLabel}» пока нет записей.`)}
          />
        ) : (
          <div className="grid gap-4">
            {items.map((item) => {
              const images = imageUrls(item);
              const itemCountry = item.normalizedPayload?.country;
              const variantCount = item.normalizedPayload?.variants?.length ?? 0;
              return (
                <article key={item.id} className="card">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    {images[0] ? <ImagePreview url={images[0]} title={item.originalTitle} /> : (
                      <div className="grid h-24 w-24 shrink-0 place-items-center rounded-xl bg-surface-muted text-muted"><Package size={24} /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="badge-info">{sourceProvider(item)}</span>
                        {isProductCountry(itemCountry) && <span className="inline-flex items-center gap-1 rounded-full border border-app px-2 py-1 text-xs"><CountryFlag country={itemCountry} /> {itemCountry}</span>}
                        <span className={item.status === 'PENDING_REVIEW' ? 'badge-warning' : item.status === 'APPROVED' ? 'badge-success' : 'badge-danger'}>
                          {t(`imports.status.${item.status}`, item.status)}
                        </span>
                      </div>
                      <h2 className="break-words font-bold text-app">{item.originalTitle}</h2>
                      <p className="mt-1 text-sm text-muted">
                        {t('imports.cost', 'Цена источника')}: <strong className="text-app">{item.sourcePriceCny == null ? '—' : `¥${item.sourcePriceCny}`}</strong>
                        {item.normalizedPayload?.sourcePriceCurrency && ` ${item.normalizedPayload.sourcePriceCurrency}`}
                        {' · '}{t('imports.category', 'Категория')}: {item.normalizedPayload?.sourceCategory || '—'}
                        {' · '}{t('imports.imagesCount', 'Изображения')}: {images.length}
                        {' · '}{t('imports.variantsCount', 'Варианты')}: {variantCount}
                      </p>
                      <p className="mt-1 text-xs text-muted">{new Date(item.createdAt).toLocaleString(currencyLocale)}</p>
                      {item.status === 'REJECTED' && item.rejectionReason && <p className="mt-1 text-sm text-red-600">{item.rejectionReason}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2 md:shrink-0">
                      <Button variant="outline" size="sm" leftIcon={<Eye size={15} />} onClick={() => setDetailsItem(item)}>
                        {t('imports.details', 'Детали')}
                      </Button>
                      {item.status === 'PENDING_REVIEW' && <>
                        <Button variant="primary" size="sm" leftIcon={<Check size={15} />} onClick={() => openApprove(item)}>
                          {t('imports.approve', 'Одобрить')}
                        </Button>
                        <Button variant="outline" size="sm" leftIcon={<X size={15} />} onClick={() => { setRejectItem(item); setRejectReason(''); }}>
                          {t('imports.reject', 'Отклонить')}
                        </Button>
                      </>}
                    </div>
                  </div>
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex max-w-full items-center gap-1 break-all text-sm text-primary-600 hover:underline">
                    {t('imports.source', 'Источник')} <ExternalLink size={14} />
                  </a>
                </article>
              );
            })}
          </div>
        )}
        {pagination && <Pagination currentPage={page} totalPages={pagination.pages} totalItems={pagination.total} pageSize={pageSize} onPageChange={setPage} />}
      </div>

      <Modal
        isOpen={!!detailsItem}
        onClose={() => setDetailsItem(null)}
        title={t('imports.detailsTitle', 'Снимок источника')}
        subtitle={detailsItem?.originalTitle}
      >
        {detailsItem && <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="badge-info">{sourceProvider(detailsItem)}</span>
            {isProductCountry(detailsItem.normalizedPayload?.country) && <span className="inline-flex items-center gap-1 rounded-full border border-app px-2 py-1"><CountryFlag country={detailsItem.normalizedPayload.country} /> {detailsItem.normalizedPayload.country}</span>}
            <span className="badge-warning">{detailsItem.status}</span>
            <span>{detailsItem.sourcePriceCny == null ? '—' : `¥${detailsItem.sourcePriceCny}`} {detailsItem.normalizedPayload?.sourcePriceCurrency ?? ''}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {imageUrls(detailsItem).length ? imageUrls(detailsItem).map((url, index) => <ImagePreview key={`${url}-${index}`} url={url} title={detailsItem.originalTitle} />) : <p className="text-sm text-muted">{t('imports.noImages', 'Нет исходных изображений')}</p>}
          </div>
          <div>
            <h3 className="font-semibold text-app">{t('imports.sourceDescription', 'Описание источника')}</h3>
            <p className="whitespace-pre-wrap break-words text-sm text-muted">{detailsItem.normalizedPayload?.sourceDescription || '—'}</p>
          </div>
          <div>
            <h3 className="font-semibold text-app">{t('imports.sourceAttributes', 'Характеристики источника')}</h3>
            {Object.entries(detailsItem.normalizedPayload?.sourceAttributes ?? {}).length
              ? <dl className="grid gap-2 sm:grid-cols-2">{Object.entries(detailsItem.normalizedPayload?.sourceAttributes ?? {}).map(([key, value]) => <div key={key} className="min-w-0 rounded-lg bg-surface-muted p-2"><dt className="text-xs text-muted">{key}</dt><dd className="break-words text-sm text-app">{Array.isArray(value) ? value.join(', ') : value}</dd></div>)}</dl>
              : <p className="text-sm text-muted">—</p>}
          </div>
          <div>
            <h3 className="font-semibold text-app">{t('imports.variantsSizes', 'Варианты и размеры')}</h3>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-surface-muted p-3 text-xs">{JSON.stringify({ variants: detailsItem.normalizedPayload?.variants ?? [], sizes: detailsItem.normalizedPayload?.sizes ?? [] }, null, 2)}</pre>
          </div>
          <div className="space-y-1 break-all text-sm">
            <p><strong>{t('imports.source', 'Ссылка источника')}:</strong> <a href={detailsItem.sourceUrl} target="_blank" rel="noreferrer" className="text-primary-600 underline">{detailsItem.sourceUrl}</a></p>
            <p><strong>{t('imports.category', 'Категория источника')}:</strong> {detailsItem.normalizedPayload?.sourceCategory || '—'}</p>
            <p><strong>{t('imports.createdAt', 'Получено')}:</strong> {new Date(detailsItem.createdAt).toLocaleString(currencyLocale)}</p>
            <p><strong>{t('imports.fetchedAt', 'Данные получены')}:</strong> {detailsItem.normalizedPayload?.fetchedAt ? new Date(detailsItem.normalizedPayload.fetchedAt).toLocaleString(currencyLocale) : '—'}</p>
            <p><strong>{t('imports.reviewedAt', 'Проверено')}:</strong> {detailsItem.reviewedAt ? new Date(detailsItem.reviewedAt).toLocaleString(currencyLocale) : '—'}</p>
          </div>
        </div>}
      </Modal>

      <Modal
        isOpen={!!approveItem}
        onClose={() => { setApproveItem(null); setUploadedImages([]); setAiSuggestions(null); }}
        title={t('imports.approveModalTitle', 'Одобрить импорт')}
        subtitle={approveItem?.originalTitle}
        footer={<div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => { setApproveItem(null); setUploadedImages([]); setAiSuggestions(null); }}>{t('common.cancel', 'Отмена')}</Button>
          <Button
            loading={approveMutation.isPending}
            leftIcon={<Check size={15} />}
            disabled={!approveItem || !priceInput || Number(priceInput) <= 0 || !isProductCountry(country) || locales.some((locale) => localizedDraft[locale].title.trim().length < 2) || (publishNow && uploadedImages.length === 0)}
            onClick={() => {
              if (!approveItem || !isProductCountry(country) || Number(priceInput) <= 0) return;
              const translations = Object.fromEntries(locales.map((locale) => [locale, {
                title: localizedDraft[locale].title.trim(),
                description: localizedDraft[locale].description.trim(),
                characteristics: localizedDraft[locale].characteristics,
              }]));
              approveMutation.mutate({
                item: approveItem,
                form: {
                  translations,
                  salePriceUzs: Number(priceInput),
                  ...(Number(exchangeRateInput) > 0 ? { exchangeRate: Number(exchangeRateInput) } : {}),
                  country,
                  mediaIds: uploadedImages.map(({ id }) => id),
                  publish: publishNow,
                },
              });
            }}
          >
            {publishNow ? t('imports.approveAndPublish', 'Одобрить и опубликовать') : t('imports.approveAsDraft', 'Одобрить · черновик')}
          </Button>
        </div>}
      >
        {approveItem && <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="rounded-xl border border-app bg-surface-muted p-3 text-sm">
            <p><strong>{t('imports.source', 'Источник')}:</strong> {sourceProvider(approveItem)} · {approveItem.sourcePriceCny == null ? '—' : `¥${approveItem.sourcePriceCny}`}</p>
            <p className="mt-1 break-all"><a href={approveItem.sourceUrl} target="_blank" rel="noreferrer" className="text-primary-600 underline">{approveItem.sourceUrl}</a></p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t('imports.salePriceLabel', 'Цена продажи (UZS)')} type="number" min={1} value={priceInput} onChange={(event) => setPriceInput(event.target.value)} />
            <Input label={t('imports.exchangeRate', 'Курс CNY → UZS (необязательно)')} type="number" min={0} step="any" value={exchangeRateInput} onChange={(event) => setExchangeRateInput(event.target.value)} />
            <Select label={t('products.countryLabel')} value={country} options={countryOptions} onChange={(value) => setCountry(isProductCountry(value) ? value : '')} />
          </div>

          {capabilities.data?.aiProductFill && <div className="space-y-3 rounded-xl border border-app p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h3 className="font-semibold text-app">{t('imports.localizedContent', 'Локализованный контент')}</h3><p className="text-xs text-muted">{t('imports.reviewBeforeApply', 'Проверьте каждое поле. AI не меняет исходные факты и ничего не сохраняет автоматически.')}</p></div>
              <Button variant="outline" size="sm" loading={aiMutation.isPending} leftIcon={<Sparkles size={15} />} disabled={!isProductCountry(country) || uploadedImages.length === 0} onClick={() => aiMutation.mutate()}>
                {t('imports.aiFill', 'Предложить AI-текст')}
              </Button>
            </div>
            {aiSuggestions && <div className="rounded-lg bg-surface-muted p-3">
              <p className="mb-2 text-sm font-semibold">{t('imports.aiPreview', 'Черновое предложение (не применено)')}</p>
              <div className="grid gap-2 sm:grid-cols-3">{locales.map((locale) => <div key={locale} className="min-w-0 rounded-lg border border-app p-2 text-xs"><strong>{locale.toUpperCase()}</strong><p className="mt-1 break-words">{aiSuggestions[locale].title || '—'}</p><p className="mt-1 line-clamp-3 text-muted">{aiSuggestions[locale].description || '—'}</p></div>)}</div>
              <Button className="mt-3" variant="outline" size="sm" onClick={applySuggestionsToEmptyFields}>{t('imports.applyAiToEmpty', 'Заполнить пустые поля')}</Button>
            </div>}
          </div>}

          <div className="space-y-3">
            {locales.map((locale) => <fieldset key={locale} className="space-y-2 rounded-xl border border-app p-3">
              <legend className="px-1 text-sm font-bold uppercase text-muted">{locale}</legend>
              <Input label={t('imports.titleLabel', 'Название')} value={localizedDraft[locale].title} onChange={(event) => setLocalizedField(locale, 'title', event.target.value)} />
              <Textarea label={t('imports.descriptionLabel', 'Описание')} rows={3} value={localizedDraft[locale].description} onChange={(event) => setLocalizedField(locale, 'description', event.target.value)} />
              {Object.keys(localizedDraft[locale].characteristics).length > 0 && <div className="rounded-lg bg-surface-muted p-2 text-xs"><strong>{t('imports.aiCharacteristics', 'Предложенные характеристики')}</strong><pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(localizedDraft[locale].characteristics, null, 2)}</pre></div>}
            </fieldset>)}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-app">{t('imports.uploadImages', 'Загрузить изображения в хранилище AVERON')}</label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-app px-3 py-2 text-sm text-app hover:bg-surface-muted">
                <ImagePlus size={16} /> {t('imports.chooseImages', 'Выбрать файлы')}
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => { void uploadImages(event.target.files); event.currentTarget.value = ''; }} />
              </label>
              <span className="text-xs text-muted">{uploadedImages.length}/15</span>
            </div>
            {uploadedImages.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{uploadedImages.map((image) => <div key={image.id} className="relative">
              <ImagePreview url={image.url} title={approveItem.originalTitle} />
              <button type="button" aria-label={t('common.remove', 'Удалить')} className="absolute -right-2 -top-2 rounded-full bg-surface p-1 text-red-600 shadow" onClick={() => setUploadedImages((current) => current.filter(({ id }) => id !== image.id))}><X size={14} /></button>
            </div>)}</div>}
          </div>
          <label className="flex items-start gap-2 rounded-xl border border-app p-3 text-sm">
            <input type="checkbox" checked={publishNow} onChange={(event) => setPublishNow(event.target.checked)} className="mt-1" />
            <span><strong>{t('imports.publishImmediately', 'Опубликовать при одобрении')}</strong><span className="block text-xs text-muted">{t('imports.publishExplicitHint', 'По умолчанию создаётся черновик. Публикация возможна только после явного подтверждения.')}</span></span>
          </label>
        </div>}
      </Modal>

      <Modal
        isOpen={!!rejectItem}
        onClose={() => { setRejectItem(null); setRejectReason(''); }}
        title={t('imports.rejectModalTitle', 'Отклонить импорт')}
        subtitle={rejectItem?.originalTitle}
        footer={<div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => { setRejectItem(null); setRejectReason(''); }}>{t('common.cancel', 'Отмена')}</Button>
          <Button variant="danger" loading={rejectMutation.isPending} leftIcon={<X size={15} />} disabled={rejectReason.trim().length < 3} onClick={() => {
            if (rejectItem && rejectReason.trim().length >= 3) rejectMutation.mutate({ id: rejectItem.id, reason: rejectReason.trim() });
          }}>{t('imports.reject', 'Отклонить')}</Button>
        </div>}
      >
        <Textarea label={t('imports.rejectReasonLabel', 'Причина отклонения')} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder={t('imports.rejectReasonPlaceholder', 'Укажите причину (минимум 3 символа)...')} rows={3} helperText={t('imports.rejectReasonHelper', 'Минимум 3 символа')} />
      </Modal>
    </Layout>
  );
}
