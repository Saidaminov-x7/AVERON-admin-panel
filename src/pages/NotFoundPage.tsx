// src/pages/NotFoundPage.tsx
// Страница 404 — Страница не найдена

import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const NotFoundPage: React.FC = () => {
  return (
    <Layout title="404 — Страница не найдена">
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 mb-6">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1 className="text-4xl font-extrabold text-app mb-2">404</h1>
        <h2 className="text-xl font-bold text-app mb-3">Страница не найдена</h2>
        <p className="text-muted text-sm max-w-md mb-8">
          Запрашиваемая страница не существует, была удалена или у вас нет доступа к данному разделу.
        </p>

        <Link
          to="/"
          className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm inline-flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Вернуться на главную
        </Link>
      </div>
    </Layout>
  );
};

export default NotFoundPage;
