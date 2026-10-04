import React from 'react';

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  as?: React.ElementType;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] active:brightness-90 shadow-xs',
  ghost: 'bg-transparent text-app hover:bg-[var(--color-surface-soft)]',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-xs',
  outline: 'bg-surface border border-app text-app hover:bg-[var(--color-surface-soft)]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 min-w-fit',
  md: 'h-11 px-4 text-sm gap-2 min-w-fit',
  lg: 'h-12 px-6 text-base gap-2 min-w-fit',
  icon: 'h-11 w-11 p-0 justify-center shrink-0',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      as: Component = 'button',
      children,
      icon,
      leftIcon,
      rightIcon,
      loading = false,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp: any = Component;
    const effectiveLeftIcon = leftIcon || icon;

    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center rounded-theme font-theme font-semibold whitespace-nowrap transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-150 [transition-timing-function:var(--ease-out-ui)] active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer outline-none select-none',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        {...props}
      >
        {loading ? (
          <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
        ) : (
          effectiveLeftIcon && <span className="shrink-0">{effectiveLeftIcon}</span>
        )}
        {children && <span className="truncate">{children}</span>}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </Comp>
    );
  },
);
Button.displayName = 'Button';
