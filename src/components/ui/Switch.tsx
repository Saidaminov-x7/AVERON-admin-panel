import React, { useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  ariaLabel?: string;
  ariaDescribedBy?: string;
  className?: string;
  containerClassName?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  ariaLabel,
  ariaDescribedBy,
  className,
  containerClassName,
}) => {
  const isSm = size === 'sm';
  const labelId = useId();
  const descriptionId = useId();
  const describedBy = [description ? descriptionId : null, ariaDescribedBy]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div
      className={twMerge(
        clsx(
          'inline-flex items-center justify-between gap-3 select-none group',
        ),
        containerClassName,
      )}
    >
      {(label || description) && (
        <div className="text-xs mr-2">
          {label && <span id={labelId} className="font-medium text-app block">{label}</span>}
          {description && <span id={descriptionId} className="text-muted block mt-0.5">{description}</span>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-label={ariaLabel}
        aria-labelledby={!ariaLabel && label ? labelId : undefined}
        aria-describedby={describedBy}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={twMerge(
          clsx(
            'relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-transparent p-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-60',
          ),
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            'pointer-events-none relative inline-flex shrink-0 items-center rounded-full border transition-colors duration-150',
            isSm ? 'h-5 w-9 p-1' : 'h-6 w-11 p-1',
            checked
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface-soft)]',
          )}
        >
          <span
            className={clsx(
              'pointer-events-none absolute left-1 top-1/2 size-4 -translate-y-1/2 rounded-full shadow-sm transition-[transform,background-color] duration-150',
              checked
                ? 'bg-[var(--color-on-primary)]'
                : 'bg-[var(--color-text-muted)]',
              checked && (isSm ? 'translate-x-3' : 'translate-x-5'),
            )}
          />
        </span>
      </button>
    </div>
  );
};
