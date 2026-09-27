import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RotateCcw,
  Building,
  Calendar,
  Download,
  ShieldAlert,
  X,
} from 'lucide-react';
import Layout from '../components/Layout';
import {
  getReportsApi,
  updateReportStatusApi,
  type ReportItem,
  type ReportStatus,
} from '../lib/listingsApi';
import {
  getReportAiAnalysisApi,
  type ReportAiAnalysisResult,
} from '../lib/extendedAdminApi';
import { Button, Tabs, Pagination, Badge, Card, EmptyState } from '../components/ui';

type TabKey = 'ALL' | 'OPEN' | 'RESOLVED' | 'DISMISSED';

const REASON_LABELS: Record<string, string> = {
  SCAM: '⚠️ Мошенничество / Скам',
  ALREADY_RENTED: '🔒 Уже сдано',
  WRONG_PRICE: '💰 Неверная цена',
  WRONG_PHOTOS: '🖼️ Чужие или фейковые фото',
  DUPLICATE: '📑 Дубликат объявления',
  REALTOR: '👔 Скрытый риелтор / Агентство',
  OTHER: 'ℹ️ Другая причина',
};

export const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const TABS = [
    { id: 'ALL' as const, label: t('common.all', 'Все жалобы') },
    { id: 'OPEN' as const, label: `${t('reports.open', 'Открытые')} (${t('dashboard.pendingModeration', 'требуют внимания')})` },
    { id: 'RESOLVED' as const, label: t('reports.resolved', 'Решённые') },
    { id: 'DISMISSED' as const, label: t('reports.dismissed', 'Отклонённые') },
  ];

  const activeTab = (searchParams.get('tab') as TabKey) || 'ALL';
  const page = Number(searchParams.get('page')) || 1;
  const [pageSize, setPageSize] = useState(10);

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

  const currentStatus = activeTab === 'ALL' ? undefined : (activeTab as ReportStatus);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'reports', activeTab, currentStatus, page, pageSize],
    queryFn: () =>
      getReportsApi({
        status: currentStatus,
        page,
        limit: pageSize,
      }),
  });

  const invalidateReports = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
  };

  const [selectedDetailReport, setSelectedDetailReport] = useState<any | null>(null);
  const [aiReportId, setAiReportId] = useState<string | null>(null);
  const [aiData, setAiData] = useState<ReportAiAnalysisResult | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleOpenAiAnalysis = async (reportId: string) => {
    setAiReportId(reportId);
    setIsAiLoading(true);
    try {
      const result = await getReportAiAnalysisApi(reportId);
      setAiData(result);
    } catch {
      toast.error('Не удалось выполнить AI-анализ переписки');
    } finally {
      setIsAiLoading(false);
    }
  };

  // C1: Optimistic update для смены статуса жалоб
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReportStatus }) =>
      updateReportStatusApi(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'reports'] });
      const previousData = queryClient.getQueriesData({ queryKey: ['admin', 'reports'] });
      queryClient.setQueriesData({ queryKey: ['admin', 'reports'] }, (old: any) => {
        if (!old) return old;
        if (old.items && Array.isArray(old.items)) {
          return {
            ...old,
            items: old.items.map((r: any) => (r.id === id ? { ...r, status } : r)),
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
      toast.error('Не удалось обновить статус жалобы');
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.status === 'RESOLVED'
          ? 'Жалоба отмечена как решённая'
          : 'Жалоба отклонена',
      );
    },
    onSettled: () => {
      invalidateReports();
    },
  });

  const reports: ReportItem[] = data?.items || [];
  const total = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 1;

  const handleExportCSV = () => {
    if (reports.length === 0) {
      toast.error(t('common.noData', 'Нет данных для экспорта'));
      return;
    }
    const headers = ['ID', 'ListingTitle', 'Reason', 'Status', 'ReporterName', 'CreatedAt'];
    const rows = reports.map((r: any) => [
      r.id,
      `"${(r.listing?.title || '').replace(/"/g, '""')}"`,
      r.reason || '',
      r.status || '',
      `"${(r.reporter?.name || '').replace(/"/g, '""')}"`,
      r.createdAt || '',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reports-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Экспорт жалоб завершен');
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="warning">{t('reports.open', 'Открыта')}</Badge>;
      case 'RESOLVED':
        return <Badge variant="success">{t('reports.resolved', 'Решена')}</Badge>;
      case 'DISMISSED':
        return <Badge variant="neutral">{t('reports.dismissed', 'Отклонена')}</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <Layout title={t('reports.title', 'Жалобы на объявления')}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-app tracking-tight">{t('reports.title', 'Жалобы и репорты')}</h1>
            <p className="text-sm text-muted mt-1">
              {t('reports.subtitle', 'Обработка жалоб пользователей на подозрительные или неактуальные объявления')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              leftIcon={<RotateCcw size={14} />}
            >
              {t('common.refresh', 'Обновить')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              leftIcon={<Download size={14} />}
            >
              {t('common.export', 'Экспорт в CSV')}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={TABS}
          activeTab={activeTab}
          onChange={(tab) => {
            updateParams({ tab, page: 1 });
          }}
        />

        {/* Reports List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-28 rounded-2xl bg-surface border border-app animate-pulse" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle size={32} />}
            title="Нет жалоб в этой категории"
            description="Все поступившие жалобы обработаны или список пуст"
          />
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {reports.map((report) => {
                const firstImage = report.listing?.images?.[0]?.url;

                return (
                  <motion.div
                    layout
                    key={report.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden', marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card padding="sm" className="space-y-3">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          {/* Image */}
                          <div className="h-16 w-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 shrink-0 border border-app flex items-center justify-center">
                            {firstImage ? (
                              <img src={firstImage} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Building size={20} className="text-muted opacity-50" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-app truncate">
                                {report.listing?.title || 'Объявление'}
                              </span>
                              {getStatusBadge(report.status)}
                              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                                {REASON_LABELS[report.reason] || report.reason}
                              </span>
                            </div>

                            {report.comment && (
                              <p className="text-xs text-app mt-1 bg-surface p-2 rounded-lg border border-app">
                                &ldquo;{report.comment}&rdquo;
                              </p>
                            )}

                            <div className="flex items-center gap-3 text-xs text-muted mt-2 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {new Date(report.createdAt).toLocaleString()}
                              </span>
                              {report.reporter && (
                                <span>• Заявитель: {report.reporter.name} ({report.reporter.email})</span>
                              )}
                              {report.listing?.owner && (
                                <span>• Автор объекта: {report.listing.owner.name} ({report.listing.owner.email})</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenAiAnalysis(report.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-500/20 text-purple-600 dark:text-purple-400 font-bold hover:bg-purple-100 transition-colors cursor-pointer"
                          >
                            ✨ AI Анализ жалобы и чатов
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedDetailReport(report)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border border-app bg-surface hover:bg-gray-50 dark:hover:bg-white/5 text-app font-medium transition-colors cursor-pointer"
                          >
                            Подробнее об объекте
                          </button>

                          {report.status === 'OPEN' && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() =>
                                  statusMutation.mutate({ id: report.id, status: 'RESOLVED' })
                                }
                                leftIcon={<CheckCircle2 size={14} />}
                              >
                                Решено
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  statusMutation.mutate({ id: report.id, status: 'DISMISSED' })
                                }
                                leftIcon={<XCircle size={14} />}
                              >
                                Отклонить
                              </Button>
                            </>
                          )}

                          <a
                            href={`https://ijara.uz/catalog/${report.listingId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border border-app bg-surface hover:bg-gray-50 dark:hover:bg-white/5 text-muted hover:text-app transition-colors"
                          >
                            <ExternalLink size={12} />
                            На сайте
                          </a>
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

        {/* ─── МОДАЛКА: ПОДРОБНАЯ ИНФОРМАЦИЯ ОБ ОБЪЕКТЕ ИЗ ЖАЛОБЫ ─── */}
        {selectedDetailReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-surface border border-app rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-app pb-3">
                <h3 className="text-lg font-bold text-app flex items-center gap-2">
                  <Building size={20} className="text-primary-500" />
                  Информация об объекте из жалобы
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedDetailReport(null)}
                  className="p-1.5 rounded-lg text-muted hover:text-app hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Фото галерея */}
              {selectedDetailReport.listing?.images && selectedDetailReport.listing.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {selectedDetailReport.listing.images.map((img: any, idx: number) => (
                    <img
                      key={idx}
                      src={img.url}
                      alt=""
                      className="h-28 w-full object-cover rounded-xl border border-app"
                    />
                  ))}
                </div>
              )}

              {/* Параметры */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-app">
                <div>
                  <span className="text-muted block">Название:</span>
                  <span className="font-bold text-app">{selectedDetailReport.listing?.title || '—'}</span>
                </div>
                <div>
                  <span className="text-muted block">Цена:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedDetailReport.listing?.price} сум/мес
                  </span>
                </div>
                <div>
                  <span className="text-muted block">Город / Район:</span>
                  <span className="font-medium text-app">
                    {selectedDetailReport.listing?.city}, {selectedDetailReport.listing?.district || ''}
                  </span>
                </div>
                <div>
                  <span className="text-muted block">Адрес / GPS:</span>
                  <span className="font-medium text-app">{selectedDetailReport.listing?.address || 'Не указан'}</span>
                </div>
                <div>
                  <span className="text-muted block">Комнат / Площадь:</span>
                  <span className="font-medium text-app">
                    {selectedDetailReport.listing?.rooms} комн., {selectedDetailReport.listing?.area} м²
                  </span>
                </div>
                <div>
                  <span className="text-muted block">Этаж:</span>
                  <span className="font-medium text-app">
                    {selectedDetailReport.listing?.floor || '—'} / {selectedDetailReport.listing?.totalFloors || '—'}
                  </span>
                </div>
              </div>

              {/* Описание */}
              {selectedDetailReport.listing?.description && (
                <div>
                  <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Описание объекта:</h4>
                  <p className="text-xs text-app whitespace-pre-line bg-surface p-3 rounded-xl border border-app">
                    {selectedDetailReport.listing.description}
                  </p>
                </div>
              )}

              {/* Контакты сторон */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl border border-app bg-surface">
                  <span className="text-[11px] font-bold text-muted uppercase block mb-1">Автор объявления (Собственник):</span>
                  <p className="text-xs font-semibold text-app">{selectedDetailReport.listing?.owner?.name || '—'}</p>
                  <p className="text-xs text-muted">{selectedDetailReport.listing?.owner?.email}</p>
                  <p className="text-xs text-primary-500">{selectedDetailReport.listing?.owner?.phone || 'Телефон скрыт'}</p>
                </div>
                <div className="p-3 rounded-xl border border-app bg-surface">
                  <span className="text-[11px] font-bold text-rose-500 uppercase block mb-1">Заявитель жалобы:</span>
                  <p className="text-xs font-semibold text-app">{selectedDetailReport.reporter?.name || 'Анонимный'}</p>
                  <p className="text-xs text-muted">{selectedDetailReport.reporter?.email || '—'}</p>
                  <p className="text-xs text-primary-500">{selectedDetailReport.reporter?.phone || '—'}</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDetailReport(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-xs font-bold text-app hover:bg-gray-200"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── МОДАЛКА: AI-АНАЛИЗ ЖАЛОБЫ И ИСТОРИИ ПЕРЕПИСКИ ─── */}
        {aiReportId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-surface border border-app rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-app pb-3">
                <h3 className="text-lg font-bold text-app flex items-center gap-2">
                  <ShieldAlert size={20} className="text-purple-500" />
                  ✨ AI Скоринг мошенничества и проверка чата
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setAiReportId(null);
                    setAiData(null);
                  }}
                  className="p-1.5 rounded-lg text-muted hover:text-app hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              {isAiLoading ? (
                <div className="p-8 text-center space-y-3">
                  <div className="inline-block w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-muted">ИИ читает историю чатов и проводит скоринг рисков...</p>
                </div>
              ) : aiData ? (
                <div className="space-y-4">
                  {/* Оценка риска */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-app bg-purple-50/50 dark:bg-purple-950/20">
                    <div>
                      <span className="text-xs text-muted block">Уровень риска мошенничества</span>
                      <span
                        className={`text-lg font-bold ${
                          aiData.riskScore >= 70
                            ? 'text-rose-500'
                            : aiData.riskScore >= 40
                            ? 'text-amber-500'
                            : 'text-emerald-500'
                        }`}
                      >
                        {aiData.riskScore}% — {aiData.verdict}
                      </span>
                    </div>
                    <div className="text-right text-xs text-muted">
                      Проанализировано сообщений: <span className="font-bold text-app">{aiData.chatMessagesAnalyzed}</span>
                    </div>
                  </div>

                  {/* Рекомендация */}
                  <div className="p-3.5 rounded-xl border border-app bg-surface space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                      Вердикт и рекомендация для модератора:
                    </span>
                    <p className="text-xs font-medium text-app leading-relaxed">
                      {aiData.recommendation}
                    </p>
                  </div>

                  {/* Обнаруженные триггеры */}
                  {aiData.flags && aiData.flags.length > 0 && (
                    <div>
                      <span className="text-xs font-bold text-muted block mb-1.5">Обнаруженные триггеры / Факторы:</span>
                      <ul className="space-y-1">
                        {aiData.flags.map((flag, i) => (
                          <li key={i} className="text-xs text-app flex items-start gap-2 bg-gray-50 dark:bg-white/5 p-2 rounded-lg border border-app">
                            <span className="text-rose-500 shrink-0">•</span>
                            <span>{flag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* История переписки между сторонами */}
                  {aiData.chatHistory && aiData.chatHistory.length > 0 ? (
                    <div>
                      <span className="text-xs font-bold text-muted block mb-1.5">
                        История переписки (Заявитель ↔ Собственник):
                      </span>
                      <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-app text-xs">
                        {aiData.chatHistory.map((m) => (
                          <div
                            key={m.id}
                            className={`p-2 rounded-lg max-w-[80%] ${
                              m.isFromOwner
                                ? 'ml-auto bg-primary-500 text-white'
                                : 'mr-auto bg-surface border border-app text-app'
                            }`}
                          >
                            <span className="text-[10px] opacity-75 block mb-0.5">
                              {m.isFromOwner ? 'Собственник' : 'Заявитель'}:
                            </span>
                            <p>{m.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-center text-xs text-muted">
                      Стороны не вели переписку во встроенном чате платформы (контакт мог быть через прямой звонок).
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAiReportId(null);
                        setAiData(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-xs font-bold text-app hover:bg-gray-200"
                    >
                      Понятно
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ReportsPage;
