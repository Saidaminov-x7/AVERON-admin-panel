// src/pages/ProfilePage.tsx
// Страница профиля администратора

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuthStore } from '../store/authStore';
import {
  getProfileApi,
  updateProfileApi,
  changePasswordApi,
  uploadMediaApi,
} from '../lib/profileApi';
import { logoutApi } from '../lib/authApi';
import { AdminSecuritySection } from '../components/security/AdminSecuritySection';

const roleTitles: Record<string, string> = {
  SUPER_ADMIN: 'Супер Администратор',
  ADMIN: 'Администратор',
  MODERATOR: 'Модератор',
  SUPPORT: 'Специалист поддержки',
};

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { updateUser, logout } = useAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['admin', 'profile'],
    queryFn: getProfileApi,
  });

  // Состояния формы профиля
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Синхронизируем начальные данные
  React.useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setAvatar(profile.avatar || null);
    }
  }, [profile]);

  // Состояния формы смены пароля
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Мутация обновления профиля
  const updateProfileMutation = useMutation({
    mutationFn: updateProfileApi,
    onSuccess: (updated) => {
      updateUser(updated);
      queryClient.invalidateQueries({ queryKey: ['admin', 'profile'] });
      setProfileSuccess('Профиль успешно обновлён');
      setProfileError('');
      setTimeout(() => setProfileSuccess(''), 3000);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      setProfileError(error.response?.data?.message || 'Ошибка при обновлении профиля');
    },
  });

  // Мутация смены пароля
  const changePasswordMutation = useMutation({
    mutationFn: changePasswordApi,
    onSuccess: () => {
      setPasswordSuccess('Пароль успешно изменён');
      setPasswordError('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 3000);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      setPasswordError(error.response?.data?.message || 'Ошибка при смене пароля');
    },
  });

  // Загрузка аватара
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setProfileError('');
    try {
      const result = await uploadMediaApi(file);
      setAvatar(result.url);
      updateProfileMutation.mutate({ name, avatar: result.url });
    } catch {
      setProfileError('Ошибка при загрузке аватара');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    updateProfileMutation.mutate({ name, avatar });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Новые пароли не совпадают');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Новый пароль должен содержать минимум 6 символов');
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // Игнорируем ошибку
    } finally {
      logout();
      navigate('/login');
    }
  };

  if (isLoading) {
    return (
      <Layout title="Профиль">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="card h-48 animate-pulse bg-gray-100 dark:bg-white/5" />
          <div className="card h-64 animate-pulse bg-gray-100 dark:bg-white/5" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Профиль администратора">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Карточка информации о роли и статусе */}
        <div className="card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  className="w-20 h-20 rounded-2xl object-cover ring-4 ring-primary-500/20"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-primary-500 flex items-center justify-center text-white text-2xl font-bold">
                  {name ? name[0].toUpperCase() : 'A'}
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-surface border border-app shadow-md cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 text-muted hover:text-app transition-all"
                title="Загрузить новое фото"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={isUploading}
                className="hidden"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-app">{profile?.name}</h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400">
                  {roleTitles[profile?.adminRole || 'SUPER_ADMIN'] || 'Администратор'}
                </span>
              </div>
              <p className="text-sm text-muted mt-0.5">{profile?.email}</p>
              <div className="flex items-center gap-4 text-xs text-muted mt-2">
                <span>
                  Вход:{' '}
                  {profile?.lastLoginAt
                    ? new Date(profile.lastLoginAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Не зафиксирован'}
                </span>
                <span>
                  Регистрация:{' '}
                  {profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString('ru-RU')
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer self-stretch sm:self-center"
          >
            Выйти из аккаунта
          </button>
        </div>

        {/* Секция изменения имени и данных */}
        <div className="card">
          <h3 className="text-base font-semibold text-app mb-4">Основные данные</h3>
          {profileSuccess && (
            <div className="p-3 mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm border border-green-200 dark:border-green-800">
              {profileSuccess}
            </div>
          )}
          {profileError && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-800">
              {profileError}
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-app mb-1.5">Имя</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app mb-1.5">Email (только чтение)</label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="input bg-gray-100 dark:bg-white/5 opacity-70 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app mb-1.5">Телефон</label>
              <input
                type="text"
                value={profile?.phone || ''}
                disabled
                className="input bg-gray-100 dark:bg-white/5 opacity-70 cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={updateProfileMutation.isPending || isUploading}
              className="btn-primary"
            >
              {updateProfileMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </form>
        </div>

        <AdminSecuritySection />

        {/* Секция смены пароля */}
        <div className="card">
          <h3 className="text-base font-semibold text-app mb-4">Смена пароля</h3>
          {passwordSuccess && (
            <div className="p-3 mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm border border-green-200 dark:border-green-800">
              {passwordSuccess}
            </div>
          )}
          {passwordError && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-800">
              {passwordError}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-app mb-1.5">Текущий пароль</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app mb-1.5">Новый пароль</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app mb-1.5">Подтверждение нового пароля</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="input"
              />
            </div>

            <button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="btn-primary"
            >
              {changePasswordMutation.isPending ? 'Обновление...' : 'Обновить пароль'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;
