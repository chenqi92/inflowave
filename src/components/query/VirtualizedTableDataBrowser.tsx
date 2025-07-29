import React, { memo, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import {
  Filter,
} from 'lucide-react';

// 数据行接口
interface DataRow {
  [key: string]: any;
  _id?: string | number;
}

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
      // 渲染表头
      return (
        <div className='virtual-table-header flex border-b bg-background z-10 h-[48px] flex-shrink-0' style={{ minWidth: 'max-content', width: 'max-content' }}>
          {visibleColumns.map(column => {

            // 使用统一的列宽度
            const width = column === '#' ? 50 : (columnWidths[column] || 120);

            return (
              <div
                key={column}
                className={cn(
                  'virtual-table-column px-3 py-2 text-left text-xs font-medium text-muted-foreground flex items-center h-full',
                  column === '#'
                    ? 'justify-center bg-muted border-r-2 border-muted'
                    : 'cursor-pointer hover:bg-muted/50'
                )}
                style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px`, flexShrink: 0 }}
                onClick={() => column !== '#' && onSort?.(column)}
              >
                <div className='flex items-center gap-1 w-full h-full'>
                  {column !== '#' && (
                    <span
                      className='text-xs font-medium flex-shrink-0'
                      title={column}
                    >
                      {column}
                    </span>
                  )}
                  {column === 'time' && (
                    <Badge variant='secondary' className='text-xs'>
                      时间
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
                          <Filter className='w-4 h-4 mr-2' />
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
      // 渲染数据行
      if (!row) return null;

      return (
        <div
          className={cn(
            'virtual-table-row flex border-b transition-colors hover:bg-muted/50 cursor-pointer group relative h-[40px] select-none',
            isSelected && 'bg-blue-50 hover:bg-blue-100'
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
            const width = column === '#' ? 50 : (columnWidths[column] || 120);

            return (
              <div
                key={column}
                className={cn(
                  'virtual-table-column px-2 py-2 text-xs flex items-center',
                  column === '#'
                    ? 'font-medium text-muted-foreground bg-muted justify-center border-r-2 border-muted'
                    : 'font-mono px-3'
                )}
                style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px`, flexShrink: 0 }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCopyCell?.(index, column);
                }}
                title={column === '#' ? `行号: ${index + 1}` : `双击复制: ${String(row[column] || '-')}`}
              >
                <div className='truncate w-full'>
                  {column === '#'
                    ? index + 1 // 显示行号（从1开始）
                    : column === 'time'
                      ? new Date(row[column]).toLocaleString()
                      : String(row[column] || '-')}
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

export { VirtualTableRow, VirtualTableHeader, UnifiedTableRow };
export type { DataRow, VirtualTableRowProps, VirtualTableHeaderProps, UnifiedTableRowProps };
