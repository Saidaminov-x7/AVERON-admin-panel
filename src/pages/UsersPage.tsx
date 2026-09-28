// src/pages/UsersPage.tsx
// Управление пользователями платформы с расширенными фильтрами, массовыми действиями и экспортом

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useDebounce } from '../hooks/useDebounce';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Download,
  RotateCcw,
  CheckSquare,
  Square,
  Users,
  Eye,
  Mail,
  Phone,
  Lock,
  Unlock,
  Trash2,
} from 'lucide-react';
import Layout from '../components/Layout';
import {
  getAdminUsersApi,
  blockUserApi,
  unblockUserApi,
  exportUsersApi,
  deleteUserApi,
  type UserRole,
  type AdminUser,
} from '../lib/usersApi';
import {
  Button,
  Modal,
  Input,
  Select,
  Textarea,
  Pagination,
  Badge,
  ConfirmDialog,
  EmptyState,
} from '../components/ui';

export const UsersPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const ROLE_OPTIONS = [
    { value: '', label: t('users.allRoles', 'Все роли') },
    { value: 'USER', label: `${t('users.buyers', 'Покупатели')} (USER)` },
    { value: 'ADMIN', label: `${t('users.administrators', 'Администраторы')} (ADMIN)` },
  ];

  const SORT_OPTIONS = [
    { value: 'createdAt-desc', label: t('users.newestFirst', 'Сначала новые') },
    { value: 'createdAt-asc', label: t('users.oldestFirst', 'Сначала старые') },
    { value: 'name-asc', label: 'По имени (А-Я)' },
    { value: 'listingsCount-desc', label: 'По количеству объявлений' },
  ];

  const roleFilter = (searchParams.get('role') as UserRole) || '';
  const sortOption = searchParams.get('sort') || 'createdAt-desc';
  const page = Number(searchParams.get('page')) || 1;
  const urlSearch = searchParams.get('search') || '';

  const [pageSize, setPageSize] = useState(15);
  const [searchInput, setSearchInput] = useState(urlSearch);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Синхронизация debouncedSearch с URL query params
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (debouncedSearch) {
        next.set('search', debouncedSearch);
      } else {
        next.delete('search');
      }
      return next;
    }, { replace: true });
  }, [debouncedSearch, setSearchParams]);

  const updateParams = (updates: Record<string, string | number | undefined | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          next.set(key, String(value));
        } else {
          next.delete(key);
        }
      });
      return next;
    });
  };

  const updateParam = (key: string, value: string | number) => {
    updateParams({ [key]: value });
  };

  // Bulk state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [blockUser, setBlockUser] = useState<AdminUser | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [isBulkBlockOpen, setIsBulkBlockOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [sortByField, sortDirection] = sortOption.split('-') as [
    'createdAt' | 'name' | 'email' | 'listingsCount',
    'asc' | 'desc',
  ];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'users', debouncedSearch, roleFilter, sortByField, sortDirection, page, pageSize],
    queryFn: () =>
      getAdminUsersApi({
        search: debouncedSearch || undefined,
        role: (roleFilter as UserRole) || undefined,
        sortBy: sortByField,
        sortOrder: sortDirection,
        page,
        limit: pageSize,
      }),
  });

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  };

  // C1: Optimistic update для блокировки
  const blockMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      blockUserApi(id, reason),
    onMutate: async ({ id, reason }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'users'] });
      const previousData = queryClient.getQueriesData({ queryKey: ['admin', 'users'] });
      queryClient.setQueriesData({ queryKey: ['admin', 'users'] }, (old: any) => {
        if (!old) return old;
        if (old.items && Array.isArray(old.items)) {
          return {
            ...old,
            items: old.items.map((u: any) =>
              u.id === id ? { ...u, isBlocked: true, blockedReason: reason } : u
            ),
          };
        }
        return old;
      });
      return { previousData };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousData) {
        for (const [key, val] of context.previousData) {
          queryClient.setQueryData(key, val);
        }
      }
      toast.error(err.response?.data?.message || 'Ошибка блокировки пользователя');
    },
    onSuccess: () => {
      setBlockUser(null);
      setBlockReason('');
      toast.success('Пользователь заблокирован');
    },
    onSettled: () => {
      invalidateUsers();
    },
  });

  // C1: Optimistic update для разблокировки
  const unblockMutation = useMutation({
    mutationFn: unblockUserApi,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'users'] });
      const previousData = queryClient.getQueriesData({ queryKey: ['admin', 'users'] });
      queryClient.setQueriesData({ queryKey: ['admin', 'users'] }, (old: any) => {
        if (!old) return old;
        if (old.items && Array.isArray(old.items)) {
          return {
            ...old,
            items: old.items.map((u: any) =>
              u.id === id ? { ...u, isBlocked: false, blockedReason: null } : u
            ),
          };
        }
        return old;
      });
      return { previousData };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousData) {
        for (const [key, val] of context.previousData) {
          queryClient.setQueryData(key, val);
        }
      }
      toast.error(err.response?.data?.message || 'Ошибка разблокировки пользователя');
    },
    onSuccess: () => {
      toast.success('Пользователь разблокирован');
    },
    onSettled: () => {
      invalidateUsers();
    },
  });

  // Bulk actions
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (data?.items && selectedIds.length === data.items.length) {
      setSelectedIds([]);
    } else if (data?.items) {
      setSelectedIds(data.items.map((u: AdminUser) => u.id));
    }
  };

  const handleBulkUnblock = async () => {
    for (const id of selectedIds) {
      await unblockUserApi(id);
    }
    invalidateUsers();
    toast.success(`Разблокировано пользователей: ${selectedIds.length}`);
    setSelectedIds([]);
  };

  const handleBulkBlockSubmit = async () => {
    for (const id of selectedIds) {
      await blockUserApi(id, blockReason.trim() || 'Массовая блокировка администратором');
    }
    invalidateUsers();
    toast.success(`Заблокировано пользователей: ${selectedIds.length}`);
    setSelectedIds([]);
    setIsBulkBlockOpen(false);
    setBlockReason('');
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (email === 'vosilhojasaidaminov@gmail.com') {
      toast.error('Нельзя удалить главного супер-администратора');
      return;
    }
    if (!window.confirm(`Вы уверены, что хотите удалить пользователя ${email}?`)) {
      return;
    }
    try {
      await deleteUserApi(id);
      invalidateUsers();
      toast.success('Пользователь удален');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Не удалось удалить пользователя');
    }
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const csvBlob = await exportUsersApi({
        role: (roleFilter as UserRole) || undefined,
      });
      const url = window.URL.createObjectURL(csvBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Экспорт пользователей завершен');
    } catch {
      toast.error('Ошибка экспорта данных');
    } finally {
      setIsExporting(false);
    }
  };

  const users: AdminUser[] = data?.items || [];
  const total = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 1;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Badge variant="danger">ADMIN</Badge>;
      case 'LANDLORD':
        return <Badge variant="primary">Арендодатель</Badge>;
      default:
        return <Badge variant="info">Арендатор</Badge>;
    }
  };

  return (
    <Layout title={t('users.title', 'Управление пользователями')}>
      <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-app tracking-tight flex items-center gap-2.5">
              <span>{t('users.subtitle', 'База пользователей')}</span>
              <Badge variant="primary" size="sm">
                {t('users.totalRecords', { count: total, defaultValue: `Всего: ${total} записей` })}
              </Badge>
            </h1>
            <p className="text-xs text-muted mt-0.5">
              {t('users.subtitleDesc', 'Управление профилями, верификация, права доступа и блокировки')}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              icon={<RotateCcw size={14} />}
            >
              {t('common.refresh', 'Обновить')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              loading={isExporting}
              icon={<Download size={14} />}
            >
              {t('users.exportCsv', 'Экспорт в CSV')}
            </Button>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-surface border border-app shadow-xs">
          <Input
            placeholder={t('users.searchPlaceholder', 'Поиск по имени, email, телефону или ID...')}
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              updateParam('page', 1);
            }}
            leftIcon={<Search size={16} />}
          />

          <Select
            options={ROLE_OPTIONS}
            value={roleFilter}
            onChange={(val) => {
              updateParam('role', val);
              updateParam('page', 1);
            }}
          />

          <Select
            options={SORT_OPTIONS}
            value={sortOption}
            onChange={(val) => {
              updateParam('sort', val);
              updateParam('page', 1);
            }}
          />
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/40 flex items-center justify-between gap-4 animate-fade-in">
            <span className="text-xs font-bold text-primary-900 dark:text-primary-200">
              Выбрано пользователей: {selectedIds.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkUnblock}
                icon={<Unlock size={14} />}
              >
                Разблокировать
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsBulkBlockOpen(true)}
                icon={<Lock size={14} />}
              >
                Заблокировать выбранных
              </Button>
            </div>
          </div>
        )}

        {/* Users Table / Cards */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-surface border border-app animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={<Users size={32} />}
            title={t('users.userNotFound', 'Пользователи не найдены')}
            description={t('users.emptyDesc', 'По заданным параметрам поиска пользователей не обнаружено')}
          />
        ) : (
          <div className="rounded-2xl border border-app bg-surface overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-white/5 border-b border-app text-muted font-bold">
                  <tr>
                    <th className="p-3.5 w-10">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-muted hover:text-app"
                      >
                        {selectedIds.length === users.length && users.length > 0 ? (
                          <CheckSquare size={16} className="text-primary-500" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </th>
                    <th className="p-3.5">{t('users.name', 'Пользователь')}</th>
                    <th className="p-3.5">{t('users.phone', 'Контакты')}</th>
                    <th className="p-3.5">{t('users.role', 'Роль')}</th>
                    <th className="p-3.5">{t('common.status', 'Статус')}</th>
                    <th className="p-3.5">{t('nav.listings', 'Объявлений')}</th>
                    <th className="p-3.5">{t('users.registeredAt', 'Дата регистрации')}</th>
                    <th className="p-3.5 text-right">{t('common.actions', 'Действия')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app">
                  <AnimatePresence mode="popLayout">
                    {users.map((user) => {
                      const isSelected = selectedIds.includes(user.id);
                      const isBlocked = user.isBlocked;

                      return (
                        <motion.tr
                          layout
                          key={user.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                            isSelected ? 'bg-primary-50/30 dark:bg-primary-950/20' : ''
                          }`}
                        >
                          <td className="p-3.5">
                            <button
                              type="button"
                              onClick={() => handleToggleSelect(user.id)}
                              className="text-muted hover:text-primary-500"
                            >
                              {isSelected ? (
                                <CheckSquare size={16} className="text-primary-500" />
                              ) : (
                                <Square size={16} />
                              )}
                            </button>
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-600 font-bold flex items-center justify-center shrink-0">
                                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <div
                                  onClick={() => navigate(`/users/${user.id}`)}
                                  className="font-bold text-app cursor-pointer hover:text-primary-600 truncate max-w-[180px]"
                                >
                                  {user.name || 'Без имени'}
                                </div>
                                <span className="text-[10px] text-muted font-mono block">
                                  ID: {user.id.slice(-6).toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5 text-muted">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-app">
                                <Mail size={12} className="text-muted shrink-0" />
                                <span className="truncate max-w-[160px]">{user.email}</span>
                              </div>
                              {user.phone && (
                                <div className="flex items-center gap-1.5 text-[11px]">
                                  <Phone size={12} className="text-muted shrink-0" />
                                  <span>{user.phone}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="p-3.5">{getRoleBadge(user.role)}</td>

                          <td className="p-3.5">
                            {isBlocked ? (
                              <Badge variant="danger" dot>
                                {t('users.block', 'Заблокирован')}
                              </Badge>
                            ) : (
                              <Badge variant="success" dot>
                                {t('common.active', 'Активен')}
                              </Badge>
                            )}
                          </td>

                          <td className="p-3.5 font-semibold text-app">
                            {user._count?.listings ?? 0}
                          </td>

                          <td className="p-3.5 text-muted font-mono text-[11px]">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>

                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/users/${user.id}`)}
                                title={t('users.profile', 'Профиль пользователя')}
                              >
                                <Eye size={15} />
                              </Button>

                              {isBlocked ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => unblockMutation.mutate(user.id)}
                                  className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                  title={t('users.unblock', 'Разблокировать')}
                                >
                                  <Unlock size={15} />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setBlockUser(user)}
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                                  title={t('users.block', 'Заблокировать')}
                                >
                                  <Lock size={15} />
                                </Button>
                              )}

                              {user.email !== 'vosilhojasaidaminov@gmail.com' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteUser(user.id, user.email)}
                                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                  title="Удалить пользователя навсегда"
                                >
                                  <Trash2 size={15} />
                                </Button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={(p) => updateParam('page', p)}
          onPageSizeChange={(s) => {
            setPageSize(s);
            updateParam('page', 1);
          }}
        />

        {/* Single Block Modal */}
        {blockUser && (
          <Modal
            isOpen={!!blockUser}
            onClose={() => {
              setBlockUser(null);
              setBlockReason('');
            }}
            title={`${t('users.block', 'Блокировка')}: ${blockUser.name || blockUser.email}`}
            subtitle={t('users.blockReasonSubtitle', 'Укажите причину блокировки пользователя')}
            size="md"
            footer={
              <div className="flex justify-end gap-2 w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBlockUser(null);
                    setBlockReason('');
                  }}
                >
                  {t('common.cancel', 'Отмена')}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (blockUser) {
                      blockMutation.mutate({
                        id: blockUser.id,
                        reason: blockReason.trim() || 'Нарушение правил сервиса',
                      });
                    }
                  }}
                  loading={blockMutation.isPending}
                >
                  {t('users.block', 'Заблокировать')}
                </Button>
              </div>
            }
          >
            <Textarea
              label={t('users.blockReasonLabel', 'Причина блокировки *')}
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder={t('users.blockReasonPlaceholder', 'Спам, фейковые объявления, подозрительная активность...')}
              rows={3}
            />
          </Modal>
        )}

        {/* Bulk Block Modal */}
        <ConfirmDialog
          isOpen={isBulkBlockOpen}
          onClose={() => setIsBulkBlockOpen(false)}
          onConfirm={handleBulkBlockSubmit}
          title="Заблокировать выбранных пользователей?"
          message={`Вы уверены, что хотите заблокировать ${selectedIds.length} пользователей? Они не смогут входить в свои аккаунты.`}
          confirmLabel={t('users.block', 'Заблокировать всех')}
          variant="danger"
        />
      </div>
    </Layout>
  );
};

export default UsersPage;
