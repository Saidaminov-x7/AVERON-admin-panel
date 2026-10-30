import axios from 'axios';

export function getApiErrorMessage(error: unknown): string | undefined {
  if (!axios.isAxiosError<{ message?: unknown }>(error)) return undefined;
  const message = error.response?.data?.message;
  return typeof message === 'string' ? message : undefined;
}
