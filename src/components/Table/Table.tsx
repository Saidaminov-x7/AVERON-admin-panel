import React from 'react';

export interface Column<T> {
  header: string;
  accessor?: keyof T | ((row: T) => React.ReactNode);
  className?: string;
  headerClassName?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyText?: string;
  onRowClick?: (row: T) => void;
}

export function Table<T extends { id?: string | number }>({
  columns,
  data,
  loading = false,
  emptyText = 'Нет данных',
  onRowClick,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center text-text-muted">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-sm">Загрузка данных...</span>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="w-full py-16 text-center text-text-muted text-sm">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b border-border bg-black/5 dark:bg-white/5 text-text-muted font-medium text-xs">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`py-3.5 px-4 ${col.headerClassName || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {data.map((row, rowIdx) => (
            <tr
              key={row.id ? String(row.id) : rowIdx}
              onClick={() => onRowClick?.(row)}
              className={`transition-colors ${
                onRowClick
                  ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5'
                  : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
              }`}
            >
              {columns.map((col, colIdx) => (
                <td
                  key={colIdx}
                  className={`py-3.5 px-4 text-text ${col.className || ''}`}
                >
                  {typeof col.accessor === 'function'
                    ? col.accessor(row)
                    : col.accessor
                    ? (row[col.accessor] as React.ReactNode)
                    : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default Table;
