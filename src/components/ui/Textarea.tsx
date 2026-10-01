import React, { forwardRef, useCallback, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  autoResize?: boolean;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      autoResize = true,
      className,
      containerClassName,
      id,
      disabled,
      onChange,
      rows = 3,
      ...props
    },
    ref,
  ) => {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const handleResize = useCallback(() => {
      const el = internalRef.current;
      if (el && autoResize) {
        el.style.height = 'auto';
        el.style.height = `${Math.max(el.scrollHeight + 2, 70)}px`;
      }
    }, [autoResize]);

    useEffect(() => {
      handleResize();
    }, [handleResize, props.value]);

    return (
      <div className={twMerge('w-full space-y-1.5', containerClassName)}>
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-semibold text-app select-none tracking-wide"
          >
            {label}
          </label>
        )}
        <textarea
          ref={(node) => {
            internalRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
          }}
          id={textareaId}
          disabled={disabled}
          rows={rows}
          onChange={(e) => {
            handleResize();
            onChange?.(e);
          }}
          className={twMerge(
            clsx(
              'w-full px-3.5 py-3 text-sm leading-relaxed rounded-xl transition-all duration-150 outline-none resize-y',
              'bg-surface border border-app text-app placeholder:text-muted',
              'focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-white/5',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            ),
            className,
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {error ? (
          <p className="text-xs text-red-500 font-medium animate-fade-in">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
