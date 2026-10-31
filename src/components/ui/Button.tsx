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
  primary: 'bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] active:brightness-95 disabled:bg-surface-soft disabled:text-muted disabled:border-line shadow-xs',
  ghost: 'bg-transparent text-ink hover:bg-surface-soft active:bg-surface-soft disabled:text-muted',
  danger: 'bg-error text-[var(--color-on-primary)] hover:brightness-90 dark:hover:brightness-110 active:brightness-75 dark:active:brightness-90 disabled:bg-surface-soft disabled:text-muted disabled:border-line shadow-xs',
  outline: 'bg-surface border border-app text-app hover:bg-surface-soft active:bg-surface-soft disabled:bg-surface-soft disabled:text-muted disabled:border-line',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[length:var(--font-size-button)] gap-2 min-w-fit',
  md: 'h-11 px-4 text-[length:var(--font-size-button)] gap-2 min-w-fit',
  lg: 'h-12 px-6 text-[length:var(--font-size-button)] gap-2 min-w-fit',
  icon: 'h-11 min-h-11 w-11 p-0 justify-center shrink-0',
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
        aria-busy={loading || undefined}
        className={[
          'averon-button relative inline-flex items-center justify-center rounded-theme font-theme font-semibold whitespace-nowrap transition-[transform,background-color,border-color,color,box-shadow,filter] duration-150 [transition-timing-function:var(--ease-out-ui)] active:scale-[.98] disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100 disabled:active:brightness-100 cursor-pointer outline-none select-none',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        {...props}
      >
        {loading ? (
          <>
            <span className="inline-flex items-center gap-2 opacity-0 pointer-events-none">
              {effectiveLeftIcon && <span className="shrink-0">{effectiveLeftIcon}</span>}
              {children && <span>{children}</span>}
              {rightIcon && <span className="shrink-0">{rightIcon}</span>}
            </span>
            <span aria-hidden="true" className="absolute inset-0 grid place-items-center">
              <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin motion-reduce:animate-none" />
            </span>
          </>
        ) : (
          <>
            {effectiveLeftIcon && <span className="shrink-0">{effectiveLeftIcon}</span>}
            {children && <span className="truncate">{children}</span>}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';
