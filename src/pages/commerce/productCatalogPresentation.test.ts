import { describe, expect, it } from "vitest";
import {
  formatCatalogPublishedAt,
  getCatalogCategoryName,
  getCatalogProductTitle,
  toCatalogLocale,
} from "./productCatalogPresentation";

describe("product catalog presentation", () => {
  it.each([
    ["ru-RU", "ru"],
    ["uz-UZ", "uz"],
    ["en-US", "en"],
    ["fr-FR", "ru"],
  ] as const)("normalizes %s for catalog copy", (language, expected) => {
    expect(toCatalogLocale(language)).toBe(expected);
  });

  it("uses the selected product title and falls back to Russian then the slug", () => {
    const translations = { ru: { title: "Пальто" }, uz: { title: "Palto" }, en: { title: "Coat" } };
    expect(getCatalogProductTitle(translations, "coat", "uz")).toBe("Palto");
    expect(getCatalogProductTitle({ ru: "Пальто" }, "coat", "en")).toBe("Пальто");
    expect(getCatalogProductTitle({}, "coat", "en")).toBe("coat");
  });

  it("uses the selected category name with localized fallbacks", () => {
    const category = { slug: "outerwear", name: { ru: "Верхняя одежда", uz: "Ustki kiyim", en: "Outerwear" } };
    expect(getCatalogCategoryName(category, "uz", "Без категории")).toBe("Ustki kiyim");
    expect(getCatalogCategoryName({ ...category, name: { ru: "Верхняя одежда" } }, "en", "Uncategorized")).toBe("Верхняя одежда");
    expect(getCatalogCategoryName(null, "en", "Uncategorized")).toBe("Uncategorized");
  });

  it("formats publication dates with the active locale and ignores invalid dates", () => {
    const publishedAt = new Date(Date.now() - 2 * 86_400_000).toISOString();
    expect(formatCatalogPublishedAt(publishedAt, "ru", (days) => `${days} дня назад`)).toContain("2 дня назад");
    expect(formatCatalogPublishedAt(publishedAt, "en", (days) => `${days} days ago`)).toContain("2 days ago");
    expect(formatCatalogPublishedAt(publishedAt, "uz", (days) => `${days} kun oldin`)).toContain("2 kun oldin");
    expect(formatCatalogPublishedAt("not-a-date", "uz", () => "bugun")).toBeNull();
  });
});
