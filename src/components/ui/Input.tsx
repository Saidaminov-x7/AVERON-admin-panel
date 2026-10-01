import React, { forwardRef, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { fieldContainerClass, fieldControlClass, fieldErrorClass, fieldLabelClass, fieldMessageClass } from './fieldStyles';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
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
      className,
      containerClassName,
      id,
      disabled,
      ...props
    },
    ref,
  ) => {
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
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperTextId : undefined}
            className={twMerge(
              clsx(
                fieldControlClass,
                'h-10 font-theme',
                leftIcon ? 'pl-9' : '',
                rightIcon ? 'pr-9' : '',
                error && fieldErrorClass,
              ),
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center text-muted">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p id={errorId} className={`${fieldMessageClass} text-red-500`}>{error}</p>
        ) : helperText ? (
          <p id={helperTextId} className="text-xs text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
