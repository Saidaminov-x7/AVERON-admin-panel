// src/components/MetricCard/MetricCard.tsx
// Карточка метрики дашборда с процентным изменением

import React from 'react';

interface MetricCardProps {
  label:     string;
  value:     string | number;
  change?:   number;        // Числовое изменение (% или абсолютное)
  isAbsolute?: boolean;     // true — показывать абсолютное изменение, false — %
  trend?:    'up' | 'down';
  icon:      React.ReactNode;
  loading?:  boolean;
}

const ArrowUpIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
);

const ArrowDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  change,
  isAbsolute = false,
  trend,
  icon,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"/>
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"/>
        </div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"/>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"/>
      </div>
    );
  }

  // Определяем цвет изменения
  // Для "Ожидают модерации" — меньше = лучше (trend 'up' = зелёный)
  const isPositive = trend === 'up';

  return (
    <div className="card hover:shadow-md transition-shadow duration-200">
      {/* Лейбл и иконка */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted">{label}</span>
        <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-500">
          {icon}
        </div>
      </div>

      {/* Значение */}
      <div className="text-3xl font-bold text-app mb-1">
        {typeof value === 'number' ? value.toLocaleString('ru-RU') : value}
      </div>

      {/* Изменение */}
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium ${
          isPositive ? 'text-emerald-500' : 'text-red-500'
        }`}>
          {isPositive ? <ArrowUpIcon /> : <ArrowDownIcon />}
          <span>
            {isAbsolute
              ? `${change > 0 ? '+' : ''}${change}`
              : `${change > 0 ? '+' : ''}${change}%`
            }
          </span>
        </div>
      )}
    </div>
  );
};

export default MetricCard;
