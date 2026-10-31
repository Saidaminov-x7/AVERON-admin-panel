import React, { useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  ariaLabel?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  containerClassName?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  ariaLabel,
  disabled = false,
  size = 'md',
  className,
  containerClassName,
}) => {
  const isSm = size === 'sm';
  const labelId = useId();
  const descriptionId = useId();

  return (
    <label
      className={twMerge(
        clsx(
          'group inline-flex min-h-11 min-w-11 cursor-pointer select-none items-center justify-between gap-3',
          disabled && 'cursor-not-allowed',
        ),
        containerClassName,
      )}
    >
      {(label || description) && (
        <div className="mr-2 min-w-0 text-xs">
          {label && <span id={labelId} className="block font-medium text-app">{label}</span>}
          {description && <span id={descriptionId} className="mt-0.5 block text-muted">{description}</span>}
        </div>
      )}
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-checked={checked}
        aria-label={ariaLabel}
        aria-labelledby={label ? labelId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        className="peer sr-only"
        />
        <span aria-hidden="true" className={twMerge(
          clsx(
            'relative inline-flex items-center rounded-full border border-transparent p-0.5 transition-colors duration-200 ease-in-out',
            isSm ? 'h-6 w-10' : 'h-7 w-12',
            checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]',
            'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-500 peer-disabled:opacity-70',
          ),
          className,
        )}
      >
        <span
          className={clsx(
            'pointer-events-none inline-block transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
            isSm
              ? clsx('size-4', checked ? 'translate-x-4' : 'translate-x-0')
              : clsx('size-5', checked ? 'translate-x-5' : 'translate-x-0'),
          )}
        />
        </span>
      </span>
    </label>
  );
};
