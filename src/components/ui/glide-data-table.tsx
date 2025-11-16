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
  Item,
  GridSelection,
  CompactSelection,
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
} from '@/components/ui';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import logger from '@/utils/logger';

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
    logger.error('获取 CSS 变量失败:', variable, error);
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

// 数据源类型
export type DataSourceType = 'influxdb1' | 'influxdb2' | 'influxdb3' | 'iotdb' | 'mysql' | 'postgresql' | 'generic';

// 复制格式类型
export type CopyFormat = 'text' | 'insert' | 'markdown' | 'json' | 'csv';

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
  // 表名（用于生成 INSERT SQL）
  tableName?: string;
  // 数据源类型（用于生成对应的 SQL 语法）
  dataSourceType?: DataSourceType;
  // 数据库名称（某些数据源需要）
  database?: string;
  // 复制格式（用于快捷键复制）
  copyFormat?: CopyFormat;
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
                                                                tableName,
                                                                dataSourceType = 'generic',
                                                                database,
                                                                copyFormat = 'insert',
                                                              }) => {
  // 状态管理
  const [searchText, setSearchText] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);
  const [containerWidth, setContainerWidth] = useState(800);
  // 列宽管理：仅在当前会话中保存用户调整的列宽，不持久化到 localStorage
  const [columnWidths, setColumnWidths] = useState<Map<string, number>>(new Map());
  const { t } = useTranslation('query');

  // 动态计算容器尺寸
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // containerRef有1px border，overflow-auto容器的可用空间需要减去border
        const borderWidth = 2; // 上下或左右各1px
        const availableHeight = rect.height - borderWidth;
        const availableWidth = rect.width - borderWidth;
        if (availableHeight > 0) {
          setContainerHeight(availableHeight);
        }
        if (availableWidth > 0) {
          setContainerWidth(availableWidth);
        }
      }
    };

    // 延迟执行以确保 DOM 已渲染
    const timer = setTimeout(updateDimensions, 100);

    window.addEventListener('resize', updateDimensions);

    // 使用 ResizeObserver 监听容器大小变化
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDimensions);
      resizeObserver.disconnect();
    };
  }, []);

  // 强制覆盖Glide Data Grid的cursor样式 - 使用持续性策略
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 函数：强制覆盖pointer cursor
    const overrideCursor = () => {
      const canvases = container.querySelectorAll('canvas');
      canvases.forEach((canvas) => {
        const htmlCanvas = canvas as HTMLCanvasElement;
        const currentCursor = htmlCanvas.style.cursor;

        // 只覆盖pointer cursor，保留所有resize cursors
        if (currentCursor === 'pointer') {
          htmlCanvas.style.cursor = 'default';
        }
      });
    };

    // 初始执行
    overrideCursor();

    // 使用setInterval持续检查和覆盖（每50ms检查一次）
    const intervalId = setInterval(overrideCursor, 50);

    // 同时使用MutationObserver作为补充
    const observer = new MutationObserver(overrideCursor);
    observer.observe(container, {
      attributes: true,
      attributeFilter: ['style'],
      subtree: true,
      childList: true,
    });

    return () => {
      clearInterval(intervalId);
      observer.disconnect();
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

        // 优先使用用户手动调整的列宽（会话内），否则使用自动计算的宽度
        const customWidth = columnWidths.get(colKey);
        const width = customWidth || column.width || 120;

        cols.push({
          title: `${column.title}${isSorted ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}`,
          width,
          id: column.key,
          grow: 0, // 不自动扩展，保持固定宽度
        } as GridColumn);
      }
    });

    return cols;
  }, [columns, effectiveColumnOrder, sortConfig, columnWidths]);

  // 调试：打印组件接收到的数据
  useEffect(() => {
    logger.debug('🔍 GlideDataTable 接收到的数据:', {
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

  // 列宽调整结束处理（仅记录日志，不保存到 localStorage）
  const handleColumnResizeEnd = useCallback((
    column: GridColumn,
    newSize: number,
    colIndex: number
  ) => {
    logger.info('📏 [GlideDataTable] 列宽调整完成:', {
      列: column.id,
      新宽度: newSize,
      列索引: colIndex
    });
    // 注意：不再保存到 localStorage，刷新后恢复为自动计算值
  }, []);

  // 列拖动建议处理 - 允许列重新排序并实时更新选中效果
  const handleColumnProposeMove = useCallback((startIndex: number, endIndex: number): boolean => {
    logger.debug('🔧 [GlideDataTable] 列拖动建议:', {
      startIndex,
      endIndex,
      startColumn: gridColumns[startIndex]?.id,
      endColumn: gridColumns[endIndex]?.id
    });

    // 使用函数式setState避免依赖gridSelection
    setGridSelection(prevSelection => {
      // 如果有列选中，需要重新映射列索引以跟随拖动
      if (prevSelection.columns.length > 0) {
        const newColumns = CompactSelection.empty();

        // 重新映射所有选中的列索引
        prevSelection.columns.toArray().forEach(colIndex => {
          let newIndex = colIndex;

          // 如果是被拖动的列
          if (colIndex === startIndex) {
            newIndex = endIndex;
          }
          // 如果在拖动范围内，需要相应调整
          else if (startIndex < endIndex) {
            // 向右拖动：startIndex+1 到 endIndex 之间的列都要左移
            if (colIndex > startIndex && colIndex <= endIndex) {
              newIndex = colIndex - 1;
            }
          } else {
            // 向左拖动：endIndex 到 startIndex-1 之间的列都要右移
            if (colIndex >= endIndex && colIndex < startIndex) {
              newIndex = colIndex + 1;
            }
          }

          newColumns.add(newIndex);
        });

        return {
          ...prevSelection,
          columns: newColumns
        };
      }

      return prevSelection;
    });

    // 返回 true 允许拖动
    return true;
  }, [gridColumns]);

  // 列拖动完成处理 - 仅在拖动结束时更新父组件
  const handleColumnMoved = useCallback((startIndex: number, endIndex: number) => {
    logger.info('🔄 [GlideDataTable] 列拖动完成:', {
      startIndex,
      endIndex,
      startColumn: gridColumns[startIndex]?.id,
      endColumn: gridColumns[endIndex]?.id
    });

    // 计算新的列顺序
    const newOrder = [...effectiveColumnOrder];
    const [movedColumn] = newOrder.splice(startIndex, 1);
    newOrder.splice(endIndex, 0, movedColumn);

    logger.debug('🔄 [GlideDataTable] 新列顺序:', {
      oldOrder: effectiveColumnOrder,
      newOrder,
      movedColumn
    });

    // 通知父组件列顺序已更改
    if (onColumnChange) {
      onColumnChange(effectiveSelectedColumns, newOrder);
    }
  }, [gridColumns, effectiveColumnOrder, effectiveSelectedColumns, onColumnChange]);

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
      logger.debug('🔧 [GlideDataTable] 触发懒加载:', {
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
    } else if (column.id && typeof column.id === 'string' && column.id.toLowerCase() === 'time' && cellValue) {
      // 支持 InfluxDB 的 'time' 和 IoTDB 的 'Time'
      // InfluxDB 返回 RFC3339 字符串，IoTDB 返回毫秒时间戳
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

  // 格式化值为 SQL 字符串
  const formatValueForSQL = useCallback((value: any, dataSourceType: DataSourceType): string => {
    if (value === null || value === undefined) {
      return 'NULL';
    }

    if (typeof value === 'string') {
      const escapedValue = value.replace(/'/g, "''");
      return `'${escapedValue}'`;
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (typeof value === 'boolean') {
      // InfluxDB 和 IoTDB 使用小写
      if (dataSourceType === 'influxdb1' || dataSourceType === 'influxdb2' || dataSourceType === 'influxdb3' || dataSourceType === 'iotdb') {
        return value ? 'true' : 'false';
      }
      return value ? 'TRUE' : 'FALSE';
    }

    if (value instanceof Date) {
      const isoString = value.toISOString();
      // InfluxDB 使用纳秒时间戳或 RFC3339 格式
      if (dataSourceType === 'influxdb1' || dataSourceType === 'influxdb2') {
        return `'${isoString}'`;
      }
      return `'${isoString}'`;
    }

    // 其他类型转为字符串
    const escapedValue = String(value).replace(/'/g, "''");
    return `'${escapedValue}'`;
  }, []);

  // 生成 INSERT SQL 语句
  const generateInsertSQL = useCallback((
    table: string,
    columnNames: string[],
    values: string[],
    dataSourceType: DataSourceType,
    database?: string
  ): string => {
    // 根据数据源类型生成不同格式的 INSERT 语句
    switch (dataSourceType) {
      case 'influxdb1':
      case 'influxdb2':
      case 'influxdb3':
        // InfluxDB 使用 Line Protocol 格式，这里生成标准 SQL 作为参考
        // 实际使用时需要转换为 Line Protocol
      { const columnList = columnNames.map(col => `"${col}"`).join(', ');
        const valueList = values.join(', ');
        return `-- InfluxDB Line Protocol format required\nINSERT INTO "${table}" (${columnList}) VALUES (${valueList});`; }

      case 'iotdb':
        // IoTDB 使用特殊的插入语法
      { const iotdbColumns = columnNames.map(col => `${table}.${col}`).join(', ');
        const iotdbValues = values.join(', ');
        return `INSERT INTO ${table} (${iotdbColumns}) VALUES (${iotdbValues});`; }

      case 'mysql':
      case 'postgresql':
        // MySQL 和 PostgreSQL 使用标准 SQL
      { const stdColumnList = columnNames.map(col => `\`${col}\``).join(', ');
        const stdValueList = values.join(', ');
        return `INSERT INTO \`${table}\` (${stdColumnList}) VALUES (${stdValueList});`; }

      case 'generic':
      default:
        // 通用 SQL 格式
      { const genericColumnList = columnNames.map(col => `"${col}"`).join(', ');
        const genericValueList = values.join(', ');
        return `INSERT INTO "${table}" (${genericColumnList}) VALUES (${genericValueList});`; }
    }
  }, []);

  // 根据格式转换选中的数据
  const convertSelectedData = useCallback((
    selectedData: { col: number; row: number }[],
    format: CopyFormat
  ): string => {
    if (selectedData.length === 0) return '';

    // 按行分组选中的单元格
    const rowMap = new Map<number, Set<number>>();
    selectedData.forEach(({ col, row }) => {
      if (!rowMap.has(row)) {
        rowMap.set(row, new Set());
      }
      rowMap.get(row)!.add(col);
    });

    // 获取所有涉及的列
    const allCols = new Set<number>();
    selectedData.forEach(({ col }) => allCols.add(col));
    const sortedCols = Array.from(allCols).sort((a, b) => a - b);

    // 获取列名
    const columnNames = sortedCols.map(colIndex => gridColumns[colIndex]?.id as string).filter(Boolean);

    if (columnNames.length === 0) return '';

    // 获取行数据
    const rows: any[][] = [];
    Array.from(rowMap.keys()).sort((a, b) => a - b).forEach(rowIndex => {
      const rowData = processedData[rowIndex];
      if (!rowData) return;
      const values = columnNames.map(colName => rowData[colName]);
      rows.push(values);
    });

    // 根据格式转换
    switch (format) {
      case 'text':
        // 文本格式：制表符分隔
        return `${columnNames.join('\t')  }\n${
          rows.map(row => row.map(v => v ?? '').join('\t')).join('\n')}`;

      case 'csv':
        // CSV格式
      { const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
        return `${columnNames.map(escapeCsv).join(',')  }\n${
          rows.map(row => row.map(escapeCsv).join(',')).join('\n')}`; }

      case 'json':
        // JSON格式
      { const jsonData = rows.map(row => {
        const obj: Record<string, any> = {};
        columnNames.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        return obj;
      });
        return JSON.stringify(jsonData, null, 2); }

      case 'markdown':
        // Markdown表格格式
        return `| ${  columnNames.join(' | ')  } |\n` +
          `| ${  columnNames.map(() => '---').join(' | ')  } |\n${
            rows.map(row => `| ${  row.map(v => v ?? '').join(' | ')  } |`).join('\n')}`;

      case 'insert':
        // INSERT SQL格式
      { const table = tableName || 'table_name';
        const sqlStatements: string[] = [];
        rows.forEach(row => {
          const values = row.map(val => formatValueForSQL(val, dataSourceType));
          sqlStatements.push(generateInsertSQL(table, columnNames, values, dataSourceType, database));
        });
        return sqlStatements.join('\n'); }

      default:
        return '';
    }
  }, [gridColumns, processedData, tableName, dataSourceType, database, formatValueForSQL]);

  // 将选中的数据转换为 INSERT SQL 语句（保留用于向后兼容）
  const convertToInsertSQL = useCallback((selectedData: { col: number; row: number }[]): string => {
    return convertSelectedData(selectedData, 'insert');
  }, [convertSelectedData]);

  // 跟踪当前选中的单元格
  const [gridSelection, setGridSelection] = useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  });

  // 使用 ref 存储最新的选择状态
  const gridSelectionRef = useRef(gridSelection);
  useEffect(() => {
    gridSelectionRef.current = gridSelection;
  }, [gridSelection]);

  // 计算选中区域的边框和内部分割线位置
  const selectionBorders = useMemo(() => {
    if (!gridSelection) {
      return null;
    }

    // 单元格尺寸配置
    const rowHeight = 32;
    const headerHeight = 36;
    const rowMarkerWidth = 48;

    // 计算列的 X 坐标
    const getColumnX = (colIndex: number) => {
      let xPos = rowMarkerWidth;
      for (let i = 0; i < colIndex; i++) {
        const col = gridColumns[i];
        if (!col || typeof col !== 'object') continue;
        const colWidth = ('width' in col ? col.width : 150) as number;
        xPos += colWidth;
      }
      return xPos;
    };

    const borders: Array<{
      outerBorder: { left: number; top: number; width: number; height: number };
      innerLines: Array<{
        type: 'vertical' | 'horizontal';
        x?: number;
        y1?: number;
        y2?: number;
        y?: number;
        x1?: number;
        x2?: number;
      }>;
    }> = [];

    // 处理单元格范围选择（但不包括单个单元格，避免双边框）
    if (gridSelection.current?.range) {
      const { range } = gridSelection.current;
      const { x: startCol, y: startRow, width: colCount, height: rowCount } = range;

      // 只在选中多个单元格时才绘制自定义边框，单个单元格使用Glide默认边框
      if (colCount > 1 || rowCount > 1) {
        const x1 = getColumnX(startCol);
        const x2 = getColumnX(startCol + colCount);
        const y1 = headerHeight + startRow * rowHeight;
        const y2 = headerHeight + (startRow + rowCount) * rowHeight;

        const outerBorder = {
          left: x1,
          top: y1,
          width: x2 - x1,
          height: y2 - y1,
        };

        const innerLines: Array<{
          type: 'vertical' | 'horizontal';
          x?: number;
          y1?: number;
          y2?: number;
          y?: number;
          x1?: number;
          x2?: number;
        }> = [];

        // 垂直分割线（列之间）
        if (colCount > 1) {
          for (let i = 1; i < colCount; i++) {
            const col = startCol + i;
            const x = getColumnX(col);
            innerLines.push({
              type: 'vertical',
              x,
              y1,
              y2,
            });
          }
        }

        // 水平分割线（行之间）
        if (rowCount > 1) {
          for (let i = 1; i < rowCount; i++) {
            const row = startRow + i;
            const y = headerHeight + row * rowHeight;
            innerLines.push({
              type: 'horizontal',
              y,
              x1,
              x2,
            });
          }
        }

        borders.push({ outerBorder, innerLines });
      }
    }

    // 处理列选择 - 合并连续的列
    if (gridSelection.columns && typeof gridSelection.columns.length === 'number' && gridSelection.columns.length > 0) {
      // 收集所有选中的列索引
      const selectedCols: number[] = [];
      for (const colIdx of gridSelection.columns) {
        selectedCols.push(colIdx);
      }
      selectedCols.sort((a, b) => a - b);

      // 将连续的列分组
      const colRanges: Array<{ start: number; end: number }> = [];
      let rangeStart = selectedCols[0];
      let rangeEnd = selectedCols[0];

      for (let i = 1; i < selectedCols.length; i++) {
        if (selectedCols[i] === rangeEnd + 1) {
          rangeEnd = selectedCols[i];
        } else {
          colRanges.push({ start: rangeStart, end: rangeEnd });
          rangeStart = selectedCols[i];
          rangeEnd = selectedCols[i];
        }
      }
      colRanges.push({ start: rangeStart, end: rangeEnd });

      // 为每个连续的列范围创建边框
      for (const range of colRanges) {
        const x1 = getColumnX(range.start);
        const x2 = getColumnX(range.end + 1);
        const y1 = headerHeight;
        const y2 = headerHeight + (data?.length || 0) * rowHeight;
        const colCount = range.end - range.start + 1;

        const outerBorder = {
          left: x1,
          top: y1,
          width: x2 - x1,
          height: y2 - y1,
        };

        const innerLines: Array<{
          type: 'vertical' | 'horizontal';
          x?: number;
          y1?: number;
          y2?: number;
          y?: number;
          x1?: number;
          x2?: number;
        }> = [];

        // 垂直分割线（列之间）
        if (colCount > 1) {
          for (let i = 1; i < colCount; i++) {
            const col = range.start + i;
            const x = getColumnX(col);
            innerLines.push({
              type: 'vertical',
              x,
              y1,
              y2,
            });
          }
        }

        // 水平分割线（行之间）
        if (data && data.length > 1) {
          for (let i = 1; i < data.length; i++) {
            const y = headerHeight + i * rowHeight;
            innerLines.push({
              type: 'horizontal',
              y,
              x1,
              x2,
            });
          }
        }

        borders.push({ outerBorder, innerLines });
      }
    }

    // 处理行选择 - 合并连续的行
    if (gridSelection.rows && typeof gridSelection.rows.length === 'number' && gridSelection.rows.length > 0) {
      // 收集所有选中的行索引
      const selectedRows: number[] = [];
      for (const rowIdx of gridSelection.rows) {
        selectedRows.push(rowIdx);
      }
      selectedRows.sort((a, b) => a - b);

      // 将连续的行分组
      const rowRanges: Array<{ start: number; end: number }> = [];
      let rangeStart = selectedRows[0];
      let rangeEnd = selectedRows[0];

      for (let i = 1; i < selectedRows.length; i++) {
        if (selectedRows[i] === rangeEnd + 1) {
          rangeEnd = selectedRows[i];
        } else {
          rowRanges.push({ start: rangeStart, end: rangeEnd });
          rangeStart = selectedRows[i];
          rangeEnd = selectedRows[i];
        }
      }
      rowRanges.push({ start: rangeStart, end: rangeEnd });

      // 为每个连续的行范围创建边框
      for (const range of rowRanges) {
        const x1 = rowMarkerWidth;
        const x2 = getColumnX(gridColumns.length);
        const y1 = headerHeight + range.start * rowHeight;
        const y2 = headerHeight + (range.end + 1) * rowHeight;
        const rowCount = range.end - range.start + 1;

        const outerBorder = {
          left: x1,
          top: y1,
          width: x2 - x1,
          height: y2 - y1,
        };

        const innerLines: Array<{
          type: 'vertical' | 'horizontal';
          x?: number;
          y1?: number;
          y2?: number;
          y?: number;
          x1?: number;
          x2?: number;
        }> = [];

        // 垂直分割线（列之间）
        if (gridColumns.length > 1) {
          for (let i = 1; i < gridColumns.length; i++) {
            const x = getColumnX(i);
            innerLines.push({
              type: 'vertical',
              x,
              y1,
              y2,
            });
          }
        }

        // 水平分割线（行之间）
        if (rowCount > 1) {
          for (let i = 1; i < rowCount; i++) {
            const row = range.start + i;
            const y = headerHeight + row * rowHeight;
            innerLines.push({
              type: 'horizontal',
              y,
              x1,
              x2,
            });
          }
        }

        borders.push({ outerBorder, innerLines });
      }
    }

    return borders.length > 0 ? borders : null;
  }, [gridSelection, gridColumns, data]);

  // 拖动选择时的自动滚动功能
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollableContainer = container.querySelector('.flex-1.min-h-0.overflow-auto') as HTMLElement;
    if (!scrollableContainer) return;

    let isDragging = false;
    let animationFrameId: number | null = null;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseDown = () => {
      isDragging = true;
    };

    const handleMouseUp = () => {
      isDragging = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const rect = scrollableContainer.getBoundingClientRect();
      mouseX = e.clientX;
      mouseY = e.clientY;

      // 开始自动滚动检测
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(autoScroll);
      }
    };

    const autoScroll = () => {
      const rect = scrollableContainer.getBoundingClientRect();
      const edgeSize = 50; // 靠近边缘多少像素时开始滚动
      const scrollSpeed = 10; // 滚动速度

      let scrollX = 0;
      let scrollY = 0;

      // 检测鼠标是否靠近右边缘
      if (mouseX > rect.right - edgeSize) {
        scrollX = scrollSpeed;
      }
      // 检测鼠标是否靠近左边缘
      else if (mouseX < rect.left + edgeSize) {
        scrollX = -scrollSpeed;
      }

      // 检测鼠标是否靠近下边缘
      if (mouseY > rect.bottom - edgeSize) {
        scrollY = scrollSpeed;
      }
      // 检测鼠标是否靠近上边缘
      else if (mouseY < rect.top + edgeSize) {
        scrollY = -scrollSpeed;
      }

      // 执行滚动
      if (scrollX !== 0 || scrollY !== 0) {
        scrollableContainer.scrollLeft += scrollX;
        scrollableContainer.scrollTop += scrollY;

        // 继续动画
        if (isDragging) {
          animationFrameId = requestAnimationFrame(autoScroll);
        }
      } else {
        animationFrameId = null;
      }
    };

    // 添加事件监听
    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  // 使用全局键盘事件监听复制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检测 Cmd+C (Mac) 或 Ctrl+C (Windows/Linux)
      const isCopyShortcut = (e.metaKey || e.ctrlKey) && e.key === 'c';

      if (!isCopyShortcut) return;

      logger.debug('🔍 [GlideDataTable] 检测到复制快捷键:', {
        current: gridSelection.current,
        dataSourceType,
      });

      // 检查是否有选中的单元格
      if (!gridSelection.current) {
        logger.debug('⚠️ [GlideDataTable] 没有选中任何内容');
        return;
      }

      // 构建选中的单元格列表
      const selectedCells: { col: number; row: number }[] = [];

      const { cell, range } = gridSelection.current;

      if (range) {
        // 有范围选择
        const startCol = range.x;
        const endCol = range.x + range.width - 1;
        const startRow = range.y;
        const endRow = range.y + range.height - 1;

        logger.info('📊 [GlideDataTable] 选择区域:', { startCol, endCol, startRow, endRow });

        for (let row = startRow; row <= endRow; row++) {
          for (let col = startCol; col <= endCol; col++) {
            selectedCells.push({ col, row });
          }
        }
      } else {
        // 单个单元格选择
        selectedCells.push({ col: cell[0], row: cell[1] });
      }

      if (selectedCells.length === 0) {
        logger.debug('⚠️ [GlideDataTable] 选中的单元格列表为空');
        return;
      }

      logger.debug('✅ [GlideDataTable] 选中了', selectedCells.length, '个单元格', '复制格式:', copyFormat);

      // 根据格式转换数据
      const convertedData = convertSelectedData(selectedCells, copyFormat);

      if (convertedData) {
        logger.info('📋 [GlideDataTable] 生成的数据:', convertedData.substring(0, 200));

        // 阻止默认复制行为
        e.preventDefault();
        e.stopPropagation();

        // 格式名称映射
        const formatNames: Record<CopyFormat, string> = {
          text: '文本',
          insert: 'INSERT SQL',
          markdown: 'Markdown',
          json: 'JSON',
          csv: 'CSV'
        };

        // 复制到剪贴板
        navigator.clipboard.writeText(convertedData).then(() => {
          toast.success(`已复制为 ${formatNames[copyFormat]}`, {
            description: `已复制 ${selectedCells.length} 个单元格的数据`,
          });
        }).catch(err => {
          logger.error('❌ [GlideDataTable] 复制失败:', err);
          toast.error('复制失败', {
            description: '无法访问剪贴板',
          });
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [gridSelection, gridColumns, processedData, convertSelectedData, copyFormat]);





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

    logger.info('📊 [GlideDataTable] 分页信息:', {
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
      {/* 修复鼠标样式 */}
      <style>{`
        .dvn-scroller .dvn-underlay canvas,
        .dvn-scroller .dvn-underlay {
          cursor: default !important;
        }
        .gdg-header-cell {
          cursor: default !important;
        }
        .gdg-row-marker {
          cursor: default !important;
        }
      `}</style>
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

      {/* 数据表格 - 使用外层滚动容器 */}
      <div ref={containerRef} className="flex-1 min-h-0 flex flex-col border rounded-none bg-background">
        {/* 可滚动内容区域 - 滚动条固定在容器边缘 */}
        <div className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full bg-background">
              <div className="text-muted-foreground">加载中...</div>
            </div>
          ) : processedData.length === 0 ? (
            <div className="flex items-center justify-center h-full bg-background">
              <div className="text-muted-foreground">暂无数据</div>
            </div>
          ) : (
            <>
              {logger.info('🎨 渲染 DataEditor:', {
                gridColumns数: gridColumns.length,
                rows: processedData.length,
                containerHeight,
                containerWidth,
              })}
              {(() => {
                // 计算表格实际大小
                const rowMarkerWidth = 48;
                const headerHeight = 36;
                const rowHeight = 32;

                // 类型安全地访问width属性
                const totalColumnsWidth = gridColumns.reduce((sum, col) => {
                  const width = 'width' in col ? col.width : 150;
                  return sum + width;
                }, 0);

                // 表格实际宽度（所有列宽 + 行标记）
                const tableWidth = totalColumnsWidth + rowMarkerWidth;

                // 表格实际高度（表头 + 所有行）
                const tableHeight = headerHeight + (rowHeight * processedData.length);

                logger.info('📊 表格实际尺寸:', {
                  totalColumnsWidth,
                  tableWidth,
                  tableHeight,
                  rowCount: processedData.length,
                  containerWidth,
                  containerHeight,
                });

                // 统一的渲染模式：DataEditor 以实际内容大小渲染，外层容器提供滚动
                // wrapper div提供border（通过CSS伪元素），宽高由DataEditor撑开
                return (
                  <div
                    className="glide-table-border-fix"
                    style={{
                      display: 'inline-block', // 让div大小由内容（DataEditor）决定
                      position: 'relative',
                      backgroundColor: 'var(--background)',
                      overflow: 'hidden', // 隐藏DataEditor内部可能的滚动条
                    }}
                  >
                    <DataEditor
                      getCellContent={getCellContent}
                      columns={gridColumns}
                      rows={processedData.length}
                      width={tableWidth}
                      height={tableHeight}
                      smoothScrollX={false}
                      smoothScrollY={false}
                      overscrollX={0}
                      overscrollY={0}
                      rowMarkers="both"
                      rowMarkerWidth={rowMarkerWidth}
                      onHeaderClicked={onHeaderClicked}
                      onColumnResize={handleColumnResize}
                      onColumnResizeEnd={handleColumnResizeEnd}
                      onColumnProposeMove={handleColumnProposeMove}
                      onColumnMoved={handleColumnMoved}
                      onVisibleRegionChanged={handleVisibleRegionChanged}
                      gridSelection={gridSelection}
                      onGridSelectionChange={setGridSelection}
                      rangeSelect="multi-rect"
                      columnSelect="multi"
                      rowSelect="multi"
                      rowSelectionMode="multi"
                      minColumnWidth={80}
                      maxColumnWidth={800}
                      maxColumnAutoWidth={500}
                      keybindings={{
                        copy: false,
                        paste: false,
                        selectAll: true,
                        selectRow: true,
                        selectColumn: true,
                      }}
                      freezeColumns={0}
                      headerHeight={36}
                      rowHeight={32}
                      onCellEdited={(cell, newValue) => {
                        logger.debug('单元格编辑:', { cell, newValue });
                        return undefined;
                      }}
                      rightElement={undefined}
                      rightElementProps={{
                        fill: false,
                        sticky: false,
                      }}
                      trailingRowOptions={undefined}
                      fillHandle={false}
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

                    {/* 选中区域边框和内部分割线覆盖层 */}
                    {selectionBorders && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          pointerEvents: 'none',
                          zIndex: 50,
                        }}
                      >
                        {selectionBorders.map((border, borderIndex) => (
                          <React.Fragment key={`border-${borderIndex}`}>
                            {/* 外边框 - 拆分为四条边 */}
                            {/* 上边框 */}
                            <div
                              style={{
                                position: 'absolute',
                                left: `${border.outerBorder.left}px`,
                                top: `${border.outerBorder.top}px`,
                                width: `${border.outerBorder.width}px`,
                                height: '1px',
                                backgroundColor: getCSSVariable('--primary', '#0066cc'),
                              }}
                            />
                            {/* 下边框 */}
                            <div
                              style={{
                                position: 'absolute',
                                left: `${border.outerBorder.left}px`,
                                top: `${border.outerBorder.top + border.outerBorder.height - 1}px`,
                                width: `${border.outerBorder.width + 1}px`,
                                height: '1px',
                                backgroundColor: getCSSVariable('--primary', '#0066cc'),
                              }}
                            />
                            {/* 左边框 */}
                            <div
                              style={{
                                position: 'absolute',
                                left: `${border.outerBorder.left}px`,
                                top: `${border.outerBorder.top}px`,
                                width: '1px',
                                height: `${border.outerBorder.height}px`,
                                backgroundColor: getCSSVariable('--primary', '#0066cc'),
                              }}
                            />
                            {/* 右边框 */}
                            <div
                              style={{
                                position: 'absolute',
                                left: `${border.outerBorder.left + border.outerBorder.width - 1}px`,
                                top: `${border.outerBorder.top}px`,
                                width: '1px',
                                height: `${border.outerBorder.height + 1}px`,
                                backgroundColor: getCSSVariable('--primary', '#0066cc'),
                              }}
                            />

                            {/* 内部分割线 */}
                            {border.innerLines.map((line, lineIndex) => (
                              line.type === 'vertical' ? (
                                <div
                                  key={`border-${borderIndex}-v-${lineIndex}`}
                                  style={{
                                    position: 'absolute',
                                    left: `${line.x}px`,
                                    top: `${line.y1}px`,
                                    width: '1px',
                                    height: `${(line.y2! - line.y1!)}px`,
                                    backgroundColor: getCSSVariable('--primary', '#0066cc'),
                                  }}
                                />
                              ) : (
                                <div
                                  key={`border-${borderIndex}-h-${lineIndex}`}
                                  style={{
                                    position: 'absolute',
                                    left: `${line.x1}px`,
                                    top: `${line.y}px`,
                                    width: `${(line.x2! - line.x1!)}px`,
                                    height: '1px',
                                    backgroundColor: getCSSVariable('--primary', '#0066cc'),
                                  }}
                                />
                              )
                            ))}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* 分页控件 */}
        {pagination && paginationInfo && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {t('showing_records', {
                  start: paginationInfo.start,
                  end: paginationInfo.end,
                  total: paginationInfo.total
                })}
              </span>
              {paginationInfo.showSizeChanger && (
                <>
                  <span className="mx-2">|</span>
                  <span>{t('per_page')}</span>
                  <Select
                    key={`pagesize-${paginationInfo.pageSize}-${paginationInfo.pageSizeOptions.join('-')}`}
                    value={paginationInfo.pageSize === -1 ? 'all' : String(paginationInfo.pageSize)}
                    onValueChange={handlePageSizeChange}
                  >
                    <SelectTrigger className="h-8 w-24">
                      <SelectValue placeholder={t('select_datasource')}>
                        {paginationInfo.pageSize === -1 ? t('all_records') : String(paginationInfo.pageSize)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {paginationInfo.pageSizeOptions.map(option => (
                        <SelectItem key={option} value={option}>
                          {option === 'all' ? t('all_records') : option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>{t('records')}</span>
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
                {t('page_info', { current: paginationInfo.current, total: paginationInfo.totalPages })}
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
