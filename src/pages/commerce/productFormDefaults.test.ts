import { describe, expect, it } from "vitest";
import { getInitialValues } from "./ProductFormModal";
import type { ProductListItem } from "../../lib/commerceApi";
import { productVariantStockKey } from "./productVariantInventory";

describe("product form publication defaults", () => {
  it("keeps a new product as a draft until publish is explicitly enabled", () => {
    const values = getInitialValues(null);

    expect(values.publish).toBe(false);
    expect(values.publishTelegram).toBe(false);
  });

  it("preserves the published state when editing an already-published product", () => {
    const values = getInitialValues({ status: "PUBLISHED" } as ProductListItem);

    expect(values.publish).toBe(true);
    expect(values.publishTelegram).toBe(false);
  });

  it("loads inventory independently for each existing color and size", () => {
    const values = getInitialValues({
      status: "DRAFT",
      variants: [
        { id: "v1", color: "Красный::#FF0000", size: "S", stock: 2 },
        { id: "v2", color: "Красный::#FF0000", size: "M", stock: 5 },
      ],
    } as ProductListItem);

    expect(values.variantStocks[productVariantStockKey("Красный::#FF0000", "S")]).toBe("2");
    expect(values.variantStocks[productVariantStockKey("Красный::#FF0000", "M")]).toBe("5");
    expect(values.colorsText).toBe("Красный | #FF0000");
    expect(values.stock).toBe("7");
  });
});
