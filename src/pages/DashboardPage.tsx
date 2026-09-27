import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import Layout from '../components/Layout';
import MetricCard from '../components/MetricCard/MetricCard';
import Badge from '../components/Badge/Badge';
import {
  getOverviewStatsApi,
  getTrafficStatsApi,
  getActivityFeedApi,
  getTopListingsApi,
  getModerationStatsApi,
  getRecentComplaintsApi,
} from '../lib/dashboardApi';
import { Sparkles, Users, List, AlertTriangle } from 'lucide-react';

// ─── Иконки для метрик ────────────────────────────────────────────────────────

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const UserPlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <line x1="20" y1="8" x2="20" y2="14"/>
    <line x1="23" y1="11" x2="17" y2="11"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

// ─── Хелперы для отображения ленты активности ─────────────────────────────────

const getActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    LISTING_APPROVED:          'Объявление одобрено',
    LISTING_REJECTED:          'Объявление отклонено',
    LISTING_DELETED:           'Объявление удалено',
    LISTING_CHANGES_REQUESTED: 'Запрошены правки',
    USER_BLOCKED:              'Пользователь заблокирован',
    USER_UNBLOCKED:            'Пользователь разблокирован',
    USER_ROLE_CHANGED:         'Роль пользователя изменена',
    USER_REGISTERED:           'Зарегистрирован новый пользователь',
    LISTING_VIEWED:            'Объявление просмотрено',
    PAGE_UPDATED:              'Страница обновлена',
    PAGE_DELETED:              'Страница удалена',
    SITE_SETTINGS_UPDATED:     'Настройки сайта обновлены',
  };
  return labels[action] || action;
};

const getActionBadge = (action: string): { variant: 'success' | 'danger' | 'warning' | 'info' | 'neutral'; label: string } => {
  if (action.includes('APPROVED') || action.includes('UNBLOCKED')) return { variant: 'success', label: 'Активен' };
  if (action.includes('REJECTED') || action.includes('DELETED') || action.includes('BLOCKED')) return { variant: 'danger', label: 'Отклонено' };
  if (action.includes('PENDING') || action.includes('CHANGES') || action.includes('REGISTERED')) return { variant: 'warning', label: 'Ожидает модерации' };
  return { variant: 'neutral', label: 'Обновлено' };
};

const formatRelativeTime = (timestamp: string): string => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} час${hours > 1 ? 'а' : ''} назад`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'день' : 'дня'} назад`;
};

