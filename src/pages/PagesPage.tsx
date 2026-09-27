import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Badge from '../components/Badge/Badge';
import { getPagesApi, createPageApi, updatePageApi, deletePageApi, type DynamicPage, type CreatePageDto } from '../lib/pagesApi';
import { getSiteSettingsApi, updateSiteSettingsApi } from '../lib/siteSettingsApi';
import { api } from '../lib/axios';

// ─── Реестр всех страниц сайта (обнаружены из файловой структуры Next.js app/[locale]/) ────
// Обновляется при добавлении новых page.tsx в кодовой базе фронтенда

interface SitePageRoute {
  path: string;
  label: string;
  description: string;
  pageKey: string | null;
  category: 'main' | 'catalog' | 'user' | 'content';
  icon: string;
}

const SITE_ROUTES: SitePageRoute[] = [
  // Основные страницы
  { path: '/',              label: 'Главная',            description: 'Каталог объявлений, баннер, преимущества',    pageKey: 'home',          category: 'main',     icon: '🏠' },
  { path: '/catalog',       label: 'Каталог',             description: 'Список всех объявлений с фильтрами',         pageKey: 'catalog',       category: 'catalog',  icon: '📋' },
  { path: '/catalog/[id]',  label: 'Объявление',          description: 'Детальная страница объявления',              pageKey: 'listing',       category: 'catalog',  icon: '📄' },
  { path: '/add-listing',   label: 'Создать объявление',  description: 'Форма создания нового объявления',           pageKey: 'add-listing',   category: 'user',     icon: '✏️' },
  // Личный кабинет
  { path: '/profile',       label: 'Профиль',             description: 'Личный кабинет пользователя',                pageKey: 'profile',       category: 'user',     icon: '👤' },
  { path: '/favorites',     label: 'Избранное',           description: 'Сохранённые объявления',                     pageKey: 'favorites',     category: 'user',     icon: '❤️' },
  // AI и коммуникации
  { path: '/chat',          label: 'AI-помощник',         description: 'Чат с AI ассистентом',                       pageKey: 'chat',          category: 'content',  icon: '🤖' },
  // Информационные страницы
  { path: '/about',         label: 'О нас',               description: 'Информация о платформе',                     pageKey: 'about',         category: 'content',  icon: 'ℹ️' },
  { path: '/privacy',       label: 'Конфиденциальность',  description: 'Политика обработки персональных данных',     pageKey: 'privacy',       category: 'content',  icon: '🔒' },
  { path: '/terms',         label: 'Условия использования', description: 'Пользовательское соглашение',              pageKey: 'terms',         category: 'content',  icon: '📜' },
  // Системные страницы
  { path: '/maintenance',   label: 'Тех. работы',         description: 'Страница режима обслуживания',               pageKey: 'maintenance',   category: 'main',     icon: '🔧' },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  main:     { label: 'Основные',     color: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' },
  catalog:  { label: 'Каталог',      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  user:     { label: 'Пользователи', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  content:  { label: 'Контент',      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
};

// ─── Форма создания/редактирования страницы ───────────────────────────────────

interface PageFormProps {
  page?: DynamicPage | null;
  onClose: () => void;
  onSave: (dto: CreatePageDto, id?: string) => void;
  isLoading: boolean;
}

const PageForm: React.FC<PageFormProps> = ({ page, onClose, onSave, isLoading }) => {
  const [form, setForm] = useState<CreatePageDto & { addToNav?: boolean }>(
    page ? {
      slug: page.slug,
      title: page.title,
      content: page.content,
      locale: page.locale,
      isPublished: page.isPublished,
      addToNav: false,
    } : {
      slug: '',
      title: '',
      content: '',
      locale: 'ru',
      isPublished: false,
      addToNav: true,
    }
  );

  const handleChange = (field: keyof CreatePageDto | 'addToNav', value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-xl p-6 w-full max-w-md border border-app shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-app">
            {page ? 'Редактировать страницу' : 'Создать страницу'}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-app">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-app mb-1.5">Slug (URL)</label>
            <input
              value={form.slug}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('slug', e.target.value)}
              placeholder="about-us"
              disabled={!!page}
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app mb-1.5">Заголовок</label>
            <input
              value={form.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('title', e.target.value)}
              placeholder="О нас"
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app mb-1.5">Язык</label>
            <select
              value={form.locale}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('locale', e.target.value)}
              className="select w-full"
            >
              <option value="ru">Русский</option>
              <option value="uz">Узбекский</option>
              <option value="en">Английский</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="add-to-nav"
              checked={form.addToNav || false}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('addToNav', e.target.checked)}
              className="h-4 w-4 rounded border-app text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="add-to-nav" className="text-sm text-app">Добавить в навигационное меню</label>
          </div>

          <div>
            <label className="block text-sm font-medium text-app mb-1.5">Контент (Markdown)</label>
            <textarea
              value={form.content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('content', e.target.value)}
              placeholder="# Заголовок\n\nТекст страницы в формате Markdown..."
              rows={8}
              className="input w-full resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleChange('isPublished', !form.isPublished)}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.isPublished ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform ${form.isPublished ? 'translate-x-5' : 'translate-x-0.5'}`}/>
            </button>
            <span className="text-sm text-app">Опубликовать страницу</span>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button onClick={onClose} className="btn-ghost text-sm">Отмена</button>
          <button
            onClick={() => onSave(form, page?.id)}
            disabled={isLoading || !form.slug || !form.title}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {isLoading ? 'Сохранение...' : (page ? 'Сохранить' : 'Создать')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Главная страница ─────────────────────────────────────────────────────────

const PagesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [editPage, setEditPage] = useState<DynamicPage | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'pages'],
    queryFn: () => getPagesApi({ limit: 50 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'pages'] });

  const createMutation = useMutation({
    mutationFn: createPageApi,
    onSuccess: () => { invalidate(); setFormOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreatePageDto> }) => updatePageApi(id, dto),
    onSuccess: () => { invalidate(); setEditPage(null); },
  });

  const toggleMaintenanceMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/pages/${id}/maintenance`),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePageApi(id),
    onSuccess: invalidate,
  });

  const handleSave = async (dto: CreatePageDto & { addToNav?: boolean }, id?: string) => {
    if (id) {
      await updateMutation.mutateAsync({ id, dto });
    } else {
      await createMutation.mutateAsync(dto);
      
      // Если нужно добавить в навигацию — обновляем настройки
      if (dto.addToNav) {
        const settings = await getSiteSettingsApi();
        const newNavLinks = [...(settings.navLinks || []), {
          label: dto.title,
          href: `/pages/${dto.slug}`,
          position: 'header' as const,
        }];
        await updateSiteSettingsApi({ navLinks: newNavLinks });
      }
    }
  };

  return (
    <Layout title="Управление страницами">
      {formOpen && (
        <PageForm
          onClose={() => setFormOpen(false)}
          onSave={handleSave}
          isLoading={createMutation.isPending}
          page={null}
        />
      )}

      {editPage && (
        <PageForm
          onClose={() => setEditPage(null)}
          onSave={handleSave}
          isLoading={updateMutation.isPending}
          page={editPage}
        />
      )}

      <div className="space-y-6 max-w-7xl mx-auto">

        {/* ─── Все страницы сайта (обнаружены из кодовой базы фронтенда) ─── */}
        {Object.entries(SITE_ROUTES.reduce<Record<string, SitePageRoute[]>>((acc, route) => {
          if (!acc[route.category]) acc[route.category] = [];
          acc[route.category].push(route);
          return acc;
        }, {})).map(([category, routes]) => {
          const catMeta = CATEGORY_LABELS[category] || CATEGORY_LABELS.content;
          return (
            <div key={category} className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-app">{catMeta.label}</h2>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catMeta.color}`}>{routes.length}</span>
                </div>
                <p className="text-xs text-muted">Контент редактируется через конструктор</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {routes.map((route) => (
                  <div key={route.path} className="card">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-app flex items-center gap-2">
                        <span className="text-lg">{route.icon}</span>
                        {route.label}
                      </h3>
                      <Badge variant="neutral">{catMeta.label}</Badge>
                    </div>
                    <p className="text-sm text-muted mb-2">{route.description}</p>
                    <p className="text-xs text-muted font-mono truncate mb-3">{route.path}</p>
                    <button
                      onClick={() => navigate(`/pages/${route.pageKey}/builder`)}
                      className="btn-primary w-full text-sm"
                    >
                      Открыть конструктор
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* ─── Динамические страницы (созданы из админки) ─── */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-app">Динамические страницы</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">{data?.items?.length ?? 0}</span>
            </div>
            <button onClick={() => setFormOpen(true)} className="btn-primary text-sm">
              + Создать страницу
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-app last:border-0">
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-1/3" />
                    <div className="h-2.5 bg-gray-200 dark:bg-white/10 rounded w-1/2" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-16 bg-gray-200 dark:bg-white/10 rounded" />
                    <div className="h-6 w-6 bg-gray-200 dark:bg-white/10 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : data?.items.length === 0 ? (
            <p className="text-muted text-sm py-4 text-center">Динамических страниц пока нет</p>
          ) : (
            <div className="space-y-3">
              {data?.items.map((page) => (
                <div key={page.id} className="flex items-center justify-between py-3 border-b border-app last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-app truncate">/{page.slug}</h3>
                      <Badge variant={page.isPublished ? 'success' : 'warning'}>
                        {page.isPublished ? 'Опубликована' : 'Черновик'}
                      </Badge>
                      {page.isUnderMaintenance && <Badge variant="warning">🔧 На обслуживании</Badge>}
                    </div>
                    <p className="text-xs text-muted truncate">{page.title} · {page.locale}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setEditPage(page)}
                      className="px-3 py-1 text-xs border border-app rounded hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-app"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(page.isUnderMaintenance
                          ? 'Снять страницу с обслуживания?'
                          : 'Поставить страницу на обслуживание?')) {
                          toggleMaintenanceMutation.mutate(page.id);
                        }
                      }}
                      className={`px-3 py-1 text-xs border rounded transition-colors ${
                        page.isUnderMaintenance
                          ? 'border-emerald-500/20 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                          : 'border-amber-500/20 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                      }`}
                    >
                      {page.isUnderMaintenance ? 'Снять с обслуж.' : 'На обслуживание'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Удалить страницу?')) {
                          deleteMutation.mutate(page.id);
                        }
                      }}
                      className="px-3 py-1 text-xs text-red-500 border border-red-500/20 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PagesPage;