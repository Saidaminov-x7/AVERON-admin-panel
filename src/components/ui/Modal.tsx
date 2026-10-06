import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  presentation?: 'dialog' | 'page';
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  fullscreenOnMobile?: boolean;
  closeLabel?: string;
  headerContent?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
  '2xl': 'max-w-6xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  presentation = 'dialog',
  subtitle,
  size = 'md',
  fullscreenOnMobile = false,
  closeLabel = 'Close',
  headerContent,
  children,
  footer,
}: ModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const dialogId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || presentation === 'page') return;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [isOpen, presentation]);

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onCloseRef.current();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href]:not([tabindex="-1"]), button:not(:disabled):not([tabindex="-1"]), input:not(:disabled):not([type="hidden"]):not([tabindex="-1"]), select:not(:disabled):not([tabindex="-1"]), textarea:not(:disabled):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const panelClass = presentation === 'page'
    ? 'min-h-[calc(100dvh-7rem)] overflow-visible rounded-theme border border-app'
    : `relative z-10 shadow-2xl border border-app ${
      fullscreenOnMobile
        ? `h-[100dvh] max-h-[100dvh] rounded-none border-x-0 border-y-0 sm:h-auto sm:max-h-[90vh] sm:rounded-theme sm:border ${sizeClasses[size]}`
        : `max-h-[90vh] rounded-theme ${sizeClasses[size]}`
    }`;
  const content = (
    <AnimatePresence>
      {isOpen && (
        <div className={presentation === 'page' ? 'w-full' : `fixed inset-0 z-50 flex items-center justify-center ${fullscreenOnMobile ? 'p-0 sm:p-4' : 'p-4'}`}>
          {presentation === 'dialog' && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            aria-hidden="true"
          />
          )}
          <motion.div
            ref={dialogRef}
            id={dialogId}
            role={presentation === 'page' ? undefined : 'dialog'}
            aria-modal={presentation === 'page' ? undefined : 'true'}
            aria-labelledby={`${dialogId}-title`}
            aria-describedby={subtitle ? `${dialogId}-description` : undefined}
            tabIndex={-1}
            onKeyDown={presentation === 'page' ? undefined : handleDialogKeyDown}
            className={`flex w-full min-h-0 flex-col font-theme bg-surface outline-none overflow-hidden ${panelClass}`}
            initial={{ opacity: 0, transform: prefersReducedMotion ? 'scale(1)' : 'scale(0.96)' }}
            animate={{ opacity: 1, transform: 'scale(1)' }}
            exit={{ opacity: 0, transform: prefersReducedMotion ? 'scale(1)' : 'scale(0.96)' }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className={`relative grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 border-b border-app bg-surface px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:gap-x-4 sm:p-5 ${
              headerContent ? 'sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]' : ''
            }`}>
              <div className="col-start-1 row-start-1 min-w-0">
                <div className="min-w-0">
                  <h3 id={`${dialogId}-title`} className="text-base font-bold text-app truncate">{title}</h3>
                  {subtitle && <p id={`${dialogId}-description`} className="text-xs text-muted truncate mt-0.5">{subtitle}</p>}
                </div>
              </div>
              {headerContent && (
                <div className="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:justify-self-center">
                  {headerContent}
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-gray-100 hover:text-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-white/5 cursor-pointer transition-colors ${
                  headerContent ? 'col-start-2 row-start-1 sm:col-start-3 sm:justify-self-end' : 'col-start-2 row-start-1'
                }`}
                aria-label={closeLabel}
              >
                <X size={18} />
              </button>
            </div>
            <div className={presentation === 'page' ? 'p-4 sm:p-6' : 'min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6'}>{children}</div>
            {footer && (
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-app bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:p-5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
  return presentation === 'page' ? content : createPortal(content, document.body);
}
