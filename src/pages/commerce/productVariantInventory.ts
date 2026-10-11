export interface ProductColorOption {
  name: string;
  hex: string;
  value: string;
}

export interface ProductVariantStock {
  color: string | null;
  size: string | null;
  stock: number;
}

export const MAX_PRODUCT_STOCK = 2_147_483_647;

export const productVariantStockKey = (color: string | null, size: string | null) =>
  JSON.stringify([color?.trim().toLocaleLowerCase() ?? "", size?.trim().toLocaleLowerCase() ?? ""]);

export const parseProductColorOptions = (text: string): ProductColorOption[] => text
  .split(/\r?\n/)
  .map((row) => {
    const [name, hex] = row.split("|").map((part) => part.trim());
    if (!name || !/^#[0-9a-fA-F]{6}$/.test(hex ?? "")) return null;
    const normalizedHex = hex.toUpperCase();
    return { name, hex: normalizedHex, value: `${name}::${normalizedHex}` };
  })
  .filter((color): color is ProductColorOption => color !== null);

export const buildProductVariantStocks = (
  colors: ProductColorOption[],
  sizes: string[],
  stocks: Record<string, string>,
  fallbackStock: string,
): ProductVariantStock[] => {
  if (!colors.length && !sizes.length) return [];
  const colorOptions: Array<string | null> = colors.length ? colors.map(({ value }) => value) : [null];
  const sizeOptions: Array<string | null> = sizes.length ? sizes : [null];
  return colorOptions.flatMap((color) => sizeOptions.map((size) => {
    const parsed = Number(stocks[productVariantStockKey(color, size)] ?? fallbackStock ?? 0);
    return {
      color,
      size,
      stock: Number.isFinite(parsed) ? Math.min(MAX_PRODUCT_STOCK, Math.max(0, Math.floor(parsed))) : 0,
    };
  }));
};

export const sumProductVariantStocks = (stocks: ProductVariantStock[]) =>
  stocks.reduce((total, variant) => total + variant.stock, 0);
