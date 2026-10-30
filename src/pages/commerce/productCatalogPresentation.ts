export type CatalogLocale = "ru" | "uz" | "en";

type LocalizedProductTitle = Partial<Record<CatalogLocale, { title?: string } | string>>;

export function toCatalogLocale(language: string): CatalogLocale {
  const baseLanguage = language.toLowerCase().split("-")[0];
  return baseLanguage === "uz" || baseLanguage === "en" ? baseLanguage : "ru";
}

export function getCatalogProductTitle(
  translations: LocalizedProductTitle | null | undefined,
  slug: string,
  locale: CatalogLocale,
): string {
  const getTitle = (translation: { title?: string } | string | undefined) =>
    typeof translation === "string" ? translation : translation?.title;

  return getTitle(translations?.[locale]) || getTitle(translations?.ru) || slug;
}

export function getCatalogCategoryName(
  category: { name: Record<string, string> | string; slug: string } | null | undefined,
  locale: CatalogLocale,
  uncategorizedLabel: string,
): string {
  if (!category) return uncategorizedLabel;
  if (typeof category.name === "string") return category.name;
  return category.name[locale] || category.name.ru || category.name.en || category.slug;
}

export function formatCatalogPublishedAt(
  value: string | null | undefined,
  locale: CatalogLocale,
  formatRelativeDays: (days: number) => string,
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  const relativeDate = formatRelativeDays(days);
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(date);
  return `${relativeDate} · ${time}`;
}
