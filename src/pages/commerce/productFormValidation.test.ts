import { describe, expect, it } from "vitest";
import { caretAfterFormatting, formatUzsPriceInput, normalizeUzsPriceInput, parseUzsPriceInput } from "../../lib/priceInput";
import {
  fileIdentity,
  formatPhotoSize,
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

describe("UZS price input", () => {
  it.each([
    ["1 234 567", "1234567"],
    ["1,234,567", "1234567"],
    ["1.234.567", "1234567"],
    ["1.234,50", "1234.50"],
    ["1 234 567,89", "1234567.89"],
    ["1234.50", "1234.50"],
  ])("normalizes pasted %s to %s", (input, expected) => {
    expect(normalizeUzsPriceInput(input)).toBe(expected);
  });

  it("groups thousands without changing the numeric value and maps the caret by digits", () => {
    const formatted = formatUzsPriceInput("1234567.89");
    expect(formatted).toBe("1\u202f234\u202f567.89");
    expect(parseUzsPriceInput(formatted)).toBe(1234567.89);
    expect(caretAfterFormatting("180\u202f000", 4)).toBe(5);
  });

  it("rejects empty and non-finite values", () => {
    expect(parseUzsPriceInput("")).toBeNull();
    expect(parseUzsPriceInput("1e999")).toBeNull();
  });
});
