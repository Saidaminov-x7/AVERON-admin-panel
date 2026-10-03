// src/lib/siteSettingsApi.ts
// API для работы с настройками сайта

import { api } from './axios';

export interface SiteSettings {
  id: string;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  siteName: string;
  contactEmail: string;
  contactPhone: string;
  googleAuthEnabled: boolean;
  autoModerationEnabled: boolean;
  maxImagesPerListing: number;
  maxProductPhotos: number;
  maxProductPhotoSizeMb: number;
  logoUrl: string | null;
  navLinks?: Array<{ label: string; href: string; position: 'header' | 'footer' }>;

  // Feature Flags & Integrations
  deviceIpBanEnabled?: boolean;
  adaptiveRateLimitEnabled?: boolean;
  twoFactorAuthEnabled?: boolean;
  geoIpValidationEnabled?: boolean;
  tokenRotationEnabled?: boolean;
  fieldEncryptionEnabled?: boolean;
  sessionQuarantineEnabled?: boolean;
  thunderingHerdEnabled?: boolean;
  fullTextSearchEnabled?: boolean;
  paymeClickEnabled?: boolean;
  autoFiscalizationEnabled?: boolean;
  smsGatewayEnabled?: boolean;
  watermarkDetectorEnabled?: boolean;
  webPushEnabled?: boolean;
  oneIdAuthEnabled?: boolean;
  openTelemetryEnabled?: boolean;
  yandexMetrikaId?: string;
  yandexMetrikaEnabled?: boolean;
  maintenancePasswordEnabled?: boolean;
  maintenanceBypassPassword?: string | null;
  mobilePinchZoomEnabled?: boolean;

  updatedAt: string;
  updatedBy: {
    id: string;
    name: string;
  } | null;
}

// Получить текущие настройки
export const getSiteSettingsApi = async (): Promise<SiteSettings> => {
  const { data } = await api.get('/admin/site-settings');
  return data;
};

// Обновить настройки
export const updateSiteSettingsApi = async (payload: Partial<SiteSettings>): Promise<SiteSettings> => {
  const { data } = await api.patch('/admin/site-settings', payload);
  return data;
};

// Вспомогательная функция для формирования полного URL логотипа / медиа
export const getMediaUrl = (url?: string | null): string => {
  if (!url) return '/logotip.png';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${apiBase}${cleanPath}`;
};

// Загрузить логотип
export const uploadSiteLogoApi = async (file: File): Promise<SiteSettings> => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post('/admin/site-settings/logo', formData, {
    headers: {
      'Content-Type': undefined,
    },
  });
  return data;
};

// Удалить логотип
export const deleteSiteLogoApi = async (): Promise<SiteSettings> => {
  const { data } = await api.delete('/admin/site-settings/logo');
  return data;
};