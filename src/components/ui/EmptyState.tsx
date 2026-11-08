import React from 'react';
import { twMerge } from 'tailwind-merge';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  className,
}) => {
  return (
    <div
      className={twMerge(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-none border border-dashed border-app bg-surface',
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-none bg-[var(--color-surface-soft)] text-muted">
        {icon || <Inbox size={28} strokeWidth={1.5} />}
      </div>
      <h3 className="text-base font-bold text-app">{title}</h3>
      {description && (
        <p className="text-xs text-muted max-w-sm mt-1 mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          variant="primary"
          size="sm"
          onClick={onAction}
          icon={actionIcon}
          className="mt-2"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
