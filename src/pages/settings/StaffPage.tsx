// src/pages/settings/StaffPage.tsx
// Управление сотрудниками и ролями административной панели (доступно только для SUPER_ADMIN)

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { Button, Modal, Select } from '../../components/ui';
import {
  getStaffListApi,
  addStaffApi,
  updateStaffRoleApi,
  revokeStaffApi,
} from '../../lib/staffApi';
import { useAuthStore } from '../../store/authStore';
import type { AdminRoleType } from '../../store/authStore';

const roleLabels: Record<AdminRoleType, { labelKey: string; color: string; descKey: string }> = {
  SUPER_ADMIN: {
    label: 'Супер Администратор',
    color: 'bg-surface-soft text-error dark:bg-surface-soft dark:text-error',
    desc: 'Полный доступ ко всей системе, сотрудникам и настройкам',
  },
  ADMIN: {
    label: 'Администратор',
    color: 'bg-surface-soft text-info dark:bg-surface-soft dark:text-info',
    desc: 'Модерация, пользователи, аналитика, конструктор страниц',
  },
  MODERATOR: {
    label: 'Модератор',
    color: 'bg-surface-soft text-info dark:bg-surface-soft dark:text-info',
    desc: 'Одобрение/отклонение объявлений, просмотр пользователей',
  },
  SUPPORT: {
    label: 'Поддержка',
    color: 'bg-surface-soft text-ink-soft dark:bg-white/10 dark:text-ink-soft',
    desc: 'Только чтение (read-only) объявлений и пользователей',
  },
};

const StaffPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
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
  const dateLocale = i18n.language?.startsWith('uz') ? 'uz-UZ' : i18n.language?.startsWith('en') ? 'en-US' : 'ru-RU';

  // Мутация: добавление сотрудника
  const addMutation = useMutation({
    mutationFn: addStaffApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
      setIsAddModalOpen(false);
      setEmail('');
      setName('');
      setPassword('');
      setFeedbackMsg(t('staffPage.addSuccess'));
      setTimeout(() => setFeedbackMsg(''), 3000);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      setModalError(error.response?.data?.message || t('staffPage.addError'));
    },
  });

  // Мутация: сменить роль
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AdminRoleType }) =>
      updateStaffRoleApi(id, { adminRole: role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
      setFeedbackMsg(t('staffPage.roleUpdated'));
      setTimeout(() => setFeedbackMsg(''), 3000);
    },
  });

  // Мутация: отозвать доступ
  const revokeMutation = useMutation({
    mutationFn: revokeStaffApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
      setFeedbackMsg(t('staffPage.accessRevoked'));
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
    if (confirm(t('staffPage.revokeConfirmation', { name: staffName }))) {
      revokeMutation.mutate(id);
    }
  };

  return (
    <Layout title={t('nav.staff', 'Сотрудники и роли')}>
      <div className="admin-page-full-width space-y-6 pb-12">
        {feedbackMsg && (
          <div className="p-4 rounded-2xl bg-surface-soft dark:bg-surface-soft text-success dark:text-success text-sm border border-line dark:border-line flex items-center gap-2">
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
            <p className="text-xs text-muted mt-1">
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
            {t('staffPage.addStaff')}
          </button>
        </div>

        {/* Таблица сотрудников */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-soft dark:bg-white/5 border-b border-app text-xs uppercase text-muted font-semibold">
                <tr>
                  <th className="px-6 py-4">{t('users.name', 'Сотрудник')}</th>
                  <th className="px-6 py-4">{t('users.role', 'Роль в панели')}</th>
                  <th className="px-6 py-4">{t('users.lastActive', 'Последний вход')}</th>
                  <th className="px-6 py-4">{t('users.registeredAt', 'Дата добавления')}</th>
                  <th className="px-6 py-4 text-right">{t('common.actions', 'Действия')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted">
                      {t('staffPage.loading')}
                    </td>
                  </tr>
                ) : staffList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted">
                      {t('staffPage.empty')}
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff) => {
                    const role = (staff.adminRole || 'SUPPORT') as AdminRoleType;
                    const roleMeta = roleLabels[role] || roleLabels.SUPPORT;
                    const isSelf = staff.id === currentUser?.id;
                    const isPrimarySuperAdmin = staff.email === 'vosilhojasaidaminov@gmail.com';

                    return (
                      <tr key={staff.id} className="hover:bg-surface-soft dark:hover:bg-white/5 transition-colors">
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
                              <div className="font-semibold text-app flex items-center gap-2">
                                {staff.name}
                                {isSelf && (
                                  <span className="text-[length:var(--font-size-caption)] bg-surface-soft dark:bg-white/10 px-2 py-1 rounded text-muted">
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
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${roleMeta.color}`}>
                              {roleMeta.label}
                            </span>
                          ) : (
                            <Select
                              value={role}
                              ariaLabel={t('staffPage.staffRole', { name: staff.name })}
                              onChange={(value) => {
                                if (!['ADMIN', 'MODERATOR', 'SUPPORT', 'SUPER_ADMIN'].includes(value)) return;
                                updateRoleMutation.mutate({
                                  id: staff.id,
                                  role: value as AdminRoleType,
                                });
                              }}
                              disabled={updateRoleMutation.isPending}
                              options={[
                                { value: 'ADMIN', label: t('staffPage.roles.admin') },
                                { value: 'MODERATOR', label: t('staffPage.roles.moderator') },
                                { value: 'SUPPORT', label: t('staffPage.roles.support') },
                                { value: 'SUPER_ADMIN', label: t('staffPage.roles.superAdminShort') },
                              ]}
                              className="text-xs font-semibold"
                            />
                          )}
                        </td>

                        <td className="px-6 py-4 text-xs text-muted font-mono">
                          {staff.lastLoginAt ? new Date(staff.lastLoginAt).toLocaleString(dateLocale) : t('staffPage.never')}
                        </td>

                        <td className="px-6 py-4 text-xs text-muted font-mono">
                          {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString(dateLocale) : '—'}
                        </td>

                        <td className="px-6 py-4 text-right">
                          {isPrimarySuperAdmin || isSelf ? (
                            <span className="text-xs text-muted italic">—</span>
                          ) : (
                            <button
                              onClick={() => handleRevoke(staff.id, staff.name)}
                              disabled={revokeMutation.isPending}
                              className="text-xs text-error dark:text-error hover:underline font-medium cursor-pointer"
                            >
                              {t('staffPage.revokeAccess')}
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
          <h3 className="text-sm font-bold text-app mb-3">{t('staffPage.roleHierarchy')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.entries(roleLabels) as [AdminRoleType, (typeof roleLabels)[AdminRoleType]][]).map(
              ([key, meta]) => (
                <div key={key} className="p-4 rounded-xl border border-app bg-surface-soft dark:bg-white/5 space-y-2">
                  <span className={`inline-block px-2 py-1 rounded text-[length:var(--font-size-caption)] font-bold ${meta.color}`}>
                    {meta.label}
                  </span>
                  <p className="text-xs text-muted leading-relaxed">{t(`staffPage.roles.${meta.descKey}`)}</p>
                </div>
              ),
            )}
          </div>
        </div>

        {/* Модальное окно добавления администратора */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title={t('staffPage.addStaff')}
          size="md"
          fullscreenOnMobile
          closeLabel={t('common.close', 'Закрыть')}
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} disabled={addMutation.isPending}>
                {t('common.cancel', 'Отмена')}
              </Button>
              <Button type="submit" form="staff-add-form" loading={addMutation.isPending}>
                {t('staffPage.assignRole')}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-surface-soft dark:bg-surface-soft text-error dark:text-error text-xs border border-line dark:border-line">
                  {modalError}
                </div>
              )}

              <form id="staff-add-form" onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label htmlFor="staff-add-email" className="block text-xs font-semibold text-app mb-1">
                    {t('staffPage.email')} *
                  </label>
                  <input
                    id="staff-add-email"
                    type="email"
                    placeholder="colleague@averon.uz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input"
                  />
                  <p className="text-[length:var(--font-size-caption)] text-muted mt-1">
                    Если аккаунт уже зарегистрирован на сайте — ему будет назначена выбранная роль. Если нет — аккаунт будет создан.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-app mb-1">
                    {t('staffPage.assignedRole')} *
                  </label>
                  <Select
                    value={selectedRole}
                    ariaLabel={t('staffPage.assignedRole')}
                    onChange={(value) => {
                      if (['ADMIN', 'MODERATOR', 'SUPPORT', 'SUPER_ADMIN'].includes(value)) {
                        setSelectedRole(value as AdminRoleType);
                      }
                    }}
                    options={[
                      { value: 'ADMIN', label: t('staffPage.roleOptions.admin') },
                      { value: 'MODERATOR', label: t('staffPage.roleOptions.moderator') },
                      { value: 'SUPPORT', label: t('staffPage.roleOptions.support') },
                      { value: 'SUPER_ADMIN', label: t('staffPage.roleOptions.superAdmin') },
                    ]}
                    className="input"
                  />
                </div>

                <div>
                  <label htmlFor="staff-add-name" className="block text-xs font-semibold text-app mb-1">
                    {t('staffPage.nameForNewUser')}
                  </label>
                  <input
                    id="staff-add-name"
                    type="text"
                    placeholder={t('staffPage.namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                  />
                </div>

                <div>
                  <label htmlFor="staff-add-password" className="block text-xs font-semibold text-app mb-1">
                    {t('staffPage.passwordForNewUser')}
                  </label>
                  <input
                    id="staff-add-password"
                    type="password"
                    placeholder={t('staffPage.passwordPlaceholder')}
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
