import { describe, expect, it } from "vitest";
import { buildProductVariantStocks, MAX_PRODUCT_STOCK, parseProductColorOptions, productVariantStockKey, sumProductVariantStocks } from "./productVariantInventory";

describe("product variant inventory", () => {
  it("creates one stock entry for every color and size combination", () => {
    const colors = parseProductColorOptions("Красный | #ff0000\nСиний | #0000ff");
    const stocks = {
      [productVariantStockKey("Красный::#FF0000", "S")]: "2",
      [productVariantStockKey("Красный::#FF0000", "M")]: "4",
      [productVariantStockKey("Синий::#0000FF", "S")]: "0",
      [productVariantStockKey("Синий::#0000FF", "M")]: "3",
    };

    expect(buildProductVariantStocks(colors, ["S", "M"], stocks, "9")).toEqual([
      { color: "Красный::#FF0000", size: "S", stock: 2 },
      { color: "Красный::#FF0000", size: "M", stock: 4 },
      { color: "Синий::#0000FF", size: "S", stock: 0 },
      { color: "Синий::#0000FF", size: "M", stock: 3 },
    ]);
  });

  it("supports a single variant dimension and safely bounds stock inputs", () => {
    expect(buildProductVariantStocks([], ["36", "37"], {}, "5")).toEqual([
      { color: null, size: "36", stock: 5 },
      { color: null, size: "37", stock: 5 },
    ]);
    expect(buildProductVariantStocks([], ["36"], { [productVariantStockKey(null, "36")]: "-2.8" }, "0")[0].stock).toBe(0);
    expect(buildProductVariantStocks([], ["36"], { [productVariantStockKey(null, "36")]: "9999999999" }, "0")[0].stock).toBe(2_147_483_647);
    expect(buildProductVariantStocks([], ["36"], {}, "0")[0].stock).toBe(0);
    expect(sumProductVariantStocks([
      { color: null, size: "S", stock: MAX_PRODUCT_STOCK },
      { color: null, size: "M", stock: 1 },
    ])).toBe(MAX_PRODUCT_STOCK + 1);
  });
});
