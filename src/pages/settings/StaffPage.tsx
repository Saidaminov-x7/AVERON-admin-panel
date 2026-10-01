// src/pages/settings/StaffPage.tsx
// Управление сотрудниками и ролями административной панели (доступно только для SUPER_ADMIN)

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { Button, Modal } from '../../components/ui';
import {
  getStaffListApi,
  addStaffApi,
  updateStaffRoleApi,
  revokeStaffApi,
} from '../../lib/staffApi';
import { useAuthStore } from '../../store/authStore';
import type { AdminRoleType } from '../../store/authStore';

const roleLabels: Record<AdminRoleType, { label: string; color: string; desc: string }> = {
  SUPER_ADMIN: {
    label: 'Супер Администратор',
    color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
    desc: 'Полный доступ ко всей системе, сотрудникам и настройкам',
  },
  ADMIN: {
    label: 'Администратор',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
    desc: 'Модерация, пользователи, аналитика, конструктор страниц',
  },
  MODERATOR: {
    label: 'Модератор',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
    desc: 'Одобрение/отклонение объявлений, просмотр пользователей',
  },
  SUPPORT: {
    label: 'Поддержка',
    color: 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-200',
    desc: 'Только чтение (read-only) объявлений и пользователей',
  },
};

const StaffPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);

  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: getStaffListApi,
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<AdminRoleType>('ADMIN');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [modalError, setModalError] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Мутация: добавление сотрудника
  const addMutation = useMutation({
    mutationFn: addStaffApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
      setIsAddModalOpen(false);
      setEmail('');
      setName('');
      setPassword('');
      setFeedbackMsg(t('common.saved', 'Сотрудник успешно добавлен'));
      setTimeout(() => setFeedbackMsg(''), 3000);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      setModalError(error.response?.data?.message || 'Ошибка добавления сотрудника');
    },
  });

  // Мутация: сменить роль
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AdminRoleType }) =>
      updateStaffRoleApi(id, { adminRole: role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
      setFeedbackMsg(t('common.saved', 'Роль сотрудника обновлена'));
      setTimeout(() => setFeedbackMsg(''), 3000);
    },
  });

  // Мутация: отозвать доступ
  const revokeMutation = useMutation({
    mutationFn: revokeStaffApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
      setFeedbackMsg(t('common.saved', 'Доступ сотрудника отозван'));
      setTimeout(() => setFeedbackMsg(''), 3000);
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    addMutation.mutate({
      email,
      adminRole: selectedRole,
      name: name || undefined,
      password: password || undefined,
    });
  };

  const handleRevoke = (id: string, staffName: string) => {
    if (confirm(`Вы действительно хотите отозвать доступ в панель у сотрудника "${staffName}"?`)) {
      revokeMutation.mutate(id);
    }
  };

  return (
    <Layout title={t('nav.staff', 'Сотрудники и роли')}>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {feedbackMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-sm border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {feedbackMsg}
          </div>
        )}

        {/* Информационная плашка и кнопка добавления */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-app">{t('nav.staff', 'Администраторы и персонал')}</h2>
            <p className="text-xs text-muted mt-0.5">
              Управление правами доступа к модулям админ-панели. Доступно исключительно Супер-Администратору.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary flex items-center gap-2 flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('common.add', 'Добавить сотрудника')}
          </button>
        </div>

        {/* Таблица сотрудников */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-white/5 border-b border-app text-xs uppercase text-muted font-semibold">
                <tr>
                  <th className="px-6 py-3.5">{t('users.name', 'Сотрудник')}</th>
                  <th className="px-6 py-3.5">{t('users.role', 'Роль в панели')}</th>
                  <th className="px-6 py-3.5">{t('users.lastActive', 'Последний вход')}</th>
                  <th className="px-6 py-3.5">{t('users.registeredAt', 'Дата добавления')}</th>
                  <th className="px-6 py-3.5 text-right">{t('common.actions', 'Действия')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted">
                      {t('common.loading', 'Загрузка списка сотрудников...')}
                    </td>
                  </tr>
                ) : staffList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted">
                      {t('users.userNotFound', 'Сотрудники не найдены')}
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff) => {
                    const role = (staff.adminRole || 'SUPPORT') as AdminRoleType;
                    const roleMeta = roleLabels[role] || roleLabels.SUPPORT;
                    const isSelf = staff.id === currentUser?.id;
                    const isPrimarySuperAdmin = staff.email === 'vosilhojasaidaminov@gmail.com';

                    return (
                      <tr key={staff.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {staff.avatar ? (
                              <img
                                src={staff.avatar}
                                alt={staff.name}
                                className="w-9 h-9 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold text-xs">
                                {staff.name ? staff.name[0].toUpperCase() : 'A'}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-app flex items-center gap-1.5">
                                {staff.name}
                                {isSelf && (
                                  <span className="text-[10px] bg-gray-100 dark:bg-white/10 px-1.5 py-0.2 rounded text-muted">
                                    Вы
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted font-mono">{staff.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {isPrimarySuperAdmin ? (
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${roleMeta.color}`}>
                              {roleMeta.label}
                            </span>
                          ) : (
                            <select
                              value={role}
                              onChange={(e) =>
                                updateRoleMutation.mutate({
                                  id: staff.id,
                                  role: e.target.value as AdminRoleType,
                                })
                              }
                              disabled={updateRoleMutation.isPending}
                              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-app bg-surface text-app cursor-pointer outline-none"
                            >
                              <option value="ADMIN">Администратор</option>
                              <option value="MODERATOR">Модератор</option>
                              <option value="SUPPORT">Поддержка</option>
                              <option value="SUPER_ADMIN">Супер-Админ</option>
                            </select>
                          )}
                        </td>

                        <td className="px-6 py-4 text-xs text-muted font-mono">
                          {staff.lastLoginAt ? new Date(staff.lastLoginAt).toLocaleString('ru-RU') : 'Никогда'}
                        </td>

                        <td className="px-6 py-4 text-xs text-muted font-mono">
                          {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString('ru-RU') : '—'}
                        </td>

                        <td className="px-6 py-4 text-right">
                          {isPrimarySuperAdmin || isSelf ? (
                            <span className="text-xs text-muted italic">—</span>
                          ) : (
                            <button
                              onClick={() => handleRevoke(staff.id, staff.name)}
                              disabled={revokeMutation.isPending}
                              className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium cursor-pointer"
                            >
                              {t('users.block', 'Отозвать доступ')}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Описание уровней доступа */}
        <div className="card">
          <h3 className="text-sm font-bold text-app mb-3">Иерархия уровней доступа</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.entries(roleLabels) as [AdminRoleType, (typeof roleLabels)[AdminRoleType]][]).map(
              ([key, meta]) => (
                <div key={key} className="p-3.5 rounded-xl border border-app bg-gray-50/50 dark:bg-white/5 space-y-1.5">
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${meta.color}`}>
                    {meta.label}
                  </span>
                  <p className="text-xs text-muted leading-relaxed">{meta.desc}</p>
                </div>
              ),
            )}
          </div>
        </div>

        {/* Модальное окно добавления администратора */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title={t('common.add', 'Добавить сотрудника')}
          size="md"
          fullscreenOnMobile
          closeLabel={t('common.close', 'Закрыть')}
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} disabled={addMutation.isPending}>
                {t('common.cancel', 'Отмена')}
              </Button>
              <Button type="submit" form="staff-add-form" loading={addMutation.isPending}>
                {t('common.save', 'Назначить права')}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs border border-red-200 dark:border-red-800">
                  {modalError}
                </div>
              )}

              <form id="staff-add-form" onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-app mb-1">
                    Email пользователя *
                  </label>
                  <input
                    type="email"
                    placeholder="colleague@averon.uz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input"
                  />
                  <p className="text-[11px] text-muted mt-1">
                    Если аккаунт уже зарегистрирован на сайте — ему будет назначена выбранная роль. Если нет — аккаунт будет создан.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-app mb-1">
                    Назначаемая роль *
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as AdminRoleType)}
                    className="input cursor-pointer"
                  >
                    <option value="ADMIN">Администратор (Модерация, пользователи, CMS)</option>
                    <option value="MODERATOR">Модератор (Проверка объявлений)</option>
                    <option value="SUPPORT">Поддержка (Read-only просмотр)</option>
                    <option value="SUPER_ADMIN">Супер Администратор (Полный доступ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-app mb-1">
                    Имя (для нового пользователя)
                  </label>
                  <input
                    type="text"
                    placeholder="Алишер К."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-app mb-1">
                    Пароль (для нового пользователя)
                  </label>
                  <input
                    type="password"
                    placeholder="Password123!"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                  />
                </div>

              </form>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default StaffPage;
