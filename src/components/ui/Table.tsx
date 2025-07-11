import React from 'react';
import { Table as AntdEnhancedTable } from './Table/AntdTable';
import type { EnhancedTableProps } from './Table/AntdTable';
import type { ColumnType } from 'antd/es/table';

// 为了向后兼容，定义旧的 TableColumn 接口
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

// 扩展新的属性接口，同时保持向后兼容
export interface TableProps<T = any> extends Omit<EnhancedTableProps<T>, 'columns'> {
  columns?: TableColumn<T>[] | ColumnType<T>[];
  dataSource?: T[];
  rowKey?: string | ((record: T) => string);
  loading?: boolean;
  pagination?: boolean | any;
  size?: 'sm' | 'md' | 'lg' | 'small' | 'middle' | 'large';
  bordered?: boolean;
  className?: string;
  onRow?: (record: T, index: number) => React.HTMLAttributes<HTMLTableRowElement>;
  scroll?: { x?: string | number | true; y?: string | number };
}

const Table = <T extends Record<string, any>>({
  columns = [],
  dataSource = [],
  rowKey = 'key',
  loading = false,
  pagination = false,
  size = 'md',
  bordered = false,
  className,
  onRow,
  scroll,
  ...props
}: TableProps<T>) => {
  // 转换列配置以确保兼容性
  const convertedColumns = columns.map((column: any) => ({
    ...column,
    dataIndex: column.dataIndex,
    key: column.key,
    title: column.title,
    width: column.width,
    align: column.align,
    render: column.render,
    sorter: column.sorter,
    fixed: column.fixed,
  }));

  // 处理 rowKey 转换
  const convertedRowKey = typeof rowKey === 'function' 
    ? rowKey 
    : (record: T) => record[rowKey as string] || record.key;

  // 处理 onRow 转换
  const convertedOnRow = onRow ? (record: T, index?: number) => {
    return onRow(record, index || 0);
  } : undefined;

  return (
    <AntdEnhancedTable<T>
      columns={convertedColumns}
      dataSource={dataSource}
      rowKey={convertedRowKey}
      loading={loading}
      pagination={pagination}
      size={size}
      className={className}
      onRow={convertedOnRow}
      scroll={scroll}
      variant={bordered ? 'bordered' : 'default'}
      {...props}
    />
  );
};

export { Table };