// ─── Кастомный tooltip для Recharts ──────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="card-sm text-xs shadow-lg">
        <p className="font-semibold text-app mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }}>{entry.value.toLocaleString('ru-RU')}</p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Страница ──────────────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats', 'overview'],
    queryFn: getOverviewStatsApi,
    refetchInterval: 60_000, // Обновляем каждую минуту
  });

  const { data: traffic = [], isLoading: trafficLoading } = useQuery({
    queryKey: ['admin', 'stats', 'traffic', 30],
    queryFn: () => getTrafficStatsApi(30),
  });

  const { data: topListings = [] } = useQuery({
    queryKey: ['admin', 'stats', 'top-listings'],
    queryFn: getTopListingsApi,
  });

  const { data: moderationStats } = useQuery({
    queryKey: ['admin', 'stats', 'moderation'],
    queryFn: getModerationStatsApi,
  });

  const { data: recentComplaints = [] } = useQuery({
    queryKey: ['admin', 'stats', 'recent-complaints'],
    queryFn: getRecentComplaintsApi,
  });

  const { data: activity = [] } = useQuery({
    queryKey: ['admin', 'stats', 'activity-feed'],
    queryFn: getActivityFeedApi,
    refetchInterval: 30_000,
  });

  return (
    <Layout title={t('dashboard.title', 'Панель управления')}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* ─── [ФИЧА: ВИДЖЕТ ЗА 24 ЧАСА] ─── */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-primary-500/10 via-primary-500/5 to-transparent border border-primary-500/20 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-500 text-white shadow-xs">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-app flex items-center gap-2">
                <span>{t('dashboard.last24Hours', 'За последние 24 часа')}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
                  Live
                </span>
              </h3>
              <p className="text-xs text-muted">
                Сводка ключевых показателей активности пользователей платформы
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 text-xs">
              <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 shrink-0">
                <Users size={14} />
              </span>
              <div>
                <span className="font-bold text-app text-sm block">
                  +{stats?.newUsers?.value || 0}
                </span>
                <span className="text-[11px] text-muted">{t('dashboard.newRegistrations24h', 'Новых пользователей')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-600 shrink-0">
                <List size={14} />
              </span>
              <div>
                <span className="font-bold text-app text-sm block">
                  {stats?.activeListings?.value || 0}
                </span>
                <span className="text-[11px] text-muted">{t('dashboard.newListings24h', 'Новых объявлений')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-600 shrink-0">
                <AlertTriangle size={14} />
              </span>
              <div>
                <span className="font-bold text-app text-sm block">
                  {stats?.pendingModeration?.value || 0}
                </span>
                <span className="text-[11px] text-muted">{t('dashboard.newReports24h', 'Ожидают проверки')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 4 карточки метрик ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label={t('dashboard.visitorsToday', 'Посетители сегодня')}
            value={stats?.visitorsToday.value ?? 0}
            change={stats?.visitorsToday.change}
            trend={stats?.visitorsToday.trend}
            icon={<EyeIcon />}
            loading={statsLoading}
          />
          <MetricCard
            label={t('dashboard.activeListings', 'Активные объявления')}
            value={stats?.activeListings.value ?? 0}
            change={stats?.activeListings.change}
            trend={stats?.activeListings.trend}
            icon={<HomeIcon />}
            loading={statsLoading}
          />
          <MetricCard
            label={t('dashboard.newUsers', 'Новые пользователи')}
            value={stats?.newUsers.value ?? 0}
            change={stats?.newUsers.change}
            trend={stats?.newUsers.trend}
            icon={<UserPlusIcon />}
            loading={statsLoading}
          />
          <MetricCard
            label={t('dashboard.pendingModeration', 'Ожидают модерации')}
            value={stats?.pendingModeration.value ?? 0}
            change={stats?.pendingModeration.change}
            isAbsolute
            trend={stats?.pendingModeration.trend}
            icon={<ClockIcon />}
            loading={statsLoading}
          />
        </div>

        {/* ─── Графики и виджеты ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* LineChart посещаемости */}
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-app">{t('dashboard.traffic30Days', 'Посещаемость за 30 дней')}</h2>
              <span className="text-xs text-muted bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-md">
                30 дней
              </span>
            </div>
            {trafficLoading ? (
              <div className="h-52 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse"/>
            ) : (
              <ResponsiveContainer width="100%" height={208}>
                <LineChart data={traffic} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false}/>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    interval="preserveStartEnd"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="visitors"
                    stroke="#14b8a6"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: '#14b8a6', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Виджеты справа */}
          <div className="space-y-4">
            {/* Конверсия модерации */}
            <div className="card">
              <h2 className="text-base font-semibold text-app mb-3">{t('dashboard.moderationConversion', 'Конверсия модерации')}</h2>
              {moderationStats ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted">{t('dashboard.approvedRate', 'Одобрено')}</span>
                    <span className="font-medium text-emerald-500">{moderationStats.approved} ({moderationStats.conversionRate}%)</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted">{t('dashboard.rejectedRate', 'Отклонено')}</span>
                    <span className="font-medium text-red-500">{moderationStats.rejected}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted">{t('common.pending', 'На проверке')}</span>
                    <span className="font-medium text-amber-500">{moderationStats.pending}</span>
                  </div>
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center text-muted text-sm">{t('common.noData', 'Нет данных')}</div>
              )}
            </div>

            {/* Топ объявлений */}
            <div className="card">
              <h2 className="text-base font-semibold text-app mb-3">{t('dashboard.topListings', 'Популярные объявления')}</h2>
              {topListings.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-muted text-sm">{t('common.noData', 'Нет данных')}</div>
              ) : (
                <div className="space-y-3">
                  {topListings.slice(0, 3).map((listing) => (
                    <div key={listing.id} className="flex items-center gap-3 text-sm">
                      {listing.images[0]?.url ? (
                        <img
                          src={listing.images[0]?.url?.startsWith('http') ? listing.images[0].url : `/api${listing.images[0]?.url}`}
                          alt={listing.title}
                          className="w-10 h-10 rounded-md object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                          <HomeIcon />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-app truncate">{listing.title}</p>
                        <p className="text-xs text-muted truncate">{listing.city} • {listing.price.toLocaleString('ru-RU')} сум</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted">
                        <EyeIcon /> {listing.viewsCount}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Последние жалобы */}
            <div className="card">
              <h2 className="text-base font-semibold text-app mb-3">{t('dashboard.recentComplaints', 'Недавние жалобы')}</h2>
              {recentComplaints.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-muted text-sm">{t('common.noData', 'Нет жалоб')}</div>
              ) : (
                <div className="space-y-3">
                  {recentComplaints.map((complaint) => (
                    <div key={complaint.id} className="text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-app truncate">{complaint.title}</p>
                        <span className="text-xs text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">{t('common.rejected', 'Отклонено')}</span>
                      </div>
                      <p className="text-xs text-muted truncate">{complaint.city} • {complaint.owner.name} ({complaint.owner.email})</p>
                      <p className="text-xs text-muted mt-1">Причина: {complaint.moderationNote}</p>
                      <p className="text-xs text-muted mt-1">{new Date(complaint.updatedAt).toLocaleString('ru-RU')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Лента последних действий ─── */}
        <div className="card">
          <h2 className="text-base font-semibold text-app mb-4">{t('dashboard.recentActivity', 'Лента последних действий')}</h2>
          {activity.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">{t('common.noData', 'Действий пока нет')}</p>
          ) : (
            <div className="space-y-3">
              {activity.slice(0, 6).map((item) => {
                const badge = getActionBadge(item.action);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3 border-b border-app last:border-0 animate-fade-in"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Иконка действия */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs
                        ${badge.variant === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                          badge.variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30 text-red-500' :
                          'bg-amber-100 dark:bg-amber-900/30 text-amber-600'}`
                      }>
                        {badge.variant === 'success' ? '✓' : badge.variant === 'danger' ? '✗' : '⏳'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-app truncate">
                          {getActionLabel(item.action)}
                          {(item.meta as { title?: string })?.title && (
                            <span className="text-muted font-normal">: {(item.meta as { title?: string }).title}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted">
                          {item.actor?.name || 'Система'} • {formatRelativeTime(item.timestamp)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={badge.variant} className="ml-4 flex-shrink-0">
                      {badge.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;