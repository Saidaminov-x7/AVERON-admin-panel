import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ShoppingCart, RefreshCw, Eye, Check, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { getOrder, getOrders, updateOrderShipping, updateOrderStatus } from '../../lib/commerceApi';
import type { CommerceDeliveryStatus, CommerceOrderTransition } from '../../lib/commerceApi';
import { filterCommerceOrders } from './orderFilters';
import { getNextOrderTransition } from './orderTransitions';
import { getNextDeliveryTransitions } from './deliveryTransitions';
import OrderTrackingDetails from './OrderTrackingDetails';

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
  PENDING: { ru: 'Ожидает обработки', uz: 'Kutilmoqda', en: 'Pending' },
  PREPARING: { ru: 'Подготовка', uz: 'Tayyorlanmoqda', en: 'Preparing' },
  SHIPPED: { ru: 'Отправлен', uz: 'Yuborildi', en: 'Shipped' },
  IN_TRANSIT: { ru: 'В пути', uz: 'Yo‘lda', en: 'In transit' },
  READY_FOR_DELIVERY: { ru: 'Готов к доставке', uz: 'Yetkazishga tayyor', en: 'Ready for delivery' },
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

const fulfillmentCopy = {
  ru: { next: 'Следующий этап', note: 'Примечание к переходу', noteHint: 'Необязательно, до 500 символов', history: 'История статусов', shipments: 'Отправления', provider: 'Служба доставки', tracking: 'Трек-номер', shipmentStatus: 'Статус отправления', sentAt: 'Отправлено', arrivedAt: 'Прибыло', noShipments: 'Отправления пока не связаны с заказом.', noHistory: 'История статусов пока пуста.', characters: 'символов', internalDelivery: 'Внутренняя доставка', method: 'Способ доставки', recipient: 'Получатель', destination: 'Назначение', estimated: 'Ожидаемая доставка', updateShipping: 'Обновить доставку', saveShipping: 'Сохранить доставку', shippingError: 'Не удалось обновить доставку.', shippingSuccess: 'Данные доставки обновлены.', preorder: 'Предзаказ' },
  uz: { next: 'Keyingi bosqich', note: 'Holat o‘zgarishi uchun izoh', noteHint: 'Ixtiyoriy, 500 belgigacha', history: 'Holatlar tarixi', shipments: 'Jo‘natmalar', provider: 'Yetkazib beruvchi', tracking: 'Kuzatuv raqami', shipmentStatus: 'Jo‘natma holati', sentAt: 'Yuborildi', arrivedAt: 'Yetib keldi', noShipments: 'Buyurtmaga hali jo‘natmalar biriktirilmagan.', noHistory: 'Holatlar tarixi hozircha bo‘sh.', characters: 'belgi', internalDelivery: 'Ichki yetkazib berish', method: 'Yetkazish usuli', recipient: 'Qabul qiluvchi', destination: 'Manzil', estimated: 'Taxminiy yetkazish', updateShipping: 'Yetkazishni yangilash', saveShipping: 'Yetkazishni saqlash', shippingError: 'Yetkazish ma’lumotlarini yangilab bo‘lmadi.', shippingSuccess: 'Yetkazish ma’lumotlari yangilandi.', preorder: 'Oldindan buyurtma' },
  en: { next: 'Next status', note: 'Transition note', noteHint: 'Optional, up to 500 characters', history: 'Status history', shipments: 'Shipments', provider: 'Provider', tracking: 'Tracking number', shipmentStatus: 'Shipment status', sentAt: 'Sent', arrivedAt: 'Arrived', noShipments: 'No shipments are linked to this order yet.', noHistory: 'No status history available.', characters: 'characters', internalDelivery: 'Internal delivery', method: 'Delivery method', recipient: 'Recipient', destination: 'Destination', estimated: 'Estimated delivery', updateShipping: 'Update delivery', saveShipping: 'Save delivery', shippingError: 'Could not update delivery.', shippingSuccess: 'Delivery details updated.', preorder: 'Preorder' },
} as const;

