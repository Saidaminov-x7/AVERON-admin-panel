import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
  error?: string;
  containerClassName?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, className, containerClassName, id, disabled, checked, ...props }, ref) => {
    const checkboxId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={twMerge('space-y-1', containerClassName)}>
        <label
          htmlFor={checkboxId}
          className={clsx(
            'inline-flex items-start gap-2.5 cursor-pointer select-none group',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
            <input
              ref={ref}
              id={checkboxId}
              type="checkbox"
              disabled={disabled}
              checked={checked}
              className="peer sr-only"
              {...props}
            />
            <div
              className={twMerge(
                clsx(
                  'h-[18px] w-[18px] rounded-none border transition-all duration-150 flex items-center justify-center',
                  'bg-surface border-app',
                  'peer-checked:bg-[var(--color-primary)] peer-checked:border-[var(--color-primary)] text-[var(--color-on-primary)]',
                  'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-500',
                  'group-hover:border-[var(--color-text-secondary)]',
                  error && 'border-red-500',
                ),
                className,
              )}
            >
              {checked && <Check size={12} strokeWidth={3} />}
            </div>
          </div>
          {(label || description) && (
            <div className="text-xs">
              {label && <span className="font-medium text-app block">{label}</span>}
              {description && <span className="text-muted block mt-0.5">{description}</span>}
            </div>
          )}
        </label>
        {error && <p className="text-xs text-red-500 font-medium animate-fade-in pl-6">{error}</p>}
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';
