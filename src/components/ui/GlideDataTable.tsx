/**
 * 高性能数据表格组件 - 基于 Glide Data Grid
 * 支持虚拟滚动、排序、筛选等功能
 * 专为大数据量场景优化，使用 Canvas 渲染确保极致性能
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@/components/ui';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

// 获取 CSS 变量的实际颜色值
const getCSSVariable = (variable: string, fallback: string = '#000000'): string => {
  if (typeof window === 'undefined') return fallback;

  try {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(variable)
      .trim();

    if (!value) return fallback;

    // 如果是 HSL 值（例如 "222.2 84% 4.9%"），转换为完整的 hsl() 格式
    if (value && !value.startsWith('#') && !value.startsWith('rgb') && !value.startsWith('hsl')) {
      return `hsl(${value})`;
    }

    return value;
  } catch (error) {
    console.error('获取 CSS 变量失败:', variable, error);
    return fallback;
  }
};

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);
  // 列宽管理：存储用户自定义的列宽
  const [columnWidths, setColumnWidths] = useState<Map<string, number>>(new Map());

  // 动态计算容器高度
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const availableHeight = rect.height;
        if (availableHeight > 0) {
          setContainerHeight(availableHeight);
        }
      }
    };

    // 延迟执行以确保 DOM 已渲染
    const timer = setTimeout(updateHeight, 100);

    window.addEventListener('resize', updateHeight);

    // 使用 ResizeObserver 监听容器大小变化
    const resizeObserver = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateHeight);
      resizeObserver.disconnect();
    };
  }, []);

  // 列管理
  const effectiveSelectedColumns = useMemo(() => {
    if (externalSelectedColumns) return externalSelectedColumns;
    return columns.map(col => col.key);
  }, [externalSelectedColumns, columns]);

  const effectiveColumnOrder = useMemo(() => {
    const order = externalColumnOrder || effectiveSelectedColumns;
    // 过滤掉不在 columns 中的列（如 _id）
    const validColumnKeys = new Set(columns.map(c => c.key));
    return order.filter(key => validColumnKeys.has(key));
  }, [externalColumnOrder, effectiveSelectedColumns, columns]);

  // 从 localStorage 加载保存的列宽
  useEffect(() => {
    const widths = new Map<string, number>();
    columns.forEach(col => {
      try {
        const key = `glide-table-column-width-${col.key}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          const width = parseInt(saved);
          if (!isNaN(width) && width > 0) {
            widths.set(col.key, width);
          }
        }
      } catch (error) {
        console.warn('从 localStorage 加载列宽失败:', error);
      }
    });
    if (widths.size > 0) {
      setColumnWidths(widths);
    }
  }, [columns]);

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

    // 客户端分页（如果启用了分页且不是服务器端分页）
    if (pagination && pagination.pageSize > 0 && !pagination.serverSide) {
      const start = (pagination.current - 1) * pagination.pageSize;
      const end = start + pagination.pageSize;
      result = result.slice(start, end);
    }

    return result;
  }, [data, searchText, filters, sortConfig, columns.length, pagination]);

  // 转换为 Glide Data Grid 格式的列定义
  const gridColumns: GridColumn[] = useMemo(() => {
    const cols: GridColumn[] = [];

    // 数据列
    effectiveColumnOrder.forEach((colKey, index) => {
      const column = columns.find(c => c.key === colKey);
      if (column) {
        const isSorted = sortConfig?.column === column.key;
        const sortDirection = isSorted ? sortConfig.direction : undefined;
        const isLastColumn = index === effectiveColumnOrder.length - 1;

        // 优先使用用户自定义的列宽，否则使用配置的默认宽度
        const customWidth = columnWidths.get(colKey);
        const width = customWidth || column.width || 120;

        // 如果用户手动调整了最后一列的宽度，禁用 grow 以保持用户设置
        const hasCustomWidth = columnWidths.has(colKey);

        cols.push({
          title: `${column.title}${isSorted ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}`,
          width: width,
          id: column.key,
          grow: isLastColumn && !hasCustomWidth ? 1 : 0, // 让最后一列自动扩展填充剩余空间（除非用户手动调整过）
        } as GridColumn);
      }
    });

    return cols;
  }, [columns, effectiveColumnOrder, sortConfig, columnWidths]);

  // 调试：打印组件接收到的数据
  useEffect(() => {
    console.log('🔍 GlideDataTable 接收到的数据:', {
      数据行数: data.length,
      列数: columns.length,
      列配置: columns.map(c => ({ key: c.key, title: c.title, width: c.width })),
      前3行数据: data.slice(0, 3),
      processedData行数: processedData.length,
      gridColumns数: gridColumns.length,
      gridColumns: gridColumns.map(c => ({ id: c.id, title: c.title, width: (c as any).width })),
    });
  }, [data, columns, processedData, gridColumns]);

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
    if (!column) return;

    const columnConfig = columns.find(c => c.key === column.id);
    if (sortable && columnConfig?.sortable !== false) {
      handleSort(column.id as string);
    }
  }, [gridColumns, columns, sortable, handleSort]);

  // 列宽调整处理（拖动过程中实时更新）
  const handleColumnResize = useCallback((
    column: GridColumn,
    newSize: number,
    colIndex: number
  ) => {
    // 实时更新列宽状态，确保拖动流畅
    setColumnWidths(prev => {
      const next = new Map(prev);
      next.set(column.id as string, newSize);
      return next;
    });
  }, []);

  // 列宽调整结束处理（拖动结束时保存到 localStorage）
  const handleColumnResizeEnd = useCallback((
    column: GridColumn,
    newSize: number,
    colIndex: number
  ) => {
    console.log('📏 [GlideDataTable] 列宽调整完成:', {
      列: column.id,
      新宽度: newSize,
      列索引: colIndex
    });

    // 保存到 localStorage 以持久化用户偏好
    try {
      const key = `glide-table-column-width-${column.id}`;
      localStorage.setItem(key, String(newSize));
    } catch (error) {
      console.warn('保存列宽到 localStorage 失败:', error);
    }
  }, []);

  // 懒加载：检测滚动到底部
  const handleVisibleRegionChanged = useCallback((range: any) => {
    if (!hasNextPage || !onLoadMore || isLoadingMore) {
      return;
    }

    // range.y 是可见行的起始索引，range.height 是可见行数
    const visibleEndRow = range.y + range.height;
    const totalRows = processedData.length;

    // 当滚动到剩余 20% 的位置时，触发加载更多
    const threshold = totalRows * 0.8;

    if (visibleEndRow >= threshold) {
      console.log('🔧 [GlideDataTable] 触发懒加载:', {
        visibleEndRow,
        totalRows,
        threshold,
        hasNextPage,
        isLoadingMore
      });
      onLoadMore();
    }
  }, [hasNextPage, onLoadMore, isLoadingMore, processedData.length]);

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
      // render 函数可能返回 React 元素，需要转换为字符串
      if (typeof rendered === 'string') {
        displayValue = rendered;
      } else if (rendered === null || rendered === undefined) {
        displayValue = String(cellValue || '');
      } else {
        // 如果是 React 元素，尝试提取文本内容
        displayValue = String(cellValue || '');
      }
    } else if (column.id === 'time' && cellValue) {
      displayValue = new Date(cellValue).toLocaleString();
    } else {
      displayValue = String(cellValue !== null && cellValue !== undefined ? cellValue : '');
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





  // 分页处理
  const handlePageChange = useCallback((newPage: number) => {
    if (pagination && onPageChange) {
      onPageChange(newPage, pagination.pageSize);
    }
  }, [pagination, onPageChange]);

  const handlePageSizeChange = useCallback((newSize: string) => {
    if (pagination && onPageChange) {
      const size = newSize === 'all' ? -1 : parseInt(newSize);
      onPageChange(1, size);
    }
  }, [pagination, onPageChange]);

  // 计算分页信息
  const paginationInfo = useMemo(() => {
    if (!pagination) return null;

    const total = pagination.total || processedData.length;
    const current = pagination.current || 1;
    const pageSize = pagination.pageSize || 500;
    const totalPages = pageSize === -1 ? 1 : Math.ceil(total / pageSize);
    const start = pageSize === -1 ? 1 : (current - 1) * pageSize + 1;
    const end = pageSize === -1 ? total : Math.min(current * pageSize, total);
    const pageSizeOptions = pagination.pageSizeOptions || ['500', '1000', '2000', '5000', 'all'];

    console.log('📊 [GlideDataTable] 分页信息:', {
      pageSize,
      pageSizeStr: pageSize === -1 ? 'all' : String(pageSize),
      pageSizeOptions,
      包含当前值: pageSizeOptions.includes(pageSize === -1 ? 'all' : String(pageSize))
    });

    return {
      total,
      current,
      pageSize,
      totalPages,
      start,
      end,
      showSizeChanger: pagination.showSizeChanger !== false,
      pageSizeOptions,
    };
  }, [pagination, processedData.length]);

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
      <div ref={containerRef} className="flex-1 min-h-0 flex flex-col border rounded-md overflow-hidden bg-background">
        <div className="flex-1 min-h-0 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="text-muted-foreground">加载中...</div>
            </div>
          ) : processedData.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="text-muted-foreground">暂无数据</div>
            </div>
          ) : (
            <>
              {console.log('🎨 渲染 DataEditor:', {
                gridColumns数: gridColumns.length,
                rows: processedData.length,
                containerHeight,
                计算后高度: containerHeight - (pagination ? 60 : 0),
              })}
              <DataEditor
                getCellContent={getCellContent}
                columns={gridColumns}
                rows={processedData.length}
                width="100%"
                height={containerHeight - (pagination ? 60 : 0)} // 为分页控件预留空间
                smoothScrollX={true}
                smoothScrollY={true}
                rowMarkers="both"
                onHeaderClicked={onHeaderClicked}
                onColumnResize={handleColumnResize}
                onColumnResizeEnd={handleColumnResizeEnd}
                onVisibleRegionChanged={handleVisibleRegionChanged}
                minColumnWidth={80}
                maxColumnWidth={800}
                maxColumnAutoWidth={500}
                keybindings={{
                  copy: true,
                  paste: false,
                  selectAll: true,
                  selectRow: true,
                  selectColumn: true,
                }}
                getCellsForSelection={true}
                freezeColumns={0}
                headerHeight={36}
                rowHeight={32}
                rightElement={undefined}
                rightElementProps={{
                  fill: false,
                  sticky: false,
                }}
                theme={{
              accentColor: getCSSVariable('--primary', '#0066cc'),
              accentFg: getCSSVariable('--primary-foreground', '#ffffff'),
              accentLight: getCSSVariable('--accent', '#f0f9ff'),
              textDark: getCSSVariable('--foreground', '#09090b'),
              textMedium: getCSSVariable('--muted-foreground', '#71717a'),
              textLight: getCSSVariable('--muted-foreground', '#a1a1aa'),
              textBubble: getCSSVariable('--foreground', '#09090b'),
              bgIconHeader: getCSSVariable('--muted-foreground', '#71717a'),
              fgIconHeader: getCSSVariable('--background', '#ffffff'),
              textHeader: getCSSVariable('--foreground', '#09090b'),
              textHeaderSelected: getCSSVariable('--primary-foreground', '#ffffff'),
              bgCell: getCSSVariable('--background', '#ffffff'),
              bgCellMedium: getCSSVariable('--muted', '#f4f4f5'),
              bgHeader: getCSSVariable('--muted', '#f4f4f5'),
              bgHeaderHasFocus: getCSSVariable('--muted', '#f4f4f5'),
              bgHeaderHovered: getCSSVariable('--accent', '#f0f9ff'),
              bgBubble: getCSSVariable('--background', '#ffffff'),
              bgBubbleSelected: getCSSVariable('--primary', '#0066cc'),
              bgSearchResult: getCSSVariable('--accent', '#f0f9ff'),
              borderColor: getCSSVariable('--border', '#e4e4e7'),
              drilldownBorder: getCSSVariable('--border', '#e4e4e7'),
              linkColor: getCSSVariable('--primary', '#0066cc'),
              headerFontStyle: "600 14px",
              baseFontStyle: "14px",
              fontFamily: "Inter, system-ui, sans-serif",
                }}
              />
            </>
          )}
        </div>

        {/* 分页控件 */}
        {pagination && paginationInfo && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                显示 {paginationInfo.start} - {paginationInfo.end} 条，共 {paginationInfo.total} 条
              </span>
              {paginationInfo.showSizeChanger && (
                <>
                  <span className="mx-2">|</span>
                  <span>每页</span>
                  <Select
                    key={`pagesize-${paginationInfo.pageSize}-${paginationInfo.pageSizeOptions.join('-')}`}
                    value={paginationInfo.pageSize === -1 ? 'all' : String(paginationInfo.pageSize)}
                    onValueChange={handlePageSizeChange}
                  >
                    <SelectTrigger className="h-8 w-24">
                      <SelectValue placeholder="选择">
                        {paginationInfo.pageSize === -1 ? '全部' : String(paginationInfo.pageSize)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {paginationInfo.pageSizeOptions.map(option => (
                        <SelectItem key={option} value={option}>
                          {option === 'all' ? '全部' : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>条</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={paginationInfo.current === 1 || loading}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(paginationInfo.current - 1)}
                disabled={paginationInfo.current === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="mx-2 text-sm">
                第 {paginationInfo.current} / {paginationInfo.totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(paginationInfo.current + 1)}
                disabled={paginationInfo.current >= paginationInfo.totalPages || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(paginationInfo.totalPages)}
                disabled={paginationInfo.current >= paginationInfo.totalPages || loading}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlideDataTable;
