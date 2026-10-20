import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  icon,
  className,
  children,
  ...props
}) => {
  const variantStyles = {
    success: 'bg-surface-soft text-success dark:bg-surface-soft dark:text-success border-line dark:border-line',
    warning: 'bg-surface-soft text-warning dark:bg-surface-soft dark:text-warning border-line dark:border-line',
    danger: 'bg-surface-soft text-error dark:bg-surface-soft dark:text-error border-line dark:border-line',
    info: 'bg-surface-soft text-info dark:bg-surface-soft dark:text-info border-line dark:border-line',
    primary: 'bg-surface-soft text-info dark:bg-surface-soft dark:text-info border-line dark:border-line',
    neutral: 'bg-surface-soft text-ink-soft dark:bg-surface-soft dark:text-ink-soft border-line dark:border-line',
  }[variant];

  const dotStyles = {
    success: 'bg-surface-soft',
    warning: 'bg-surface-soft',
    danger: 'bg-surface-soft',
    info: 'bg-surface-soft',
    primary: 'bg-surface-soft',
    neutral: 'bg-surface-soft',
  }[variant];

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-2 font-semibold rounded-full border transition-colors select-none',
          size === 'sm' ? 'px-2 py-1 text-[length:var(--font-size-caption)]' : 'px-3 py-1 text-xs',
          variantStyles,
        ),
        className,
      )}
      {...props}
    >
      {dot && <span className={clsx('h-1.5 w-1.5 rounded-full shrink-0 animate-pulse', dotStyles)} />}
      {icon}
      <span>{children}</span>
    </span>
  );
};
