export function getCommerceNumberLocale(language?: string): string {
  const normalized = language?.toLowerCase() ?? '';
  if (normalized.startsWith('uz')) return 'uz-UZ';
  if (normalized.startsWith('en')) return 'en-US';
  return 'ru-RU';
}

export function formatCommerceNumber(value: string | number, language?: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat(getCommerceNumberLocale(language), { maximumFractionDigits: 20 }).format(amount);
}
