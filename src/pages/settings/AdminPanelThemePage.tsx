// src/pages/settings/AdminPanelThemePage.tsx
// Управление дизайн-токенами ПАНЕЛИ АДМИНИСТРАТОРА (не сайта!)
// API: GET/PATCH /admin/admin-theme

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import { api } from '../../lib/axios';

interface AdminThemeData {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: string;
  fontFamily: string;
}

const getAdminThemeApi = async (): Promise<AdminThemeData> => {
  const { data } = await api.get('/admin/admin-theme');
  return data;
};

const updateAdminThemeApi = async (dto: Partial<AdminThemeData>): Promise<AdminThemeData> => {
  const { data } = await api.patch('/admin/admin-theme', dto);
  return data;
};

const PRESET_THEMES: { name: string; tokens: Partial<AdminThemeData> }[] = [
  {
    name: 'Синий (по умолчанию)',
    tokens: { primaryColor: '#2563eb', secondaryColor: '#1d4ed8', backgroundColor: '#0f0f0f', textColor: '#f1f5f9' },
  },
  {
    name: 'Индиго',
    tokens: { primaryColor: '#6366f1', secondaryColor: '#4338ca', backgroundColor: '#0f0f1a', textColor: '#f1f5f9' },
  },
  {
    name: 'Изумрудный',
    tokens: { primaryColor: '#10b981', secondaryColor: '#059669', backgroundColor: '#0a0f0d', textColor: '#f1f5f9' },
  },
  {
    name: 'Роза',
    tokens: { primaryColor: '#f43f5e', secondaryColor: '#e11d48', backgroundColor: '#0f0a0c', textColor: '#f1f5f9' },
  },
  {
    name: 'Янтарный',
    tokens: { primaryColor: '#f59e0b', secondaryColor: '#d97706', backgroundColor: '#0f0d08', textColor: '#f1f5f9' },
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

const AdminPanelThemePage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin', 'admin-theme'],
    queryFn: getAdminThemeApi,
  });

  const [form, setForm] = useState<AdminThemeData>({
    primaryColor: '#2563eb',
    secondaryColor: '#1d4ed8',
    backgroundColor: '#0f0f0f',
    textColor: '#f1f5f9',
    borderRadius: '0.5rem',
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
    mutationFn: updateAdminThemeApi,
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin', 'admin-theme'], updated);
      setForm(updated);
      setSuccessMsg('Тема панели успешно обновлена');
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 3000);

      // Применяем тему сразу после сохранения — без ожидания перезагрузки
      const root = document.documentElement;
      root.style.setProperty('--color-primary', updated.primaryColor);
      root.style.setProperty('--color-primary-hover', updated.secondaryColor);
      root.style.setProperty('--radius', updated.borderRadius);
      root.style.setProperty('--border-radius', updated.borderRadius);
      if (updated.fontFamily) {
        root.style.setProperty('--font-family', updated.fontFamily);
        document.body.style.fontFamily = updated.fontFamily;
      }
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(error.response?.data?.message || 'Ошибка сохранения темы панели');
    },
  });

  // Цвет изменяется только в form-состоянии (для preview). 
  // Реальное применение происходит только после onSuccess (через AdminThemeInjector или mutation.onSuccess)
  const handleColorChange = (key: keyof AdminThemeData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setSuccessMsg('');
    setErrorMsg('');
    mutation.mutate(form);
  };

  const applyPreset = (preset: Partial<AdminThemeData>) => {
    setForm((prev) => ({ ...prev, ...preset }));
  };

  return (
    <Layout title="Тема панели администратора">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Инфо-баннер */}
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm flex items-start gap-3">
          <svg className="shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <p className="font-semibold">Тема панели администратора</p>
            <p className="text-xs mt-0.5 opacity-80">
              Эти настройки управляют цветовой схемой <strong>самой административной панели</strong> — сайдбара, кнопок, акцентов.
              Тема сайта настраивается отдельно в разделе «Тема сайта».
            </p>
          </div>
        </div>

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
                  { key: 'primaryColor' as const, label: 'Основной цвет', desc: 'Активные пункты меню, кнопки, акценты' },
                  { key: 'secondaryColor' as const, label: 'Вторичный цвет', desc: 'Hover-состояния, тёмные акценты' },
                  { key: 'backgroundColor' as const, label: 'Цвет фона', desc: 'Только для предпросмотра (фактический фон задаётся CSS-темой)' },
                  { key: 'textColor' as const, label: 'Цвет текста', desc: 'Только для предпросмотра' },
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
                {mutation.isPending ? 'Сохранение...' : 'Сохранить тему панели'}
              </button>
            </div>
          </div>

          {/* Правая панель — live preview */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="text-base font-semibold text-app mb-3">Предпросмотр</h3>
              <p className="text-xs text-muted mb-3">Тема применяется ко всей панели после сохранения</p>
              {/* Мини-превью сайдбара */}
              <div
                className="rounded-xl border border-app overflow-hidden"
                style={{ fontFamily: form.fontFamily }}
              >
                {/* Sidebar preview */}
                <div className="flex h-48">
                  <div
                    className="w-14 flex flex-col items-center py-3 gap-2 border-r"
                    style={{ backgroundColor: '#111111', borderColor: '#2a2a2a' }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: form.primaryColor }}
                    >
                      I
                    </div>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex flex-col items-center gap-0.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={i === 1
                            ? { backgroundColor: form.primaryColor }
                            : { backgroundColor: 'transparent' }
                          }
                        >
                          <div className="w-3.5 h-3.5 rounded-sm opacity-70" style={{ backgroundColor: i === 1 ? 'white' : '#666' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Content preview */}
                  <div className="flex-1 p-3" style={{ backgroundColor: '#141824' }}>
                    <div className="text-white text-xs font-semibold mb-2">Дашборд</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="rounded-lg p-2" style={{ backgroundColor: '#1e1e1e' }}>
                          <div className="text-[10px] text-gray-400">Метрика {i}</div>
                          <div
                            className="text-sm font-bold mt-0.5"
                            style={{ color: i === 1 ? form.primaryColor : '#f9fafb' }}
                          >
                            {i * 124}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      className="mt-2 w-full py-1.5 text-[10px] font-semibold text-white rounded-lg"
                      style={{ backgroundColor: form.primaryColor, borderRadius: form.borderRadius }}
                    >
                      Действие
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* CSS Variables reference */}
            <div className="card">
              <h3 className="text-sm font-semibold text-app mb-2">CSS-переменные</h3>
              <p className="text-xs text-muted mb-3">
                Применяются через <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">:root</code> на все компоненты панели
              </p>
              <pre className="text-[10px] text-muted font-mono bg-gray-50 dark:bg-white/5 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
{`:root {
  --color-primary: ${form.primaryColor};
  --color-primary-hover: ${form.secondaryColor};
  --radius: ${form.borderRadius};
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

export default AdminPanelThemePage;
