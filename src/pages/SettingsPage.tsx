import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { Select } from '../components/ui/Select';
import { getSiteSettingsApi, updateSiteSettingsApi, uploadSiteLogoApi, deleteSiteLogoApi, getMediaUrl } from '../lib/siteSettingsApi';

const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin', 'site-settings'],
    queryFn: getSiteSettingsApi,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [navLinks, setNavLinks] = useState<Array<{ label: string; href: string; position: 'header' | 'footer' }>>([]);

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);

  // Синхронизируем локальное состояние с данными API
  useEffect(() => {
    if (settings) {
      setMaintenanceMode(settings.maintenanceMode);
      setMessage(settings.maintenanceMessage || '');
      setLogoPreview(settings.logoUrl || null);
      setNavLinks(settings.navLinks || []);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: updateSiteSettingsApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'site-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = () => {
    mutation.mutate({
      maintenanceMode,
      maintenanceMessage: message || null,
      navLinks,
    });
  };

  const uploadLogoMutation = useMutation({
    mutationFn: uploadSiteLogoApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'site-settings'] });
    },
  });

  const deleteLogoMutation = useMutation({
    mutationFn: deleteSiteLogoApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'site-settings'] });
      setLogoFile(null);
      setLogoPreview(null);
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);
  };

  const handleUploadLogo = () => {
    if (!logoFile) return;
    uploadLogoMutation.mutate(logoFile);
  };

  const handleDeleteLogo = () => {
    deleteLogoMutation.mutate();
  };

  return (
    <Layout title="Настройки">
      <div className="space-y-6 max-w-2xl">

        {/* ─── Режим обслуживания ─── */}
        <div className="card">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-app">Режим обслуживания сайта</h2>
              <p className="text-sm text-muted mt-0.5">
                При включении пользователи будут перенаправлены на страницу технических работ.
                Вы всегда сможете зайти в админку и отключить режим.
              </p>
            </div>
            {/* Toggle switch */}
            {!isLoading && (
              <button
                id="maintenance-toggle"
                onClick={() => setMaintenanceMode((v) => !v)}
                className={`
                  relative inline-flex items-center w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ml-4
                  ${maintenanceMode ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}
                `}
                role="switch"
                aria-checked={maintenanceMode}
              >
                <span className={`
                  inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200
                  ${maintenanceMode ? 'translate-x-6' : 'translate-x-0.5'}
                `}/>
              </button>
            )}
          </div>

          {/* Статус */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-4 ${
            maintenanceMode
              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
              : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${maintenanceMode ? 'bg-amber-500' : 'bg-emerald-500'}`}/>
            {maintenanceMode ? '⚠️ Сайт переведён в режим обслуживания' : '✅ Сайт работает в штатном режиме'}
          </div>

          {/* Сообщение */}
          <div>
            <label htmlFor="maintenance-message" className="block text-sm font-medium text-app mb-1.5">
              Сообщение для пользователей
            </label>
            <textarea
              id="maintenance-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Сайт временно недоступен. Мы проводим технические работы. Попробуйте позже."
              rows={3}
              className="input resize-none"
            />
            <p className="text-xs text-muted mt-1">
              Если оставить пустым, будет использовано стандартное сообщение
            </p>
          </div>

          {/* Кнопка сохранения */}
          <div className="flex items-center gap-3 mt-4">
            <button
              id="save-settings-btn"
              onClick={handleSave}
              disabled={mutation.isPending}
              className="btn-primary disabled:opacity-50"
            >
              {mutation.isPending ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Сохранение...
                </>
              ) : 'Сохранить настройки'}
            </button>
            {saved && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                ✓ Сохранено!
              </span>
            )}
            {mutation.isError && (
              <span className="text-sm text-red-500">Ошибка при сохранении</span>
            )}
          </div>
        </div>

        {/* ─── Информация об обновлении ─── */}
        {settings?.updatedAt && (
          <div className="text-xs text-muted">
            Последнее обновление: {new Date(settings.updatedAt).toLocaleString('ru-RU')}
            {settings.updatedBy && ` · ${settings.updatedBy.name}`}
          </div>
        )}

        {/* ─── Логотип платформы ─── */}
        <div className="card">
          <h2 className="text-base font-semibold text-app mb-3">Логотип платформы</h2>
          <p className="text-sm text-muted mb-4">
            Загрузите логотип, который будет отображаться на сайте и в админ-панели.
          </p>

          <div className="flex items-center gap-4 mb-4">
            {logoPreview ? (
              <div className="relative">
                <img
                  src={getMediaUrl(logoPreview)}
                  alt="Логотип"
                  className="h-16 w-auto rounded-lg border border-app object-contain"
                />
                <button
                  onClick={handleDeleteLogo}
                  disabled={deleteLogoMutation.isPending}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 disabled:opacity-50"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="h-16 w-32 rounded-lg border border-app flex items-center justify-center text-muted text-sm">
                Нет логотипа
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="btn-secondary cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
              Выбрать файл
            </label>
            {logoFile && (
              <button
                onClick={handleUploadLogo}
                disabled={uploadLogoMutation.isPending}
                className="btn-primary disabled:opacity-50"
              >
                {uploadLogoMutation.isPending ? 'Загрузка...' : 'Загрузить логотип'}
              </button>
            )}
          </div>
          {uploadLogoMutation.isError && (
            <p className="text-sm text-red-500 mt-2">Ошибка при загрузке логотипа</p>
          )}
        </div>

        {/* ─── Навигационное меню ─── */}
        <div className="card">
          <h2 className="text-base font-semibold text-app mb-3">Навигационное меню</h2>
          <p className="text-sm text-muted mb-4">Ссылки для шапки и подвала сайта</p>

          <div className="space-y-4">
            {navLinks.map((link, index) => (
              <div key={index} className="flex items-center gap-2 p-3 border border-app rounded-lg">
                <input
                  value={link.label}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const newLinks = [...navLinks];
                    newLinks[index] = { ...newLinks[index], label: e.target.value };
                    setNavLinks(newLinks);
                  }}
                  placeholder="Главная"
                  className="input flex-1"
                />
                <input
                  value={link.href}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const newLinks = [...navLinks];
                    newLinks[index] = { ...newLinks[index], href: e.target.value };
                    setNavLinks(newLinks);
                  }}
                  placeholder="/"
                  className="input flex-1"
                />
                <Select
                  value={link.position}
                  onChange={(value) => {
                    if (value !== 'header' && value !== 'footer') return;
                    const newLinks = [...navLinks];
                    newLinks[index] = { ...newLinks[index], position: value };
                    setNavLinks(newLinks);
                  }}
                  options={[
                    { value: 'header', label: 'Шапка' },
                    { value: 'footer', label: 'Подвал' },
                  ]}
                  className="text-sm"
                  containerClassName="w-28"
                />
                <button
                  onClick={() => {
                    const newLinks = [...navLinks];
                    newLinks.splice(index, 1);
                    setNavLinks(newLinks);
                  }}
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
            ))}

            {navLinks.length < 10 && (
              <button
                onClick={() => {
                  setNavLinks([...navLinks, { label: '', href: '', position: 'header' }]);
                }}
                className="w-full p-2 text-sm text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg border border-dashed border-app"
              >
                + Добавить ссылку
              </button>
            )}
          </div>
        </div>

        {/* ─── О системе ─── */}
        <div className="card">
          <h2 className="text-base font-semibold text-app mb-3">О системе</h2>
          <dl className="space-y-2 text-sm">
            {[
              { label: 'Версия API', value: '1.0.0' },
              { label: 'Backend', value: 'Fastify + Prisma + PostgreSQL' },
              { label: 'Admin Panel', value: 'Vite + React + TanStack Query' },
              { label: 'API URL', value: import.meta.env.VITE_API_URL || 'localhost:3000' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b border-app last:border-0">
                <dt className="text-muted">{label}</dt>
                <dd className="font-medium text-app font-mono text-xs">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;