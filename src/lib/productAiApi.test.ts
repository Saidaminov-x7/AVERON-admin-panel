import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './axios';
import {
  applyProductAiSuggestions,
  getAdminCapabilitiesApi,
  getAdminAiStatusApi,
  getProductAiSuggestionsApi,
  hasAiProductFillCapability,
  hasImageEmbeddingsCapability,
  parseAdminCapabilities,
  parseAdminAiStatus,
  parseProductAiSuggestions,
  toProductAiCountry,
} from './productAiApi';

vi.mock('./axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const request = {
  sourceTitle: 'Cotton shirt',
  sourceDescription: 'A lightweight shirt',
  country: 'GB' as const,
  categoryName: 'Clothing',
  variants: [{ size: 'M', color: 'Blue' }],
};

const response = {
  suggestions: {
    ru: { title: 'Рубашка', description: 'Лёгкая рубашка', characteristics: { color: 'Синий' } },
    uz: { title: 'Ko‘ylak', description: 'Yengil ko‘ylak', characteristics: { color: 'Ko‘k' } },
    en: { title: 'Shirt', description: 'Lightweight shirt', characteristics: { material: 'Cotton' } },
  },
};

describe('admin product AI capability and suggestions API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts only the documented boolean capability value', () => {
    expect(parseAdminCapabilities({ aiProductFill: true, anotherCapability: false }))
      .toEqual({ aiProductFill: true, imageEmbeddings: false });
    expect(parseAdminCapabilities({ aiProductFill: true, imageEmbeddings: true }))
      .toEqual({ aiProductFill: true, imageEmbeddings: true });
    expect(hasAiProductFillCapability({ aiProductFill: true })).toBe(true);
    expect(hasAiProductFillCapability({ aiProductFill: false })).toBe(false);
    expect(hasAiProductFillCapability(undefined)).toBe(false);
    expect(hasImageEmbeddingsCapability({ aiProductFill: true })).toBe(false);
    expect(hasImageEmbeddingsCapability({ aiProductFill: true, imageEmbeddings: true })).toBe(true);
    expect(() => parseAdminCapabilities({ aiProductFill: true, imageEmbeddings: 'true' })).toThrow();
    expect(() => parseAdminCapabilities({ aiProductFill: 'true' })).toThrow();
  });

  it('loads capabilities with an abort signal from the expected endpoint', async () => {
    const signal = new AbortController().signal;
    vi.mocked(api.get).mockResolvedValue({ data: { aiProductFill: true, imageEmbeddings: true } });

    await expect(getAdminCapabilitiesApi(signal)).resolves.toEqual({
      aiProductFill: true,
      imageEmbeddings: true,
    });
    expect(api.get).toHaveBeenCalledWith('/api/v1/capabilities', { signal });
  });

  it('parses safe AI deployment status without requiring or exposing provider credentials', async () => {
    const status = {
      flags: { aiSearch: false, styleAssistant: false, completeTheLook: false },
      provider: 'openai-compatible',
      model: 'gpt-4o-mini',
      providerConfigured: false,
      timeoutMs: 10000,
    };
    const signal = new AbortController().signal;
    vi.mocked(api.get).mockResolvedValue({ data: status });

    await expect(getAdminAiStatusApi(signal)).resolves.toEqual(status);
    expect(api.get).toHaveBeenCalledWith('/api/v1/admin/ai-status', { signal });
    expect(parseAdminAiStatus({ ...status, apiKey: 'must-not-be-returned' })).toEqual(status);
    expect(() => parseAdminAiStatus({ ...status, flags: { ...status.flags, aiSearch: 'true' } })).toThrow();
  });

  it('posts the strict product-fill request and returns localized suggestions', async () => {
    const signal = new AbortController().signal;
    vi.mocked(api.post).mockResolvedValue({ data: response });

    await expect(getProductAiSuggestionsApi({ aiProductFill: true }, request, signal))
      .resolves.toEqual(response);
    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/admin/products/ai-suggestions',
      request,
      { signal },
    );
  });

  it('never posts suggestions when the capability is disabled or unknown', async () => {
    await expect(getProductAiSuggestionsApi({ aiProductFill: false }, request)).rejects.toThrow();
    await expect(getProductAiSuggestionsApi(undefined, request)).rejects.toThrow();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('uses the existing ProductCountry enum without converting countries', () => {
    for (const country of ['CN', 'US', 'TR', 'IT', 'GB']) {
      expect(toProductAiCountry(country)).toBe(country);
    }
    expect(() => toProductAiCountry('KR')).toThrow();
    expect(() => toProductAiCountry('')).toThrow();
  });

  it('parses all required localized fields and rejects malformed or empty responses', () => {
    expect(parseProductAiSuggestions(response)).toEqual(response);
    expect(() => parseProductAiSuggestions({ translations: response.suggestions })).toThrow();
    expect(() => parseProductAiSuggestions({
      suggestions: {
        ...response.suggestions,
        uz: { title: 'Only title', description: '', characteristics: { color: 4 } },
      },
    })).toThrow();
    expect(() => parseProductAiSuggestions({
      suggestions: {
        ru: { title: '', description: '', characteristics: {} },
        uz: { title: '', description: '', characteristics: {} },
        en: { title: '', description: '', characteristics: {} },
      },
    })).toThrow();
  });
});

describe('applying product AI suggestions', () => {
  const current = {
    ru: { title: '', description: '' },
    uz: { title: 'Existing Uzbek title', description: 'Existing description' },
    en: { title: ' ', description: '' },
  };

  it('fills only empty text and variant fields while preserving existing edits', () => {
    expect(applyProductAiSuggestions(current, { color: '', size: '' }, response.suggestions)).toEqual({
      translations: {
        ru: { title: 'Рубашка', description: 'Лёгкая рубашка' },
        uz: { title: 'Existing Uzbek title', description: 'Existing description' },
        en: { title: 'Shirt', description: 'Lightweight shirt' },
      },
      variant: { color: 'Синий', size: '' },
      appliedCount: 5,
      firstAppliedLocale: 'ru',
    });
  });

  it('does not replace user-entered values or add unrecognized characteristics to variant fields', () => {
    const result = applyProductAiSuggestions(
      current,
      { color: 'User color', size: 'L' },
      response.suggestions,
    );
    expect(result.variant).toEqual({ color: 'User color', size: 'L' });
    expect(result.translations.uz).toEqual(current.uz);
    expect(result.appliedCount).toBe(4);
  });
});
