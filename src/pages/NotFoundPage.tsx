import { ArrowLeft, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function NotFoundPage() {
  return (
    <Layout title="Страница не найдена">
      <section className="grid min-h-[68vh] place-items-center">
        <div className="grid w-full max-w-4xl overflow-hidden border border-app bg-surface md:grid-cols-[.7fr_1fr]">
          <div className="relative flex min-h-64 flex-col justify-between overflow-hidden bg-primary-600 p-8 text-white md:min-h-[420px] md:p-12">
            <div className="absolute -right-16 -top-16 h-64 w-64 border border-white/15" />
            <div className="relative flex items-center gap-2 text-xs font-black tracking-[.22em]">AVERON<span className="h-1.5 w-1.5 bg-white" /></div>
            <div className="relative"><p className="text-8xl font-semibold leading-none tracking-[-.08em]">404</p><p className="mt-4 text-sm text-white/70">Запрошенный раздел панели недоступен.</p></div>
          </div>
          <div className="flex flex-col justify-center p-8 md:p-12">
            <div className="mb-7 flex h-12 w-12 items-center justify-center border border-app text-primary-600"><SearchX size={22} /></div>
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-primary-600">Навигация</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-app">Страница не найдена</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted">Адрес мог измениться, либо у вашей роли нет доступа к этому разделу.</p>
            <Link to="/" className="btn-primary mt-8 w-fit"><ArrowLeft size={16} />Вернуться в панель</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
