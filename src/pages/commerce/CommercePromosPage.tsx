import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Plus, Save, Trash2 } from 'lucide-react';
import Layout from '../../components/Layout';
import { Button } from '../../components/ui';
import { createCommercePromo, deleteCommercePromo, getCommercePromoUsages, getCommercePromos, updateCommercePromo } from '../../lib/commercePromoApi';

type PromoCopy = {
  title: string; intro: string; create: string; code: string; percent: string; cap: string;
  start: string; expiry: string; unlimited: string; status: string; active: string; inactive: string;
  used: string; remaining: string; save: string; history: string; customer: string; order: string;
  date: string; subtotal: string; discount: string; final: string; loading: string; error: string;
  empty: string; invalid: string; remove: string; confirmRemove: string; archived: string; deleted: string;
};

const asIso = (value: string) => value ? new Date(value).toISOString() : null;
const money = (value: string, locale: string) => `${Number(value).toLocaleString(locale)} ${locale === 'en' ? 'UZS' : locale === 'uz' ? 'so‘m' : 'сум'}`;

export default function CommercePromosPage() {
  const queryClient = useQueryClient();
  const { i18n, t } = useTranslation();
  const locale = i18n.language.startsWith('en') ? 'en' : i18n.language.startsWith('uz') ? 'uz' : 'ru';
  const text: PromoCopy = {
    title: t('commercePromosPage.title'),
    intro: t('commercePromosPage.intro'),
    create: t('commercePromosPage.create'),
    code: t('commercePromosPage.code'),
    percent: t('commercePromosPage.percent'),
    cap: t('commercePromosPage.cap'),
    start: t('commercePromosPage.start'),
    expiry: t('commercePromosPage.expiry'),
    unlimited: t('commercePromosPage.unlimited'),
    status: t('commercePromosPage.status'),
    active: t('commercePromosPage.active'),
    inactive: t('commercePromosPage.inactive'),
    used: t('commercePromosPage.used'),
    remaining: t('commercePromosPage.remaining'),
    save: t('commercePromosPage.save'),
    history: t('commercePromosPage.history'),
    customer: t('commercePromosPage.customer'),
    order: t('commercePromosPage.order'),
    date: t('commercePromosPage.date'),
    subtotal: t('commercePromosPage.subtotal'),
    discount: t('commercePromosPage.discount'),
    final: t('commercePromosPage.final'),
    loading: t('commercePromosPage.loading'),
    error: t('commercePromosPage.error'),
    empty: t('commercePromosPage.empty'),
    invalid: t('commercePromosPage.invalid'),
    remove: t('commercePromosPage.remove'),
    confirmRemove: t('commercePromosPage.confirmRemove'),
    archived: t('commercePromosPage.archived'),
    deleted: t('commercePromosPage.deleted'),
  };
  const [code, setCode] = useState('');
  const [percent, setPercent] = useState(1);
  const [cap, setCap] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState('');
  const promos = useQuery({ queryKey: ['admin', 'commerce-promos'], queryFn: getCommercePromos });
  const changed = () => queryClient.invalidateQueries({ queryKey: ['admin', 'commerce-promos'] });
  const create = useMutation({
    mutationFn: createCommercePromo,
    onSuccess: () => { void changed(); setCode(''); setPercent(1); setCap(''); setStartsAt(''); setExpiresAt(''); setError(''); setCreateOpen(false); },
    onError: () => setError(text.error),
  });
  const remove = useMutation({
    mutationFn: deleteCommercePromo,
    onSuccess: async (result) => {
      await changed();
      setError('');
      window.alert(result.archived ? text.archived : text.deleted);
    },
    onError: () => setError(text.error),
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateCommercePromo>[1] }) => updateCommercePromo(id, patch),
    onSuccess: () => { void changed(); setError(''); },
    onError: () => setError(text.error),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    const maxActivations = cap.trim() ? Number(cap) : null;
    if (!/^[A-Z0-9_-]{3,40}$/.test(normalized) || !Number.isInteger(percent) || percent < 1 || percent > 15 ||
      (maxActivations !== null && (!Number.isInteger(maxActivations) || maxActivations < 1))) {
      setError(text.invalid);
      return;
    }
    setError('');
    create.mutate({ code: normalized, discountPercent: percent, maxActivations, startsAt: asIso(startsAt), expiresAt: asIso(expiresAt) });
  };

  return (
    <Layout title={text.title}>
      <main className="mx-auto max-w-7xl space-y-6 pb-12">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <p className="max-w-3xl text-sm text-muted">{text.intro}</p>
          <Button type="button" onClick={() => setCreateOpen((open) => !open)}><Plus size={16} />{text.create}</Button>
        </header>
        {createOpen && <form onSubmit={submit} className="card grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-semibold">{text.code}<input required minLength={3} maxLength={40} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} className="mt-1 w-full rounded-lg border border-app bg-app px-3 py-2 font-mono uppercase" /></label>
          <label className="text-sm font-semibold">{text.percent}<input required type="number" min={1} max={15} value={percent} onChange={(event) => setPercent(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-app bg-app px-3 py-2" /></label>
          <label className="text-sm font-semibold">{text.cap}<input type="number" min={1} value={cap} onChange={(event) => setCap(event.target.value)} placeholder={text.unlimited} className="mt-1 w-full rounded-lg border border-app bg-app px-3 py-2" /></label>
          <label className="text-sm font-semibold">{text.start}<input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="mt-1 w-full rounded-lg border border-app bg-app px-3 py-2" /></label>
          <label className="text-sm font-semibold">{text.expiry}<input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-1 w-full rounded-lg border border-app bg-app px-3 py-2" /></label>
          <Button type="submit" loading={create.isPending} className="self-end"><Plus size={16} />{text.create}</Button>
          {error && <p role="alert" className="text-sm text-rose-600 sm:col-span-2 xl:col-span-3">{error}</p>}
        </form>}

        <section className="card overflow-x-auto p-0" aria-label={text.title}>
          {promos.isPending ? <p role="status" className="p-6">{text.loading}</p> : promos.isError ? <p role="alert" className="p-6 text-rose-600">{text.error}</p> : !promos.data?.length ? <p className="p-6 text-muted">{text.empty}</p> : (
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-app bg-gray-50 text-xs uppercase text-muted dark:bg-white/5"><tr>
                <th className="p-3">{text.code}</th><th className="p-3">{text.percent}</th><th className="p-3">{text.used}</th><th className="p-3">{text.remaining}</th><th className="p-3">{text.start} / {text.expiry}</th><th className="p-3">{text.status}</th><th className="p-3">{text.history}</th>
              </tr></thead>
              <tbody className="divide-y divide-app">
                {promos.data.map((promo) => <PromoRow key={promo.id} promo={promo} text={text} locale={locale} expanded={expanded === promo.id} onExpand={() => setExpanded(expanded === promo.id ? null : promo.id)} onUpdate={(patch) => update.mutate({ id: promo.id, patch })} onRemove={() => {
                  if (window.confirm(text.confirmRemove)) remove.mutate(promo.id);
                }} updating={update.isPending || remove.isPending} />)}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </Layout>
  );
}

function PromoRow({ promo, text, locale, expanded, onExpand, onUpdate, onRemove, updating }: {
  promo: NonNullable<ReturnType<typeof getCommercePromos> extends Promise<infer T> ? T : never>[number];
  text: PromoCopy;
  locale: string;
  expanded: boolean;
  onExpand: () => void;
  onUpdate: (patch: Parameters<typeof updateCommercePromo>[1]) => void;
  onRemove: () => void;
  updating: boolean;
}) {
  const [discount, setDiscount] = useState(promo.discountPercent);
  const [limit, setLimit] = useState(promo.maxActivations?.toString() ?? '');
  const usages = useQuery({ queryKey: ['admin', 'commerce-promos', promo.id, 'usages'], queryFn: () => getCommercePromoUsages(promo.id), enabled: expanded });
  return <>
    <tr>
      <td className="p-3 font-mono font-bold">{promo.code}</td>
      <td className="p-3"><div className="flex gap-1"><input aria-label={`${text.percent}: ${promo.code}`} type="number" min={1} max={15} value={discount} onChange={(event) => setDiscount(Number(event.target.value))} className="w-16 rounded border border-app bg-app px-2 py-1" /><span>%</span></div></td>
      <td className="p-3">{promo.usedActivations} / {promo.maxActivations ?? text.unlimited}</td>
      <td className="p-3">{promo.remainingActivations ?? text.unlimited}</td>
      <td className="p-3 text-xs">{promo.startsAt ? new Date(promo.startsAt).toLocaleString(locale) : '—'}<br />{promo.expiresAt ? new Date(promo.expiresAt).toLocaleString(locale) : '—'}</td>
      <td className="p-3"><button type="button" disabled={updating} onClick={() => onUpdate({ isActive: !promo.isActive })} className={`rounded-full px-3 py-1 text-xs font-bold ${promo.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'}`}>{promo.isActive ? text.active : text.inactive}</button></td>
      <td className="p-3"><div className="flex gap-2"><button type="button" disabled={updating || discount < 1 || discount > 15 || !Number.isInteger(discount)} onClick={() => onUpdate({ discountPercent: discount, maxActivations: limit ? Number(limit) : null })} className="rounded border border-app p-2" aria-label={`${text.save}: ${promo.code}`}><Save size={15} /></button><button type="button" onClick={onExpand} className="rounded border border-app p-2" aria-expanded={expanded} aria-label={`${text.history}: ${promo.code}`}>{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button><button type="button" disabled={updating} onClick={onRemove} className="rounded border border-app p-2 text-red-600" aria-label={`${text.remove}: ${promo.code}`}><Trash2 size={15} /></button></div><input aria-label={`${text.cap}: ${promo.code}`} type="number" min={promo.usedActivations || 1} value={limit} onChange={(event) => setLimit(event.target.value)} placeholder={text.unlimited} className="mt-2 w-28 rounded border border-app bg-app px-2 py-1 text-xs" /></td>
    </tr>
    {expanded && <tr><td colSpan={7} className="bg-gray-50 p-4 dark:bg-white/5">
      {usages.isPending ? <p role="status">{text.loading}</p> : usages.isError ? <p role="alert" className="text-rose-600">{text.error}</p> : !usages.data?.length ? <p className="text-muted">{text.empty}</p> : (
        <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead><tr><th className="p-2">{text.customer}</th><th className="p-2">{text.order}</th><th className="p-2">{text.date}</th><th className="p-2">{text.percent}</th><th className="p-2">{text.subtotal}</th><th className="p-2">{text.discount}</th><th className="p-2">{text.final}</th></tr></thead><tbody>{usages.data.map((usage) => <tr key={`${usage.orderNumber}:${usage.usedAt}`}><td className="p-2">{usage.customer}</td><td className="p-2">{usage.orderNumber}</td><td className="p-2">{new Date(usage.usedAt).toLocaleString(locale)}</td><td className="p-2">{usage.discountPercent}%</td><td className="p-2">{money(usage.subtotalUzs, locale)}</td><td className="p-2">{money(usage.discountUzs, locale)}</td><td className="p-2">{money(usage.finalTotalUzs, locale)}</td></tr>)}</tbody></table></div>
      )}
    </td></tr>}
  </>;
}
