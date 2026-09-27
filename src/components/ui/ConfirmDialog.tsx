import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'warning';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  variant = 'danger',
  loading = false,
}) => {
  const iconConfig = {
    danger: {
      icon: <AlertTriangle size={24} className="text-red-500" />,
      bg: 'bg-red-50 dark:bg-red-950/40',
      btnVariant: 'danger' as const,
    },
    warning: {
      icon: <AlertTriangle size={24} className="text-amber-500" />,
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      btnVariant: 'primary' as const,
    },
    primary: {
      icon: <Info size={24} className="text-primary-500" />,
      bg: 'bg-primary-50 dark:bg-primary-950/40',
      btnVariant: 'primary' as const,
    },
  }[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={iconConfig.btnVariant}
            size="sm"
            onClick={() => {
              onConfirm();
            }}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconConfig.bg}`}>
          {iconConfig.icon}
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-app">{title}</h4>
          <div className="text-xs text-muted leading-relaxed">{message}</div>
        </div>
      </div>
    </Modal>
  );
};
