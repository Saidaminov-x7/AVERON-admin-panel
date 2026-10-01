import { History, Truck } from 'lucide-react';
import type { CommerceOrderStatusHistoryEntry, CommerceOrderShipment } from '../../lib/commerceApi';

type Locale = 'ru' | 'uz' | 'en';
type LocalizedText = Record<Locale, string>;

interface Props {
  history: CommerceOrderStatusHistoryEntry[];
  shipments: CommerceOrderShipment[];
  locale: Locale;
  statusLabels: Record<string, LocalizedText>;
  copy: {
    history: string;
    shipments: string;
    provider: string;
    tracking: string;
    shipmentStatus: string;
    sentAt: string;
    arrivedAt: string;
    noShipments: string;
    noHistory: string;
  };
}

function dateTime(value: string, locale: Locale) {
  return new Date(value).toLocaleString(locale === 'en' ? 'en-US' : locale === 'uz' ? 'uz-UZ' : 'ru-RU');
}

export default function OrderTrackingDetails({ history, shipments, locale, statusLabels, copy }: Props) {
  return (
    <>
      <section className="space-y-3 border-t border-app pt-4">
        <h3 className="flex items-center gap-2 font-bold"><History size={16} />{copy.history}</h3>
        {history.length ? (
          <ol className="space-y-3 border-l-2 border-app pl-4">
            {history.map((entry, index) => (
              <li key={`${entry.status}-${entry.createdAt}-${index}`} className="relative text-sm">
                <span className="font-semibold">{statusLabels[entry.status]?.[locale] ?? entry.status}</span>
                <time className="ml-2 text-xs text-muted" dateTime={entry.createdAt}>{dateTime(entry.createdAt, locale)}</time>
                {entry.note && <p className="mt-1 whitespace-pre-wrap text-muted">{entry.note}</p>}
              </li>
            ))}
          </ol>
        ) : <p className="text-sm text-muted">{copy.noHistory}</p>}
      </section>
      <section className="space-y-3 border-t border-app pt-4">
        <h3 className="flex items-center gap-2 font-bold"><Truck size={16} />{copy.shipments}</h3>
        {shipments.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {shipments.map((shipment) => (
              <li key={shipment.trackingNumber} className="min-w-0 rounded-xl bg-gray-50 p-4 text-sm dark:bg-white/[0.03]">
                <dl className="space-y-2">
                  <div><dt className="text-xs text-muted">{copy.provider}</dt><dd className="font-medium">{shipment.provider}</dd></div>
                  <div><dt className="text-xs text-muted">{copy.tracking}</dt><dd className="break-all font-mono">{shipment.trackingNumber}</dd></div>
                  <div><dt className="text-xs text-muted">{copy.shipmentStatus}</dt><dd>{shipment.status}</dd></div>
                  {shipment.sentAt && <div><dt className="text-xs text-muted">{copy.sentAt}</dt><dd>{dateTime(shipment.sentAt, locale)}</dd></div>}
                  {shipment.arrivedAt && <div><dt className="text-xs text-muted">{copy.arrivedAt}</dt><dd>{dateTime(shipment.arrivedAt, locale)}</dd></div>}
                </dl>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">{copy.noShipments}</p>}
      </section>
    </>
  );
}
