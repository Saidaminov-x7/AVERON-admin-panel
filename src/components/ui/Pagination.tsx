import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}) => {
  if (totalPages <= 1 && !totalItems) return null;

  // Generate visible page numbers
  const getPages = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPages();

  return (
    <div
      className={twMerge(
        'flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-1 text-xs text-muted select-none',
        className,
      )}
    >
      {/* Total items info & page size */}
      <div className="flex items-center gap-3">
        {totalItems !== undefined && (
          <span>
            Всего: <strong className="text-app font-semibold">{totalItems}</strong> записей
          </span>
        )}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span>Показывать:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 rounded-lg bg-surface border border-app text-app outline-none focus:border-primary-500 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          className="p-1.5 rounded-lg border border-app bg-surface hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="В начало"
        >
          <ChevronsLeft size={14} />
        </button>
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-1.5 rounded-lg border border-app bg-surface hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Назад"
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((p, idx) => {
          if (p === 'ellipsis') {
            return (
              <span key={`el-${idx}`} className="px-2 py-1 text-muted">
                ...
              </span>
            );
          }
          const isActive = p === currentPage;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={clsx(
                'min-w-8 h-8 px-2 rounded-lg font-medium transition-all text-xs flex items-center justify-center cursor-pointer',
                isActive
                  ? 'bg-primary-500 text-white font-bold shadow-xs'
                  : 'bg-surface border border-app text-app hover:bg-gray-100 dark:hover:bg-white/5',
              )}
            >
              {p}
            </button>
          );
        })}

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-1.5 rounded-lg border border-app bg-surface hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Вперёд"
        >
          <ChevronRight size={14} />
        </button>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className="p-1.5 rounded-lg border border-app bg-surface hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="В конец"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
};
