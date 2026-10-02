// src/components/ProtectedRoute.tsx
// HOC для защиты маршрутов: проверяет авторизацию, роль ADMIN и гранулярный AdminRole

import React, { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { AdminRoleType } from '../store/authStore';

import FullScreenLoader from './ui/FullScreenLoader';

const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredAdminRole?: AdminRoleType;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredAdminRole }) => {
  const { isAuthenticated, isAdmin, isInitialized, user } = useAuth();

  // Пока идёт инициализация (проверка refresh token) — показываем лоадер
  if (!isInitialized) {
    return <FullScreenLoader label="Проверка сессии..." />;
  }

  // Не авторизован — редирект на /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Авторизован, но нет доступа к админке
  if (!isAdmin && !user?.adminRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-app">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-app mb-2">Доступ запрещён</h1>
          <p className="text-muted mb-6">
            Эта панель доступна только администраторам.
          </p>
          <a href="/login" className="btn-primary">
            Войти как администратор
          </a>
        </div>
      </div>
    );
  }

  // Если требуется конкретная роль (например, SUPER_ADMIN для /settings/staff),
  // а у пользователя другая роль — показываем реальную страницу 404
  if (requiredAdminRole && user?.adminRole !== requiredAdminRole) {
    return <Suspense fallback={<FullScreenLoader label="Загрузка страницы..." />}><NotFoundPage /></Suspense>;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
