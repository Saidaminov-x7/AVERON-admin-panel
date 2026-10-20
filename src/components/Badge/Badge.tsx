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
  success: 'bg-surface-soft text-success dark:bg-surface-soft dark:text-success',
  warning: 'bg-surface-soft text-warning dark:bg-surface-soft dark:text-warning',
  danger:  'bg-surface-soft text-error dark:bg-surface-soft dark:text-error',
  info:    'bg-surface-soft text-info dark:bg-surface-soft dark:text-info',
  neutral: 'bg-surface-soft text-muted dark:bg-surface-soft dark:text-ink-soft',
  teal:    'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
};

const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, className = '' }) => {
  return (
    <span
      className={`
        inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};

export default Badge;
