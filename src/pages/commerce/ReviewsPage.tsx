import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Check, ExternalLink, RefreshCw, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { Select } from '../../components/ui/Select';
import { api } from '../../lib/axios';

type ReviewStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED';
type ReviewItem = {
  id: string;
  product: { slug: string; translations: unknown };
  orderNumber: string;
  status: ReviewStatus;
  rating: number;
  title: string | null;
  comment: string;
  verifiedPurchase: boolean;
  fitFeedback: 'RUNS_SMALL' | 'TRUE_TO_SIZE' | 'RUNS_LARGE' | null;
  customer: { name: string | null; avatar: string | null };
  media: Array<{ url: string; mimeType: string }>;
  createdAt: string;
  moderatedAt: string | null;
};
type ReviewList = { items: ReviewItem[]; pagination: { page: number; pages: number; total: number } };

const statusKeys: ReviewStatus[] = ['PENDING', 'PUBLISHED', 'REJECTED'];

export default function ReviewsPage() {
  const { t, i18n } = useTranslation();
  const language = i18n.language.slice(0, 2);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [rating, setRating] = useState('');
  const [verified, setVerified] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const query = useQuery({
    queryKey: ['admin-product-reviews', status, rating, verified, debouncedSearch, page],
    queryFn: async () => (await api.get<ReviewList>('/api/v1/admin/reviews', {
      params: {
        page,
        limit: 20,
        ...(status ? { status } : {}),
        ...(rating ? { rating } : {}),
        ...(verified ? { verifiedPurchase: verified } : {}),
        ...(debouncedSearch ? { q: debouncedSearch } : {}),
      },
    })).data,
  });
  const moderation = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: 'PUBLISHED' | 'REJECTED' }) =>
      api.patch(`/api/v1/admin/reviews/${encodeURIComponent(id)}/moderation`, { status: nextStatus }),
    onSuccess: async () => {
      toast.success(t('commerceReviews.saved'));
      await queryClient.invalidateQueries({ queryKey: ['admin-product-reviews'] });
    },
    onError: () => toast.error(t('commerceReviews.actionError')),
  });
  const localeName = (value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
    const translations = value as Record<string, unknown>;
    const localized = translations[language] ?? translations.ru ?? translations.en;
    if (typeof localized === 'string') return localized;
    if (localized && typeof localized === 'object' && 'name' in localized && typeof localized.name === 'string') return localized.name;
    return '';
  };
  const dateLabel = (value: string) => new Date(value).toLocaleString(language === 'en' ? 'en-US' : language === 'uz' ? 'uz-UZ' : 'ru-RU');
  const fitLabels: Record<NonNullable<ReviewItem['fitFeedback']>, string> = {
    RUNS_SMALL: t('commerceReviews.fit.small'),
    TRUE_TO_SIZE: t('commerceReviews.fit.true'),
    RUNS_LARGE: t('commerceReviews.fit.large'),
  };
  const statusLabel = (value: ReviewStatus) => t(`commerceReviews.status.${value}`);

  return (
    <Layout>
      <main className="space-y-5 p-4 sm:p-6" aria-labelledby="commerce-reviews-title">
        <header>
          <h1 id="commerce-reviews-title" className="text-2xl font-extrabold">{t('commerceReviews.title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('commerceReviews.subtitle')}</p>
        </header>
        <section className="grid gap-3 rounded-2xl border border-app bg-card p-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={t('commerceReviews.filters')}>
          <Select
            label={t('commerceReviews.filterStatus')}
            value={status}
            options={[{ value: '', label: t('commerceReviews.all') }, ...statusKeys.map((key) => ({ value: key, label: statusLabel(key) }))]}
            onChange={(value) => { setStatus(value); setPage(1); }}
            containerClassName="text-sm font-semibold"
          />
          <Select
            label={t('commerceReviews.filterRating')}
            value={rating}
            options={[{ value: '', label: t('commerceReviews.all') }, ...[5, 4, 3, 2, 1].map((item) => ({ value: String(item), label: `${item} / 5` }))]}
            onChange={(value) => { setRating(value); setPage(1); }}
            containerClassName="text-sm font-semibold"
          />
          <Select
            label={t('commerceReviews.filterVerified')}
            value={verified}
            options={[
              { value: '', label: t('commerceReviews.all') },
              { value: 'true', label: t('commerceReviews.verified') },
              { value: 'false', label: t('commerceReviews.unverified') },
            ]}
            onChange={(value) => { setVerified(value); setPage(1); }}
            containerClassName="text-sm font-semibold"
          />
          <form onSubmit={(event) => { event.preventDefault(); setDebouncedSearch(search.trim()); setPage(1); }} className="text-sm font-semibold">
            <label htmlFor="review-search">{t('commerceReviews.search')}</label>
            <span className="mt-1 flex min-h-10 overflow-hidden rounded-lg border border-app">
              <input id="review-search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={120} className="min-w-0 flex-1 bg-app px-3 font-normal" />
              <button type="submit" className="px-3 text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" aria-label={t('commerceReviews.search')}><Search size={17} /></button>
            </span>
          </form>
        </section>

        {query.isLoading ? <p role="status" className="py-10 text-center">{t('commerceReviews.loading')}</p>
          : query.isError ? <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-900">{t('commerceReviews.loadError')} <button type="button" onClick={() => void query.refetch()} className="ml-2 inline-flex min-h-9 items-center gap-2 rounded border border-current px-3"><RefreshCw size={15} />{t('common.refresh')}</button></div>
            : query.data?.items.length ? (
              <div className="space-y-3">
                {query.data.items.map((review) => (
                  <article key={review.id} className="min-w-0 rounded-2xl border border-app bg-card p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="break-words text-base font-bold">{localeName(review.product.translations) || review.product.slug}</h2>
                        <p className="mt-1 break-all text-xs text-muted">{review.product.slug} · {t('commerceReviews.order')}: {review.orderNumber}</p>
                      </div>
                      <span className="rounded-full border border-app px-3 py-1 text-xs font-bold">{statusLabel(review.status)}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <span aria-label={t('commerceReviews.rating', { rating: review.rating })} className="font-bold text-amber-600">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)} {review.rating}/5</span>
                      <span>{review.customer.name || t('commerceReviews.unknownCustomer')}</span>
                      {review.verifiedPurchase && <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-1 text-xs font-bold text-cyan-800 dark:text-cyan-200"><BadgeCheck size={14} />{t('commerceReviews.verified')}</span>}
                      {review.fitFeedback && <span className="rounded-full border border-app px-2 py-1 text-xs">{fitLabels[review.fitFeedback]}</span>}
                      <time className="text-xs text-muted" dateTime={review.createdAt}>{dateLabel(review.createdAt)}</time>
                    </div>
                    {review.title && <h3 className="mt-3 font-bold">{review.title}</h3>}
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{review.comment}</p>
                    {review.media.length > 0 && <ul className="mt-3 flex flex-wrap gap-2">{review.media.map((media, index) => <li key={`${media.url}-${index}`}>
                      <a href={media.url} target="_blank" rel="noopener noreferrer" className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                        <img src={media.url} alt={t('commerceReviews.imageAlt', { index: index + 1 })} className="h-20 w-20 rounded-lg border border-app object-cover sm:h-28 sm:w-28" loading="lazy" />
                        <span className="sr-only">{t('commerceReviews.openImage')} <ExternalLink size={12} /></span>
                      </a>
                    </li>)}</ul>}
                    {review.moderatedAt && <p className="mt-2 text-xs text-muted">{t('commerceReviews.moderated')}: {dateLabel(review.moderatedAt)}</p>}
                    {(review.status === 'PENDING' || review.status === 'PUBLISHED') && <div className="mt-4 flex flex-wrap gap-2 border-t border-app pt-3">
                      {review.status === 'PENDING' && <button type="button" disabled={moderation.isPending} onClick={() => moderation.mutate({ id: review.id, nextStatus: 'PUBLISHED' })} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"><Check size={16} />{t('commerceReviews.publish')}</button>}
                      <button type="button" disabled={moderation.isPending} onClick={() => moderation.mutate({ id: review.id, nextStatus: 'REJECTED' })} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-300 px-4 text-sm font-bold text-rose-800 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50"><X size={16} />{t('commerceReviews.reject')}</button>
                    </div>}
                  </article>
                ))}
              </div>
            ) : <p className="rounded-xl border border-app p-8 text-center text-sm text-muted">{t('commerceReviews.empty')}</p>}

        {(query.data?.pagination.pages ?? 0) > 1 && <nav className="flex items-center justify-center gap-3" aria-label={t('commerceReviews.pagination')}>
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="min-h-10 rounded-lg border border-app px-3 disabled:opacity-40">{t('common.back')}</button>
          <span className="text-sm">{t('common.page')} {page} / {query.data?.pagination.pages}</span>
          <button type="button" disabled={page >= (query.data?.pagination.pages ?? 1)} onClick={() => setPage((value) => value + 1)} className="min-h-10 rounded-lg border border-app px-3 disabled:opacity-40">{t('common.next')}</button>
        </nav>}
      </main>
    </Layout>
  );
}
