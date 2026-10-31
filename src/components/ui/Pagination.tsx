import React, { useEffect, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { Select } from './Select';
import { getVisiblePageNumbers } from './paginationUtils';

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
  const { t, i18n } = useTranslation();
  const currentPageButtonRef = useRef<HTMLButtonElement>(null);
  const focusCurrentPageAfterChange = useRef(false);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1024 : window.innerWidth,
  );

  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', updateViewportWidth);
    return () => window.removeEventListener('resize', updateViewportWidth);
  }, []);

  useEffect(() => {
    if (!focusCurrentPageAfterChange.current) return;
    focusCurrentPageAfterChange.current = false;
    currentPageButtonRef.current?.focus();
  }, [currentPage]);

  const changePage = (page: number) => {
    if (page === currentPage) return;
    focusCurrentPageAfterChange.current = true;
    onPageChange(page);
  };

  if (totalPages <= 1 && !totalItems) return null;

  const pageNumbers = getVisiblePageNumbers(currentPage, totalPages, viewportWidth);
  const formattedTotal = totalItems === undefined
    ? null
    : new Intl.NumberFormat(i18n.language).format(totalItems);

  return (
    <div
      className={twMerge(
        'flex flex-col md:flex-row items-center justify-between gap-4 py-3 px-1 text-xs text-muted select-none',
        className,
      )}
    >
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center md:w-auto">
        {formattedTotal !== null && (
          <span>
            {t('common.total', { count: formattedTotal })}
          </span>
        )}
        {onPageSizeChange && (
          <div className="flex items-center gap-2 ml-2">
            <span>Показывать:</span>
            <div className="w-20">
              <Select
                ariaLabel={t('common.itemsPerPage')}
                value={String(pageSize)}
                onChange={(value) => onPageSizeChange(Number(value))}
                options={pageSizeOptions.map((option) => ({ value: String(option), label: String(option) }))}
                className="h-11 text-xs py-1"
              />
            </div>
          </div>
        )}
      </div>

      <nav aria-label={t('common.pagination')} className="flex items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          className="p-2 rounded-lg border border-app bg-surface hover:bg-surface-soft dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="В начало"
        >
          <ChevronsLeft size={16} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-2 rounded-lg border border-app bg-surface hover:bg-surface-soft dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Назад"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </Button>

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
                  : 'bg-surface border border-app text-app hover:bg-surface-soft dark:hover:bg-white/5',
              )}
            >
              {p}
            </button>
          );
        })}

        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-2 rounded-lg border border-app bg-surface hover:bg-surface-soft dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Вперёд"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className="p-2 rounded-lg border border-app bg-surface hover:bg-surface-soft dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="В конец"
        >
          <ChevronsRight size={16} aria-hidden="true" />
        </Button>
      </nav>
    </div>
  );
};
