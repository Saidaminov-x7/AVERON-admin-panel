// src/components/Badge/Badge.tsx
// Универсальный компонент цветного бейджа статуса

import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'teal';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger:  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  info:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  teal:    'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
};

const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, className = '' }) => {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};

export default Badge;

// ─── Функции-хелперы для частых статусов ─────────────────────────────────────

export const getModerationBadge = (status: string): { variant: BadgeVariant; label: string } => {
  switch (status) {
    case 'APPROVED':          return { variant: 'success', label: 'Одобрено' };
    case 'PENDING':           return { variant: 'warning', label: 'Ожидает' };
    case 'REJECTED':          return { variant: 'danger',  label: 'Отклонено' };
    case 'CHANGES_REQUESTED': return { variant: 'info',    label: 'Правки' };
    default:                  return { variant: 'neutral', label: status };
  }
};

export const getUserStatusBadge = (user: { isBlocked: boolean; createdAt: string; lastLoginAt?: string | null }): { variant: BadgeVariant; label: string } => {
  if (user.isBlocked) return { variant: 'danger', label: 'Заблокирован' };

  // "Активен" — если пользователь хотя бы раз вошёл в систему
  if (user.lastLoginAt) return { variant: 'success', label: 'Активен' };

  // "Новый" — зарегистрирован, но ещё не входил
  return { variant: 'warning', label: 'Новый' };
};

const adminRoleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Супер Администратор',
  ADMIN:       'Администратор',
  MODERATOR:   'Модератор',
  SUPPORT:     'Поддержка',
};

export const getRoleBadge = (role: string, adminRole?: string | null): { variant: BadgeVariant; label: string } => {
  // Если пользователь — сотрудник с adminRole, показываем его роль в админке
  if (adminRole && role === 'ADMIN') {
    const variant: BadgeVariant = adminRole === 'SUPER_ADMIN' ? 'danger' : 'teal';
    return { variant, label: adminRoleLabels[adminRole] || adminRole };
  }
  switch (role) {
    case 'ADMIN':    return { variant: 'teal',    label: 'Администратор' };
    case 'SELLER':   return { variant: 'info',    label: 'Продавец' };
    case 'USER':     return { variant: 'neutral', label: 'Покупатель' };
    default:         return { variant: 'neutral', label: role };
  }
};
