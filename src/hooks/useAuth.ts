// src/hooks/useAuth.ts

import { useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { api, API_URL, scheduleProactiveRefresh } from '../lib/axios';

function hasAdminAccess(user: { role?: string; adminRole?: string | null }) {
  return user.role === 'ADMIN' || !!user.adminRole;
}

export const useInitAuth = () => {
  const { setAuth, setInitialized } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      try {
        // Refresh token хранится в httpOnly cookie, отправляем пустое тело
        const { data: refreshData } = await axios.post<{ accessToken: string }>(
          `${API_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const accessToken = refreshData.accessToken;

        const { data: user } = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!hasAdminAccess(user)) {
          setInitialized();
          return;
        }

        setAuth(accessToken, user);
        // Запускаем proactive refresh — токен обновится за 5 мин до истечения
        scheduleProactiveRefresh(accessToken);
      } catch {
        setInitialized();
      }
    };

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
};

export const useAuth = () => {
  const { user, accessToken, isInitialized, logout } = useAuthStore();
  return {
    user,
    accessToken,
    isInitialized,
    isAdmin: user?.role === 'ADMIN' || !!user?.adminRole,
    isAuthenticated: !!accessToken && !!user,
    logout,
  };
};
