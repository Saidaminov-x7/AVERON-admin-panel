import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import './i18n';

// Настройка TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Повторяем запрос 1 раз при ошибке
      retry: 1,
      // Данные считаются свежими 60 секунд
      staleTime: 60_000,
      // Кэш хранится 5 минут
      gcTime: 5 * 60_000,
      // Не рефетчим при фокусе окна (снижает количество запросов)
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster closeButton position="top-right" toastOptions={{ duration: 4000 }} />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

// Скрываем статический HTML-лоадер после монтирования React
const staticLoader = document.getElementById('static-loader');
if (staticLoader) {
  staticLoader.style.opacity = '0';
  staticLoader.style.transition = 'opacity 0.25s ease';
  setTimeout(() => staticLoader.remove(), 280);
}
