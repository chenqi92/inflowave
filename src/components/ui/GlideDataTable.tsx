/**
 * 高性能数据表格组件 - 基于 Glide Data Grid
 * 支持虚拟滚动、排序、筛选等功能
 * 专为大数据量场景优化，使用 Canvas 渲染确保极致性能
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  DataEditor,
  GridColumn,
  GridCell,
  GridCellKind,
  Item
} from '@glideapps/glide-data-grid';
import { cn } from '@/lib/utils';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  toast,
} from '@/components/ui';
import {
  Search,
} from 'lucide-react';

// 数据行类型
export interface DataRow {
  [key: string]: any;
  _id?: string | number;
}

// 列配置类型
export interface ColumnConfig {
  key: string;
  title: string;
  dataIndex?: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: DataRow, index: number) => React.ReactNode;
}

// 排序配置类型
export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

// 筛选配置类型
export interface FilterConfig {
  column: string;
  value: string;
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'in';
}

// 分页配置类型
export interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  pageSizeOptions?: string[];
  serverSide?: boolean;
}

// 组件属性
export interface GlideDataTableProps {
  data: DataRow[];
  columns: ColumnConfig[];
  loading?: boolean;
  pagination?: PaginationConfig | false;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  exportable?: boolean;
  columnManagement?: boolean;
  showToolbar?: boolean;
  showRowNumbers?: boolean;
  className?: string;
  title?: string;
  // 外部列管理状态
  selectedColumns?: string[];
  columnOrder?: string[];
  onSearch?: (searchText: string) => void;
  onFilter?: (filters: FilterConfig[]) => void;
  onSort?: (sort: SortConfig | null) => void;
  onPageChange?: (page: number, pageSize: number) => void;
  onExport?: (format: 'text' | 'json' | 'csv') => void;
  onColumnChange?: (visibleColumns: string[], columnOrder: string[]) => void;
  onRowSelect?: (selectedRows: Set<number>) => void;
  // 懒加载相关配置
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  isLoadingMore?: boolean;
  totalCount?: number;
  // 高度配置
  height?: number;
  maxHeight?: number;
}



// 主组件
export const GlideDataTable: React.FC<GlideDataTableProps> = ({
  data,
  columns,
  loading = false,
  pagination = { current: 1, pageSize: 500, total: 0 },
  searchable = true,
  filterable = true,
  sortable = true,
  exportable = true,
  columnManagement = true,
  showToolbar = true,
  showRowNumbers = true,
  className,
  title,
  selectedColumns: externalSelectedColumns,
  columnOrder: externalColumnOrder,
  onSearch,
  onFilter,
  onSort,
  onPageChange,
  onExport,
  onColumnChange,
  onRowSelect,
  onLoadMore,
  hasNextPage = false,
  isLoadingMore = false,
  totalCount,
  height = 600,
  maxHeight = 800,
}) => {
  // 状态管理
  const [searchText, setSearchText] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filters, setFilters] = useState<FilterConfig[]>([]);

  // 列管理
  const effectiveSelectedColumns = useMemo(() => {
    if (externalSelectedColumns) return externalSelectedColumns;
    return columns.map(col => col.key);
  }, [externalSelectedColumns, columns]);

  const effectiveColumnOrder = useMemo(() => {
    if (externalColumnOrder) return externalColumnOrder;
    return effectiveSelectedColumns;
  }, [externalColumnOrder, effectiveSelectedColumns]);

  // 数据处理
  const processedData = useMemo(() => {
    let result = [...data];

    // 搜索过滤
    if (searchText) {
      result = result.filter(row =>
        Object.values(row).some(value =>
          String(value || '').toLowerCase().includes(searchText.toLowerCase())
        )
      );
    }

    // 列筛选
    filters.forEach(filter => {
      if (filter.value) {
        result = result.filter(row => {
          const cellValue = String(row[filter.column] || '').toLowerCase();
          const filterValue = filter.value.toLowerCase();
          
          switch (filter.operator) {
            case 'contains':
              return cellValue.includes(filterValue);
            case 'equals':
              return cellValue === filterValue;
            case 'startsWith':
              return cellValue.startsWith(filterValue);
            case 'endsWith':
              return cellValue.endsWith(filterValue);
            default:
              return cellValue.includes(filterValue);
          }
        });
      }
    });

    // 排序
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.column];
        const bVal = b[sortConfig.column];

        if (aVal === bVal) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        const comparison = aVal < bVal ? -1 : 1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchText, filters, sortConfig]);

  // 转换为 Glide Data Grid 格式的列定义
  const gridColumns: GridColumn[] = useMemo(() => {
    const cols: GridColumn[] = [];

    // 行号列
    if (showRowNumbers) {
      cols.push({
        title: '#',
        width: 60,
        id: 'row-number',
      });
    }

    // 数据列
    effectiveColumnOrder.forEach(colKey => {
      const column = columns.find(c => c.key === colKey);
      if (column) {
        const isSorted = sortConfig?.column === column.key;
        const sortDirection = isSorted ? sortConfig.direction : undefined;

        cols.push({
          title: `${column.title}${isSorted ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}`,
          width: column.width || 120,
          id: column.key,
        });
      }
    });

    return cols;
  }, [columns, effectiveColumnOrder, showRowNumbers, sortConfig]);

  // 排序处理
  const handleSort = useCallback((columnKey: string) => {
    const newDirection: 'asc' | 'desc' = sortConfig?.column === columnKey && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    const newSortConfig = { column: columnKey, direction: newDirection };
    setSortConfig(newSortConfig);
    onSort?.(newSortConfig);
  }, [sortConfig, onSort]);

  // 列头点击处理
  const onHeaderClicked = useCallback((col: number) => {
    const column = gridColumns[col];
    if (!column || column.id === 'row-number') return;

    const columnConfig = columns.find(c => c.key === column.id);
    if (sortable && columnConfig?.sortable !== false) {
      handleSort(column.id as string);
    }
  }, [gridColumns, columns, sortable, handleSort]);

  // 获取单元格数据
  const getCellContent = useCallback((cell: Item): GridCell => {
    const [col, row] = cell;
    const column = gridColumns[col];

    if (!column) {
      return {
        kind: GridCellKind.Text,
        data: '',
        displayData: '',
        allowOverlay: false,
      };
    }

    // 行号列
    if (column.id === 'row-number') {
      return {
        kind: GridCellKind.Number,
        data: row + 1,
        displayData: String(row + 1),
        allowOverlay: false,
      };
    }

    // 数据列
    const rowData = processedData[row];
    if (!rowData) {
      return {
        kind: GridCellKind.Text,
        data: '',
        displayData: '',
        allowOverlay: false,
      };
    }

    const columnConfig = columns.find(c => c.key === column.id);
    const cellValue = rowData[column.id as string];

    let displayValue = '';
    if (columnConfig?.render) {
      const rendered = columnConfig.render(cellValue, rowData, row);
      displayValue = typeof rendered === 'string' ? rendered : String(cellValue || '');
    } else if (column.id === 'time' && cellValue) {
      displayValue = new Date(cellValue).toLocaleString();
    } else {
      displayValue = String(cellValue || '');
    }

    return {
      kind: GridCellKind.Text,
      data: cellValue,
      displayData: displayValue,
      allowOverlay: true,
    };
  }, [gridColumns, processedData, columns]);

  // 筛选处理
  const handleFilter = useCallback((columnKey: string, value: string, operator: FilterConfig['operator'] = 'contains') => {
    const newFilters = filters.filter(f => f.column !== columnKey);
    if (value) {
      newFilters.push({ column: columnKey, value, operator });
    }
    setFilters(newFilters);
    onFilter?.(newFilters);
  }, [filters, onFilter]);





  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 工具栏 */}
      {showToolbar && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                {title || '数据表格'}
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* 搜索 */}
                {searchable && (
                  <div className="relative">
                    <Input
                      placeholder="搜索..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="w-64"
                    />
                  </div>
                )}

                {/* 导出 */}
                {exportable && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        导出
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => onExport?.('csv')}>
                        CSV 格式
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExport?.('json')}>
                        JSON 格式
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* 数据表格 */}
      <div className="flex-1 border rounded-md overflow-hidden">
        <DataEditor
          getCellContent={getCellContent}
          columns={gridColumns}
          rows={processedData.length}
          width="100%"
          height={Math.min(height, maxHeight)}
          smoothScrollX={true}
          smoothScrollY={true}
          rowMarkers="both"
          onHeaderClicked={onHeaderClicked}
          keybindings={{
            copy: true,
            paste: false,
            selectAll: true,
            selectRow: true,
            selectColumn: true,
          }}
          getCellsForSelection={true}
          freezeColumns={showRowNumbers ? 1 : 0}
          headerHeight={36}
          rowHeight={32}
          theme={{
            accentColor: "hsl(var(--primary))",
            accentFg: "hsl(var(--primary-foreground))",
            accentLight: "hsl(var(--primary) / 0.1)",
            textDark: "hsl(var(--foreground))",
            textMedium: "hsl(var(--muted-foreground))",
            textLight: "hsl(var(--muted-foreground) / 0.7)",
            textBubble: "hsl(var(--foreground))",
            bgIconHeader: "hsl(var(--muted-foreground))",
            fgIconHeader: "hsl(var(--background))",
            textHeader: "hsl(var(--foreground))",
            textHeaderSelected: "hsl(var(--primary-foreground))",
            bgCell: "hsl(var(--background))",
            bgCellMedium: "hsl(var(--muted) / 0.5)",
            bgHeader: "hsl(var(--muted))",
            bgHeaderHasFocus: "hsl(var(--muted))",
            bgHeaderHovered: "hsl(var(--muted) / 0.8)",
            bgBubble: "hsl(var(--background))",
            bgBubbleSelected: "hsl(var(--primary))",
            bgSearchResult: "hsl(var(--primary) / 0.2)",
            borderColor: "hsl(var(--border))",
            drilldownBorder: "hsl(var(--border))",
            linkColor: "hsl(var(--primary))",
            headerFontStyle: "600 14px",
            baseFontStyle: "14px",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        />
      </div>
    </div>
  );
};

export default GlideDataTable;
