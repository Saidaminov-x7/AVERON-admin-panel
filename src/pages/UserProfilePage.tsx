// src/pages/UserProfilePage.tsx
// Страница профиля пользователя в админке: контакты, история действий, объявления

import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { getAdminUserByIdApi, blockUserApi, unblockUserApi, getUserActivityApi } from '../lib/usersApi';
import { getUserAuditLogsApi } from '../lib/auditLogApi';
import { getUserAllChatsApi, getUserAllListingsApi } from '../lib/extendedAdminApi';
import Badge from '../components/Badge/Badge';
import { ArrowLeft, Shield, Lock, Unlock, Mail, Phone, Calendar, Home, Clock, Activity, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

const UserProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'info' | 'listings' | 'chats' | 'activity' | 'history'>('info');

  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => getAdminUserByIdApi(id!),
  });

  const { data: userChatsData } = useQuery({
    queryKey: ['admin', 'user', id, 'all-chats'],
    queryFn: () => getUserAllChatsApi(id!),
  });

  const { data: userAllListingsData } = useQuery({
    queryKey: ['admin', 'user', id, 'all-listings'],
    queryFn: () => getUserAllListingsApi(id!),
  });

  const { data: userActivity, isLoading: isActivityLoading } = useQuery({
    queryKey: ['admin', 'user', id, 'activity'],
    queryFn: () => getUserActivityApi(id!),
  });

  const { data: auditLogs, isLoading: isAuditLoading } = useQuery({
    queryKey: ['admin', 'user', id, 'audit-logs'],
    queryFn: () => getUserAuditLogsApi(id!),
  });

  const blockMutation = useMutation({
    mutationFn: (reason: string) => blockUserApi(id!, reason),
    onSuccess: () => {
      navigate('/users');
    },
  });

  const unblockMutation = useMutation({
    mutationFn: () => unblockUserApi(id!),
    onSuccess: () => {
      navigate('/users');
    },
  });

  const currentLocale = i18n.language === 'en' ? enUS : ru;

  if (isUserLoading) {
    return (
      <Layout title={t('common.loading', 'Загрузка...')}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout title={t('users.userNotFound', 'Пользователь не найден')}>
        <div className="card p-8 text-center max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-app mb-4">{t('users.userNotFound', 'Пользователь не найден')}</h2>
          <button className="btn-primary" onClick={() => navigate('/users')}>
            {t('common.back', 'Вернуться к списку')}
          </button>
        </div>
      </Layout>
    );
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN': return { label: 'Администратор', variant: 'teal' as const };
      case 'LANDLORD': return { label: 'Арендодатель', variant: 'success' as const };
      default: return { label: 'Пользователь', variant: 'info' as const };
    }
  };

  const getStatusBadge = (isBlocked: boolean) => {
    return isBlocked
      ? { label: t('users.block', 'Заблокирован'), variant: 'danger' as const }
      : { label: t('common.active', 'Активен'), variant: 'success' as const };
  };

  return (
    <Layout title={`${t('users.profile', 'Профиль пользователя')}: ${user.name}`}>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Хлебные крошки и кнопка назад */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/users')}
            className="flex items-center gap-2 text-sm text-muted hover:text-app transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} /> {t('common.back', 'Назад к списку')}
          </button>
        </div>

        {/* Карточка профиля */}
        <div className="card p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 flex items-center justify-center text-3xl font-semibold">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                <h1 className="text-2xl font-bold text-app">{user.name}</h1>
                <Badge variant={getRoleBadge(user.role).variant} className="text-sm">
                  {getRoleBadge(user.role).label}
                </Badge>
                <Badge variant={getStatusBadge(user.isBlocked).variant} className="text-sm">
                  {getStatusBadge(user.isBlocked).label}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted">
                  <Mail size={16} />
                  <a href={`mailto:${user.email}`} className="hover:text-primary-500 transition-colors">{user.email}</a>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2 text-muted">
                    <Phone size={16} />
                    <a href={`tel:${user.phone}`} className="hover:text-primary-500 transition-colors">{user.phone}</a>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted">
                  <Calendar size={16} />
                  <span>{t('users.registeredAt', 'Зарегистрирован')}: {format(new Date(user.createdAt), 'd MMMM yyyy', { locale: currentLocale })}</span>
                </div>
                {user.lastLoginAt && (
                  <div className="flex items-center gap-2 text-muted">
                    <Clock size={16} />
                    <span>{t('users.lastActive', 'Последний вход')}: {format(new Date(user.lastLoginAt), 'd MMMM yyyy, HH:mm', { locale: currentLocale })}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-6">
                {user.isBlocked ? (
                  <button
                    className="btn-ghost gap-1 cursor-pointer text-emerald-600"
                    onClick={() => unblockMutation.mutate()}
                    disabled={unblockMutation.isPending}
                  >
                    <Unlock size={16} /> {t('users.unblock', 'Разблокировать')}
                  </button>
                ) : (
                  <button
                    className="btn-danger gap-1 cursor-pointer"
                    onClick={() => blockMutation.mutate('')}
                    disabled={blockMutation.isPending}
                  >
                    <Lock size={16} /> {t('users.block', 'Заблокировать')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Вкладки */}
        <div className="border-b border-app">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
                activeTab === 'info' ? 'border-primary-500 text-primary-500' : 'border-transparent text-muted hover:text-app'
              }`}
            >
              {t('users.profile', 'Информация')}
            </button>
            <button
              onClick={() => setActiveTab('listings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
                activeTab === 'listings' ? 'border-primary-500 text-primary-500' : 'border-transparent text-muted hover:text-app'
              }`}
            >
              {t('nav.listings', 'Все объявления')} ({userAllListingsData?.listings?.length || user.listings?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('chats')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'chats' ? 'border-primary-500 text-primary-500' : 'border-transparent text-muted hover:text-app'
              }`}
            >
              <MessageSquare size={14} /> Все чаты ({userChatsData?.messages?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
                activeTab === 'activity' ? 'border-primary-500 text-primary-500' : 'border-transparent text-muted hover:text-app'
              }`}
            >
              {t('dashboard.recentActivity', 'Активность')} ({userActivity?.items?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
                activeTab === 'history' ? 'border-primary-500 text-primary-500' : 'border-transparent text-muted hover:text-app'
              }`}
            >
              {t('auditLog.title', 'Админ-аудит')} ({auditLogs?.length || 0})
            </button>
          </nav>
        </div>

        {/* Контент вкладок */}
        {activeTab === 'info' && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-app mb-4">Дополнительная информация</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border border-app rounded-xl bg-surface">
                <div className="text-sm text-muted mb-1">{t('users.role', 'Роль в системе')}</div>
                <div className="font-medium text-app">{getRoleBadge(user.role).label}</div>
              </div>
              <div className="p-4 border border-app rounded-xl bg-surface">
                <div className="text-sm text-muted mb-1">{t('common.status', 'Статус')}</div>
                <div className="font-medium text-app">{getStatusBadge(user.isBlocked).label}</div>
              </div>
              <div className="p-4 border border-app rounded-xl bg-surface">
                <div className="text-sm text-muted mb-1">{t('users.registeredAt', 'Дата регистрации')}</div>
                <div className="font-medium text-app">{format(new Date(user.createdAt), 'd MMMM yyyy, HH:mm', { locale: currentLocale })}</div>
              </div>
              {user.lastLoginAt && (
                <div className="p-4 border border-app rounded-xl bg-surface">
                  <div className="text-sm text-muted mb-1">{t('users.lastActive', 'Последний вход')}</div>
                  <div className="font-medium text-app">{format(new Date(user.lastLoginAt), 'd MMMM yyyy, HH:mm', { locale: currentLocale })}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Все чаты пользователя */}
        {activeTab === 'chats' && (
          <div className="card p-0 overflow-hidden">
            {!userChatsData?.messages || userChatsData.messages.length === 0 ? (
              <div className="p-8 text-center text-muted">У пользователя нет истории переписок</div>
            ) : (
              <div className="divide-y divide-app">
                {userChatsData.messages.map((m: any) => (
                  <div key={m.id} className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <div className="flex items-center justify-between text-xs text-muted mb-1">
                      <span className="font-bold text-app">
                        {m.sender?.name || 'Пользователь'} ➔ {m.recipient?.name || 'Собеседник'}
                      </span>
                      <span>{format(new Date(m.createdAt), 'd MMM yyyy, HH:mm', { locale: currentLocale })}</span>
                    </div>
                    {m.listing && (
                      <p className="text-xs text-primary-500 font-semibold mb-1">
                        Объект: {m.listing.title} ({m.listing.price} сум, {m.listing.city})
                      </p>
                    )}
                    <p className="text-xs text-app bg-surface p-2.5 rounded-xl border border-app">
                      {m.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Все объявления пользователя (включая удаленные и архивные) */}
        {activeTab === 'listings' && (
          <div className="card p-0 overflow-hidden">
            {(!userAllListingsData?.listings || userAllListingsData.listings.length === 0) && user.listings?.length === 0 ? (
              <div className="p-6 text-center text-muted">{t('common.noData', 'У пользователя нет объявлений')}</div>
            ) : (
              <div className="divide-y divide-app">
                {(userAllListingsData?.listings || user.listings)?.map((listing: any) => (
                  <div key={listing.id} className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <div className="flex gap-4">
                      <div className="w-20 h-16 bg-gray-100 dark:bg-white/10 rounded-xl flex-shrink-0 overflow-hidden">
                        {listing.images?.[0]?.url ? (
                          <img
                            src={listing.images[0].url}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted">
                            <Home size={24} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-app truncate">{listing.title}</h3>
                          <Badge variant={listing.moderationStatus === 'APPROVED' ? 'success' : listing.moderationStatus === 'REJECTED' ? 'danger' : 'warning'} className="text-xs">
                            {listing.moderationStatus === 'APPROVED' ? t('common.approved', 'Одобрено') : listing.moderationStatus === 'REJECTED' ? t('common.rejected', 'Отклонено') : t('common.pending', 'На модерации')}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted mb-1">
                          {listing.city}{listing.district ? `, ${listing.district}` : ''}
                        </div>
                        <div className="text-sm text-muted">
                          {listing.rooms} комн., {listing.area} м², {listing.price.toLocaleString()} сум/мес
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="card p-0 overflow-hidden">
            {isActivityLoading ? (
              <div className="p-6 text-center text-muted">{t('common.loading', 'Загрузка логов активности...')}</div>
            ) : !userActivity?.items || userActivity.items.length === 0 ? (
              <div className="p-6 text-center text-muted">{t('common.noData', 'Активности пользователя не найдено')}</div>
            ) : (
              <div className="divide-y divide-app">
                {userActivity.items.map((act) => (
                  <div key={act.id} className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <Activity size={18} className="text-primary-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-app text-sm">
                              {act.action === 'LOGIN' ? 'Вход в аккаунт'
                                : act.action === 'REGISTER' ? 'Регистрация аккаунта'
                                : act.action === 'LISTING_CREATED' ? 'Создано объявление'
                                : act.action === 'MESSAGE_SENT' ? 'Отправлено сообщение'
                                : act.action}
                            </span>
                            {act.ip && (
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-muted font-mono">
                                {act.ip}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted">
                            {format(new Date(act.createdAt), 'd MMM yyyy, HH:mm:ss', { locale: currentLocale })}
                          </span>
                        </div>
                        {act.meta && Object.keys(act.meta).length > 0 && (
                          <pre className="text-xs text-emerald-400 bg-gray-900 dark:bg-black/90 p-2 rounded-xl mt-1 font-mono overflow-x-auto max-w-full border border-app">
                            {JSON.stringify(act.meta, null, 2)}
                          </pre>
                        )}
                        {act.userAgent && (
                          <div className="text-[11px] text-muted truncate mt-1">
                            {act.userAgent}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="card p-0 overflow-hidden">
            {isAuditLoading ? (
              <div className="p-6 text-center text-muted">{t('common.loading', 'Загрузка...')}</div>
            ) : auditLogs?.length === 0 ? (
              <div className="p-6 text-center text-muted">{t('common.noData', 'Нет действий')}</div>
            ) : (
              <div className="divide-y divide-app">
                {auditLogs?.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {log.action === 'USER_BLOCKED' ? (
                          <Lock size={18} className="text-red-500" />
                        ) : log.action === 'USER_UNBLOCKED' ? (
                          <Unlock size={18} className="text-emerald-500" />
                        ) : log.action === 'USER_ROLE_CHANGED' ? (
                          <Shield size={18} className="text-blue-500" />
                        ) : (
                          <Clock size={18} className="text-muted" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-app">
                            {log.action === 'USER_BLOCKED' ? t('users.block', 'Заблокирован')
                              : log.action === 'USER_UNBLOCKED' ? t('users.unblock', 'Разблокирован')
                              : log.action === 'USER_ROLE_CHANGED' ? 'Изменена роль'
                              : log.action === 'USER_CREATED' ? 'Зарегистрирован'
                              : log.action}
                          </span>
                          <span className="text-xs text-muted">
                            {format(new Date(log.timestamp), 'd MMM yyyy, HH:mm', { locale: currentLocale })}
                          </span>
                        </div>
                        <div className="text-sm text-muted">
                          {typeof log.meta?.reason === 'string' && <div className="mb-1">Причина: {log.meta.reason}</div>}
                          {typeof log.meta?.oldRole === 'string' && typeof log.meta?.newRole === 'string' && (
                            <div>
                              Роль изменена с <strong>{log.meta.oldRole}</strong> на <strong>{log.meta.newRole}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default UserProfilePage;