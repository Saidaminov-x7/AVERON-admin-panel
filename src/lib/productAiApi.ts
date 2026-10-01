import { api } from './axios';
import { isProductCountry } from './commerceApi';
import type { ProductCountry, ProductLocale } from './commerceApi';

export interface AdminCapabilities {
  aiProductFill: boolean;
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

export function parseAdminCapabilities(value: unknown): AdminCapabilities {
  if (
    !value ||
    typeof value !== 'object' ||
    !('aiProductFill' in value) ||
    typeof value.aiProductFill !== 'boolean'
  ) {
    throw new Error('Invalid admin capabilities response');
  }
  return { aiProductFill: value.aiProductFill };
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
