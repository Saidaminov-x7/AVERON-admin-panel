export const PRODUCT_VALIDATION_FIELDS = [
  "titleRu",
  "titleUz",
  "titleEn",
  "country",
  "sourceUrl",
  "salePriceUzs",
  "photos",
] as const;

export type ProductValidationField = typeof PRODUCT_VALIDATION_FIELDS[number];
export type ProductValidationCode =
  | "title"
  | "country"
  | "sourceUrl"
  | "salePriceUzs"
  | "photos"
  | "photoCount"
  | "photoSize";
export type ProductValidationErrors = Partial<Record<ProductValidationField, ProductValidationCode>>;

export interface ProductDraftValidationInput {
  titles: Record<"ru" | "uz" | "en", string>;
  country: string;
  existingCountry?: string;
  sourceUrl: string;
  salePriceUzs: string;
  photoCount: number;
  photoSizes: number[];
  maxPhotos: number;
  maxPhotoSizeMb: number;
}

export function validateProductDraft(
  input: ProductDraftValidationInput,
  isProductCountry: (value: unknown) => boolean,
): ProductValidationErrors {
  const errors: ProductValidationErrors = {};
  const locales = ["ru", "uz", "en"] as const;
  const titleFields = { ru: "titleRu", uz: "titleUz", en: "titleEn" } as const;
  for (const locale of locales) {
    if (input.titles[locale].trim().length < 2) {
      errors[titleFields[locale]] = "title";
    }
  }

  const unchangedCountry = input.existingCountry !== undefined
    && input.country === input.existingCountry
    && !isProductCountry(input.country);
  if (!isProductCountry(input.country) && !unchangedCountry) errors.country = "country";

  const salePriceUzs = Number(input.salePriceUzs);
  if (!Number.isFinite(salePriceUzs) || salePriceUzs <= 0) {
    errors.salePriceUzs = "salePriceUzs";
  }

  const sourceUrl = input.sourceUrl.trim();
  if (sourceUrl) {
    try {
      if (!new URL(sourceUrl).host) errors.sourceUrl = "sourceUrl";
    } catch {
      errors.sourceUrl = "sourceUrl";
    }
  }

  const maxPhotos = Math.min(15, Math.max(1, input.maxPhotos));
  const maxPhotoBytes = Math.min(25, Math.max(1, input.maxPhotoSizeMb)) * 1024 * 1024;
  if (!input.photoCount) errors.photos = "photos";
  else if (input.photoCount > maxPhotos) errors.photos = "photoCount";
  else if (input.photoSizes.some((size) => size > maxPhotoBytes)) errors.photos = "photoSize";

  return errors;
}

export function reorderItem<T>(items: T[], index: number, offset: -1 | 1): T[] {
  const nextIndex = index + offset;
  if (index < 0 || index >= items.length || nextIndex < 0 || nextIndex >= items.length) return items;
  const reordered = [...items];
  [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
  return reordered;
}

export function fileIdentity(file: Pick<File, "name" | "size" | "lastModified">): string {
  return `${file.name.toLowerCase()}-${file.size}-${file.lastModified}`;
}

export function formatPhotoSize(size: number): string {
  return size >= 1024 * 1024
    ? `${(size / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`;
}
