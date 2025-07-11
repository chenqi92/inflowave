import React from 'react';
import { Table as AntdTable } from 'antd';
import type { TableProps as AntdTableProps, ColumnType } from 'antd/es/table';
import { cn } from '@/utils/cn';

// 扩展 Ant Design Table 的属性以支持自定义功能
export interface EnhancedTableProps<T = any> extends Omit<AntdTableProps<T>, 'columns'> {
  columns?: ColumnType<T>[];
  dataSource?: T[];
  loading?: boolean;
  size?: 'small' | 'middle' | 'large' | 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'bordered' | 'striped' | 'hover';
  className?: string;
  style?: React.CSSProperties;
}

const Table = <T extends Record<string, any> = any>({
  className,
  columns = [],
  dataSource = [],
  loading = false,
  size = 'middle',
  variant = 'default',
  pagination,
  scroll,
  ...props
}: EnhancedTableProps<T>) => {
  // 将自定义 size 映射到 Ant Design 的 size
  const getAntdSize = (size: string): AntdTableProps['size'] => {
    switch (size) {
      case 'xs':
      case 'sm':
        return 'small';
      case 'lg':
        return 'large';
      case 'small':
      case 'middle':
      case 'large':
        return size as AntdTableProps['size'];
      default:
        return 'middle';
    }
  };

  // 根据 variant 添加特殊样式
  const getVariantClassName = (variant: string): string => {
    switch (variant) {
      case 'bordered':
        return 'ant-table-bordered';
      case 'striped':
        return 'ant-table-striped';
      case 'hover':
        return 'ant-table-hover';
      default:
        return '';
    }
  };

  // 构建 className
  const tableClassName = cn(
    getVariantClassName(variant),
    className
  );

  // 处理分页配置
  const paginationConfig = pagination === false ? false : {
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number, range: [number, number]) => 
      `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
    ...pagination
  };

  // 处理滚动配置
  const scrollConfig = scroll || { x: 'max-content' };

  return (
    <AntdTable<T>
      className={tableClassName}
      columns={columns}
      dataSource={dataSource}
      loading={loading}
      size={getAntdSize(size)}
      pagination={paginationConfig}
      scroll={scrollConfig}
      {...props}
    />
  );
};

export { Table };