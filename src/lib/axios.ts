// src/lib/axios.ts
// Axios with JWT interceptor. On 401: POST /auth/refresh then retry.
// Refresh token хранится в httpOnly cookie бэкенда (безопасно от XSS)
// Access token хранится в памяти Zustand store

import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) {
  throw new Error(
    'VITE_API_URL не задан. Укажи переменную окружения перед сборкой — без неё админ-панель не может обратиться к backend API.',
  );
}
export { API_URL };
const PROACTIVE_REFRESH_BEFORE_MS = 5 * 60 * 1000; // 5 минут

/** Декодирует JWT payload без верификации (только для чтения exp) */
function decodeJwtExp(token: string): number | null {
  try {
    const base64 = token.split('.')[1];
    const payload = JSON.parse(atob(base64.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

let proactiveRefreshTimer: ReturnType<typeof setTimeout> | null = null;

/** Запускает таймер proactive refresh — обновит токен за 5 мин до истечения */
export function scheduleProactiveRefresh(token: string) {
  if (proactiveRefreshTimer) clearTimeout(proactiveRefreshTimer);
  const exp = decodeJwtExp(token);
  if (!exp) return;
  const delay = exp - Date.now() - PROACTIVE_REFRESH_BEFORE_MS;
  if (delay <= 0) return;
  proactiveRefreshTimer = setTimeout(async () => {
    try {
      const { data } = await axios.post<{ accessToken: string }>(
        `${API_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      useAuthStore.getState().setToken(data.accessToken);
      scheduleProactiveRefresh(data.accessToken);
    } catch {
      // Если proactive refresh упал — ждём 401 от interceptor
    }
  }, delay);
}

const getAuthToken = () => useAuthStore.getState().accessToken;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else if (token) prom.resolve(token);
  });
  failedQueue = [];
};

const AUTH_SKIP = ['/auth/login', '/auth/register', '/auth/google', '/auth/refresh', '/auth/logout'];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 429) {
      const message = error.response?.data?.message || 'Слишком много запросов. Попробуйте позже.';
      return Promise.reject(new Error(message));
    }

    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    const url: string = originalRequest?.url || '';
    if (AUTH_SKIP.some((p) => url.includes(p))) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${API_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      const newToken = data.accessToken;
      useAuthStore.getState().setToken(newToken);
      scheduleProactiveRefresh(newToken);
      processQueue(null, newToken);

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Если refresh токен тоже невалиден — разлогиниваем
      if (axios.isAxiosError(refreshError) && refreshError.response?.status === 401) {
        useAuthStore.getState().logout();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
