// src/pages/settings/GeneralSettingsPage.tsx
// Основные настройки: maintenance mode, название сайта, контакты для футера, логотип

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Upload,
  Trash2,
  Save,
  Globe,
  Mail,
  Phone,
  Plus,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';
import Layout from '../../components/Layout';
import {
  getSiteSettingsApi,
  updateSiteSettingsApi,
  uploadSiteLogoApi,
  deleteSiteLogoApi,
  getMediaUrl,
} from '../../lib/siteSettingsApi';
import { Button, Input, Textarea, Switch, Card } from '../../components/ui';
import { useTranslation } from 'react-i18next';

const GeneralSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin', 'site-settings'],
    queryFn: getSiteSettingsApi,
  });

  const [siteName, setSiteName] = useState('AVERON');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenancePasswordEnabled, setMaintenancePasswordEnabled] = useState(false);
  const [maintenanceBypassPassword, setMaintenanceBypassPassword] = useState('');
  const [mobilePinchZoomEnabled, setMobilePinchZoomEnabled] = useState(true);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [navLinks, setNavLinks] = useState<
    Array<{ label: string; href: string; position: 'header' | 'footer' }>
  >([
    { label: 'Товары', href: '/catalog', position: 'header' },
    { label: 'AI', href: '/ai', position: 'header' },
    { label: 'О нас', href: '/about', position: 'header' },
  ]);

  useEffect(() => {
    if (settings) {
      setSiteName(settings.siteName?.toLowerCase().includes('ijara') ? 'AVERON' : settings.siteName || 'AVERON');
      setContactEmail(settings.contactEmail?.toLowerCase().includes('ijarauz') ? '' : settings.contactEmail || '');
      setContactPhone(settings.contactPhone === '+998 71 200-00-00' ? '' : settings.contactPhone || '');
      setMaintenanceMode(settings.maintenanceMode ?? false);
      setMaintenanceMessage(settings.maintenanceMessage || '');
      setMaintenanceBypassPassword((settings as any).maintenanceBypassPassword || '');
      setMaintenancePasswordEnabled((settings as any).maintenancePasswordEnabled ?? false);
      setMobilePinchZoomEnabled((settings as any).mobilePinchZoomEnabled ?? true);
      setLogoPreview(settings.logoUrl || null);
      if (settings.navLinks && Array.isArray(settings.navLinks) && settings.navLinks.length > 0) {
        setNavLinks(settings.navLinks.filter((link) => !['/add-listing', '/chat'].includes(link.href)));
      }
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: updateSiteSettingsApi,
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin', 'site-settings'], updated);
      toast.success(t('settings.savedSuccess', 'Основные настройки и меню успешно сохранены'));
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || t('settings.saveError', 'Ошибка сохранения настроек'));
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: uploadSiteLogoApi,
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin', 'site-settings'], updated);
      queryClient.invalidateQueries({ queryKey: ['admin', 'site-settings'] });
      setLogoPreview(updated.logoUrl || null);
      setLogoFile(null);
      toast.success(t('settings.logoUploaded', 'Логотип успешно загружен и сохранён'));
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || t('settings.logoUploadError', 'Ошибка загрузки логотипа'));
    },
  });

  const deleteLogoMutation = useMutation({
    mutationFn: deleteSiteLogoApi,
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin', 'site-settings'], updated);
      queryClient.invalidateQueries({ queryKey: ['admin', 'site-settings'] });
      setLogoPreview(null);
      setLogoFile(null);
      toast.success(t('settings.logoDeleted', 'Логотип удалён (используется стандартный)'));
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || t('settings.logoDeleteError', 'Ошибка удаления логотипа'));
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Обновляем основные настройки и навигацию
    await mutation.mutateAsync({
      siteName,
      contactEmail,
      contactPhone,
      maintenanceMode,
      maintenanceMessage: maintenanceMessage.trim() || null,
      maintenancePasswordEnabled,
      maintenanceBypassPassword: maintenanceBypassPassword.trim() || null,
      mobilePinchZoomEnabled,
      navLinks,
    });

    // 2. Загружаем логотип при наличии нового файла (если еще не отправлен)
    if (logoFile) {
      uploadLogoMutation.mutate(logoFile);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.includes('svg')) {
      toast.error(t('settings.logoTypeError', 'Можно загружать только изображения (PNG, JPG, SVG, WebP)'));
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    uploadLogoMutation.mutate(file);
  };

  const handleLogoDelete = () => {
    deleteLogoMutation.mutate();
  };

  return (
    <Layout title="Основные настройки">
      <div className="max-w-4xl mx-auto space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Масштабирование двумя пальцами (Pinch-to-zoom) */}
          <Card
            title="Масштабирование на смартфонах (Pinch-to-zoom)"
            description="Управление возможностью увеличивать и уменьшать масштаб сайта жестом двумя пальцами на мобильных устройствах"
          >
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-1">
                <p className="font-semibold text-app">Увеличение двумя пальцами (Zoom)</p>
                <p className="text-xs text-muted">
                  {mobilePinchZoomEnabled
                    ? 'Включено: пользователи могут свободно приближать текст и фотографии щипком двумя пальцами'
                    : 'Отключено: масштаб зафиксирован 1:1 без возможности ручного приближения'}
                </p>
              </div>
              <Switch checked={mobilePinchZoomEnabled} onChange={setMobilePinchZoomEnabled} />
            </div>
          </Card>
          {/* Maintenance Mode */}
          <Card
            title={t('settings.maintenanceMode', 'Режим технического обслуживания')}
            description={t('settings.maintenanceModeDesc', 'Если включено, публичная часть сайта будет недоступна для посетителей')}
            className="border-amber-500/20 bg-amber-500/5"
          >
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-app">{t('settings.maintenanceStatus', 'Статус техобслуживания')}</p>
                    <p className="text-xs text-muted">
                      {maintenanceMode
                        ? t('settings.maintenanceOn', 'Сайт переведен в режим обслуживания')
                        : t('settings.maintenanceOff', 'Сайт работает в обычном режиме')}
                    </p>
                  </div>
                </div>
                <Switch checked={maintenanceMode} onChange={setMaintenanceMode} />
              </div>

              {maintenanceMode && (
                <div className="pt-3 border-t border-app">
                  <Textarea
                    label={t('settings.maintenanceMsg', 'Сообщение для посетителей при техобслуживании')}
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    rows={3}
                    placeholder={t('settings.maintenanceMsgPlaceholder', 'Сайт временно недоступен. Мы проводим плановые технические работы...')}
                  />
                  <div className="pt-3 border-t border-app mt-4 flex items-center justify-between">
                    <span className="text-sm text-muted">{t('settings.requirePasswordMaintenance', 'Требовать пароль при техобслуживании')}</span>
                    <Switch checked={maintenancePasswordEnabled} onChange={setMaintenancePasswordEnabled} />
                  </div>
                  {maintenancePasswordEnabled && (
                    <div className="pt-3 border-t border-app mt-4">
                      <label className="block text-xs font-semibold text-muted mb-1">{t('settings.bypassPassword', 'Пароль для обхода техобслуживания')}</label>
                      <input
                        type="password"
                        value={maintenanceBypassPassword}
                        onChange={(e) => setMaintenanceBypassPassword(e.target.value)}
                        placeholder={t('common.enterPassword', 'Введите пароль')}
                        className="input max-w-xs"
                      />
                      <p className="text-xs text-muted mt-1">{t('settings.bypassPasswordHint', 'Пароль позволит входить в сайт, когда включён режим обслуживания.')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Platform Logo */}
          <Card
            title={t('settings.logoTitle', 'Логотип платформы')}
            description={t('settings.logoDesc', 'Загруженный логотип будет отображаться в шапке сайта и административной панели')}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pt-2">
              {logoPreview ? (
                <div className="relative group">
                  <div className="h-20 w-44 rounded-xl border border-app bg-surface p-2 flex items-center justify-center overflow-hidden">
                    <img
                      src={getMediaUrl(logoPreview)}
                      alt={t('settings.logoAlt', 'Логотип платформы')}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/logotip.png';
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleLogoDelete}
                    className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    title={t('settings.deleteLogo', 'Удалить логотип')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <div className="h-20 w-44 rounded-xl border-2 border-dashed border-app flex flex-col items-center justify-center text-muted gap-1 bg-surface">
                  <ImageIcon size={20} />
                  <span className="text-xs">{t('settings.defaultLogo', 'Стандартный логотип')}</span>
                </div>
              )}

              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-app bg-surface hover:bg-gray-50 dark:hover:bg-white/5 text-app text-sm font-medium cursor-pointer transition-colors">
                <Upload size={16} />
                <span>{t('settings.uploadNewLogo', 'Загрузить новый логотип')}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </Card>

          {/* Site Info & Contacts */}
          <Card title={t('settings.siteInfoTitle', 'Информация о сайте и контакты')} description={t('settings.siteInfoDesc', 'Название и контактные данные, отображаемые в подвале')}>
            <div className="space-y-4 pt-2">
              <Input
                label={t('settings.siteName', 'Название платформы')}
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                required
                leftIcon={<Globe size={16} />}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={t('settings.supportEmail', 'Контактный Email')}
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                  leftIcon={<Mail size={16} />}
                />

                <Input
                  label={t('settings.supportPhone', 'Контактный телефон')}
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  required
                  leftIcon={<Phone size={16} />}
                />
              </div>
            </div>
          </Card>

          {/* Nav Menu */}
          <Card
            title={t('settings.navMenuTitle', 'Навигационное меню сайта')}
            description={t('settings.navMenuDesc', 'Управляйте пунктами меню: добавляйте ссылки, меняйте названия и адреса')}
            headerAction={
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={() =>
                  setNavLinks((prev) => [
                    ...prev,
                    { label: t('settings.newLink', 'Новая ссылка'), href: '/catalog', position: 'header' },
                  ])
                }
              >
                {t('settings.addMenuItem', 'Добавить пункт')}
              </Button>
            }
          >
            <div className="space-y-3 pt-2">
              {navLinks.map((link, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-center gap-3 p-3.5 rounded-xl border border-app bg-surface"
                >
                  <div className="flex-1 w-full sm:w-auto">
                    <Input
                      label={t('settings.menuItemLabel', 'Название пункта')}
                      value={link.label}
                      onChange={(e) => {
                        const updated = [...navLinks];
                        updated[idx] = { ...updated[idx], label: e.target.value };
                        setNavLinks(updated);
                      }}
                      placeholder={t('settings.menuItemPlaceholder', 'Например: Каталог')}
                    />
                  </div>
                  <label className="w-full text-xs font-semibold text-muted sm:w-36">
                    {t('settings.menuItemPosition', 'Размещение')}
                    <select
                      value={link.position}
                      onChange={(e) => {
                        const updated = [...navLinks];
                        updated[idx] = { ...updated[idx], position: e.target.value as 'header' | 'footer' };
                        setNavLinks(updated);
                      }}
                      className="input mt-1 w-full"
                    >
                      <option value="header">{t('settings.header', 'Шапка')}</option>
                      <option value="footer">{t('settings.footer', 'Подвал')}</option>
                    </select>
                  </label>
                  <div className="flex-1 w-full sm:w-auto">
                    <Input
                      label={t('settings.menuItemUrl', 'Ссылка (URL или относительный путь)')}
                      value={link.href}
                      onChange={(e) => {
                        const updated = [...navLinks];
                        updated[idx] = { ...updated[idx], href: e.target.value };
                        setNavLinks(updated);
                      }}
                      placeholder="/catalog"
                    />
                  </div>
                  <div className="w-full sm:w-auto flex sm:flex-col justify-end items-end sm:items-center pt-2 sm:pt-6">
                    <button
                      type="button"
                      onClick={() => setNavLinks((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                      title={t('settings.removeMenuItem', 'Удалить пункт меню')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              leftIcon={<Save size={18} />}
              loading={isLoading || mutation.isPending}
            >
              {t('settings.saveGeneral', 'Сохранить основные настройки')}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default GeneralSettingsPage;
