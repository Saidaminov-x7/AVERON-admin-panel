import React, { forwardRef, useCallback, useId, useRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { fieldContainerClass, fieldControlClass, fieldErrorClass, fieldLabelClass, fieldMessageClass } from './fieldStyles';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      clearable = false,
      onClear,
      className,
      containerClassName,
      id,
      disabled,
      value,
      ...props
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const setInputRef = useCallback((node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    }, [ref]);
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperTextId = `${inputId}-help`;

    return (
      <div className={twMerge(fieldContainerClass, containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className={fieldLabelClass}
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-muted">
              {leftIcon}
            </div>
          )}
          <input
            ref={setInputRef}
            id={inputId}
            disabled={disabled}
            value={value}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperTextId : undefined}
            className={twMerge(
              clsx(
                fieldControlClass,
                'h-10 font-theme',
                leftIcon ? 'pl-10' : '',
                rightIcon ? 'pr-10' : '',
                error && fieldErrorClass,
              ),
              className,
            )}
            {...props}
          />
          {clearable && onClear && String(value ?? '').length > 0 && (
            <button
              type="button"
              aria-label={t('common.clearField')}
              title={t('common.clearField')}
              disabled={disabled}
              onClick={() => {
                onClear();
                requestAnimationFrame(() => inputRef.current?.focus());
              }}
              className="absolute right-0 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-none bg-transparent text-muted transition-colors hover:bg-[var(--color-surface-soft)] hover:text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 disabled:cursor-not-allowed"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
          {rightIcon && (
              <div className={`absolute ${clearable && onClear && String(value ?? '').length > 0 ? 'right-11' : 'right-3'} flex items-center text-muted`}>
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p id={errorId} className={`${fieldMessageClass} text-error`}>{error}</p>
        ) : helperText ? (
          <p id={helperTextId} className="text-xs text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
