import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { Button, Input, Select } from '../../components/ui';
import { repairMojibake } from '../../lib/repairMojibake';
import { lazy, Suspense } from 'react';

const FittingAssetPreview = lazy(() => import('../../components/commerce/FittingAssetPreview').then((module) => ({ default: module.FittingAssetPreview })));
import {
  deleteFittingAsset,
  cancelFittingGenerationJob,
  createFittingGenerationJob,
  getFittingGenerationCapabilities,
  listFittingGenerationJobs,
  listFittingAssets,
  retryFittingGenerationJob,
  reviewFittingAsset,
  updateFittingAsset,
  uploadFittingAsset,
  type AdminFittingAsset,
  type FittingLayer,
  type AdminGenerationJob,
} from '../../lib/fittingRoomApi';

const layers: FittingLayer[] = ['BASE_TOP', 'MID_LAYER', 'OUTERWEAR', 'BOTTOM', 'FOOTWEAR', 'ACCESSORY'];

export function ProductFittingRoomPanel({ productId, variants = [], sourceImages = [] }: { productId: string | null; variants?: Array<{ id: string; color?: string | null; size?: string | null }>; sourceImages?: Array<{ id: string; url: string }> }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage === 'uz' || i18n.resolvedLanguage === 'en' ? i18n.resolvedLanguage : 'ru';
  const queryClient = useQueryClient();
  const [layer, setLayer] = useState<FittingLayer>('BASE_TOP');
  const [variantId, setVariantId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AdminFittingAsset | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [formError, setFormError] = useState('');
  const [sourceImageIds, setSourceImageIds] = useState<string[]>([]);
  const queryKey = useMemo(() => ['admin', 'products', productId, 'fitting-room-assets'], [productId]);
  const jobsQueryKey = useMemo(() => ['admin', 'products', productId, 'fitting-room-generation-jobs'], [productId]);
  const assetsQuery = useQuery({
    queryKey,
    queryFn: () => listFittingAssets(productId!),
    enabled: Boolean(productId && sourceImages.length > 0),
    retry: false,
  });
  const generationCapabilitiesQuery = useQuery({
    queryKey: ['admin', 'fitting-room', 'generation-capabilities'],
    queryFn: getFittingGenerationCapabilities,
    enabled: Boolean(productId),
    retry: false,
  });
  const jobsQuery = useQuery({
    queryKey: jobsQueryKey,
    queryFn: () => listFittingGenerationJobs(productId!),
    enabled: Boolean(productId) && generationCapabilitiesQuery.data !== undefined && !generationCapabilitiesQuery.isError,
    retry: false,
    refetchInterval: (query) => query.state.data?.some((job) => job.status === 'QUEUED' || job.status === 'RUNNING' || job.status === 'POSTPROCESSING') ? 3000 : false,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const refreshJobs = () => queryClient.invalidateQueries({ queryKey: jobsQueryKey });
  const uploadMutation = useMutation({
    mutationFn: () => uploadFittingAsset(productId!, file!, layer, variantId || undefined),
    onSuccess: () => { setFile(null); setFormError(''); void refresh(); },
    onError: (error) => setFormError(isAxiosError(error) ? String(error.response?.data?.code ?? t('products.fittingRoom.uploadError')) : t('products.fittingRoom.uploadError')),
  });
  const reviewMutation = useMutation({
    mutationFn: ({ assetId, action }: { assetId: string; action: 'approve' | 'reject' }) => reviewFittingAsset(assetId, action, action === 'reject' ? rejectionReason : undefined),
    onSuccess: () => { setFormError(''); setRejectionReason(''); void refresh(); },
    onError: (error) => setFormError(isAxiosError(error) ? String(error.response?.data?.code ?? t('products.fittingRoom.reviewError')) : t('products.fittingRoom.reviewError')),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteFittingAsset,
    onSuccess: () => { setSelectedAsset(null); void refresh(); },
    onError: (error) => setFormError(isAxiosError(error) ? String(error.response?.data?.code ?? t('products.fittingRoom.deleteError')) : t('products.fittingRoom.deleteError')),
  });
  const updateMutation = useMutation({
    mutationFn: ({ assetId, ...input }: Parameters<typeof updateFittingAsset>[1] & { assetId: string }) => updateFittingAsset(assetId, input),
    onSuccess: () => void refresh(),
    onError: () => setFormError(t('products.fittingRoom.updateError')),
  });
  const generationMutation = useMutation({
    mutationFn: () => createFittingGenerationJob(productId!, {
      ...(variantId ? { variantId } : {}),
      sourceImageIds,
      garmentLayer: layer,
    }),
    onSuccess: () => { setFormError(''); void refreshJobs(); },
    onError: (error) => setFormError(isAxiosError(error) ? String(error.response?.data?.code ?? 'LOCAL_GENERATION_UNAVAILABLE') : 'LOCAL_GENERATION_UNAVAILABLE'),
  });
  const jobActionMutation = useMutation({
    mutationFn: ({ job, action }: { job: AdminGenerationJob; action: 'cancel' | 'retry' }) => action === 'cancel' ? cancelFittingGenerationJob(job.id) : retryFittingGenerationJob(job.id),
    onSuccess: () => void refreshJobs(),
    onError: (error) => setFormError(isAxiosError(error) ? String(error.response?.data?.code ?? 'GENERATION_JOB_ACTION_FAILED') : 'GENERATION_JOB_ACTION_FAILED'),
  });
  const layerLabel = (value: FittingLayer) => repairMojibake(({
    BASE_TOP: { ru: 'Р’РµСЂС…РЅРёР№ СЃР»РѕР№', uz: 'Ichki ustki qatlam', en: 'Base layer' },
    MID_LAYER: { ru: 'РЎСЂРµРґРЅРёР№ СЃР»РѕР№', uz: 'OвЂrta qatlam', en: 'Mid layer' },
    OUTERWEAR: { ru: 'Р’РµСЂС…РЅСЏСЏ РѕРґРµР¶РґР°', uz: 'Tashqi kiyim', en: 'Outerwear' },
    BOTTOM: { ru: 'РќРёР¶РЅСЏСЏ РѕРґРµР¶РґР°', uz: 'Pastki kiyim', en: 'Bottom' },
    FOOTWEAR: { ru: 'РћР±СѓРІСЊ', uz: 'Oyoq kiyim', en: 'Footwear' },
    ACCESSORY: { ru: 'РђРєСЃРµСЃСЃСѓР°СЂС‹', uz: 'Aksessuarlar', en: 'Accessories' },
  }[value][language]));
  const layerOptions = layers.map((value) => ({ value, label: layerLabel(value) }));
  const variantOptions = [
    { value: '', label: t('products.fittingRoom.allVariants') },
    ...variants.map((variant) => ({ value: variant.id, label: [variant.color, variant.size].filter(Boolean).join(' / ') || variant.id })),
  ];
  const statusLabel = (status: AdminFittingAsset['status']) => t(`products.fittingRoom.status.${status}`);

  if (!productId) {
    return <section className="space-y-3 rounded-lg border border-app bg-surface p-4">
      <h4 className="text-sm font-bold text-app">{t('products.fittingRoom.title')}</h4>
      <p className="text-sm text-muted">{t('products.fittingRoom.saveFirst')}</p>
    </section>;
  }

  return <section className="space-y-5 rounded-lg border border-app bg-surface p-4">
    <div><h4 className="text-sm font-bold text-app">{t('products.fittingRoom.title')}</h4><p className="mt-1 text-xs leading-5 text-muted">{t('products.fittingRoom.description')}</p></div>
    <div className="grid gap-3 rounded-lg border border-app bg-surface-muted p-4 sm:grid-cols-2">
      <Select label={t('products.fittingRoom.layer')} value={layer} options={layerOptions} onChange={(value) => setLayer(value as FittingLayer)} />
      <Select label={t('products.fittingRoom.variant')} value={variantId} options={variantOptions} onChange={setVariantId} />
      <label className="sm:col-span-2 min-w-0"><span className="mb-1 block text-xs font-semibold text-app">{t('products.fittingRoom.glbFile')}</span><input type="file" accept=".glb,model/gltf-binary" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block min-h-11 min-w-0 w-full rounded-md border border-app bg-surface px-2 py-2 text-xs text-app file:mr-2 file:border-0 file:bg-transparent file:text-xs file:font-semibold"/><span className="mt-1 block text-xs text-muted">{t('products.fittingRoom.fileHint')}</span></label>
      <div className="sm:col-span-2"><Button type="button" loading={uploadMutation.isPending} disabled={!file} onClick={() => uploadMutation.mutate()}>{uploadMutation.isPending ? t('products.fittingRoom.uploading') : t('products.fittingRoom.upload')}</Button></div>
      {formError && <p role="alert" className="sm:col-span-2 text-sm text-red-600 dark:text-red-300">{formError}</p>}
    </div>
    <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-5 text-app">
      <p>{t('products.fittingRoom.generationUnavailable')}</p>
      {sourceImages.length > 0 && generationCapabilitiesQuery.data?.enabled && generationCapabilitiesQuery.data.localWorkerConfigured && <fieldset className="space-y-2">
        <legend className="font-semibold">{language === 'ru' ? 'Исходные фотографии' : language === 'uz' ? 'Manba rasmlari' : 'Source photos'}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {sourceImages.map((image, index) => <label key={image.id} className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md border border-app bg-surface p-2">
            <input type="checkbox" checked={sourceImageIds.includes(image.id)} onChange={(event) => setSourceImageIds((current) => event.target.checked ? [...current, image.id].slice(0, 12) : current.filter((id) => id !== image.id))} />
            <img src={image.url} alt="" className="h-12 w-10 shrink-0 rounded object-cover" />
            <span className="truncate">{language === 'ru' ? `Фото ${index + 1}` : language === 'uz' ? `${index + 1}-rasm` : `Photo ${index + 1}`}</span>
          </label>)}
        </div>
        <Button type="button" loading={generationMutation.isPending} disabled={!sourceImageIds.length} onClick={() => generationMutation.mutate()}>
          {language === 'ru' ? 'Поставить в очередь 3D-модели' : language === 'uz' ? '3D modelni navbatga qo\u2018shish' : 'Queue local 3D generation'}
        </Button>
      </fieldset>}
      {sourceImages.length === 0 && <p className="text-muted">{language === 'ru' ? 'Сначала сохраните товар минимум с одной фотографией.' : language === 'uz' ? 'Avval kamida bitta rasm bilan mahsulotni saqlang.' : 'Save the product with at least one photo first.'}</p>}
      {sourceImages.length > 0 && generationCapabilitiesQuery.data && (!generationCapabilitiesQuery.data.enabled || !generationCapabilitiesQuery.data.localWorkerConfigured) && <p className="text-muted">{language === 'ru' ? 'Постановка заданий отключена: включите флаг локальной генерации и настройте локальный worker.' : language === 'uz' ? 'Vazifalar navbatga qo\u2018shilmaydi: mahalliy generatsiya bayrog\u2018ini yoqing va worker sozlang.' : 'Queue submission is disabled until local generation is enabled and the worker is configured.'}</p>}
      {sourceImages.length > 0 && generationCapabilitiesQuery.isError && <p role="alert" className="text-red-600 dark:text-red-300">{language === 'ru' ? 'Не удалось проверить готовность локального worker.' : language === 'uz' ? 'Mahalliy worker holatini tekshirib bo\u2018lmadi.' : 'Could not check local worker readiness.'}</p>}
      {jobsQuery.isError && <p role="alert" className="text-red-600 dark:text-red-300">{t('products.fittingRoom.loadError')}</p>}
      {jobsQuery.data?.length ? <div className="space-y-2 border-t border-app pt-3">
        <h5 className="font-semibold">{language === 'ru' ? 'Задания генерации' : language === 'uz' ? 'Generatsiya vazifalari' : 'Generation jobs'}</h5>
        {jobsQuery.data.map((job) => <article key={job.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-app bg-surface p-2">
          <div className="min-w-0"><p className="font-medium">{job.status} · {job.stage}</p><p className="break-words text-muted">{job.errorCode ?? job.errorMessage ?? `${job.attemptCount}/${job.maxAttempts}`}</p></div>
          {job.status === 'FAILED' && <Button type="button" variant="outline" loading={jobActionMutation.isPending} onClick={() => jobActionMutation.mutate({ job, action: 'retry' })}>{language === 'ru' ? 'Повторить' : language === 'uz' ? 'Qayta urinish' : 'Retry'}</Button>}
          {['QUEUED', 'RUNNING', 'POSTPROCESSING'].includes(job.status) && <Button type="button" variant="outline" loading={jobActionMutation.isPending} onClick={() => jobActionMutation.mutate({ job, action: 'cancel' })}>{language === 'ru' ? 'Отменить' : language === 'uz' ? 'Bekor qilish' : 'Cancel'}</Button>}
        </article>)}
      </div> : null}
      {formError && <p role="alert" className="text-red-600 dark:text-red-300">{formError}</p>}
    </div>
    {assetsQuery.isLoading ? <p role="status" className="text-sm text-muted">{t('products.fittingRoom.loading')}</p>
      : assetsQuery.isError ? <p role="alert" className="text-sm text-red-600 dark:text-red-300">{t('products.fittingRoom.loadError')}</p>
        : assetsQuery.data?.length ? <div className="space-y-4">{assetsQuery.data.map((asset) => <article key={asset.id} className="grid gap-4 rounded-lg border border-app p-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,.9fr)]">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold text-app">{layerLabel(asset.garmentLayer)}</p><p className="mt-1 text-xs text-muted">{(asset.fileSize / 1024 / 1024).toFixed(2)} MB · {asset.mannequinVersion}</p></div><span className={`rounded-full border px-2 py-1 text-xs font-medium ${asset.status === 'APPROVED' ? 'border-emerald-600/30 text-emerald-700 dark:text-emerald-300' : asset.status === 'REJECTED' ? 'border-red-600/30 text-red-700 dark:text-red-300' : 'border-amber-600/30 text-amber-700 dark:text-amber-300'}`}>{statusLabel(asset.status)}</span></div>
            <p className="text-xs leading-5 text-muted">{asset.validationSummary || t('products.fittingRoom.validationPassed')}</p>
            {asset.rejectionReason && <p className="text-xs text-red-700 dark:text-red-300">{asset.rejectionReason}</p>}
            <Select label={t('products.fittingRoom.layer')} value={asset.garmentLayer} options={layerOptions} onChange={(value) => void updateMutation.mutateAsync({ assetId: asset.id, garmentLayer: value as FittingLayer })} />
            <Select label={t('products.fittingRoom.variant')} value={asset.variantId ?? ''} options={variantOptions} onChange={(value) => void updateMutation.mutateAsync({ assetId: asset.id, variantId: value || null })} />
            <div className="grid grid-cols-2 gap-3">
              <Input key={`${asset.id}:scale:${asset.scale}`} label={t('products.fittingRoom.scale')} type="number" min="0.25" max="3" step="0.05" defaultValue={asset.scale} onBlur={(event) => { const value = Number(event.currentTarget.value); if (Number.isFinite(value) && value >= 0.25 && value <= 3 && value !== asset.scale) void updateMutation.mutateAsync({ assetId: asset.id, scale: value }); }} />
              <Input key={`${asset.id}:x:${asset.positionX}`} label={t('products.fittingRoom.positionX')} type="number" min="-2" max="2" step="0.01" defaultValue={asset.positionX} onBlur={(event) => { const value = Number(event.currentTarget.value); if (Number.isFinite(value) && value >= -2 && value <= 2 && value !== asset.positionX) void updateMutation.mutateAsync({ assetId: asset.id, positionX: value }); }} />
              <Input key={`${asset.id}:y:${asset.positionY}`} label={t('products.fittingRoom.positionY')} type="number" min="-2" max="2" step="0.01" defaultValue={asset.positionY} onBlur={(event) => { const value = Number(event.currentTarget.value); if (Number.isFinite(value) && value >= -2 && value <= 2 && value !== asset.positionY) void updateMutation.mutateAsync({ assetId: asset.id, positionY: value }); }} />
              <Input key={`${asset.id}:z:${asset.positionZ}`} label={t('products.fittingRoom.positionZ')} type="number" min="-2" max="2" step="0.01" defaultValue={asset.positionZ} onBlur={(event) => { const value = Number(event.currentTarget.value); if (Number.isFinite(value) && value >= -2 && value <= 2 && value !== asset.positionZ) void updateMutation.mutateAsync({ assetId: asset.id, positionZ: value }); }} />
            </div>
            {asset.status === 'NEEDS_REVIEW' && <div className="space-y-2 border-t border-app pt-3">
              <Input label={t('products.fittingRoom.rejectionReason')} value={selectedAsset?.id === asset.id ? rejectionReason : ''} onChange={(event) => { setSelectedAsset(asset); setRejectionReason(event.target.value); }} />
              <div className="flex flex-wrap gap-2"><Button type="button" loading={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ assetId: asset.id, action: 'approve' })}>{t('products.fittingRoom.approve')}</Button><Button type="button" variant="outline" loading={reviewMutation.isPending} disabled={!rejectionReason.trim()} onClick={() => reviewMutation.mutate({ assetId: asset.id, action: 'reject' })}>{t('products.fittingRoom.reject')}</Button></div>
            </div>}
            <Button type="button" variant="danger" loading={deleteMutation.isPending} onClick={() => { if (window.confirm(t('products.fittingRoom.confirmDelete'))) deleteMutation.mutate(asset.id); }}>{t('products.fittingRoom.delete')}</Button>
          </div>
          {asset.previewUrl ? <Suspense fallback={<p role="status" className="grid min-h-48 place-items-center rounded-lg border border-app p-4 text-center text-xs text-muted">{t('products.fittingRoom.loading')}</p>}><FittingAssetPreview url={asset.previewUrl} transform={{ scale: asset.scale, positionX: asset.positionX, positionY: asset.positionY, positionZ: asset.positionZ }} labels={{ loading: t('products.fittingRoom.loading'), unavailable: t('products.fittingRoom.previewError'), left: t('products.fittingRoom.left'), right: t('products.fittingRoom.right') }} /></Suspense> : <p role="alert" className="grid min-h-48 place-items-center rounded-lg border border-app p-4 text-center text-xs text-muted">{t('products.fittingRoom.previewError')}</p>}
        </article>)}</div>
        : <p className="text-sm text-muted">{t('products.fittingRoom.noAssets')}</p>}
  </section>;
}


