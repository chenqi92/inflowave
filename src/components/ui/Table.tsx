import React from 'react';
import { cn } from '@/utils/cn';

export interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex?: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sorter?: boolean;
  fixed?: 'left' | 'right';
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  dataSource: T[];
  rowKey?: string | ((record: T) => string);
  loading?: boolean;
  pagination?: boolean;
  size?: 'sm' | 'md' | 'lg';
  bordered?: boolean;
  className?: string;
  onRow?: (record: T, index: number) => React.HTMLAttributes<HTMLTableRowElement>;
}

const Table = <T extends Record<string, any>>({
  columns,
  dataSource,
  rowKey = 'key',
  loading = false,
  pagination = false,
  size = 'md',
  bordered = false,
  className,
  onRow,
}: TableProps<T>) => {
  const sizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const cellPadding = {
    sm: 'px-2 py-1',
    md: 'px-4 py-2',
    lg: 'px-6 py-3',
  };

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] || index.toString();
  };

  const getCellValue = (record: T, column: TableColumn<T>, index: number) => {
    if (column.render) {
      return column.render(
        column.dataIndex ? record[column.dataIndex] : record,
        record,
        index
      );
    }
    return column.dataIndex ? record[column.dataIndex] : '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className={cn(
        'w-full bg-white',
        bordered && 'border border-gray-300',
        sizes[size]
      )}>
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'font-medium text-gray-900 border-b border-gray-200',
                  cellPadding[size],
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right',
                  bordered && 'border-r border-gray-300 last:border-r-0'
                )}
                style={{ width: column.width }}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {dataSource.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className={cn('text-center text-gray-500', cellPadding[size])}
              >
                No data
              </td>
            </tr>
          ) : (
            dataSource.map((record, index) => {
              const rowProps = onRow?.(record, index) || {};
              return (
                <tr
                  key={getRowKey(record, index)}
                  className={cn(
                    'hover:bg-gray-50 transition-colors',
                    rowProps.className
                  )}
                  {...rowProps}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'text-gray-900',
                        cellPadding[size],
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right',
                        bordered && 'border-r border-gray-300 last:border-r-0'
                      )}
                    >
                      {getCellValue(record, column, index)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export { Table };
