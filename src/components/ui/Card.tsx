import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: 'default' | 'flat' | 'bordered' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  title?: React.ReactNode;
  description?: React.ReactNode;
  headerAction?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  title,
  description,
  headerAction,
  className,
  children,
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  }[padding];

  const variantStyles = {
    default: 'bg-surface border border-app shadow-xs',
    flat: 'bg-surface/50 border-0',
    bordered: 'bg-surface border border-app',
    elevated: 'bg-surface border border-app shadow-md hover:shadow-lg transition-shadow',
  }[variant];

  return (
    <div
      className={twMerge(
        clsx('rounded-theme font-theme transition-colors', variantStyles, paddingStyles),
        className,
      )}
      {...props}
    >
      {(title || description || headerAction) && (
        <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-app">
          <div>
            {title && typeof title === 'string' ? (
              <h3 className="text-base font-bold text-app tracking-tight">{title}</h3>
            ) : (
              title
            )}
            {description && (
              <p className="text-xs text-muted mt-0.5">{description}</p>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={twMerge(
      'flex items-center justify-between gap-4 mb-4 pb-3 border-b border-app',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3
    className={twMerge('text-base font-bold text-app tracking-tight', className)}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p className={twMerge('text-xs text-muted mt-0.5', className)} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={twMerge('space-y-4', className)} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={twMerge(
      'flex items-center justify-between gap-4 mt-6 pt-4 border-t border-app',
      className,
    )}
    {...props}
  >
    {children}
  </div>
);
