import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
};

export function Modal({ isOpen, onClose, title, subtitle, size = 'md', children, footer }: ModalProps) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            className={`relative w-full ${sizeClasses[size]} rounded-theme font-theme bg-surface shadow-2xl border border-app z-10 max-h-[90vh] flex flex-col`}
            initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.96 }}
            transition={{ duration: 0.15 }}
          >
            {(title || subtitle) && (
              <div className="flex items-start justify-between gap-4 p-5 border-b border-app shrink-0">
                <div className="min-w-0">
                  {title && <h3 className="text-base font-bold text-app truncate">{title}</h3>}
                  {subtitle && <p className="text-xs text-muted truncate mt-0.5">{subtitle}</p>}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-muted hover:text-app hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg shrink-0 cursor-pointer transition-colors"
                  aria-label="Закрыть"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            <div className="p-5 overflow-y-auto">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-3 p-5 border-t border-app shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
