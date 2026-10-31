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
  ariaLabel,
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
          {label && <span className="font-medium text-app block">{label}</span>}
          {description && <span className="text-muted block mt-1">{description}</span>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-label={ariaLabel}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={twMerge(
          clsx(
            'relative inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          ),
          className,
        )}
      >
        <span aria-hidden="true" className={clsx('relative block rounded-full border transition-colors duration-200 motion-reduce:transition-none', isSm ? 'h-5 w-9' : 'h-6 w-11', checked ? 'border-primary-500 bg-primary-500' : 'border-app bg-surface-soft')}>
          <span className={clsx('absolute left-0.5 top-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 motion-reduce:transition-none', isSm ? 'size-3.5' : 'size-[18px]', checked && (isSm ? 'translate-x-4' : 'translate-x-5'))} />
        </span>
      </button>
    </div>
  );
};
