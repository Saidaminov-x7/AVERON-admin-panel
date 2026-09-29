// src/pages/MediaLibraryPage.tsx
// Медиа-библиотека платформы: просмотр, поиск, загрузка, удаление и копирование ссылок на изображения

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Image as ImageIcon,
  Copy,
  Trash2,
  ExternalLink,
  Plus,
  Grid,
  List,
  RotateCcw,
  Check,
  CheckSquare,
  Square,
} from 'lucide-react';
import Layout from '../components/Layout';
import {
  getMediaListApi,
  uploadMediaApi,
  deleteMediaApi,
  type MediaItem,
} from '../lib/mediaApi';
import {
  Button,
  Modal,
  Pagination,
  EmptyState,
  ConfirmDialog,
  FileUpload,
  Badge,
  Card,
} from '../components/ui';

export const MediaLibraryPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['media-library', page, pageSize],
    queryFn: () => getMediaListApi({ page, limit: pageSize }),
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        await uploadMediaApi(file);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-library'] });
      setIsUploadModalOpen(false);
      toast.success(t('media.uploadSuccess', 'Изображения успешно загружены'));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || t('media.uploadError', 'Ошибка загрузки файлов'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMediaApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-library'] });
      toast.success(t('media.deleteSuccess', 'Файл успешно удалён'));
      if (selectedImage?.id === deleteConfirmId) setSelectedImage(null);
      setDeleteConfirmId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || t('media.deleteError', 'Ошибка удаления файла'));
    },
  });

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success(t('media.copySuccess', 'Ссылка скопирована в буфер обмена'));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (data?.items && selectedIds.length === data.items.length) {
      setSelectedIds([]);
    } else if (data?.items) {
      setSelectedIds(data.items.map((i) => i.id));
    }
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteMediaApi(id);
    }
    queryClient.invalidateQueries({ queryKey: ['media-library'] });
    toast.success(t('media.bulkDeleteSuccess', { count: selectedIds.length, defaultValue: `Удалено файлов: ${selectedIds.length}` }));
    setSelectedIds([]);
    setIsBulkDeleteOpen(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const items = data?.items || [];
  const total = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 1;

  return (
    <Layout title={t('media.title', 'Медиа-библиотека')}>
      <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-app tracking-tight flex items-center gap-2.5">
              <span>{t('media.title', 'Медиа-библиотека')}</span>
              <Badge variant="primary" size="sm">
                {t('media.filesCount', { count: total, defaultValue: `${total} файлов` })}
              </Badge>
              <Badge variant="neutral" size="sm">
                {formatFileSize(data?.meta?.totalBytes || 0)} {t('media.used', 'занято')}
              </Badge>
            </h1>
            <p className="text-xs text-muted mt-0.5">
              {t('media.subtitle', 'Хранилище загруженных изображений и медиаресурсов платформы')}
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
              variant="primary"
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              icon={<Plus size={16} />}
            >
              {t('media.uploadFiles', 'Загрузить файлы')}
            </Button>
          </div>
        </div>

        {/* Toolbar: Bulk actions, view modes & select all */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 rounded-2xl bg-surface border border-app shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-xs font-semibold text-app hover:text-primary-600 cursor-pointer"
            >
              {selectedIds.length === items.length && items.length > 0 ? (
                <CheckSquare size={16} className="text-primary-500" />
              ) : (
                <Square size={16} className="text-muted" />
              )}
              <span>{t('media.selectAll', 'Выбрать все')} ({items.length})</span>
            </button>

            {selectedIds.length > 0 && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsBulkDeleteOpen(true)}
                icon={<Trash2 size={14} />}
              >
                {t('media.deleteSelected', 'Удалить выбранные')} ({selectedIds.length})
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl border transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-surface border-app text-muted hover:text-app'
              }`}
              title={t('media.gridView', 'Сетка')}
            >
              <Grid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl border transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-surface border-app text-muted hover:text-app'
              }`}
              title={t('media.listView', 'Список')}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Media Grid / List */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-surface border border-app animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ImageIcon size={32} />}
            title={t('media.emptyTitle', 'Библиотека пуста')}
            description={t('media.emptyDesc', 'Загрузите ваши первые изображения или баннеры')}
            actionLabel={t('media.uploadFiles', 'Загрузить изображения')}
            onAction={() => setIsUploadModalOpen(true)}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {items.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const isCopied = copiedId === item.id;

              return (
                <div
                  key={item.id}
                  className={`group relative rounded-2xl border overflow-hidden bg-surface transition-all duration-150 shadow-xs hover:shadow-md ${
                    isSelected ? 'ring-2 ring-primary-500 border-primary-500' : 'border-app'
                  }`}
                >
                  {/* Select Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelect(item.id);
                    }}
                    className="absolute top-2 left-2 z-10 p-1 rounded-lg bg-black/50 text-white backdrop-blur-xs hover:bg-black transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare size={14} className="text-primary-400" />
                    ) : (
                      <Square size={14} />
                    )}
                  </button>

                  {/* Thumbnail Image */}
                  <div
                    onClick={() => setSelectedImage(item)}
                    className="aspect-square cursor-pointer overflow-hidden bg-gray-100 dark:bg-white/5 flex items-center justify-center"
                  >
                    <img
                      src={item.url}
                      alt={item.id}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                  </div>

                  {/* Footer overlay */}
                  <div className="p-2 flex items-center justify-between text-[11px] text-muted border-t border-app">
                    <span className="truncate">{formatFileSize(item.size)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyUrl(item.url, item.id);
                        }}
                        className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 text-muted hover:text-app transition-colors"
                        title={t('media.copyLink', 'Скопировать ссылку')}
                      >
                        {isCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(item.id);
                        }}
                        className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 transition-colors"
                        title={t('common.delete', 'Удалить')}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="rounded-2xl border border-app bg-surface overflow-hidden divide-y divide-app">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleSelect(item.id)}
                    className="text-muted hover:text-primary-500"
                  >
                    {selectedIds.includes(item.id) ? (
                      <CheckSquare size={16} className="text-primary-500" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                  <img
                    src={item.url}
                    alt=""
                    className="h-12 w-12 rounded-xl object-cover border border-app shrink-0 cursor-pointer"
                    onClick={() => setSelectedImage(item)}
                  />
                  <div className="min-w-0">
                    <p
                      onClick={() => setSelectedImage(item)}
                      className="text-xs font-semibold text-app truncate cursor-pointer hover:text-primary-500"
                    >
                      {item.url.split('/').pop()}
                    </p>
                    <p className="text-[11px] text-muted font-mono mt-0.5">
                      {formatFileSize(item.size)} • {item.mimeType} • {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyUrl(item.url, item.id)}
                    icon={copiedId === item.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  >
                    {copiedId === item.id ? t('media.copied', 'Скопировано') : t('media.copyLink', 'Ссылка')}
                  </Button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl border border-app text-muted hover:text-app hover:bg-gray-100 dark:hover:bg-white/10"
                    title={t('media.openNewTab', 'Открыть в новой вкладке')}
                  >
                    <ExternalLink size={14} />
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteConfirmId(item.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />

        {/* Upload Modal */}
        <Modal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          title={t('media.uploadModalTitle', 'Загрузка медиафайлов')}
          subtitle={t('media.uploadModalSubtitle', 'Выберите или перетащите изображения для загрузки в хранилище')}
          size="lg"
        >
          <FileUpload
            multiple
            loading={uploadMutation.isPending}
            onUpload={async (files) => {
              await uploadMutation.mutateAsync(files);
            }}
          />
        </Modal>

        {/* Image Detail Preview Modal */}
        {selectedImage && (
          <Modal
            isOpen={!!selectedImage}
            onClose={() => setSelectedImage(null)}
            title={t('media.fileDetails', 'Сведения о файле')}
            size="lg"
            footer={
              <div className="flex items-center justify-between w-full">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleteConfirmId(selectedImage.id)}
                  icon={<Trash2 size={14} />}
                >
                  {t('common.delete', 'Удалить')}
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyUrl(selectedImage.url, selectedImage.id)}
                    icon={<Copy size={14} />}
                  >
                    {t('media.copyUrl', 'Скопировать URL')}
                  </Button>
                  <a
                    href={selectedImage.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    {t('media.openNewTab', 'Открыть в новой вкладке')} <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="max-h-80 overflow-hidden rounded-2xl bg-black/10 dark:bg-black/40 border border-app flex items-center justify-center p-2">
                <img
                  src={selectedImage.url}
                  alt=""
                  className="max-h-72 w-auto object-contain rounded-xl shadow-md"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <Card padding="sm">
                  <span className="text-muted block text-[10px]">{t('media.fileSize', 'Размер файла')}:</span>
                  <strong className="text-app">{formatFileSize(selectedImage.size)}</strong>
                </Card>
                <Card padding="sm">
                  <span className="text-muted block text-[10px]">MIME-{t('media.type', 'тип')}:</span>
                  <strong className="text-app font-mono">{selectedImage.mimeType}</strong>
                </Card>
                <Card padding="sm">
                  <span className="text-muted block text-[10px]">{t('media.createdAt', 'Дата создания')}:</span>
                  <strong className="text-app">{new Date(selectedImage.createdAt).toLocaleDateString()}</strong>
                </Card>
                <Card padding="sm">
                  <span className="text-muted block text-[10px]">{t('media.fileId', 'ID файла')}:</span>
                  <strong className="text-app font-mono text-[10px] truncate block">{selectedImage.id}</strong>
                </Card>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-app text-xs flex items-center justify-between gap-3">
                <span className="font-mono text-muted truncate text-[11px]">{selectedImage.url}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyUrl(selectedImage.url, selectedImage.id)}
                  icon={<Copy size={12} />}
                >
                  {t('media.copy', 'Копировать')}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Delete Single Confirm Dialog */}
        <ConfirmDialog
          isOpen={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={() => {
            if (deleteConfirmId) deleteMutation.mutate(deleteConfirmId);
          }}
          title={t('media.deleteConfirmTitle', 'Удалить файл из библиотеки?')}
          message={t('media.deleteConfirmMsg', 'Вы уверены, что хотите удалить этот файл? Если он используется в объявлениях или на страницах, ссылка перестанет работать.')}
          confirmLabel={t('common.delete', 'Удалить')}
          variant="danger"
          loading={deleteMutation.isPending}
        />

        {/* Bulk Delete Confirm Dialog */}
        <ConfirmDialog
          isOpen={isBulkDeleteOpen}
          onClose={() => setIsBulkDeleteOpen(false)}
          onConfirm={handleBulkDelete}
          title={t('media.bulkDeleteTitle', 'Удалить выбранные файлы?')}
          message={t('media.bulkDeleteMsg', { count: selectedIds.length, defaultValue: `Вы уверены, что хотите удалить ${selectedIds.length} файлов? Это действие необратимо.` })}
          confirmLabel={t('media.deleteAll', 'Удалить все')}
          variant="danger"
        />
      </div>
    </Layout>
  );
};

export default MediaLibraryPage;
