import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calculateProductPhotoCropRect,
  cropProductPhoto,
  DEFAULT_PRODUCT_PHOTO_CROP,
  productPhotoCropSignature,
} from "./productImageCrop";

afterEach(() => vi.unstubAllGlobals());

describe("product photo crop", () => {
  it.each([
    ["portrait", 4 / 5],
    ["landscape", 4 / 3],
    ["square", 1],
  ] as const)("fits the %s crop inside the source image", (orientation, aspectRatio) => {
    const rect = calculateProductPhotoCropRect(2400, 1600, {
      ...DEFAULT_PRODUCT_PHOTO_CROP,
      orientation,
    });

    expect(rect.width / rect.height).toBeCloseTo(aspectRatio);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(2400);
    expect(rect.y + rect.height).toBeLessThanOrEqual(1600);
  });

  it("zooms into the requested focal point without crossing image edges", () => {
    const rect = calculateProductPhotoCropRect(2400, 1600, {
      orientation: "landscape",
      zoom: 2,
      x: 100,
      y: 0,
    });

    expect(rect.width).toBeCloseTo((1600 * (4 / 3)) / 2);
    expect(rect.x + rect.width).toBeCloseTo(2400);
    expect(rect.y).toBe(0);
  });

  it("changes the signature when crop settings change", () => {
    expect(productPhotoCropSignature(DEFAULT_PRODUCT_PHOTO_CROP))
      .not.toBe(productPhotoCropSignature({ ...DEFAULT_PRODUCT_PHOTO_CROP, orientation: "landscape" }));
  });

  it("exports the selected crop as a new image file", async () => {
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (callback: BlobCallback, type = "image/jpeg") => callback(new Blob(["cropped"], { type })),
    };
    class MockImage {
      naturalWidth = 2400;
      naturalHeight = 1600;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_value: string) {
        this.onload?.();
      }
    }

    vi.stubGlobal("Image", MockImage);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:product-photo"),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal("document", { createElement: () => canvas });

    const result = await cropProductPhoto(
      new File(["source"], "coat.jpg", { type: "image/jpeg" }),
      { ...DEFAULT_PRODUCT_PHOTO_CROP, orientation: "landscape" },
    );

    expect(drawImage).toHaveBeenCalledOnce();
    expect(canvas.width).toBe(2000);
    expect(canvas.height).toBe(1500);
    expect(result).toMatchObject({
      name: "coat-averon.jpg",
      type: "image/jpeg",
    });
  });

  it("keeps transparent GIF photos in a lossless format after cropping", async () => {
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn() }),
      toBlob: (callback: BlobCallback, type = "image/png") => callback(new Blob(["cropped"], { type })),
    };
    class MockImage {
      naturalWidth = 1200;
      naturalHeight = 1500;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_value: string) {
        this.onload?.();
      }
    }

    vi.stubGlobal("Image", MockImage);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:transparent-photo"),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal("document", { createElement: () => canvas });

    const result = await cropProductPhoto(
      new File(["source"], "logo.gif", { type: "image/gif" }),
      DEFAULT_PRODUCT_PHOTO_CROP,
    );

    expect(result.type).toBe("image/png");
    expect(result.name).toBe("logo-averon.png");
  });
});
