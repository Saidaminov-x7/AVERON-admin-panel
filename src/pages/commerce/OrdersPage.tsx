import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ShoppingCart, RefreshCw, Eye, Check, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { getOrder, getOrders, updateOrderStatus } from '../../lib/commerceApi';

type LocalizedText = { ru: string; uz: string; en: string };

const statusLabels: Record<string, LocalizedText> = {
  CREATED: { ru: 'Создан', uz: 'Yaratildi', en: 'Created' },
  CONFIRMED: { ru: 'Подтверждён', uz: 'Tasdiqlandi', en: 'Confirmed' },
  CANCELLED: { ru: 'Отменён', uz: 'Bekor qilindi', en: 'Cancelled' },
  PAID: { ru: 'Оплачен', uz: 'To‘langan', en: 'Paid' },
  ORDERED_FROM_SUPPLIER: { ru: 'Заказан у поставщика', uz: 'Yetkazib beruvchidan buyurtma qilindi', en: 'Ordered from supplier' },
  SUPPLIER_CONFIRMED: { ru: 'Подтверждён поставщиком', uz: 'Yetkazib beruvchi tasdiqladi', en: 'Supplier confirmed' },
  IN_TRANSIT_CHINA: { ru: 'В пути по Китаю', uz: 'Xitoy bo‘ylab yo‘lda', en: 'In transit in China' },
  CARGO_WAREHOUSE: { ru: 'На складе карго', uz: 'Kargo omborida', en: 'At cargo warehouse' },
  INTERNATIONAL_TRANSIT: { ru: 'Международная доставка', uz: 'Xalqaro yo‘lda', en: 'International transit' },
  ARRIVED_UZBEKISTAN: { ru: 'Прибыл в Узбекистан', uz: 'O‘zbekistonga yetib keldi', en: 'Arrived in Uzbekistan' },
  OUT_FOR_DELIVERY: { ru: 'Передан в доставку', uz: 'Yetkazib berishga topshirildi', en: 'Out for delivery' },
  DELIVERED: { ru: 'Доставлен', uz: 'Yetkazildi', en: 'Delivered' },
  COMPLETED: { ru: 'Завершён', uz: 'Yakunlandi', en: 'Completed' },
  REFUNDED: { ru: 'Возврат', uz: 'Qaytarildi', en: 'Refunded' },
};

const statusStyles: Record<string, string> = {
  CREATED: 'badge-warning',
  CONFIRMED: 'badge-info',
  CANCELLED: 'badge-danger',
  PAID: 'badge-info',
  DELIVERED: 'badge-success',
  REFUNDED: 'badge-neutral',
};

