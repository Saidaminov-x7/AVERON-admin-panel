// src/pages/StaffPage.tsx
// Управление сотрудниками и ролями администраторов платформы

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Trash2,
  Edit2,
  Mail,
  Phone,
  Calendar,
  Lock,
  History,
} from 'lucide-react';
import Layout from '../components/Layout';
import { useAuthStore, type AdminRoleType } from '../store/authStore';
import {
  getStaffListApi,
  addStaffApi,
  updateStaffRoleApi,
  revokeStaffApi,
} from '../lib/staffApi';
import { getAuditLogsApi, type AuditLogItem } from '../lib/auditLogApi';
import {
  Button,
  Modal,
  Input,
  Select,
  Badge,
  Card,
  ConfirmDialog,
  EmptyState,
  Tabs,
} from '../components/ui';

const ROLE_OPTIONS = [
  { value: 'SUPER_ADMIN', label: 'Супер-администратор (Полный доступ)' },
  { value: 'ADMIN', label: 'Администратор (Управление страницами и каталогом)' },
  { value: 'MODERATOR', label: 'Модератор (Проверка объявлений и пользователей)' },
  { value: 'SUPPORT', label: 'Поддержка (Чат и ответы на запросы)' },
];

export const StaffPage: React.FC = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<'staff' | 'audit'>('staff');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);

  // Form state
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<AdminRoleType>('MODERATOR');

  const { data: staffList = [], isLoading: isStaffLoading, refetch: refetchStaff } = useQuery({
    queryKey: ['admin-staff'],
    queryFn: getStaffListApi,
  });

  const { data: auditLogs = [], isLoading: isAuditLoading, refetch: refetchAudit } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => getAuditLogsApi(),
    enabled: activeTab === 'audit',
  });

  const addMutation = useMutation({
    mutationFn: addStaffApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
      setIsAddModalOpen(false);
      resetForm();
      toast.success('Сотрудник успешно добавлен');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Ошибка добавления сотрудника');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AdminRoleType }) =>
      updateStaffRoleApi(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
      setEditingStaff(null);
      toast.success('Роль сотрудника обновлена');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Ошибка изменения роли');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeStaffApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
      setRevokeConfirmId(null);
      toast.success('Доступ сотрудника отозван');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Ошибка отзыва доступа');
    },
  });

  const resetForm = () => {
    setFormEmail('');
    setFormName('');
    setFormPhone('');
    setFormPassword('');
    setFormRole('MODERATOR');
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim()) {
      toast.error('Укажите email сотрудника');
      return;
    }
    addMutation.mutate({
      email: formEmail.trim(),
      adminRole: formRole,
      name: formName.trim() || undefined,
      phone: formPhone.trim() || undefined,
      password: formPassword.trim() || undefined,
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'danger';
      case 'ADMIN':
        return 'primary';
      case 'MODERATOR':
        return 'info';
      default:
        return 'neutral';
    }
  };

  const tabs = [
    { id: 'staff' as const, label: 'Команда сотрудников', icon: <Shield size={16} /> },
    { id: 'audit' as const, label: 'Журнал аудита действий', icon: <History size={16} /> },
  ];

  const isSuperAdmin = currentUser?.adminRole === 'SUPER_ADMIN';

  return (
    <Layout title="Сотрудники и роли">
      <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-app tracking-tight flex items-center gap-2.5">
              <span>Сотрудники и права доступа</span>
              <Badge variant="primary" size="sm">
                {staffList.length} сотрудников
              </Badge>
            </h1>
            <p className="text-xs text-muted mt-0.5">
              Разграничение прав (RBAC), приглашение администраторов и аудит операций
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTab === 'staff') refetchStaff();
                else refetchAudit();
              }}
              icon={<RotateCcw size={14} />}
            >
              Обновить
            </Button>
            {isSuperAdmin && activeTab === 'staff' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
                icon={<UserPlus size={16} />}
              >
                Добавить сотрудника
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab)}
          variant="segmented"
          size="md"
        />

        {/* Tab 1: Staff list */}
        {activeTab === 'staff' && (
          <div className="space-y-4">
            {isStaffLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-2xl bg-surface border border-app animate-pulse" />
                ))}
              </div>
            ) : staffList.length === 0 ? (
              <EmptyState
                icon={<ShieldAlert size={32} />}
                title="Сотрудники не найдены"
                description="Добавьте первого сотрудника для делегирования задач администрирования"
                actionLabel="Добавить сотрудника"
                onAction={() => setIsAddModalOpen(true)}
              />
            ) : (
              <div className="space-y-3">
                {staffList.map((member) => {
                  const isSelf = member.id === currentUser?.id;

                  return (
                    <Card
                      key={member.id}
                      padding="sm"
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-bold text-base">
                          {member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-app truncate">
                              {member.name || 'Без имени'}
                            </h4>
                            {isSelf && (
                              <span className="text-[10px] bg-primary-500/10 text-primary-600 px-2 py-0.5 rounded-md font-semibold">
                                Это вы
                              </span>
                            )}
                            <Badge variant={getRoleBadgeVariant(member.adminRole || 'SUPPORT')} size="sm">
                              {member.adminRole || 'SUPPORT'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Mail size={12} /> {member.email}
                            </span>
                            {member.phone && (
                              <span className="flex items-center gap-1">
                                <Phone size={12} /> {member.phone}
                              </span>
                            )}
                            {member.createdAt && (
                              <span className="flex items-center gap-1">
                                <Calendar size={12} /> {new Date(member.createdAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isSuperAdmin && !isSelf && (
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingStaff(member);
                              setFormRole(member.adminRole as AdminRoleType);
                            }}
                            icon={<Edit2 size={14} />}
                          >
                            Изменить роль
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRevokeConfirmId(member.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                            title="Отозвать доступ"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Audit Logs */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            {isAuditLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 rounded-2xl bg-surface border border-app animate-pulse" />
                ))}
              </div>
            ) : auditLogs.length === 0 ? (
              <EmptyState
                icon={<History size={32} />}
                title="Журнал пуст"
                description="Здесь будут логироваться все действия сотрудников (изменения страниц, блокировки, модерация)"
              />
            ) : (
              <div className="rounded-2xl border border-app bg-surface overflow-hidden divide-y divide-app">
                {auditLogs.map((log: AuditLogItem) => (
                  <div key={log.id} className="p-3.5 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/5 text-muted font-mono shrink-0">
                        <ShieldCheck size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-app truncate">
                          {log.action} • {log.resource || 'SYSTEM'}
                        </p>
                        <p className="text-muted text-[11px] truncate mt-0.5">
                          {log.meta ? JSON.stringify(log.meta) : 'Без деталей'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted font-mono shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Staff Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Добавить сотрудника"
          subtitle="Создайте аккаунт администратора или назначьте права существующему пользователю"
          size="md"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="ghost" size="sm" onClick={() => setIsAddModalOpen(false)}>
                Отмена
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddSubmit}
                loading={addMutation.isPending}
                icon={<UserPlus size={14} />}
              >
                Сохранить
              </Button>
            </div>
          }
        >
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <Input
              label="Email сотрудника *"
              type="email"
              required
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="admin@ijarauz.uz"
              leftIcon={<Mail size={16} />}
            />

            <Input
              label="Имя и фамилия"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Фарход Каримов"
            />

            <Input
              label="Номер телефона"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="+998 90 123-45-67"
              leftIcon={<Phone size={16} />}
            />

            <Input
              label="Пароль (если создаётся новый аккаунт)"
              type="password"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              placeholder="Минимум 8 символов..."
              leftIcon={<Lock size={16} />}
            />

            <Select
              label="Роль сотрудника в системе *"
              options={ROLE_OPTIONS}
              value={formRole}
              onChange={(val) => setFormRole(val as AdminRoleType)}
            />
          </form>
        </Modal>

        {/* Change Role Modal */}
        {editingStaff && (
          <Modal
            isOpen={!!editingStaff}
            onClose={() => setEditingStaff(null)}
            title={`Изменение роли: ${editingStaff.name || editingStaff.email}`}
            size="md"
            footer={
              <div className="flex justify-end gap-2 w-full">
                <Button variant="ghost" size="sm" onClick={() => setEditingStaff(null)}>
                  Отмена
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    updateRoleMutation.mutate({
                      id: editingStaff.id,
                      role: formRole,
                    });
                  }}
                  loading={updateRoleMutation.isPending}
                >
                  Обновить роль
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <Select
                label="Выберите новую роль"
                options={ROLE_OPTIONS}
                value={formRole}
                onChange={(val) => setFormRole(val as AdminRoleType)}
              />
            </div>
          </Modal>
        )}

        {/* Revoke Confirm Dialog */}
        <ConfirmDialog
          isOpen={!!revokeConfirmId}
          onClose={() => setRevokeConfirmId(null)}
          onConfirm={() => {
            if (revokeConfirmId) revokeMutation.mutate(revokeConfirmId);
          }}
          title="Отозвать права доступа?"
          message="Сотрудник потеряет доступ к панели управления ijarauz. Его аккаунт больше не сможет входить в админ-панель."
          confirmLabel="Отозвать доступ"
          variant="danger"
          loading={revokeMutation.isPending}
        />
      </div>
    </Layout>
  );
};

export default StaffPage;
