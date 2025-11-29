/**
 * 虚拟化表格数据浏览器 - JetBrains New UI 风格
 * 32px 表头高度, 28px 行高, 12px/13px 字体
 */
import React, { memo, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Filter,
} from 'lucide-react';
import { useDataBrowserTranslation } from '@/hooks/useTranslation';

// 数据行接口
interface DataRow {
  [key: string]: any;
  _id?: string | number;
}

// 安全地将任何值转换为可显示的字符串
const safeStringify = (value: any): string => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    // 处理 Date 对象
    if (value instanceof Date) return value.toLocaleString();
    // 处理数组和对象 - 使用 JSON.stringify
    try {
      return JSON.stringify(value);
    } catch {
      return '[Object]';
    }
  }
  return String(value);
};

// 统一的表格行类型（支持表头和数据行）
interface UnifiedTableRowProps {
  isHeader?: boolean;
  row?: DataRow;
  index?: number;
  columnOrder: string[];
  selectedColumns: string[];
  columnWidths: Record<string, number>;
  // 表头专用props
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  selectedRowsCount?: number;
  totalRowsCount?: number;
  onSort?: (column: string) => void;
  onAddFilter?: (column: string) => void;
  onSelectAll?: () => void;
  onCopySelectedRows?: (format: 'text' | 'json' | 'csv') => void;
  // 数据行专用props
  isSelected?: boolean;
  onRowClick?: (index: number, event: React.MouseEvent) => void;
  onRowMouseDown?: (index: number, event: React.MouseEvent) => void;
  onRowMouseEnter?: (index: number, event: React.MouseEvent) => void;
  onRowMouseUp?: (index: number, event: React.MouseEvent) => void;
  onRowContextMenu?: (index: number, event: React.MouseEvent) => void;
  onCopyRow?: (index: number, format?: 'text' | 'json' | 'csv') => void;
  onCopyCell?: (index: number, column: string) => void;
}

