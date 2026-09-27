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
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-app bg-surface/50',
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/5 text-muted mb-4 shadow-xs">
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
          className="mt-2 shadow-xs"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
