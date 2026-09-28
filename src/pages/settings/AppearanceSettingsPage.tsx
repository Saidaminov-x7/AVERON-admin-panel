// src/pages/settings/AppearanceSettingsPage.tsx
// Управление дизайн-токенами: цвета, шрифты, скругления, отступы

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import { api } from '../../lib/axios';

interface ThemeSettingsData {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: string;
  fontFamily: string;
}

const getThemeApi = async (): Promise<ThemeSettingsData> => {
  const { data } = await api.get('/admin/theme');
  return data;
};

const updateThemeApi = async (dto: Partial<ThemeSettingsData>): Promise<ThemeSettingsData> => {
  const { data } = await api.patch('/admin/theme', dto);
  return data;
};

const PRESET_THEMES: { name: string; tokens: Partial<ThemeSettingsData> }[] = [
  {
    name: 'Teal (по умолчанию)',
    tokens: { primaryColor: '#14b8a6', secondaryColor: '#0f766e', backgroundColor: '#f9fafb', textColor: '#111827' },
  },
  {
    name: 'Indigo',
    tokens: { primaryColor: '#6366f1', secondaryColor: '#4338ca', backgroundColor: '#f8fafc', textColor: '#0f172a' },
  },
  {
    name: 'Rose',
    tokens: { primaryColor: '#f43f5e', secondaryColor: '#e11d48', backgroundColor: '#fff1f2', textColor: '#1c1917' },
  },
  {
    name: 'Amber',
    tokens: { primaryColor: '#f59e0b', secondaryColor: '#d97706', backgroundColor: '#fffbeb', textColor: '#1c1917' },
  },
  {
    name: 'Тёмная',
    tokens: { primaryColor: '#14b8a6', secondaryColor: '#0f766e', backgroundColor: '#0f172a', textColor: '#f1f5f9' },
  },
];

const FONT_OPTIONS = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Nunito, sans-serif', label: 'Nunito' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
  { value: 'PT Sans, sans-serif', label: 'PT Sans' },
  { value: 'Manrope, sans-serif', label: 'Manrope' },
];

const BORDER_RADIUS_OPTIONS = [
  { value: '0', label: 'Без скругления' },
  { value: '0.25rem', label: 'Маленькое (4px)' },
  { value: '0.5rem', label: 'Среднее (8px)' },
  { value: '0.75rem', label: 'Большое (12px)' },
  { value: '1rem', label: 'Очень большое (16px)' },
  { value: '9999px', label: 'Полный круг' },
];

const AppearanceSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin', 'theme-settings'],
    queryFn: getThemeApi,
  });

  const [form, setForm] = useState<ThemeSettingsData>({
    primaryColor: '#14b8a6',
    secondaryColor: '#0f766e',
    backgroundColor: '#f9fafb',
    textColor: '#111827',
    borderRadius: '0.75rem',
    fontFamily: 'Inter, sans-serif',
  });

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: updateThemeApi,
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin', 'theme-settings'], updated);
      setForm(updated);
      setSuccessMsg('Дизайн-токены успешно обновлены');
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(error.response?.data?.message || 'Ошибка сохранения настроек темы');
    },
  });

  const handleColorChange = (key: keyof ThemeSettingsData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Предпросмотр работает через form-состояние в Preview-блоке (inline styles)
    // Реальное применение к панели — только через AdminThemeInjector
  };

  const handleSave = () => {
    setSuccessMsg('');
    setErrorMsg('');
    mutation.mutate(form);
  };

  const applyPreset = (preset: Partial<ThemeSettingsData>) => {
    setForm((prev) => ({ ...prev, ...preset }));
    // Предпросмотр работает через form-состояние в Preview-блоке (inline styles)
    // Реальное применение к сайту происходит только после сохранения
  };

  return (
    <Layout title="Тема сайта">
      <div className="max-w-6xl mx-auto space-y-6">
        {successMsg && (
          <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm border border-green-200 dark:border-green-800 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-800">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Левая панель — настройки */}
          <div className="lg:col-span-2 space-y-6">
            {/* Пресеты */}
            <div className="card">
              <h3 className="text-base font-semibold text-app mb-3">Готовые темы</h3>
              <p className="text-xs text-muted mb-4">Выберите готовый набор цветов или настройте вручную</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_THEMES.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset.tokens)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-app text-sm text-app hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div
                      className="w-5 h-5 rounded-full border border-app shadow-xs"
                      style={{ backgroundColor: preset.tokens.primaryColor }}
                    />
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Цвета */}
            <div className="card">
              <h3 className="text-base font-semibold text-app mb-4">Цвета</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'primaryColor' as const, label: 'Основной цвет', desc: 'Кнопки, ссылки, акценты' },
                  { key: 'secondaryColor' as const, label: 'Вторичный цвет', desc: 'Hover-состояния, тёмные акценты' },
                  { key: 'backgroundColor' as const, label: 'Цвет фона', desc: 'Основной фон страницы' },
                  { key: 'textColor' as const, label: 'Цвет текста', desc: 'Основной текст' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center gap-3 p-3 rounded-lg border border-app">
                    <input
                      type="color"
                      value={form[item.key]}
                      onChange={(e) => handleColorChange(item.key, e.target.value)}
                      className="w-10 h-10 rounded-lg border border-app cursor-pointer p-0.5 bg-transparent"
                    />
                    <div className="flex-1 min-w-0">
                      <label className="text-sm font-medium text-app">{item.label}</label>
                      <p className="text-xs text-muted">{item.desc}</p>
                      <input
                        type="text"
                        value={form[item.key]}
                        onChange={(e) => handleColorChange(item.key, e.target.value)}
                        className="w-full text-xs text-app bg-transparent border-b border-app outline-none mt-1 font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Шрифт и скругления */}
            <div className="card">
              <h3 className="text-base font-semibold text-app mb-4">Типографика и форма</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-app mb-1.5">Шрифт</label>
                  <select
                    value={form.fontFamily}
                    onChange={(e) => setForm((prev) => ({ ...prev, fontFamily: e.target.value }))}
                    className="select w-full"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-app mb-1.5">Скругление углов</label>
                  <select
                    value={form.borderRadius}
                    onChange={(e) => setForm((prev) => ({ ...prev, borderRadius: e.target.value }))}
                    className="select w-full"
                  >
                    {BORDER_RADIUS_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={isLoading || mutation.isPending}
                className="btn-primary px-6"
              >
                {mutation.isPending ? 'Сохранение...' : 'Сохранить дизайн-токены'}
              </button>
            </div>
          </div>

          {/* Правая панель — live preview */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="text-base font-semibold text-app mb-3">Предпросмотр</h3>
              <div
                className="rounded-xl border border-app overflow-hidden"
                style={{
                  backgroundColor: form.backgroundColor,
                  color: form.textColor,
                  fontFamily: form.fontFamily,
                }}
              >
                {/* Preview header */}
                <div
                  className="px-4 py-3 border-b"
                  style={{ borderColor: `${form.primaryColor}33` }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: form.primaryColor }}
                    >
                      I
                    </div>
                    <span className="font-bold text-sm">AVERON</span>
                  </div>
                </div>

                {/* Preview body */}
                <div className="p-4 space-y-3">
                  <h4 className="font-bold text-sm">Найдите жильё мечты</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Поиск по городу..."
                      readOnly
                      className="flex-1 px-3 py-2 text-xs rounded-lg border bg-transparent outline-none"
                      style={{ borderColor: `${form.primaryColor}44` }}
                    />
                    <button
                      className="px-4 py-2 text-xs font-semibold text-white rounded-lg"
                      style={{
                        backgroundColor: form.primaryColor,
                        borderRadius: form.borderRadius,
                      }}
                    >
                      Найти
                    </button>
                  </div>

                  {/* Preview card */}
                  <div
                    className="border p-3 space-y-2"
                    style={{
                      borderColor: `${form.secondaryColor}33`,
                      borderRadius: form.borderRadius,
                    }}
                  >
                    <div className="w-full h-16 bg-stone-200 dark:bg-white/10 rounded-lg flex items-center justify-center text-xs opacity-50">
                      📷 Фото
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs">2-комн. квартира</div>
                        <div className="text-[10px] opacity-60">Ташкент, Юнусабад</div>
                      </div>
                      <div className="font-bold text-xs" style={{ color: form.primaryColor }}>
                        $400/мес
                      </div>
                    </div>
                  </div>

                  {/* Preview button */}
                  <button
                    className="w-full py-2 text-xs font-semibold text-white"
                    style={{
                      backgroundColor: form.secondaryColor,
                      borderRadius: form.borderRadius,
                    }}
                  >
                    Смотреть все
                  </button>
                </div>
              </div>
            </div>

            {/* CSS Variables reference */}
            <div className="card">
              <h3 className="text-sm font-semibold text-app mb-2">CSS-переменные</h3>
              <p className="text-xs text-muted mb-3">
                Эти переменные применяются через <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">:root</code> на сайте
              </p>
              <pre className="text-[10px] text-muted font-mono bg-gray-50 dark:bg-white/5 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
{`:root {
  --color-primary: ${form.primaryColor};
  --color-secondary: ${form.secondaryColor};
  --color-bg: ${form.backgroundColor};
  --color-text: ${form.textColor};
  --border-radius: ${form.borderRadius};
  --font-family: ${form.fontFamily};
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AppearanceSettingsPage;
