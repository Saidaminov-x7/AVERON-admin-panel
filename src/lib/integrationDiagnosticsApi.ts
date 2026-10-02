import { api } from './axios';

export interface IntegrationDiagnostic {
  name: string;
  featureEnabled: boolean;
  configured: boolean;
  implementationStatus: string;
  verificationStatus: string;
  degraded: boolean;
  lastSuccessfulOperation: string | null;
  rateProvider?: string | null;
  currentRate?: number | null;
  rateFetchedAt?: string | null;
  providerTimestamp?: string | null;
  stale?: boolean | null;
}

export async function getIntegrationDiagnostics() {
  const { data } = await api.get<IntegrationDiagnostic[]>('/api/v1/admin/integration-diagnostics');
  return data;
}
