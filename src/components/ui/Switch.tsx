import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
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
  disabled = false,
  size = 'md',
  className,
  containerClassName,
}) => {
  const isSm = size === 'sm';

  return (
    <label
      className={twMerge(
        clsx(
          'inline-flex items-center justify-between gap-3 cursor-pointer select-none group',
          disabled && 'opacity-50 cursor-not-allowed',
        ),
        containerClassName,
      )}
    >
      {(label || description) && (
        <div className="text-xs mr-2">
          {label && <span className="font-medium text-app block">{label}</span>}
          {description && <span className="text-muted block mt-0.5">{description}</span>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={twMerge(
          clsx(
            'relative inline-flex shrink-0 transition-colors duration-200 ease-in-out rounded-full border-2 border-transparent cursor-pointer outline-none focus:ring-2 focus:ring-primary-500/20',
            isSm ? 'h-5 w-9' : 'h-6 w-11',
            checked ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-700',
          ),
          className,
        )}
      >
        <span
          className={clsx(
            'pointer-events-none inline-block transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
            isSm
              ? clsx('h-4 w-4', checked ? 'translate-x-4' : 'translate-x-0')
              : clsx('h-5 w-5', checked ? 'translate-x-5' : 'translate-x-0'),
          )}
        />
      </button>
    </label>
  );
};
