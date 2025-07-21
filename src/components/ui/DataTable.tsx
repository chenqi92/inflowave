import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './Table';
import { Spin } from './Spin';
import { Empty } from './Empty';
import { Button } from './Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

// 排序方向类型
type SortOrder = 'asc' | 'desc' | null;

// 排序配置
interface SortConfig {
  key: string;
  direction: SortOrder;
}

// 分页配置
interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: (total: number, range: [number, number]) => string;
  pageSizeOptions?: string[];
}

// 兼容 Ant Design Table API 的数据表格组件
interface Column {
  title: string;
  dataIndex: string;
  key: string;
  ellipsis?: boolean;
  width?: number | string;
  render?: (value: any, record: any, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean; // 是否支持排序
  sorter?: boolean | ((a: any, b: any) => number); // 排序函数
}

interface DataTableProps {
  columns?: Column[];
  dataSource?: any[];
  loading?: boolean;
  rowKey?: string | ((record: any) => string);
  rowClassName?: string | ((record: any, index: number) => string);
  size?: 'small' | 'middle' | 'large';
  scroll?: { x?: number | string; y?: number | string };
  bordered?: boolean;
  className?: string;
  style?: React.CSSProperties;
  pagination?: PaginationConfig | false; // 分页配置，false表示不分页
  onRow?: (record: any, index?: number) => { [key: string]: (event: any) => void };
  onChange?: (pagination: PaginationConfig, sorter: SortConfig) => void; // 分页和排序变化回调
}

const DataTable = React.forwardRef<HTMLDivElement, DataTableProps>(
  (
    {
      columns = [],
      dataSource = [],
      loading = false,
      rowKey = 'key',
      rowClassName,
      size = 'middle',
      scroll,
      bordered = false,
      className,
      style,
      pagination = { current: 1, pageSize: 50, total: 0 }, // 默认分页配置
      onRow,
      onChange,
      ...props
    },
    ref
  ) => {
    // 排序状态
    const [sortConfig, setSortConfig] = React.useState<SortConfig>({ key: '', direction: null });

    // 分页状态
    const [currentPage, setCurrentPage] = React.useState(
      pagination === false ? 1 : pagination.current || 1
    );
    const [pageSize, setPageSize] = React.useState(
      pagination === false ? dataSource.length : pagination.pageSize || 50
    );

    // 默认分页选项
    const defaultPageSizeOptions = ['20', '50', '100', '200', '500'];
    const pageSizeOptions = pagination !== false && pagination.pageSizeOptions
      ? pagination.pageSizeOptions
      : defaultPageSizeOptions;

    // 排序函数
    const handleSort = (column: Column) => {
      if (!column.sortable && !column.sorter) return;

      let newDirection: SortOrder = 'asc';
      if (sortConfig.key === column.key) {
        if (sortConfig.direction === 'asc') {
          newDirection = 'desc';
        } else if (sortConfig.direction === 'desc') {
          newDirection = null;
        }
      }

      const newSortConfig = { key: column.key, direction: newDirection };
      setSortConfig(newSortConfig);

      // 触发onChange回调
      if (onChange) {
        const paginationConfig = pagination === false
          ? { current: 1, pageSize: dataSource.length, total: dataSource.length }
          : { current: currentPage, pageSize, total: dataSource.length };
        onChange(paginationConfig, newSortConfig);
      }
    };

    // 数据排序
    const sortedData = React.useMemo(() => {
      if (!sortConfig.key || !sortConfig.direction) {
        return dataSource;
      }

      const column = columns.find(col => col.key === sortConfig.key);
      if (!column) return dataSource;

      return [...dataSource].sort((a, b) => {
        const aValue = a[column.dataIndex];
        const bValue = b[column.dataIndex];

        // 如果有自定义排序函数
        if (typeof column.sorter === 'function') {
          const result = column.sorter(a, b);
          return sortConfig.direction === 'asc' ? result : -result;
        }

        // 默认排序逻辑
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        // 数字排序
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        // 日期排序
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
          return sortConfig.direction === 'asc'
            ? aDate.getTime() - bDate.getTime()
            : bDate.getTime() - aDate.getTime();
        }

        // 字符串排序
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        if (sortConfig.direction === 'asc') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }, [dataSource, sortConfig, columns]);

    // 分页数据
    const paginatedData = React.useMemo(() => {
      if (pagination === false) {
        return sortedData;
      }

      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      return sortedData.slice(startIndex, endIndex);
    }, [sortedData, currentPage, pageSize, pagination]);

    // 总数据量
    const total = sortedData.length;

    // 分页变化处理
    const handlePageChange = (page: number) => {
      setCurrentPage(page);
      if (onChange && pagination !== false) {
        const paginationConfig = { current: page, pageSize, total };
        onChange(paginationConfig, sortConfig);
      }
    };

    // 页面大小变化处理
    const handlePageSizeChange = (newPageSize: string) => {
      const size = parseInt(newPageSize);
      setPageSize(size);
      setCurrentPage(1); // 重置到第一页
      if (onChange && pagination !== false) {
        const paginationConfig = { current: 1, pageSize: size, total };
        onChange(paginationConfig, sortConfig);
      }
    };
    // 渲染排序图标
    const renderSortIcon = (column: Column) => {
      if (!column.sortable && !column.sorter) return null;

      const isActive = sortConfig.key === column.key;
      const direction = isActive ? sortConfig.direction : null;

      if (direction === 'asc') {
        return <ChevronUp className="w-4 h-4 ml-1 text-primary" />;
      } else if (direction === 'desc') {
        return <ChevronDown className="w-4 h-4 ml-1 text-primary" />;
      } else {
        return <ChevronsUpDown className="w-4 h-4 ml-1 text-muted-foreground" />;
      }
    };

    if (loading) {
      return (
        <div
          ref={ref}
          className={cn('flex items-center justify-center p-8', className)}
          style={style}
        >
          <Spin />
        </div>
      );
    }

    if (!dataSource || dataSource.length === 0) {
      return (
        <div
          ref={ref}
          className={cn('flex items-center justify-center p-8', className)}
          style={style}
        >
          <Empty description='暂无数据' />
        </div>
      );
    }

    const getRowKey = (record: any, index: number): string => {
      if (typeof rowKey === 'function') {
        return rowKey(record);
      }
      return record[rowKey] || index.toString();
    };

    const getRowClassName = (record: any, index: number): string => {
      if (typeof rowClassName === 'function') {
        return rowClassName(record, index);
      }
      return rowClassName || '';
    };

    // 计算分页信息
    const startIndex = pagination === false ? 1 : (currentPage - 1) * pageSize + 1;
    const endIndex = pagination === false ? total : Math.min(currentPage * pageSize, total);
    const totalPages = pagination === false ? 1 : Math.ceil(total / pageSize);

    return (
      <div
        ref={ref}
        className={cn('relative w-full h-full flex flex-col', className)}
        style={style}
        {...props}
      >
        {/* 表格容器 */}
        <div className="flex-1 min-h-0">
          <div
            className={cn(
              'relative w-full h-full overflow-auto',
              scroll?.x && 'overflow-x-auto',
              scroll?.y && 'overflow-y-auto'
            )}
            style={{
              maxHeight: scroll?.y,
              maxWidth: scroll?.x,
            }}
          >
            <Table
              zebra={true}
              zebraType="data"
              className={cn(
                'min-w-full border-collapse',
                size === 'small' && 'text-xs',
                size === 'large' && 'text-base',
                bordered && 'border border-border'
              )}
            >
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {columns.map(column => (
                    <TableHead
                      key={column.key}
                      style={{
                        width: column.width,
                        textAlign: column.align || 'left',
                      }}
                      className={cn(
                        column.ellipsis && 'truncate',
                        bordered && 'border-r border-border last:border-r-0',
                        'sticky top-0 z-10 bg-background', // 让表头固定在顶部并设置背景色
                        (column.sortable || column.sorter) && 'cursor-pointer hover:bg-muted/50 select-none'
                      )}
                      onClick={() => handleSort(column)}
                    >
                      <div className="flex items-center justify-between">
                        <span>{column.title}</span>
                        {renderSortIcon(column)}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((record, index) => {
                  const rowProps = onRow ? onRow(record, index) : {};
                  return (
                    <TableRow
                      key={getRowKey(record, index)}
                      className={cn(
                        'transition-colors duration-150',
                        getRowClassName(record, index),
                        bordered && 'border-b border-border'
                      )}
                      {...rowProps}
                    >
                      {columns.map(column => (
                        <TableCell
                          key={column.key}
                          style={{
                            textAlign: column.align || 'left',
                          }}
                          className={cn(
                            'py-3',
                            column.ellipsis && 'truncate',
                            bordered && 'border-r border-border last:border-r-0'
                          )}
                        >
                          {column.render
                            ? column.render(record[column.dataIndex], record, index)
                            : record[column.dataIndex]}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* 分页组件 */}
        {pagination !== false && total > 0 && (
          <div className="flex-shrink-0 border-t bg-background p-4">
            <div className="flex items-center justify-between">
              {/* 左侧：显示信息和页面大小选择 */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  显示 {startIndex}-{endIndex} 条，共 {total} 条
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">每页显示</span>
                  <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pageSizeOptions.map(option => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">条</span>
                </div>
              </div>

              {/* 右侧：分页按钮 */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  首页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  上一页
                </Button>

                {/* 页码显示 */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const pages = [];
                    const showPages = 5; // 显示的页码数量
                    let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
                    let endPage = Math.min(totalPages, startPage + showPages - 1);

                    if (endPage - startPage + 1 < showPages) {
                      startPage = Math.max(1, endPage - showPages + 1);
                    }

                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <Button
                          key={i}
                          variant={i === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(i)}
                          className="w-8 h-8 p-0"
                        >
                          {i}
                        </Button>
                      );
                    }
                    return pages;
                  })()}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  下一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  末页
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

DataTable.displayName = 'DataTable';

export { DataTable };
export type { DataTableProps, Column };