// 统一的表格行组件（支持表头和数据行）
const UnifiedTableRow: React.FC<UnifiedTableRowProps> = memo(
  ({
    isHeader = false,
    row,
    index = 0,
    columnOrder,
    selectedColumns,
    columnWidths,
    sortColumn,
    sortDirection,
    selectedRowsCount = 0,
    totalRowsCount = 0,
    onSort,
    onAddFilter,
    onSelectAll,
    onCopySelectedRows,
    isSelected = false,
    onRowClick,
    onRowMouseDown,
    onRowMouseEnter,
    onRowMouseUp,
    onRowContextMenu,
    onCopyRow,
    onCopyCell,
  }) => {
    const { t } = useDataBrowserTranslation();

    const visibleColumns = useMemo(
      () => [
        '#', // 序号列始终在最前面
        ...columnOrder.filter(column => selectedColumns.includes(column) && column !== '#'),
      ],
      [columnOrder, selectedColumns]
    );

    const handleRowClick = useCallback((event: React.MouseEvent) => {
      if (!isHeader && onRowClick) {
        onRowClick(index, event);
      }
    }, [isHeader, onRowClick, index]);

    const handleRowMouseDown = useCallback((event: React.MouseEvent) => {
      if (!isHeader && onRowMouseDown) {
        onRowMouseDown(index, event);
      }
    }, [isHeader, onRowMouseDown, index]);

    const handleRowMouseEnter = useCallback((event: React.MouseEvent) => {
      if (!isHeader && onRowMouseEnter) {
        onRowMouseEnter(index, event);
      }
    }, [isHeader, onRowMouseEnter, index]);

    const handleRowMouseUp = useCallback((event: React.MouseEvent) => {
      if (!isHeader && onRowMouseUp) {
        onRowMouseUp(index, event);
      }
    }, [isHeader, onRowMouseUp, index]);

    const handleRowContextMenu = useCallback((event: React.MouseEvent) => {
      if (!isHeader && onRowContextMenu) {
        event.preventDefault();
        onRowContextMenu(index, event);
      }
    }, [isHeader, onRowContextMenu, index]);

    if (isHeader) {
      // 渲染表头 - JetBrains New UI 风格: 32px 高度, 12px 字体
      return (
        <div className='virtual-table-header flex border-b bg-muted/50 z-10 h-8 flex-shrink-0' style={{ minWidth: 'max-content', width: 'max-content' }}>
          {visibleColumns.map(column => {

            // 使用统一的列宽度
            const width = column === '#' ? 40 : (columnWidths[column] || 120);

            return (
              <div
                key={column}
                className={cn(
                  'virtual-table-column px-2 py-1 text-left text-[12px] font-semibold text-foreground flex items-center h-full transition-colors duration-100',
                  column === '#'
                    ? 'justify-center bg-muted/80 border-r border-border'
                    : 'cursor-pointer hover:bg-muted/80'
                )}
                style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px`, flexShrink: 0 }}
                onClick={() => column !== '#' && onSort?.(column)}
              >
                <div className='flex items-center gap-1 w-full h-full'>
                  {column !== '#' && (
                    <span
                      className='text-xs font-semibold flex-shrink-0 truncate'
                      title={column}
                    >
                      {column}
                    </span>
                  )}
                  {column === 'time' && (
                    <Badge variant='secondary' className='text-xs h-4 px-1'>
                      {t('time_label')}
                    </Badge>
                  )}
                  {sortColumn === column && column !== '#' && (
                    <span className='text-xs text-primary'>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                  {column !== '#' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-4 w-4 p-0 ml-auto opacity-0 group-hover:opacity-100'
                        >
                          <Filter className='h-3 w-3' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='start'>
                        <DropdownMenuItem onClick={() => onAddFilter?.(column)}>
                          <Filter className='w-3.5 h-3.5 mr-1.5' />
                          添加过滤器
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    } else {
      // 渲染数据行 - JetBrains New UI 风格: 28px 高度, 13px 字体
      if (!row) return null;

      return (
        <div
          className={cn(
            'virtual-table-row flex border-b transition-colors duration-100 hover:bg-muted/30 cursor-pointer group relative h-7 select-none',
            isSelected && 'bg-primary/10 hover:bg-primary/15'
          )}
          onClick={handleRowClick}
          onMouseDown={handleRowMouseDown}
          onMouseEnter={handleRowMouseEnter}
          onMouseUp={handleRowMouseUp}
          onContextMenu={handleRowContextMenu}
          style={{ display: 'flex', alignItems: 'center', minWidth: 'max-content', width: 'max-content' }}
        >
          {visibleColumns.map(column => {

            // 使用统一的列宽度
            const width = column === '#' ? 40 : (columnWidths[column] || 120);

            return (
              <div
                key={column}
                className={cn(
                  'virtual-table-column px-2 py-1 text-sm flex items-center',
                  column === '#'
                    ? 'font-medium text-muted-foreground bg-muted/50 justify-center border-r border-border text-xs'
                    : 'font-mono'
                )}
                style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px`, flexShrink: 0 }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCopyCell?.(index, column);
                }}
                title={column === '#' ? `行号: ${index + 1}` : `双击复制: ${safeStringify(row[column])}`}
              >
                <div className='truncate w-full'>
                  {column === '#'
                    ? index + 1 // 显示行号（从1开始）
                    : column === 'time'
                      ? new Date(row[column]).toLocaleString()
                      : safeStringify(row[column])}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
  },
  (prevProps, nextProps) => {
    // 优化的memo比较函数
    if (prevProps.isHeader !== nextProps.isHeader) return false;
    if (prevProps.isHeader) {
      // 表头比较
      return (
        prevProps.sortColumn === nextProps.sortColumn &&
        prevProps.sortDirection === nextProps.sortDirection &&
        prevProps.selectedRowsCount === nextProps.selectedRowsCount &&
        prevProps.totalRowsCount === nextProps.totalRowsCount &&
        prevProps.columnOrder === nextProps.columnOrder &&
        prevProps.selectedColumns === nextProps.selectedColumns &&
        prevProps.columnWidths === nextProps.columnWidths
      );
    } else {
      // 数据行比较
      return (
        prevProps.index === nextProps.index &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.row === nextProps.row &&
        prevProps.columnOrder === nextProps.columnOrder &&
        prevProps.selectedColumns === nextProps.selectedColumns &&
        prevProps.columnWidths === nextProps.columnWidths
      );
    }
  }
);

UnifiedTableRow.displayName = 'UnifiedTableRow';

// 保持原有的VirtualTableRowProps接口兼容性
interface VirtualTableRowProps {
  row: DataRow;
  index: number;
  columnOrder: string[];
  selectedColumns: string[];
  columnWidths: Record<string, number>;
  isSelected: boolean;
  onRowClick?: (index: number, event: React.MouseEvent) => void;
  onRowMouseDown?: (index: number, event: React.MouseEvent) => void;
  onRowMouseEnter?: (index: number, event: React.MouseEvent) => void;
  onRowMouseUp?: (index: number, event: React.MouseEvent) => void;
  onRowContextMenu?: (index: number, event: React.MouseEvent) => void;
  onCopyRow: (index: number, format?: 'text' | 'json' | 'csv') => void;
  onCopyCell: (index: number, column: string) => void;
}

const VirtualTableRow: React.FC<VirtualTableRowProps> = memo(
  ({
    row,
    index,
    columnOrder,
    selectedColumns,
    columnWidths,
    isSelected,
    onRowClick,
    onRowMouseDown,
    onRowMouseEnter,
    onRowMouseUp,
    onRowContextMenu,
    onCopyRow,
    onCopyCell,
  }) => {
    return (
      <UnifiedTableRow
        isHeader={false}
        row={row}
        index={index}
        columnOrder={columnOrder}
        selectedColumns={selectedColumns}
        columnWidths={columnWidths}
        isSelected={isSelected}
        onRowClick={onRowClick}
        onRowMouseDown={onRowMouseDown}
        onRowMouseEnter={onRowMouseEnter}
        onRowMouseUp={onRowMouseUp}
        onRowContextMenu={onRowContextMenu}
        onCopyRow={onCopyRow}
        onCopyCell={onCopyCell}
      />
    );
  }
);

VirtualTableRow.displayName = 'VirtualTableRow';

// 虚拟化表格头部组件接口
interface VirtualTableHeaderProps {
  columnOrder: string[];
  selectedColumns: string[];
  columnWidths: Record<string, number>;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  selectedRowsCount: number;
  totalRowsCount: number;
  onSort: (column: string) => void;
  onAddFilter: (column: string) => void;
  onSelectAll: () => void;
  onCopySelectedRows: (format: 'text' | 'json' | 'csv') => void;
}

// 虚拟化表格头部组件（使用UnifiedTableRow）
const VirtualTableHeader: React.FC<VirtualTableHeaderProps> = memo(
  ({
    columnOrder,
    selectedColumns,
    columnWidths,
    sortColumn,
    sortDirection,
    selectedRowsCount,
    totalRowsCount,
    onSort,
    onAddFilter,
    onSelectAll,
    onCopySelectedRows,
  }) => {
    return (
      <UnifiedTableRow
        isHeader={true}
        columnOrder={columnOrder}
        selectedColumns={selectedColumns}
        columnWidths={columnWidths}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        selectedRowsCount={selectedRowsCount}
        totalRowsCount={totalRowsCount}
        onSort={onSort}
        onAddFilter={onAddFilter}
        onSelectAll={onSelectAll}
        onCopySelectedRows={onCopySelectedRows}
      />
    );
  }
);

VirtualTableHeader.displayName = 'VirtualTableHeader';

export { VirtualTableRow, VirtualTableHeader, UnifiedTableRow };
export type { DataRow, VirtualTableRowProps, VirtualTableHeaderProps, UnifiedTableRowProps };
