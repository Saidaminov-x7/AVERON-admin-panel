import { describe, expect, it } from "vitest";
import {
  fileIdentity,
  formatPhotoSize,
  getFirstProductValidationStep,
  normalizeProductSizes,
  reorderItem,
  validateProductDraft,
  type ProductDraftValidationInput,
} from "./productFormValidation";

const validDraft: ProductDraftValidationInput = {
  titles: { ru: "Товар", uz: "Mahsulot", en: "Product" },
  country: "CN",
  salePriceUzs: "180000",
  photoCount: 1,
  photoSizes: [324 * 1024],
  maxPhotos: 8,
  maxPhotoSizeMb: 5,
};

const isProductCountry = (value: unknown) => ["CN", "US", "TR", "IT", "GB"].includes(String(value));

describe("product form validation", () => {
  it("routes validation errors to the earliest step in the product workflow", () => {
    expect(getFirstProductValidationStep({ titleRu: "title", salePriceUzs: "salePriceUzs", photos: "photos" })).toBe(0);
    expect(getFirstProductValidationStep({ salePriceUzs: "salePriceUzs", photos: "photos" })).toBe(1);
    expect(getFirstProductValidationStep({ colors: "color", photos: "photos" })).toBe(2);
    expect(getFirstProductValidationStep({ photos: "photos" })).toBe(3);
    expect(getFirstProductValidationStep({})).toBeNull();
  });

  it("reports all required field errors in one validation pass", () => {
    const errors = validateProductDraft({
      ...validDraft,
      titles: { ru: "", uz: " ", en: "" },
      country: "",
      salePriceUzs: "",
      photoCount: 0,
      photoSizes: [],
    }, isProductCountry);

    expect(errors).toEqual({
      titleRu: "title",
      titleUz: "title",
      titleEn: "title",
      country: "country",
      salePriceUzs: "salePriceUzs",
      photos: "photos",
    });
  });

  it("allows an omitted source URL and leaves an unchanged unknown country alone", () => {
    expect(validateProductDraft({
      ...validDraft,
      country: "XX",
      existingCountry: "XX",
    }, isProductCountry)).toEqual({});
  });

  it("enforces configured photo count and size limits", () => {
    expect(validateProductDraft({
      ...validDraft,
      photoCount: 9,
    }, isProductCountry).photos).toBe("photoCount");
    expect(validateProductDraft({
      ...validDraft,
      photoSizes: [5 * 1024 * 1024 + 1],
    }, isProductCountry).photos).toBe("photoSize");
  });

  it("enforces the hard 15-photo limit even if a larger setting is passed", () => {
    expect(validateProductDraft({
      ...validDraft,
      photoCount: 16,
      maxPhotos: 99,
    }, isProductCountry).photos).toBe("photoCount");
  });

  it("requires descriptive color names and valid HEX values instead of generated placeholders", () => {
    expect(validateProductDraft({ ...validDraft, colorsText: "Тёмно-синий | #000080" }, isProductCountry).colors).toBeUndefined();
    expect(validateProductDraft({ ...validDraft, colorsText: "Цвет 1 | #000080" }, isProductCountry).colors).toBe("color");
    expect(validateProductDraft({ ...validDraft, colorsText: " | #000080" }, isProductCountry).colors).toBe("color");
    expect(validateProductDraft({ ...validDraft, colorsText: "Красный | #FF0000\nСиний | #12" }, isProductCountry).colors).toBe("color");
    expect(validateProductDraft({ ...validDraft, colorsText: "" }, isProductCountry).colors).toBeUndefined();
  });
});

describe("product variant size normalization", () => {
  it("sends a sorted, case-insensitive unique size list", () => {
    expect(normalizeProductSizes(" L, m\nM, 41, 40, XS ")).toEqual(["40", "41", "XS", "M", "L"]);
  });
});

describe("product photo helpers", () => {
  it("moves the selected photo and makes the first item the main photo", () => {
    const photos = ["first", "second", "third"];
    expect(reorderItem(photos, 1, -1)).toEqual(["second", "first", "third"]);
    expect(reorderItem(photos, 0, -1)).toBe(photos);
  });

  it("formats photo sizes and identifies repeated local file selections", () => {
    expect(formatPhotoSize(324 * 1024)).toBe("324 KB");
    expect(formatPhotoSize(Math.round(1.8 * 1024 * 1024))).toBe("1.8 MB");
    expect(fileIdentity({ name: "Photo.JPG", size: 1024, lastModified: 42 }))
      .toBe(fileIdentity({ name: "photo.jpg", size: 1024, lastModified: 42 }));
  });
});
