import { api } from './axios';

export type FittingLayer = 'BASE_TOP' | 'MID_LAYER' | 'OUTERWEAR' | 'BOTTOM' | 'FOOTWEAR' | 'ACCESSORY';
export type FittingAssetStatus = 'NEEDS_REVIEW' | 'APPROVED' | 'REJECTED';
export type GenerationJobStatus = 'QUEUED' | 'RUNNING' | 'POSTPROCESSING' | 'NEEDS_REVIEW' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type AdminGenerationJob = {
  id: string;
  status: GenerationJobStatus;
  stage: string;
  attemptCount: number;
  maxAttempts: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
};
export type GenerationCapabilities = { enabled: boolean; localWorkerConfigured: boolean };

export type AdminFittingAsset = {
  id: string;
  productId: string;
  variantId: string | null;
  fileSize: number;
  status: FittingAssetStatus;
  source: 'MANUAL' | 'LOCAL_GENERATION';
  garmentLayer: FittingLayer;
  mannequinVersion: string;
  modelVersion: string;
  validationSummary: string | null;
  validationDetails: unknown;
  positionX: number;
  positionY: number;
  positionZ: number;
  scale: number;
  rejectionReason: string | null;
  previewUrl: string | null;
  variant: { id: string; color: string | null; size: string | null } | null;
  createdAt: string;
};

export async function listFittingAssets(productId: string): Promise<AdminFittingAsset[]> {
  const { data } = await api.get<AdminFittingAsset[]>(`/api/v1/admin/products/${encodeURIComponent(productId)}/fitting-room/assets`);
  return data;
}

export async function listFittingGenerationJobs(productId: string): Promise<AdminGenerationJob[]> {
  const { data } = await api.get<AdminGenerationJob[]>(`/api/v1/admin/products/${encodeURIComponent(productId)}/fitting-room/generation-jobs`);
  return data;
}

export async function getFittingGenerationCapabilities(): Promise<GenerationCapabilities> {
  const { data } = await api.get<GenerationCapabilities>('/api/v1/admin/fitting-room/generation-capabilities');
  return data;
}

export async function createFittingGenerationJob(productId: string, input: { variantId?: string; sourceImageIds: string[]; garmentLayer: FittingLayer }) {
  const { data } = await api.post<AdminGenerationJob>(
    `/api/v1/admin/products/${encodeURIComponent(productId)}/fitting-room/generation-jobs`,
    input,
    { headers: { 'Idempotency-Key': crypto.randomUUID() } },
  );
  return data;
}

export async function cancelFittingGenerationJob(jobId: string) {
  const { data } = await api.post(`/api/v1/admin/fitting-room/generation-jobs/${encodeURIComponent(jobId)}/cancel`);
  return data;
}

export async function retryFittingGenerationJob(jobId: string) {
  const { data } = await api.post(`/api/v1/admin/fitting-room/generation-jobs/${encodeURIComponent(jobId)}/retry`);
  return data as AdminGenerationJob;
}

export async function uploadFittingAsset(productId: string, file: File, garmentLayer: FittingLayer, variantId?: string) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post(`/api/v1/admin/products/${encodeURIComponent(productId)}/fitting-room/assets`, form, {
    params: { layer: garmentLayer, ...(variantId ? { variantId } : {}) },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data as { id: string; status: FittingAssetStatus; previewUrl: string | null };
}

export async function updateFittingAsset(assetId: string, input: Partial<Pick<AdminFittingAsset, 'garmentLayer' | 'variantId' | 'positionX' | 'positionY' | 'positionZ' | 'scale'>>) {
  const { data } = await api.patch(`/api/v1/admin/fitting-room/assets/${encodeURIComponent(assetId)}`, input);
  return data;
}

export async function reviewFittingAsset(assetId: string, action: 'approve' | 'reject', rejectionReason?: string) {
  const { data } = await api.post(`/api/v1/admin/fitting-room/assets/${encodeURIComponent(assetId)}/review`, { action, rejectionReason });
  return data;
}

export async function deleteFittingAsset(assetId: string) {
  await api.delete(`/api/v1/admin/fitting-room/assets/${encodeURIComponent(assetId)}`);
}

