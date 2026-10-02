import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import { getIntegrationDiagnostics } from '../../lib/integrationDiagnosticsApi';

const copy = {
  ru: { title: 'Диагностика интеграций', loading: 'Загрузка…', error: 'Диагностику загрузить не удалось.', enabled: 'Функция включена', configured: 'Настроена', implementation: 'Реализация', verification: 'Проверка', lastSuccess: 'Последняя успешная операция', degraded: 'Работает с ограничениями', yes: 'Да', no: 'Нет', none: 'Нет данных', warning: 'Секреты, ключи и приватные адреса здесь не отображаются.' },
  uz: { title: 'Integratsiyalar diagnostikasi', loading: 'Yuklanmoqda…', error: 'Diagnostikani yuklab bo‘lmadi.', enabled: 'Funksiya yoqilgan', configured: 'Sozlangan', implementation: 'Amalga oshirilishi', verification: 'Tekshiruv', lastSuccess: 'Oxirgi muvaffaqiyatli amal', degraded: 'Cheklangan holatda ishlayapti', yes: 'Ha', no: 'Yo‘q', none: 'Ma’lumot yo‘q', warning: 'Maxfiy kalitlar va yopiq manzillar ko‘rsatilmaydi.' },
  en: { title: 'Integration diagnostics', loading: 'Loading…', error: 'Diagnostics could not be loaded.', enabled: 'Feature enabled', configured: 'Configured', implementation: 'Implementation', verification: 'Verification', lastSuccess: 'Last successful operation', degraded: 'Degraded', yes: 'Yes', no: 'No', none: 'No data', warning: 'Secrets, API keys, and private URLs are not shown.' },
} as const;

export default function IntegrationDiagnosticsPage() {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('en') ? 'en' : i18n.language.startsWith('uz') ? 'uz' : 'ru';
  const text = copy[locale];
  const query = useQuery({ queryKey: ['admin', 'integration-diagnostics'], queryFn: getIntegrationDiagnostics, refetchInterval: 60_000 });
  return (
    <Layout title={text.title}>
      <main className="mx-auto max-w-7xl space-y-4 pb-12">
        <p className="text-sm text-muted">{text.warning}</p>
        {query.isPending ? <p role="status" className="card p-5">{text.loading}</p> : query.isError ? <p role="alert" className="card p-5 text-rose-600">{text.error}</p> : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {query.data?.map((item) => <li key={item.name} className="card space-y-3 p-5">
              <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{item.name}</h2>{item.degraded && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">{text.degraded}</span>}</div>
              <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-sm">
                <dt>{text.enabled}</dt><dd>{item.featureEnabled ? text.yes : text.no}</dd>
                <dt>{text.configured}</dt><dd>{item.configured ? text.yes : text.no}</dd>
                <dt>{text.implementation}</dt><dd className="font-mono text-xs">{item.implementationStatus}</dd>
                <dt>{text.verification}</dt><dd className="font-mono text-xs">{item.verificationStatus}</dd>
                <dt>{text.lastSuccess}</dt><dd>{item.lastSuccessfulOperation ? new Date(item.lastSuccessfulOperation).toLocaleString(locale) : text.none}</dd>
              </dl>
            </li>)}
          </ul>
        )}
      </main>
    </Layout>
  );
}