const text = {
  ru: { title: 'Заказы клиентов', search: 'Номер заказа или клиент', filter: 'Статус', all: 'Все статусы', loading: 'Загрузка заказов…', error: 'Не удалось загрузить заказы.', retry: 'Повторить', emptyTitle: 'Заказов пока нет', emptyDesc: 'Заказы клиентов появятся здесь после оформления.', number: 'Номер', customer: 'Клиент', status: 'Статус', total: 'Сумма', date: 'Дата', details: 'Подробнее', noName: 'Без имени', detailsTitle: 'Заказ', delivery: 'Данные для доставки', phone: 'Телефон', address: 'Адрес', items: 'Состав заказа', subtotal: 'Товары', discount: 'Скидка', deliveryCost: 'Доставка', confirm: 'Подтвердить заказ', cancel: 'Отменить', cancelTitle: 'Отменить заказ?', cancelText: 'Отменить можно только новый заказ. Это действие нельзя будет выполнить повторно.', close: 'Закрыть', updateError: 'Не удалось изменить статус заказа.', updateSuccess: 'Статус заказа обновлён.' },
  uz: { title: 'Mijozlar buyurtmalari', search: 'Buyurtma raqami yoki mijoz', filter: 'Holati', all: 'Barcha holatlar', loading: 'Buyurtmalar yuklanmoqda…', error: 'Buyurtmalarni yuklab bo‘lmadi.', retry: 'Qayta urinish', emptyTitle: 'Hozircha buyurtmalar yo‘q', emptyDesc: 'Mijozlar buyurtmalari shu yerda ko‘rinadi.', number: 'Raqam', customer: 'Mijoz', status: 'Holati', total: 'Summa', date: 'Sana', details: 'Batafsil', noName: 'Ismsiz', detailsTitle: 'Buyurtma', delivery: 'Yetkazib berish ma’lumotlari', phone: 'Telefon', address: 'Manzil', items: 'Buyurtma tarkibi', subtotal: 'Mahsulotlar', discount: 'Chegirma', deliveryCost: 'Yetkazib berish', confirm: 'Buyurtmani tasdiqlash', cancel: 'Bekor qilish', cancelTitle: 'Buyurtma bekor qilinsinmi?', cancelText: 'Faqat yangi buyurtmani bekor qilish mumkin. Bu amalni qaytarib bo‘lmaydi.', close: 'Yopish', updateError: 'Buyurtma holatini o‘zgartirib bo‘lmadi.', updateSuccess: 'Buyurtma holati yangilandi.' },
  en: { title: 'Customer orders', search: 'Order number or customer', filter: 'Status', all: 'All statuses', loading: 'Loading orders…', error: 'Could not load orders.', retry: 'Try again', emptyTitle: 'No orders yet', emptyDesc: 'Customer orders will appear here once placed.', number: 'Number', customer: 'Customer', status: 'Status', total: 'Total', date: 'Date', details: 'View details', noName: 'No name', detailsTitle: 'Order', delivery: 'Delivery details', phone: 'Phone', address: 'Address', items: 'Order items', subtotal: 'Items', discount: 'Discount', deliveryCost: 'Delivery', confirm: 'Confirm order', cancel: 'Cancel', cancelTitle: 'Cancel this order?', cancelText: 'Only a new order can be cancelled. This action cannot be undone.', close: 'Close', updateError: 'Could not update the order status.', updateSuccess: 'Order status updated.' },
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

function toLocalDateTimeInput(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function isDeliveryStatus(value: string): value is CommerceDeliveryStatus {
  return ['PENDING', 'PREPARING', 'SHIPPED', 'IN_TRANSIT', 'READY_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].includes(value);
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
  const [statusNote, setStatusNote] = useState('');

  const ordersQuery = useQuery({ queryKey: ['commerce-orders'], queryFn: getOrders });
  const selectedOrderQuery = useQuery({
    queryKey: ['commerce-order', selectedOrderNumber],
    queryFn: () => getOrder(selectedOrderNumber!),
    enabled: Boolean(selectedOrderNumber),
  });
  const statusMutation = useMutation({
    mutationFn: ({ orderNumber, status, note }: {
      orderNumber: string;
      status: CommerceOrderTransition;
      note?: string;
    }) => updateOrderStatus(orderNumber, status, note),
    onSuccess: async () => {
      toast.success(copy.updateSuccess);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['commerce-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['commerce-order', selectedOrderNumber] }),
      ]);
      setCancelPending(false);
      setStatusNote('');
    },
    onError: () => toast.error(copy.updateError),
  });
  const shippingMutation = useMutation({
    mutationFn: ({ orderNumber, payload }: { orderNumber: string; payload: {
      status: CommerceDeliveryStatus;
      trackingNumber: string | null;
      provider: string | null;
      estimatedDeliveryAt: string | null;
      note?: string;
    } }) => updateOrderShipping(orderNumber, payload),
    onSuccess: async () => {
      toast.success(text[locale].updateSuccess);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['commerce-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['commerce-order', selectedOrderNumber] }),
      ]);
    },
    onError: () => toast.error(fulfillmentCopy[locale].shippingError),
  });

  const orders = useMemo(
    () => filterCommerceOrders(ordersQuery.data ?? [], search, statusFilter),
    [ordersQuery.data, search, statusFilter],
  );

  const order = selectedOrderQuery.data;
  const nextStatus = order ? getNextOrderTransition(order.status) : null;
  const nextDeliveryStatuses = order ? getNextDeliveryTransitions(order.delivery?.status ?? 'PENDING') : [];
  const fulfillment = fulfillmentCopy[locale];
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

      <Modal isOpen={Boolean(selectedOrderNumber)} onClose={() => { setSelectedOrderNumber(null); setStatusNote(''); }} title={`${copy.detailsTitle} ${selectedOrderNumber ? `#${selectedOrderNumber}` : ''}`} size="xl">
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
                  <span>{item.title}{item.variantSnapshot ? ` · ${[item.variantSnapshot.color, item.variantSnapshot.size].filter(Boolean).join(' · ')}` : ''} × {item.quantity}{item.isPreorder && <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">{fulfillment.preorder}</span>}</span>
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
            <OrderTrackingDetails
              history={order.statusHistory}
              shipments={order.shipments}
              locale={locale}
              statusLabels={statusLabels}
              copy={fulfillment}
            />
            {order && (
              <section className="space-y-4 border-t border-app pt-4">
                <h3 className="font-bold">{fulfillment.internalDelivery}</h3>
                <dl className="grid gap-3 rounded-xl bg-gray-50 p-4 text-sm dark:bg-white/[0.03] sm:grid-cols-2">
                  <div><dt className="text-xs text-muted">{fulfillment.method}</dt><dd>{order.delivery?.method ?? 'COURIER'}</dd></div>
                  <div><dt className="text-xs text-muted">{fulfillment.recipient}</dt><dd>{order.delivery?.recipient ?? name} · {order.delivery?.phone ?? phone}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs text-muted">{fulfillment.destination}</dt><dd>{[readField(order.delivery?.destination ?? order.deliveryAddress, 'city'), readField(order.delivery?.destination ?? order.deliveryAddress, 'address')].filter(Boolean).join(', ') || '—'}</dd></div>
                </dl>
                <form
                  key={`${order.orderNumber}-${selectedOrderQuery.dataUpdatedAt}`}
                  className="grid gap-3 sm:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    const status = String(formData.get('status') ?? '');
                    if (!isDeliveryStatus(status)) return;
                    const estimateValue = String(formData.get('estimatedDeliveryAt') ?? '');
                    const estimate = estimateValue ? new Date(estimateValue) : null;
                    if (estimate && !Number.isFinite(estimate.getTime())) return;
                    const trackingNumber = String(formData.get('trackingNumber') ?? '').trim();
                    const provider = String(formData.get('provider') ?? '').trim();
                    const note = String(formData.get('note') ?? '').trim();
                    shippingMutation.mutate({
                      orderNumber: order.orderNumber,
                      payload: {
                        status,
                        trackingNumber: trackingNumber || null,
                        provider: provider || null,
                        estimatedDeliveryAt: estimate?.toISOString() ?? null,
                        ...(note ? { note } : {}),
                      },
                    });
                  }}
                >
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">{fulfillment.shipmentStatus}</span>
                    <select name="status" defaultValue={order.delivery?.status ?? 'PENDING'} className="input w-full" required>
                      {([order.delivery?.status ?? 'PENDING', ...nextDeliveryStatuses].filter((value, index, all) => all.indexOf(value) === index)).map((value) => (
                        <option key={value} value={value}>{statusLabels[value][locale]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">{fulfillment.provider}</span>
                    <input name="provider" defaultValue={order.delivery?.provider ?? ''} maxLength={100} className="input w-full" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">{fulfillment.tracking}</span>
                    <input name="trackingNumber" defaultValue={order.delivery?.trackingNumber ?? ''} maxLength={160} className="input w-full" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">{fulfillment.estimated}</span>
                    <input name="estimatedDeliveryAt" type="datetime-local" defaultValue={toLocalDateTimeInput(order.delivery?.estimatedDeliveryAt)} className="input w-full" />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-sm font-medium">{fulfillment.note}</span>
                    <input name="note" maxLength={500} className="input w-full" />
                  </label>
                  <div className="sm:col-span-2 flex justify-end">
                    <button type="submit" disabled={shippingMutation.isPending} className="btn-primary disabled:opacity-50">
                      {shippingMutation.isPending ? fulfillment.updateShipping : fulfillment.saveShipping}
                    </button>
                  </div>
                </form>
              </section>
            )}
            {nextStatus && (
              <section className="space-y-3 border-t border-app pt-4">
                <h3 className="font-bold">{fulfillment.next}: {statusLabels[nextStatus][locale]}</h3>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">{fulfillment.note}</span>
                  <textarea
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                    maxLength={500}
                    rows={3}
                    className="input h-auto min-h-20 resize-y py-2"
                    aria-describedby="order-status-note-count"
                    placeholder={fulfillment.noteHint}
                  />
                  <span id="order-status-note-count" className="mt-1 block text-right text-xs text-muted">
                    {statusNote.length}/500 {fulfillment.characters}
                  </span>
                </label>
                <div className="flex flex-wrap justify-end gap-3">
                  {order.status === 'CREATED' && (
                    <button type="button" disabled={statusMutation.isPending} onClick={() => setCancelPending(true)} className="btn-ghost text-red-600 disabled:opacity-50"><Ban size={16} className="mr-2 inline" />{copy.cancel}</button>
                  )}
                  <button
                    type="button"
                    disabled={statusMutation.isPending || statusNote.length > 500}
                    onClick={() => statusMutation.mutate({
                      orderNumber: order.orderNumber,
                      status: nextStatus,
                      ...(statusNote.trim() ? { note: statusNote.trim() } : {}),
                    })}
                    className="btn-primary disabled:opacity-50"
                  >
                    <Check size={16} className="mr-2 inline" />{statusLabels[nextStatus][locale]}
                  </button>
                </div>
              </section>
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialog isOpen={cancelPending} onClose={() => setCancelPending(false)} onConfirm={() => order && statusMutation.mutate({ orderNumber: order.orderNumber, status: 'CANCELLED', ...(statusNote.trim() ? { note: statusNote.trim() } : {}) })} title={copy.cancelTitle} message={copy.cancelText} confirmLabel={copy.cancel} cancelLabel={copy.close} loading={statusMutation.isPending} />
    </Layout>
  );
}
