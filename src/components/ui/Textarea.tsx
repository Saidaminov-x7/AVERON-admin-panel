import React, { forwardRef, useCallback, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useId } from 'react';
import { fieldContainerClass, fieldControlClass, fieldErrorClass, fieldLabelClass, fieldMessageClass } from './fieldStyles';

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
    const generatedId = useId();
    const textareaId = id || generatedId;
    const errorId = `${textareaId}-error`;
    const helperTextId = `${textareaId}-help`;

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
      <div className={twMerge(fieldContainerClass, containerClassName)}>
        {label && (
          <label
            htmlFor={textareaId}
            className={fieldLabelClass}
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
              fieldControlClass,
              'min-h-[70px] py-3 leading-relaxed resize-y',
              error && fieldErrorClass,
            ),
            className,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperTextId : undefined}
          {...props}
        />
        {error ? (
          <p id={errorId} className={`${fieldMessageClass} text-red-500`}>{error}</p>
        ) : helperText ? (
          <p id={helperTextId} className="text-xs text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
