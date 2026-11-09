import React from 'react';
import { LoaderCircle } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import uiStyles from './themeStyles.module.css';

type ButtonVariant = 'primary' | 'default' | 'ghost' | 'danger' | 'outline' | 'link';
type ButtonSize = 'sm' | 'md' | 'default' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  as?: React.ElementType;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  loadingLabel?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--color-action-bg)] text-[var(--color-on-action)] hover:bg-[var(--color-button-hover)]',
  default: 'bg-[var(--color-action-bg)] text-[var(--color-on-action)] hover:bg-[var(--color-button-hover)]',
  ghost: 'border border-transparent bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)] hover:text-app',
  danger: 'border border-transparent bg-[var(--color-error)] text-white hover:brightness-90',
  outline: 'border border-app bg-surface text-app hover:bg-[var(--color-surface-soft)]',
  link: 'h-auto min-w-0 p-0 text-app underline-offset-4 hover:underline',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-11 px-3 text-[13px] gap-2 min-w-fit',
  md: 'h-11 px-4 text-[13px] gap-2 min-w-fit',
  default: 'h-11 px-4 text-[13px] gap-2 min-w-fit',
  lg: 'h-11 px-8 text-sm gap-2 min-w-fit',
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
      loadingLabel,
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
          className={twMerge([
          `inline-flex items-center justify-center rounded-[var(--radius-control)] border border-transparent ${uiStyles.fontTheme} text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-[var(--color-bg)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none`,
          variantClasses[variant],
          sizeClasses[size],
          className,
          ].join(' '))}
        {...props}
      >
        {loading ? (
          <LoaderCircle aria-hidden="true" className="mr-2 size-4 shrink-0 animate-spin motion-reduce:animate-none" />
        ) : (
          effectiveLeftIcon && <span className="shrink-0">{effectiveLeftIcon}</span>
        )}
        {loading && loadingLabel ? <span className="truncate">{loadingLabel}</span> : children}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'size'> {
  label: string;
  children: React.ReactNode;
  compact?: boolean;
}

/** Shared accessible icon-only action with a predictable touch target. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, children, compact = false, ...props }, ref) => (
    <Button
      {...props}
      ref={ref}
      size="icon"
      aria-label={label}
      title={props.title ?? label}
      className={twMerge(compact && 'h-9 w-9', props.className)}
    >
      {children}
    </Button>
  ),
);
IconButton.displayName = 'IconButton';
