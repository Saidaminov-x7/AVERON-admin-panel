const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type AnalyticsDateRangeError = 'required' | 'invalid' | 'startAfterEnd' | 'tooLong';

function parseUtcDate(value: string): number | null {
  if (!ISO_DATE.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) return null;
  return timestamp;
}

export function validateAnalyticsDateRange(
  from: string,
  to: string,
  maxDays = 365,
): AnalyticsDateRangeError | null {
  if (!from || !to) return 'required';
  const start = parseUtcDate(from);
  const end = parseUtcDate(to);
  if (start === null || end === null) return 'invalid';
  if (start > end) return 'startAfterEnd';
  const inclusiveDays = Math.floor((end - start) / DAY_MS) + 1;
  return inclusiveDays > maxDays ? 'tooLong' : null;
}

export function getAveragePaidOrderValue(revenueUzs?: number, paidOrders?: number): number | null {
  if (
    typeof revenueUzs !== 'number'
    || !Number.isFinite(revenueUzs)
    || typeof paidOrders !== 'number'
    || !Number.isFinite(paidOrders)
    || paidOrders <= 0
  ) return null;
  return revenueUzs / paidOrders;
}
