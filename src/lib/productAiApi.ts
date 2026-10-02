import { api } from './axios';
import { isProductCountry } from './commerceApi';
import type { ProductCountry, ProductLocale } from './commerceApi';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export interface AdminCapabilities {
  aiProductFill: boolean;
  imageEmbeddings?: boolean;
}

export interface ProductAiVariant {
  size?: string;
  color?: string;
}

export interface ProductAiSuggestionsRequest {
  sourceTitle: string;
  sourceDescription?: string;
  country: ProductCountry;
  categoryName?: string;
  characteristics?: Record<string, string>;
  variants?: ProductAiVariant[];
}

export interface ProductAiLocaleSuggestion {
  title: string;
  description: string;
  characteristics: Record<string, string>;
}

export type ProductAiSuggestions = Record<ProductLocale, ProductAiLocaleSuggestion>;

export interface ProductAiSuggestionsResponse {
  suggestions: ProductAiSuggestions;
}

export interface ProductLocalizedContent {
  title: string;
  description: string;
}

export function applyProductAiSuggestions(
  current: Record<ProductLocale, ProductLocalizedContent>,
  currentVariant: ProductAiVariant,
  suggestions: ProductAiSuggestions,
): {
  translations: Record<ProductLocale, ProductLocalizedContent>;
  variant: ProductAiVariant;
  appliedCount: number;
  firstAppliedLocale: ProductLocale | null;
} {
  const translations = { ...current };
  const variant = { ...currentVariant };
  let appliedCount = 0;
  let firstAppliedLocale: ProductLocale | null = null;

  for (const locale of ['ru', 'uz', 'en'] as const) {
    const suggestion = suggestions[locale];
    const next = { ...current[locale] };
    for (const field of ['title', 'description'] as const) {
      const value = suggestion[field].trim();
      if (value && !current[locale][field].trim()) {
        next[field] = value;
        appliedCount += 1;
        firstAppliedLocale ??= locale;
      }
    }
    translations[locale] = next;

    for (const [name, value] of Object.entries(suggestion.characteristics)) {
      const key = name.toLowerCase().replace(/[\s_-]/g, '');
      if (key === 'color' && value.trim() && !variant.color?.trim()) {
        variant.color = value.trim();
        appliedCount += 1;
      } else if (key === 'size' && value.trim() && !variant.size?.trim()) {
        variant.size = value.trim();
        appliedCount += 1;
      }
    }
  }

  return { translations, variant, appliedCount, firstAppliedLocale };
}

export function hasAiProductFillCapability(
  capabilities: AdminCapabilities | undefined,
): boolean {
  return capabilities?.aiProductFill === true;
}

export function hasImageEmbeddingsCapability(
  capabilities: AdminCapabilities | undefined,
): boolean {
  return capabilities?.imageEmbeddings === true;
}

export function parseAdminCapabilities(value: unknown): AdminCapabilities {
  if (
    !value ||
    typeof value !== 'object' ||
    !('aiProductFill' in value) ||
    typeof value.aiProductFill !== 'boolean' ||
    ('imageEmbeddings' in value && typeof value.imageEmbeddings !== 'boolean')
  ) {
    throw new Error('Invalid admin capabilities response');
  }
  const source = value as Record<string, unknown>;
  return {
    aiProductFill: source.aiProductFill as boolean,
    imageEmbeddings: typeof source.imageEmbeddings === 'boolean' ? source.imageEmbeddings : false,
  };
}

export function toProductAiCountry(country: string): ProductCountry {
  if (!isProductCountry(country)) throw new Error('A supported product country is required');
  return country;
}

export function parseProductAiSuggestions(value: unknown): ProductAiSuggestionsResponse {
  if (!value || typeof value !== 'object' || !('suggestions' in value)) {
    throw new Error('Invalid product suggestions response');
  }

  const source = (value as { suggestions: unknown }).suggestions;
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('Invalid product suggestions response');
  }
  const suggestions = source as Record<string, unknown>;
  const parsed = {} as ProductAiSuggestions;

  for (const locale of ['ru', 'uz', 'en'] as const) {
    const entry = suggestions[locale];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error('Invalid product suggestions response');
    }
    const localized = entry as Record<string, unknown>;
    if (
      typeof localized.title !== 'string' ||
      typeof localized.description !== 'string' ||
      !localized.characteristics ||
      typeof localized.characteristics !== 'object' ||
      Array.isArray(localized.characteristics)
    ) {
      throw new Error('Invalid product suggestions response');
    }

    const characteristics: Record<string, string> = {};
    for (const [key, item] of Object.entries(localized.characteristics)) {
      if (typeof item !== 'string') throw new Error('Invalid product suggestions response');
      characteristics[key] = item;
    }
    parsed[locale] = {
      title: localized.title,
      description: localized.description,
      characteristics,
    };
  }

  if (!Object.values(parsed).some(({ title, description, characteristics }) =>
    title.trim() || description.trim() || Object.values(characteristics).some((item) => item.trim()),
  )) {
    throw new Error('No product suggestions were returned');
  }
  return { suggestions: parsed };
}

