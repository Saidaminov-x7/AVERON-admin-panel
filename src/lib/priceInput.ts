const GROUPING_SPACES = /[\s\u00a0\u202f\u2007]/g;

/** Accept canonical decimals and common grouped integer pastes (e.g. 1 200 000 / 1,200,000). */
export function normalizeUzsPriceInput(value: string): string {
  if (/[^0-9.,\s\u00a0\u202f\u2007]/.test(value)) return "";
  const compact = value.replace(GROUPING_SPACES, "");
  const commaCount = (compact.match(/,/g) ?? []).length;
  const dotCount = (compact.match(/\./g) ?? []).length;
  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  let decimalSeparator: "," | "." | null = null;
  if (commaCount && dotCount) {
    decimalSeparator = lastComma > lastDot ? "," : ".";
  } else if (commaCount === 1 && compact.length - lastComma - 1 <= 2 && compact.length - lastComma - 1 > 0) {
    decimalSeparator = ",";
  } else if (dotCount === 1 && compact.length - lastDot - 1 <= 2 && compact.length - lastDot - 1 > 0) {
    decimalSeparator = ".";
  }
  const separatorIndex = decimalSeparator ? compact.lastIndexOf(decimalSeparator) : -1;
  let result = "";
  let hasDecimal = false;
  for (let index = 0; index < compact.length; index += 1) {
    const character = compact[index];
    if (character >= "0" && character <= "9") result += character;
    else if (index === separatorIndex && !hasDecimal) {
      result += result ? "." : "0.";
      hasDecimal = true;
    }
  }
  return result;
}

export function formatUzsPriceInput(value: string): string {
  if (!value) return "";
  const [integer, fraction] = value.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

export function parseUzsPriceInput(value: string): number | null {
  const normalized = normalizeUzsPriceInput(value);
  if (!normalized || normalized === ".") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Map a caret by the count of numeric/decimal characters, ignoring inserted grouping spaces. */
export function caretAfterFormatting(formatted: string, tokenCount: number): number {
  if (tokenCount <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (/[0-9.]/.test(formatted[index])) seen += 1;
    if (seen === tokenCount) return index + 1;
  }
  return formatted.length;
}
