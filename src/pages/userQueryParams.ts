export const updateUserQueryParams = (
  current: URLSearchParams,
  updates: Record<string, string | number | undefined | null>,
): URLSearchParams => {
  const next = new URLSearchParams(current);
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== null) {
      next.set(key, String(value));
    } else {
      next.delete(key);
    }
  });
  return next;
};