const text = {
  ru: { title: 'Заказы клиентов', search: 'Номер заказа или клиент', filter: 'Статус', all: 'Все статусы', loading: 'Загрузка заказов…', error: 'Не удалось загрузить заказы.', retry: 'Повторить', emptyTitle: 'Заказов пока нет', emptyDesc: 'Заказы клиентов появятся здесь после оформления.', number: 'Номер', customer: 'Клиент', status: 'Статус', total: 'Сумма', date: 'Дата', details: 'Подробнее', noName: 'Без имени', detailsTitle: 'Заказ', delivery: 'Данные для доставки', phone: 'Телефон', address: 'Адрес', items: 'Состав заказа', subtotal: 'Товары', discount: 'Скидка', deliveryCost: 'Доставка', confirm: 'Подтвердить заказ', cancel: 'Отменить', cancelTitle: 'Отменить заказ?', cancelText: 'Отменить можно только новый заказ. Это действие нельзя будет выполнить повторно.', close: 'Закрыть', updateError: 'Не удалось изменить статус заказа.', updateSuccess: 'Статус заказа обновлён.', notPaid: 'Оплата через сайт не выполнялась.' },
  uz: { title: 'Mijozlar buyurtmalari', search: 'Buyurtma raqami yoki mijoz', filter: 'Holati', all: 'Barcha holatlar', loading: 'Buyurtmalar yuklanmoqda…', error: 'Buyurtmalarni yuklab bo‘lmadi.', retry: 'Qayta urinish', emptyTitle: 'Hozircha buyurtmalar yo‘q', emptyDesc: 'Mijozlar buyurtmalari shu yerda ko‘rinadi.', number: 'Raqam', customer: 'Mijoz', status: 'Holati', total: 'Summa', date: 'Sana', details: 'Batafsil', noName: 'Ismsiz', detailsTitle: 'Buyurtma', delivery: 'Yetkazib berish ma’lumotlari', phone: 'Telefon', address: 'Manzil', items: 'Buyurtma tarkibi', subtotal: 'Mahsulotlar', discount: 'Chegirma', deliveryCost: 'Yetkazib berish', confirm: 'Buyurtmani tasdiqlash', cancel: 'Bekor qilish', cancelTitle: 'Buyurtma bekor qilinsinmi?', cancelText: 'Faqat yangi buyurtmani bekor qilish mumkin. Bu amalni qaytarib bo‘lmaydi.', close: 'Yopish', updateError: 'Buyurtma holatini o‘zgartirib bo‘lmadi.', updateSuccess: 'Buyurtma holati yangilandi.', notPaid: 'Sayt orqali to‘lov amalga oshirilmadi.' },
  en: { title: 'Customer orders', search: 'Order number or customer', filter: 'Status', all: 'All statuses', loading: 'Loading orders…', error: 'Could not load orders.', retry: 'Try again', emptyTitle: 'No orders yet', emptyDesc: 'Customer orders will appear here once placed.', number: 'Number', customer: 'Customer', status: 'Status', total: 'Total', date: 'Date', details: 'View details', noName: 'No name', detailsTitle: 'Order', delivery: 'Delivery details', phone: 'Phone', address: 'Address', items: 'Order items', subtotal: 'Items', discount: 'Discount', deliveryCost: 'Delivery', confirm: 'Confirm order', cancel: 'Cancel', cancelTitle: 'Cancel this order?', cancelText: 'Only a new order can be cancelled. This action cannot be undone.', close: 'Close', updateError: 'Could not update the order status.', updateSuccess: 'Order status updated.', notPaid: 'No payment was taken through the site.' },
} as const;

function readField(value: unknown, key: string): string {
  if (!value || typeof value !== 'object' || !(key in value)) return '';
  const field = (value as Record<string, unknown>)[key];
  return typeof field === 'string' ? field : '';
}

function formatUzs(amount: string | number, locale: string) {
  const value = Number(amount);
  return `${Number.isFinite(value) ? value.toLocaleString(locale === 'en' ? 'en-US' : locale === 'uz' ? 'uz-UZ' : 'ru-RU') : '0'} ${locale === 'en' ? 'UZS' : locale === 'uz' ? 'so‘m' : 'сум'}`;
}

