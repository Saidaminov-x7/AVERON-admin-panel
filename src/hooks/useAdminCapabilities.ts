import { useQuery } from '@tanstack/react-query';
import { getAdminCapabilitiesApi } from '../lib/productAiApi';

export function useAdminCapabilities(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'capabilities'],
    queryFn: ({ signal }) => getAdminCapabilitiesApi(signal),
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
