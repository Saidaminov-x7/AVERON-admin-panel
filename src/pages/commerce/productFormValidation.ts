export const PRODUCT_VALIDATION_FIELDS = [
  "titleRu",
  "titleUz",
  "titleEn",
  "country",
  "salePriceUzs",
  "photos",
  "colors",
] as const;

export type ProductValidationField = typeof PRODUCT_VALIDATION_FIELDS[number];
export type ProductValidationCode =
  | "title"
  | "country"
  | "salePriceUzs"
  | "photos"
  | "photoCount"
  | "photoSize"
  | "color";
export type ProductValidationErrors = Partial<Record<ProductValidationField, ProductValidationCode>>;

const PRODUCT_VALIDATION_STEP_FIELDS: ReadonlyArray<readonly ProductValidationField[]> = [
  ["titleRu", "titleUz", "titleEn", "country"],
  ["salePriceUzs"],
  ["colors"],
  ["photos"],
];

export function getFirstProductValidationStep(errors: ProductValidationErrors): number | null {
  const step = PRODUCT_VALIDATION_STEP_FIELDS.findIndex((fields) => fields.some((field) => errors[field]));
  return step === -1 ? null : step;
}

export interface ProductDraftValidationInput {
  titles: Record<"ru" | "uz" | "en", string>;
  country: string;
  existingCountry?: string;
  salePriceUzs: string;
  photoCount: number;
  photoSizes: number[];
  maxPhotos: number;
  maxPhotoSizeMb: number;
  colorsText?: string;
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

  const maxPhotos = Math.min(15, Math.max(1, input.maxPhotos));
  const maxPhotoBytes = Math.min(25, Math.max(1, input.maxPhotoSizeMb)) * 1024 * 1024;
  if (!input.photoCount) errors.photos = "photos";
  else if (input.photoCount > maxPhotos) errors.photos = "photoCount";
  else if (input.photoSizes.some((size) => size > maxPhotoBytes)) errors.photos = "photoSize";

  const colorRows = input.colorsText?.split(/\r?\n/).filter((row) => row.trim()) ?? [];
  if (colorRows.some((row) => {
    const [name = "", hex = ""] = row.split("|").map((part) => part.trim());
    return !name || /^(?:цвет|color)\s*\d+$/iu.test(name) || !/^#[0-9a-fA-F]{6}$/.test(hex);
  })) errors.colors = "color";

  return errors;
}

export function reorderItem<T>(items: T[], index: number, offset: -1 | 1): T[] {
  const nextIndex = index + offset;
  if (index < 0 || index >= items.length || nextIndex < 0 || nextIndex >= items.length) return items;
  const reordered = [...items];
  [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
  return reordered;
}

export function normalizeProductSizes(text: string): string[] {
  const clothingOrder = ["XXXS", "XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"];
  const canonicalSizes = new Map(clothingOrder.map((size) => [size.toLocaleLowerCase(), size]));
  const seen = new Set<string>();
  const sizes = text.split(/[\n,]+/).map((size) => {
    const trimmed = size.trim();
    return canonicalSizes.get(trimmed.toLocaleLowerCase()) ?? trimmed;
  }).filter((size) => {
    if (!size) return false;
    const key = size.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return sizes.sort((a, b) => {
    const aNumber = Number(a.replace(/[^0-9.]/g, ""));
    const bNumber = Number(b.replace(/[^0-9.]/g, ""));
    const aHasNumber = Number.isFinite(aNumber) && /\d/.test(a);
    const bHasNumber = Number.isFinite(bNumber) && /\d/.test(b);
    if (aHasNumber && bHasNumber && aNumber !== bNumber) return aNumber - bNumber;
    const aRank = clothingOrder.indexOf(a.toUpperCase());
    const bRank = clothingOrder.indexOf(b.toUpperCase());
    if (aRank >= 0 && bRank >= 0 && aRank !== bRank) return aRank - bRank;
    if (aHasNumber !== bHasNumber) return aHasNumber ? -1 : 1;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  });
}

export function fileIdentity(file: Pick<File, "name" | "size" | "lastModified">): string {
  return `${file.name.toLowerCase()}-${file.size}-${file.lastModified}`;
}

export function formatPhotoSize(size: number): string {
  return size >= 1024 * 1024
    ? `${(size / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`;
}