export default function OrdersPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.slice(0, 2) === 'uz' ? 'uz' : i18n.language?.slice(0, 2) === 'en' ? 'en' : 'ru';
  const copy = text[locale];
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string | null>(null);
  const [cancelPending, setCancelPending] = useState(false);

  const ordersQuery = useQuery({ queryKey: ['commerce-orders'], queryFn: getOrders });
  const selectedOrderQuery = useQuery({
    queryKey: ['commerce-order', selectedOrderNumber],
    queryFn: () => getOrder(selectedOrderNumber!),
    enabled: Boolean(selectedOrderNumber),
  });
  const statusMutation = useMutation({
    mutationFn: ({ orderNumber, status }: { orderNumber: string; status: 'CONFIRMED' | 'CANCELLED' }) =>
      updateOrderStatus(orderNumber, status),
    onSuccess: async () => {
      toast.success(copy.updateSuccess);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['commerce-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['commerce-order', selectedOrderNumber] }),
      ]);
      setCancelPending(false);
    },
    onError: () => toast.error(copy.updateError),
  });

  const orders = useMemo(() => {
    const searchTerm = search.trim().toLocaleLowerCase();
    return (ordersQuery.data ?? []).filter((order) => {
      const customerName = readField(order.contact, 'name');
      const matchesSearch = !searchTerm
        || order.orderNumber.toLocaleLowerCase().includes(searchTerm)
        || customerName.toLocaleLowerCase().includes(searchTerm)
        || readField(order.contact, 'phone').toLocaleLowerCase().includes(searchTerm);
      return matchesSearch && (!statusFilter || order.status === statusFilter);
    });
  }, [ordersQuery.data, search, statusFilter]);

  const order = selectedOrderQuery.data;
  const name = order ? readField(order.contact, 'name') : '';
  const phone = order ? readField(order.contact, 'phone') : '';
  const city = order ? readField(order.deliveryAddress, 'city') : '';
  const street = order ? readField(order.deliveryAddress, 'address') : '';
  const extraAddress = order ? [
    readField(order.deliveryAddress, 'apartment'),
    readField(order.deliveryAddress, 'entrance'),
    readField(order.deliveryAddress, 'floor'),
  ].filter(Boolean).join(', ') : '';

  return (
    <Layout title={t('orders.title', copy.title)}>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-bold tracking-widest text-primary-500">{t('orders.section', 'COMMERCE')}</p>
          <h1 className="text-2xl font-black text-app">{t('orders.title', copy.title)}</h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="relative min-w-64 flex-1">
            <span className="sr-only">{copy.search}</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} className="input w-full pl-9" />
          </label>
          <label>
            <span className="sr-only">{copy.filter}</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="input min-w-44">
              <option value="">{copy.all}</option>
              {Object.entries(statusLabels).map(([value, labels]) => <option key={value} value={value}>{labels[locale]}</option>)}
            </select>
          </label>
        </div>

        {ordersQuery.isLoading ? (
          <div role="status" className="card animate-pulse h-48">{copy.loading}</div>
        ) : ordersQuery.isError ? (
          <div role="alert" className="card flex flex-wrap items-center justify-between gap-3 text-red-500">
            <p>{copy.error}</p>
            <button type="button" onClick={() => void ordersQuery.refetch()} className="btn-ghost inline-flex items-center gap-2"><RefreshCw size={16} />{copy.retry}</button>
          </div>
        ) : orders.length === 0 ? (
          <EmptyState icon={<ShoppingCart size={32} />} title={search || statusFilter ? copy.emptyTitle : t('orders.emptyTitle', copy.emptyTitle)} description={t('orders.emptyDesc', copy.emptyDesc)} />
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-app text-left text-xs text-muted font-semibold tracking-wide uppercase">
                <th className="px-4 py-3">{copy.number}</th><th className="px-4 py-3">{copy.customer}</th><th className="px-4 py-3">{copy.status}</th><th className="px-4 py-3 text-right">{copy.total}</th><th className="px-4 py-3">{copy.date}</th><th className="px-4 py-3"><span className="sr-only">{copy.details}</span></th>
              </tr></thead>
              <tbody>{orders.map((item) => (
                <tr key={item.orderNumber} className="border-t border-app hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-bold text-app">#{item.orderNumber}</td>
                  <td className="px-4 py-3 text-app">{readField(item.contact, 'name') || copy.noName}</td>
                  <td className="px-4 py-3"><span className={statusStyles[item.status] ?? 'badge-neutral'}>{statusLabels[item.status]?.[locale] ?? item.status}</span></td>
                  <td className="px-4 py-3 text-right font-semibold text-app">{formatUzs(item.totalRevenue, locale)}</td>
                  <td className="px-4 py-3 text-muted text-xs">{new Date(item.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : locale === 'uz' ? 'uz-UZ' : 'ru-RU')}</td>
                  <td className="px-4 py-3 text-right"><button type="button" onClick={() => setSelectedOrderNumber(item.orderNumber)} className="btn-ghost inline-flex items-center gap-2"><Eye size={16} />{copy.details}</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={Boolean(selectedOrderNumber)} onClose={() => setSelectedOrderNumber(null)} title={`${copy.detailsTitle} ${selectedOrderNumber ? `#${selectedOrderNumber}` : ''}`} size="xl">
        {selectedOrderQuery.isLoading ? <div role="status" className="py-8 text-center text-muted">{copy.loading}</div> : selectedOrderQuery.isError || !order ? (
          <div role="alert" className="py-8 text-center text-red-500">{copy.error}<button type="button" onClick={() => void selectedOrderQuery.refetch()} className="ml-3 underline">{copy.retry}</button></div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={statusStyles[order.status] ?? 'badge-neutral'}>{statusLabels[order.status]?.[locale] ?? order.status}</span>
              <span className="text-sm text-muted">{new Date(order.createdAt).toLocaleString(locale === 'en' ? 'en-US' : locale === 'uz' ? 'uz-UZ' : 'ru-RU')}</span>
            </div>
            <section className="grid gap-4 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03] sm:grid-cols-2">
              <div><h3 className="text-sm font-bold">{copy.delivery}</h3><p className="mt-2 text-sm">{name || copy.noName}</p><p className="text-sm text-muted">{phone || '—'}</p></div>
              <div><h3 className="text-sm font-bold">{copy.address}</h3><p className="mt-2 text-sm">{[city, street, extraAddress].filter(Boolean).join(', ') || '—'}</p></div>
            </section>
            <section>
              <h3 className="font-bold">{copy.items}</h3>
              <ul className="mt-2 divide-y divide-app">{order.items.map((item) => (
                <li key={item.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm">
                  <span>{item.title}{item.variantSnapshot ? ` · ${[item.variantSnapshot.color, item.variantSnapshot.size].filter(Boolean).join(' · ')}` : ''} × {item.quantity}</span>
                  <span className="font-semibold">{formatUzs(item.totalPrice, locale)}</span>
                </li>
              ))}</ul>
            </section>
            <dl className="space-y-2 border-t border-app pt-4 text-sm">
              <div className="flex justify-between"><dt>{copy.subtotal}</dt><dd>{formatUzs(order.subtotal, locale)}</dd></div>
              {Number(order.discount) > 0 && <div className="flex justify-between"><dt>{copy.discount}</dt><dd>-{formatUzs(order.discount, locale)}</dd></div>}
              <div className="flex justify-between"><dt>{copy.deliveryCost}</dt><dd>{formatUzs(order.deliveryCost, locale)}</dd></div>
              <div className="flex justify-between border-t border-app pt-3 text-base font-bold"><dt>{copy.total}</dt><dd>{formatUzs(order.totalRevenue, locale)}</dd></div>
            </dl>
            <p className="text-xs text-muted">{copy.notPaid}</p>
            {order.status === 'CREATED' && (
              <div className="flex flex-wrap justify-end gap-3 border-t border-app pt-4">
                <button type="button" disabled={statusMutation.isPending} onClick={() => setCancelPending(true)} className="btn-ghost text-red-600 disabled:opacity-50"><Ban size={16} className="mr-2 inline" />{copy.cancel}</button>
                <button type="button" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ orderNumber: order.orderNumber, status: 'CONFIRMED' })} className="btn-primary disabled:opacity-50"><Check size={16} className="mr-2 inline" />{copy.confirm}</button>
              </div>
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialog isOpen={cancelPending} onClose={() => setCancelPending(false)} onConfirm={() => order && statusMutation.mutate({ orderNumber: order.orderNumber, status: 'CANCELLED' })} title={copy.cancelTitle} message={copy.cancelText} confirmLabel={copy.cancel} cancelLabel={copy.close} loading={statusMutation.isPending} />
    </Layout>
  );
}
