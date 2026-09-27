import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TabItem<T extends string = string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  variant?: 'pills' | 'underline' | 'segmented';
  size?: 'sm' | 'md';
  className?: string;
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  variant = 'segmented',
  size = 'md',
  className,
}: TabsProps<T>) {
  const isSm = size === 'sm';

  if (variant === 'underline') {
    return (
      <div className={twMerge('flex border-b border-app space-x-4', className)}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onChange(tab.id)}
              className={clsx(
                'flex items-center gap-2 pb-2.5 px-1 font-medium transition-all border-b-2 cursor-pointer outline-none',
                isSm ? 'text-xs' : 'text-sm',
                isActive
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400 font-semibold'
                  : 'border-transparent text-muted hover:text-app hover:border-gray-300 dark:hover:border-gray-700',
                tab.disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'pills') {
    return (
      <div className={twMerge('flex flex-wrap gap-1.5', className)}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onChange(tab.id)}
              className={clsx(
                'flex items-center gap-1.5 font-medium rounded-xl transition-all cursor-pointer outline-none',
                isSm ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
                isActive
                  ? 'bg-primary-500 text-white shadow-xs font-semibold'
                  : 'bg-surface text-muted hover:text-app hover:bg-gray-100 dark:hover:bg-white/5 border border-app',
                tab.disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge}
            </button>
          );
        })}
      </div>
    );
  }

  // Segmented control variant (default)
  return (
    <div
      className={twMerge(
        'inline-flex items-center p-1 rounded-xl bg-gray-100 dark:bg-white/5 border border-app',
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.id)}
            className={clsx(
              'flex items-center justify-center gap-1.5 rounded-lg transition-all cursor-pointer outline-none select-none font-medium',
              isSm ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs sm:text-sm',
              isActive
                ? 'bg-surface text-app shadow-xs font-bold dark:bg-white/15 dark:text-white border border-gray-200/60 dark:border-white/10'
                : 'text-muted hover:text-app hover:bg-black/5 dark:hover:bg-white/5',
              tab.disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge}
          </button>
        );
      })}
    </div>
  );
}
