// src/pages/ListingsPage.tsx
// Страница модерации и управления объявлениями с массовыми действиями и фильтрами

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useDebounce } from '../hooks/useDebounce';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  RotateCcw,
  CheckSquare,
  Square,
  Building,
  Home,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Download,
} from 'lucide-react';
import Layout from '../components/Layout';
import { getFraudAnalysisApi, type FraudAnalysisResult } from '../lib/extendedAdminApi';
import {
  getAdminListingsApi,
  approveListingApi,
  rejectListingApi,
  requestChangesApi,
  verifyListingApi,
  deleteListingApi,
  type ModerationStatus,
} from '../lib/listingsApi';
import {
  Button,
  Modal,
  Input,
  Select,
  Textarea,
  Tabs,
  Pagination,
  Badge,
  Card,
  ConfirmDialog,
  EmptyState,
} from '../components/ui';

type TabKey = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';

export const ListingsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const TABS = [
    { id: 'ALL' as const, label: t('common.all', 'Все') },
    { id: 'PENDING' as const, label: t('dashboard.pendingModeration', 'Ожидают модерации') },
    { id: 'APPROVED' as const, label: t('common.approved', 'Одобрены') },
    { id: 'REJECTED' as const, label: t('common.rejected', 'Отклонены') },
    { id: 'CHANGES_REQUESTED' as const, label: t('kanban.changesRequestedCol', 'Требуют правок') },
  ];

  const SORT_OPTIONS = [
    { value: 'createdAt-desc', label: t('users.newestFirst', 'Сначала новые') },
    { value: 'createdAt-asc', label: t('users.oldestFirst', 'Сначала старые') },
    { value: 'price-desc', label: 'Сначала дороже' },
    { value: 'price-asc', label: 'Сначала дешевле' },
    { value: 'viewsCount-desc', label: 'По популярности (просмотры)' },
  ];

  const activeTab = (searchParams.get('tab') as TabKey) || 'PENDING';
  const page = Number(searchParams.get('page')) || 1;
  const sortOption = searchParams.get('sort') || 'createdAt-desc';
  const urlSearch = searchParams.get('search') || '';

  const [pageSize, setPageSize] = useState(10);
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

  // Bulk actions state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalAction, setModalAction] = useState<{
    type: 'reject' | 'changes' | 'bulk-reject';
    id?: string;
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Fraud / Scam modal
  const [fraudModalListingId, setFraudModalListingId] = useState<string | null>(null);
  const [fraudData, setFraudData] = useState<FraudAnalysisResult | null>(null);
  const [isFraudLoading, setIsFraudLoading] = useState(false);

  const handleOpenFraudAnalysis = async (listingId: string) => {
    setFraudModalListingId(listingId);
    setIsFraudLoading(true);
    try {
      const data = await getFraudAnalysisApi(listingId);
      setFraudData(data);
    } catch {
      toast.error('Не удалось загрузить скоринг безопасности');
    } finally {
      setIsFraudLoading(false);
    }
  };

  const [sortByField, sortDirection] = sortOption.split('-') as [
    'createdAt' | 'price' | 'viewsCount' | 'area',
    'asc' | 'desc',
  ];

  const currentStatus = activeTab === 'ALL' ? undefined : (activeTab as ModerationStatus);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'listings', activeTab, currentStatus, page, pageSize, sortByField, sortDirection, debouncedSearch],
    queryFn: () =>
      getAdminListingsApi({
        moderationStatus: currentStatus,
        page,
        limit: pageSize,
        sortBy: sortByField,
        sortOrder: sortDirection,
      }),
  });

  // Tab counters
  const { data: pendingCountData } = useQuery({
    queryKey: ['admin', 'listings', 'PENDING-count'],
    queryFn: () => getAdminListingsApi({ moderationStatus: 'PENDING', page: 1, limit: 1 }),
  });

  const invalidateListings = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] });
  };

  const approveMutation = useMutation({
    mutationFn: approveListingApi,
    onSuccess: () => {
      invalidateListings();
      toast.success('Объявление успешно одобрено');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectListingApi(id, reason),
    onSuccess: () => {
      invalidateListings();
      setModalAction(null);
      setActionReason('');
      toast.success('Объявление отклонено');
    },
  });

  const requestChangesMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      requestChangesApi(id, note),
    onSuccess: () => {
      invalidateListings();
      setModalAction(null);
      setActionReason('');
      toast.success('Запрос на внесение правок отправлен автору');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteListingApi,
    onSuccess: () => {
      invalidateListings();
      setDeleteConfirmId(null);
      toast.success('Объявление удалено');
    },
  });

  // C1: Optimistic update для верификации объявлений
  const verifyMutation = useMutation({
    mutationFn: ({ id, isVerified }: { id: string; isVerified: boolean }) =>
      verifyListingApi(id, isVerified),
    onMutate: async ({ id, isVerified }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'listings'] });
      const previousData = queryClient.getQueriesData({ queryKey: ['admin', 'listings'] });
      queryClient.setQueriesData({ queryKey: ['admin', 'listings'] }, (old: any) => {
        if (!old) return old;
        if (old.items && Array.isArray(old.items)) {
          return {
            ...old,
            items: old.items.map((item: any) =>
              item.id === id ? { ...item, isVerified } : item
            ),
          };
        }
        return old;
      });
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        for (const [key, val] of context.previousData) {
          queryClient.setQueryData(key, val);
        }
      }
      toast.error('Не удалось обновить статус верификации');
    },
    onSuccess: (_, variables) => {
      toast.success(variables.isVerified ? 'Объявление верифицировано ("Проверено Ijarauz")' : 'Верификация снята');
    },
    onSettled: () => {
      invalidateListings();
    },
  });

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (data?.items && selectedIds.length === data.items.length) {
      setSelectedIds([]);
    } else if (data?.items) {
      setSelectedIds(data.items.map((i) => i.id));
    }
  };

  // Bulk actions
  const handleBulkApprove = async () => {
    for (const id of selectedIds) {
      await approveListingApi(id);
    }
    invalidateListings();
    toast.success(`Одобрено объявлений: ${selectedIds.length}`);
    setSelectedIds([]);
  };

  const handleBulkRejectSubmit = async () => {
    if (!actionReason.trim()) return;
    for (const id of selectedIds) {
      await rejectListingApi(id, actionReason.trim());
    }
    invalidateListings();
    toast.success(`Отклонено объявлений: ${selectedIds.length}`);
    setSelectedIds([]);
    setModalAction(null);
    setActionReason('');
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteListingApi(id);
    }
    invalidateListings();
    toast.success(`Удалено объявлений: ${selectedIds.length}`);
    setSelectedIds([]);
    setIsBulkDeleteOpen(false);
  };

  const items = data?.items || [];
  const total = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 1;
  const pendingCount = pendingCountData?.meta?.total || 0;

  const filteredItems = items.filter((item) => {
    if (!debouncedSearch.trim()) return true;
    const q = debouncedSearch.toLowerCase();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.city?.toLowerCase().includes(q) ||
      item.district?.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      item.owner?.name?.toLowerCase().includes(q)
    );
  });

  const handleExportCSV = () => {
    if (items.length === 0) {
      toast.error('Нет данных для экспорта');
      return;
    }
    const headers = ['ID', 'Title', 'City', 'Price', 'Status', 'ModerationStatus', 'OwnerName', 'CreatedAt'];
    const rows = items.map((l: any) => [
      l.id,
      `"${(l.title || '').replace(/"/g, '""')}"`,
      l.city || '',
      l.price || 0,
      l.status || '',
      l.moderationStatus || '',
      `"${(l.owner?.name || '').replace(/"/g, '""')}"`,
      l.createdAt || '',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `listings-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Экспорт объявлений в CSV завершен');
  };

  const getStatusBadge = (status: ModerationStatus) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success">{t('common.approved', 'Одобрено')}</Badge>;
      case 'PENDING':
        return <Badge variant="warning">{t('common.pending', 'Ожидает')}</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">{t('common.rejected', 'Отклонено')}</Badge>;
      case 'CHANGES_REQUESTED':
        return <Badge variant="info">{t('kanban.changesRequestedCol', 'Требуются правки')}</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <Layout title={t('listings.title', 'Управление объявлениями')}>
      <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-app tracking-tight flex items-center gap-2.5">
              <span>{t('listings.title', 'Каталог объявлений')}</span>
              {pendingCount > 0 && (
                <Badge variant="warning" size="sm" dot>
                  {pendingCount} {t('dashboard.pendingModeration', 'на модерации')}
                </Badge>
              )}
            </h1>
            <p className="text-xs text-muted mt-0.5">
              {t('listings.subtitle', 'Модерация объектов недвижимости, проверка собственников и управление статусами')}
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
              icon={<Download size={14} />}
            >
              {t('common.export', 'Экспорт в CSV')}
            </Button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center justify-between border-b border-app pb-2">
          <Tabs
            tabs={TABS}
            activeTab={activeTab}
            onChange={(tab) => {
              updateParams({ tab, page: 1 });
              setSelectedIds([]);
            }}
            variant="underline"
            size="sm"
          />
        </div>

        {/* Filters Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-surface border border-app shadow-xs">
          <Input
            placeholder="Поиск по названию, городу, ID или автору..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              updateParam('page', 1);
            }}
            leftIcon={<Search size={16} />}
          />

          <Select
            options={SORT_OPTIONS}
            value={sortOption}
            onChange={(val) => {
              updateParam('sort', val);
              updateParam('page', 1);
            }}
          />

          <div className="flex items-center justify-end gap-2 text-xs text-muted">
            <span>
              Показано: <strong className="text-app">{filteredItems.length}</strong> из{' '}
              <strong className="text-app">{total}</strong>
            </span>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
            <span className="text-xs font-bold text-primary-900 dark:text-primary-200">
              Выбрано объявлений: {selectedIds.length}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="primary"
                size="sm"
                onClick={handleBulkApprove}
                icon={<CheckCircle2 size={14} />}
              >
                Одобрить все
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalAction({ type: 'bulk-reject' })}
                icon={<XCircle size={14} />}
              >
                Отклонить все
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsBulkDeleteOpen(true)}
                icon={<Trash2 size={14} />}
              >
                Удалить все
              </Button>
            </div>
          </div>
        )}

        {/* Select all header */}
        <div className="flex items-center justify-between px-1 text-xs text-muted">
          <button
            type="button"
            onClick={handleSelectAll}
            className="flex items-center gap-2 font-semibold text-app hover:text-primary-600 cursor-pointer"
          >
            {selectedIds.length === filteredItems.length && filteredItems.length > 0 ? (
              <CheckSquare size={16} className="text-primary-500" />
            ) : (
              <Square size={16} className="text-muted" />
            )}
            <span>Выбрать все на этой странице</span>
          </button>
        </div>

        {/* Listings List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-surface border border-app animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={<Home size={32} />}
            title="Объявления не найдены"
            description="В выбранной категории сейчас нет объявлений, соответствующих заданным критериям фильтра"
          />
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const priceNum = parseFloat(item.price || '0');
                const priceUsd = Math.round(priceNum / 12500);
                const firstImage = item.images?.[0]?.url;

                return (
                  <motion.div
                    layout
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden', marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card
                      padding="sm"
                      className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-150 ${
                        isSelected ? 'ring-2 ring-primary-500 border-primary-500' : ''
                      }`}
                    >
                  <div className="flex items-start gap-3.5 min-w-0 w-full md:w-auto flex-1">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleSelect(item.id)}
                      className="mt-1 text-muted hover:text-primary-500 shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare size={16} className="text-primary-500" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>

                    {/* Image thumbnail */}
                    <div className="h-20 w-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 shrink-0 border border-app flex items-center justify-center">
                      {firstImage ? (
                        <img src={firstImage} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Building size={24} className="text-muted opacity-50" />
                      )}
                    </div>

                    {/* Content info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-app truncate">{item.title}</h3>
                        {getStatusBadge(item.moderationStatus)}
                        {item.isPromoted && (
                          <Badge variant={item.promotionTier === 'URGENT' ? 'danger' : item.promotionTier === 'TOP' ? 'warning' : 'info'}>
                            {item.promotionTier === 'URGENT' ? '🔥 Срочно' : item.promotionTier === 'TOP' ? '⭐ ТОП' : 'Boost'}
                          </Badge>
                        )}
                        {item.isVerified && (
                          <Badge variant="success">
                            <ShieldCheck size={12} className="inline mr-1" /> Проверено
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted font-mono bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                          LST-{item.id.slice(-4).toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-primary-500" /> {item.city}, {item.district}
                        </span>
                        {item.area && <span>• {item.area} м²</span>}
                        {item.rooms && <span>• {item.rooms} комн.</span>}
                        <span>• Автор: {item.owner?.name || 'Не указан'} ({item.owner?.phone})</span>
                      </div>

                      {item.moderationNote && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md inline-block">
                          💬 Примечание: {item.moderationNote}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Price & Action Buttons */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-app">
                    <div className="text-right">
                      <div className="text-base font-black text-primary-600 dark:text-primary-400">
                        {priceUsd > 0 ? `${priceUsd.toLocaleString()} у.е.` : `${priceNum.toLocaleString()} сум`}
                      </div>
                      <span className="text-[10px] text-muted block">в месяц</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Кнопка проверки на Скам / Fraud Score */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenFraudAnalysis(item.id)}
                        className="text-amber-600 border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        title="Проверить риск мошенничества (Fraud Score)"
                        leftIcon={<ShieldAlert size={14} />}
                      >
                        AI-Скор
                      </Button>

                      {/* Кнопка быстрой верификации */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          verifyMutation.mutate({
                            id: item.id,
                            isVerified: !item.isVerified,
                          })
                        }
                        className={
                          item.isVerified
                            ? 'text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            : 'text-muted hover:text-app'
                        }
                        title={item.isVerified ? 'Снять статус проверки' : 'Подтвердить (Проверено Ijarauz)'}
                        leftIcon={<ShieldCheck size={14} />}
                      >
                        {item.isVerified ? 'Проверено' : 'Подтвердить'}
                      </Button>

                      {item.moderationStatus === 'PENDING' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => approveMutation.mutate(item.id)}
                            icon={<CheckCircle2 size={14} />}
                            title="Одобрить публикацию"
                          >
                            Одобрить
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setModalAction({ type: 'reject', id: item.id })}
                            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                            title="Отклонить"
                          >
                            Отклонить
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setModalAction({ type: 'changes', id: item.id })}
                            title="Запросить исправления"
                          >
                            Правки
                          </Button>
                        </>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        title="Удалить объявление"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
              );
            })}
            </AnimatePresence>
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

        {/* Reject / Request Changes Reason Modal */}
        {modalAction && (
          <Modal
            isOpen={!!modalAction}
            onClose={() => {
              setModalAction(null);
              setActionReason('');
            }}
            title={
              modalAction.type === 'reject'
                ? 'Отклонить объявление'
                : modalAction.type === 'bulk-reject'
                ? 'Массовое отклонение объявлений'
                : 'Запросить правки у автора'
            }
            subtitle="Укажите причину для автора объявления"
            size="md"
            footer={
              <div className="flex justify-end gap-2 w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setModalAction(null);
                    setActionReason('');
                  }}
                >
                  Отмена
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (modalAction.type === 'reject' && modalAction.id) {
                      rejectMutation.mutate({ id: modalAction.id, reason: actionReason });
                    } else if (modalAction.type === 'changes' && modalAction.id) {
                      requestChangesMutation.mutate({ id: modalAction.id, note: actionReason });
                    } else if (modalAction.type === 'bulk-reject') {
                      handleBulkRejectSubmit();
                    }
                  }}
                  disabled={!actionReason.trim()}
                >
                  Отправить
                </Button>
              </div>
            }
          >
            <Textarea
              label="Текст замечания или причины *"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="Например: Некачественные фотографии объекта, не указан точный адрес..."
              rows={4}
            />
          </Modal>
        )}

        {/* Delete Single Confirm Dialog */}
        <ConfirmDialog
          isOpen={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={() => {
            if (deleteConfirmId) deleteMutation.mutate(deleteConfirmId);
          }}
          title="Удалить объявление?"
          message="Вы уверены, что хотите удалить это объявление? Оно будет снято с публикации."
          confirmLabel="Удалить"
          variant="danger"
          loading={deleteMutation.isPending}
        />

        {/* Bulk Delete Confirm Dialog */}
        <ConfirmDialog
          isOpen={isBulkDeleteOpen}
          onClose={() => setIsBulkDeleteOpen(false)}
          onConfirm={handleBulkDelete}
          title="Удалить выбранные объявления?"
          message={`Вы уверены, что хотите удалить ${selectedIds.length} объявлений?`}
          confirmLabel="Удалить все"
          variant="danger"
        />

        {/* Fraud Analysis / Anti-Scam Modal */}
        {fraudModalListingId && (
          <Modal
            isOpen={!!fraudModalListingId}
            onClose={() => {
              setFraudModalListingId(null);
              setFraudData(null);
            }}
            title="🛡️ AI-Анализ риска мошенничества и дубликатов"
            subtitle={`Объявление ID: ${fraudModalListingId}`}
            size="lg"
            footer={
              <div className="flex justify-end w-full">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setFraudModalListingId(null);
                    setFraudData(null);
                  }}
                >
                  Закрыть
                </Button>
              </div>
            }
          >
            {isFraudLoading ? (
              <div className="p-8 text-center text-muted">Выполняется скоринг факторов риска...</div>
            ) : !fraudData ? (
              <div className="p-8 text-center text-muted">Данные скоринга недоступны</div>
            ) : (
              <div className="space-y-4">
                {/* Главный скор */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-app">
                  <div>
                    <div className="text-xs text-muted">Индекс подозрительности (Fraud Score)</div>
                    <div className="text-2xl font-black mt-0.5 flex items-center gap-2">
                      <span
                        className={
                          fraudData.riskLevel === 'CRITICAL'
                            ? 'text-rose-600 dark:text-rose-400'
                            : fraudData.riskLevel === 'HIGH'
                            ? 'text-amber-600 dark:text-amber-400'
                            : fraudData.riskLevel === 'MEDIUM'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }
                      >
                        {fraudData.score} / 100
                      </span>
                      <Badge
                        variant={
                          fraudData.riskLevel === 'CRITICAL' || fraudData.riskLevel === 'HIGH'
                            ? 'danger'
                            : fraudData.riskLevel === 'MEDIUM'
                            ? 'warning'
                            : 'success'
                        }
                      >
                        Уровень риска: {fraudData.riskLevel}
                      </Badge>
                    </div>
                  </div>

                  {/* Оценка рыночной цены */}
                  <div className="text-right">
                    <div className="text-xs text-muted">Справедливая рыночная цена</div>
                    <div className="text-sm font-bold text-app mt-0.5">
                      Медиана: {fraudData.marketFairPrice.medianPrice.toLocaleString()} сум
                    </div>
                    <div className="text-xs text-muted font-mono">
                      Отклонение: {fraudData.marketFairPrice.differencePercent > 0 ? '+' : ''}
                      {fraudData.marketFairPrice.differencePercent}% ({fraudData.marketFairPrice.verdict})
                    </div>
                  </div>
                </div>

                {/* Факторы риска */}
                <div>
                  <h4 className="text-xs font-bold text-app uppercase tracking-wide mb-2">Обнаруженные триггеры риска:</h4>
                  {fraudData.factors.length === 0 ? (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 text-xs flex items-center gap-2">
                      <CheckCircle2 size={16} /> Подозрительных триггеров и стоп-слов не обнаружено
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {fraudData.factors.map((f, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs flex items-center justify-between text-rose-700 dark:text-rose-300">
                          <span>• {f.description}</span>
                          <span className="font-mono font-bold">+{f.weight} баллов</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Возможные дубликаты */}
                {fraudData.possibleDuplicates.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-app uppercase tracking-wide mb-2 flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <AlertTriangle size={14} /> Найдено похожих объявлений (AI-детектор):
                    </h4>
                    <div className="space-y-1.5">
                      {fraudData.possibleDuplicates.map((dup) => (
                        <div key={dup.id} className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-xs flex items-center justify-between">
                          <span className="font-semibold text-app truncate">{dup.title}</span>
                          <span className="font-mono text-amber-600 dark:text-amber-400 font-bold shrink-0 ml-2">
                            Совпадение {dup.similarity}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Modal>
        )}
      </div>
    </Layout>
  );
};

export default ListingsPage;