export async function getAdminCapabilitiesApi(signal?: AbortSignal): Promise<AdminCapabilities> {
  const { data } = await api.get<unknown>('/api/v1/capabilities', { signal });
  return parseAdminCapabilities(data);
}

export type AdminAiStatus = {
  flags: {
    aiSearch: boolean;
    styleAssistant: boolean;
    completeTheLook: boolean;
  };
  provider: string;
  model: string;
  providerConfigured: boolean;
  timeoutMs: number;
};

export function parseAdminAiStatus(value: unknown): AdminAiStatus {
  if (!isRecord(value) || !isRecord(value.flags)) throw new Error('Invalid AI status response');
  const flags = value.flags;
  if (
    typeof flags.aiSearch !== 'boolean' ||
    typeof flags.styleAssistant !== 'boolean' ||
    typeof flags.completeTheLook !== 'boolean' ||
    typeof value.provider !== 'string' ||
    typeof value.model !== 'string' ||
    typeof value.providerConfigured !== 'boolean' ||
    typeof value.timeoutMs !== 'number' ||
    !Number.isFinite(value.timeoutMs)
  ) {
    throw new Error('Invalid AI status response');
  }
  return {
    flags: {
      aiSearch: flags.aiSearch,
      styleAssistant: flags.styleAssistant,
      completeTheLook: flags.completeTheLook,
    },
    provider: value.provider,
    model: value.model,
    providerConfigured: value.providerConfigured,
    timeoutMs: value.timeoutMs,
  };
}

export async function getAdminAiStatusApi(signal?: AbortSignal): Promise<AdminAiStatus> {
  const { data } = await api.get<unknown>('/api/v1/admin/ai-status', { signal });
  return parseAdminAiStatus(data);
}

export type AdminRecommendationStatus = {
  flags: { recommendations: boolean; personalized: boolean; recentlyViewed: boolean };
  embeddingAvailable: boolean;
  sharedCacheEnabled: boolean;
  personalizedResultsShared: boolean;
};

export function parseAdminRecommendationStatus(value: unknown): AdminRecommendationStatus {
  if (!isRecord(value) || !isRecord(value.flags)) {
    throw new Error('Invalid recommendation status response');
  }
  const { flags } = value;
  if (
    typeof flags.recommendations !== 'boolean' ||
    typeof flags.personalized !== 'boolean' ||
    typeof flags.recentlyViewed !== 'boolean' ||
    typeof value.embeddingAvailable !== 'boolean' ||
    typeof value.sharedCacheEnabled !== 'boolean' ||
    typeof value.personalizedResultsShared !== 'boolean'
  ) {
    throw new Error('Invalid recommendation status response');
  }
  return {
    flags: {
      recommendations: flags.recommendations,
      personalized: flags.personalized,
      recentlyViewed: flags.recentlyViewed,
    },
    embeddingAvailable: value.embeddingAvailable,
    sharedCacheEnabled: value.sharedCacheEnabled,
    personalizedResultsShared: value.personalizedResultsShared,
  };
}

export async function getAdminRecommendationStatusApi(signal?: AbortSignal): Promise<AdminRecommendationStatus> {
  const { data } = await api.get<unknown>('/api/v1/admin/recommendation-status', { signal });
  return parseAdminRecommendationStatus(data);
}

export async function getProductAiSuggestionsApi(
  capabilities: AdminCapabilities | undefined,
  request: ProductAiSuggestionsRequest,
  signal?: AbortSignal,
): Promise<ProductAiSuggestionsResponse> {
  if (!hasAiProductFillCapability(capabilities)) {
    throw new Error('AI product fill is not enabled');
  }
  const { data } = await api.post<unknown>(
    '/api/v1/admin/products/ai-suggestions',
    request,
    { signal },
  );
  return parseProductAiSuggestions(data);
}
