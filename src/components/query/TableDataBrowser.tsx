import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
  useRef,
} from 'react';
import {
  Card,
  CardContent,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Checkbox,
  Input,
  DatePicker,
} from '@/components/ui';
import { toast } from 'sonner';
import {
  GlideDataTable,
  type DataSourceType,
} from '@/components/ui/glide-data-table';
import { TableToolbar, type CopyFormat } from '@/components/ui/table-toolbar';
import { useTranslation, useDataBrowserTranslation } from '@/hooks/useTranslation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  FileText,
  FileSpreadsheet,
  Code,
  Copy,
  Square,
  CheckSquare,
  Filter,
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { useConnectionStore } from '@/store/connection';
import { useTabStore } from '@/stores/tabStore';

import { exportWithNativeDialog } from '@/utils/nativeExport';
import type { QueryResult } from '@/types';

// 可拖拽的列项组件
interface SortableColumnItemProps {
  column: string;
  isSelected: boolean;
  onToggle: (column: string) => void;
  t: (key: string) => string;
}

const SortableColumnItem: React.FC<SortableColumnItemProps> = memo(
  ({ column, isSelected, onToggle, t }) => {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id: column });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const handleToggle = (e: React.MouseEvent | React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // 序号列不能被取消选择
      if (column === '#') {
        return;
      }
      onToggle(column);
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className='flex items-center px-2 py-1.5 hover:bg-accent rounded text-sm'
      >
        <div className='flex items-center flex-1 min-w-0'>
          <Checkbox
            checked={isSelected}
            onChange={handleToggle}
            onClick={handleToggle}
            disabled={column === '#'}
            className='mr-2 h-4 w-4 flex-shrink-0'
          />
          <span
            className={`flex-1 text-sm truncate ${column === '#' ? 'cursor-default' : 'cursor-pointer'}`}
            onClick={handleToggle}
            title={column === '#' ? t('rowNumber') : column}
          >
            {column === '#' ? t('rowNumber') : column}
          </span>
          {column === 'time' && (
            <Badge variant='secondary' className='text-xs ml-2 flex-shrink-0'>
              {t('time_column')}
            </Badge>
          )}
          {column === '#' && (
            <Badge variant='outline' className='text-xs ml-2 flex-shrink-0'>
              {t('required')}
            </Badge>
          )}
        </div>
        <div
          {...attributes}
          {...listeners}
          className='text-xs text-muted-foreground ml-2 cursor-move p-1 flex-shrink-0'
          title={t('dragToSort')}
        >
          ⋮⋮
        </div>
      </div>
    );
  }
);

// 原有的 VirtualTableRow 组件已移动到 VirtualizedTableDataBrowser.tsx

// 增强的筛选器组件
interface FilterEditorProps {
  filter: ColumnFilter;
  onUpdate: (filter: ColumnFilter) => void;
  onRemove: () => void;
  onApply: () => void;
  availableOperators: { value: FilterOperator; label: string }[];
  t: (key: string) => string;
}

const FilterEditor: React.FC<FilterEditorProps> = ({
  filter,
  onUpdate,
  onRemove,
  onApply,
  availableOperators,
  t,
}) => {
  const handleOperatorChange = (operator: FilterOperator) => {
    onUpdate({ ...filter, operator, value: '', value2: undefined });
  };

  const handleValueChange = (value: string) => {
    onUpdate({ ...filter, value });
  };

  const handleValue2Change = (value2: string) => {
    onUpdate({ ...filter, value2 });
  };

  const renderValueInput = () => {
    switch (filter.dataType) {
      case 'number':
        if (filter.operator === 'between') {
          return (
            <div className='flex items-center gap-1'>
              <Input
                type='number'
                placeholder={t('minValue')}
                value={filter.value}
                onChange={e => handleValueChange(e.target.value)}
                className='w-12 h-6 text-xs px-1'
              />
              <span className='text-xs text-muted-foreground'>-</span>
              <Input
                type='number'
                placeholder={t('maxValue')}
                value={filter.value2 || ''}
                onChange={e => handleValue2Change(e.target.value)}
                className='w-12 h-6 text-xs px-1'
              />
            </div>
          );
        }
        return (
          <Input
            type='number'
            placeholder={t('numericValue')}
            value={filter.value}
            onChange={e => handleValueChange(e.target.value)}
            className='w-14 h-6 text-xs px-1'
          />
        );

      case 'time':
        if (filter.operator === 'time_range') {
          return (
            <div className='flex items-center gap-1'>
              <DatePicker
                value={filter.value ? new Date(filter.value) : undefined}
                onChange={date =>
                  handleValueChange(date ? date.toISOString() : '')
                }
                placeholder={t('start_time')}
                showTime
                size='small'
                className='w-20'
              />
              <span className='text-xs text-muted-foreground'>-</span>
              <DatePicker
                value={filter.value2 ? new Date(filter.value2) : undefined}
                onChange={date =>
                  handleValue2Change(date ? date.toISOString() : '')
                }
                placeholder={t('end_time')}
                showTime
                size='small'
                className='w-20'
              />
            </div>
          );
        }
        return (
          <DatePicker
            value={filter.value ? new Date(filter.value) : undefined}
            onChange={date => handleValueChange(date ? date.toISOString() : '')}
            placeholder={t('select_time')}
            showTime
            size='small'
            className='w-28'
          />
        );

      default:
        return (
          <Input
            placeholder={t('enterValue')}
            value={filter.value}
            onChange={e => handleValueChange(e.target.value)}
            className='w-16 h-6 text-xs px-1'
          />
        );
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onApply();
    }
  };

  return (
    <div className='relative flex items-center gap-1 p-1.5 border rounded-md bg-background flex-nowrap min-w-fit'>
      <Button
        variant='ghost'
        size='sm'
        onClick={onRemove}
        className='absolute -top-2 -right-2 h-5 w-5 p-0 text-muted-foreground hover:text-destructive rounded-full bg-background border'
        title={t('deleteFilter')}
      >
        ×
      </Button>

      <Badge
        variant='outline'
        className='text-xs px-1 h-6 flex items-center flex-shrink-0 max-w-[80px] truncate'
        title={filter.column}
      >
        {filter.column}
      </Badge>

      <Select value={filter.operator} onValueChange={handleOperatorChange}>
        <SelectTrigger className='min-w-[70px] w-auto h-6 text-xs flex-shrink-0 whitespace-nowrap'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableOperators.map(op => (
            <SelectItem key={op.value} value={op.value} className='text-xs'>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div onKeyPress={handleKeyPress} className='flex-shrink-0'>{renderValueInput()}</div>
    </div>
  );
};

// 复制相关的工具函数
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    }
  } catch (error) {
    logger.error('复制失败:', error);
    return false;
  }
};

// 格式化行数据为文本
const formatRowData = (
  row: DataRow,
  columns: string[],
  format: 'text' | 'json' | 'csv' = 'text'
): string => {
  switch (format) {
    case 'json': {
      const jsonData: Record<string, any> = {};
      columns.forEach((col: string) => {
        if (col !== '#') {
          jsonData[col] = row[col];
        }
      });
      return JSON.stringify(jsonData, null, 2);
    }

    case 'csv':
      return columns
        .filter(col => col !== '#')
        .map(col => {
          const value = String(row[col] || '');
          // CSV格式需要处理包含逗号、引号、换行的值
          if (
            value.includes(',') ||
            value.includes('"') ||
            value.includes('\n')
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(',');

    case 'text':
    default:
      return columns
        .filter(col => col !== '#')
        .map(col => String(row[col] || ''))
        .join('\t');
  }
};

// 格式化多行数据
const formatMultipleRows = (
  rows: DataRow[],
  columns: string[],
  format: 'text' | 'json' | 'csv' = 'text'
): string => {
  switch (format) {
    case 'json': {
      const jsonArray = rows.map(row => {
        const jsonData: Record<string, any> = {};
        columns.forEach(col => {
          if (col !== '#') {
            jsonData[col] = row[col];
          }
        });
        return jsonData;
      });
      return JSON.stringify(jsonArray, null, 2);
    }

    case 'csv': {
      const headers = columns.filter(col => col !== '#').join(',');
      const dataRows = rows.map(row => formatRowData(row, columns, 'csv'));
      return [headers, ...dataRows].join('\n');
    }

    case 'text':
    default:
      return rows.map(row => formatRowData(row, columns, 'text')).join('\n');
  }
};
import ExportOptionsDialog, { type ExportOptions } from './ExportOptionsDialog';

import { logger } from '@/utils/logger';
// 生成带时间戳的文件名
const generateTimestampedFilename = (
  tableName: string,
  format: string
): string => {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/:/g, '-') // 替换冒号为连字符
    .replace(/\./g, '-') // 替换点为连字符
    .slice(0, 19); // 只保留到秒，格式：2025-07-20T09-30-45

  const extension = format === 'excel' ? 'xlsx' : format;
  return `${tableName}_${timestamp}.${extension}`;
};

interface TableDataBrowserProps {
  connectionId: string;
  database: string;
  tableName: string;
}

interface DataRow {
  [key: string]: any;
}

// 列数据类型
type ColumnDataType = 'string' | 'number' | 'time' | 'boolean';

// 筛选操作符
type FilterOperator =
  // 字符串操作符
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  // 数字操作符
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  // 时间操作符
  | 'time_range';

interface ColumnFilter {
  column: string;
  operator: FilterOperator;
  value: string;
  value2?: string; // for between operator and time range end
  dataType: ColumnDataType;
}

const TableDataBrowser: React.FC<TableDataBrowserProps> = ({
  connectionId,
  database,
  tableName,
}) => {
  const { t } = useTranslation('query');
  const { t: tBrowser } = useDataBrowserTranslation();

  // 🔧 获取当前 tab 的信息，用于管理 loading 状态
  const { tabs, updateTab } = useTabStore();
  const currentTab = useMemo(() =>
    tabs.find(tab =>
      tab.type === 'data-browser' &&
      tab.connectionId === connectionId &&
      tab.database === database &&
      tab.tableName === tableName
    ),
    [tabs, connectionId, database, tableName]
  );

  // 状态管理
  const [data, setData] = useState<DataRow[]>([]);
  const [rawData, setRawData] = useState<DataRow[]>([]); // 存储原始数据用于客户端排序
  const [columns, setColumns] = useState<string[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]); // 列的显示顺序
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]); // 选中的列
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({}); // 统一的列宽度管理
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(500);
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');
  const [searchText, setSearchText] = useState<string>('');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [fullFieldPaths, setFullFieldPaths] = useState<string[]>([]);
  const [connectionConfig, setConnectionConfig] = useState<any>(null);
  const [copyFormat, setCopyFormat] = useState<CopyFormat>('text'); // 复制格式状态

  // 获取连接配置
  const { connections } = useConnectionStore();
  const currentConnection = connections.find(conn => conn.id === connectionId);

  // 缓存数据库类型值，避免对象引用变化导致无限循环
  const dbType = useMemo(() => currentConnection?.dbType, [currentConnection?.dbType]);
  const detectedType = useMemo(() => currentConnection?.detectedType, [currentConnection?.detectedType]);

  // 确定数据源类型
  const dataSourceType: DataSourceType = useMemo(() => {
    if (!currentConnection) return 'generic';

    const dbTypeValue = currentConnection.dbType;
    const version = currentConnection.version;

    if (dbTypeValue === 'iotdb') {
      return 'iotdb';
    }

    if (dbType === 'influxdb') {
      if (version === '1.x' || version?.includes('1.')) {
        return 'influxdb1';
      } else if (version === '2.x' || version?.includes('2.')) {
        return 'influxdb2';
      } else if (version === '3.x' || version?.includes('3.')) {
        return 'influxdb3';
      }
      return 'influxdb1'; // 默认
    }

    return 'generic';
  }, [currentConnection]);

  // 行选择状态
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1);

  // 查询设置
  const [querySettings, setQuerySettings] = useState<{
    enable_lazy_loading: boolean;
    lazy_loading_batch_size: number;
  }>({
    enable_lazy_loading: true,
    lazy_loading_batch_size: 500,
  });

  // 预加载缓存：存储预加载的下一批数据
  const [prefetchedData, setPrefetchedData] = useState<DataRow[]>([]);
  const [isPrefetching, setIsPrefetching] = useState(false);

  // 使用 ref 存储预加载函数引用，避免循环依赖
  const prefetchNextBatchRef = useRef<((dataLength: number) => Promise<void>) | null>(null);
  const triggerPrefetch = (dataLength: number) => {
    if (prefetchNextBatchRef.current) {
      prefetchNextBatchRef.current(dataLength);
    }
  };

  // 加载查询设置
  useEffect(() => {
    const loadQuerySettings = async () => {
      try {
        const settings = await safeTauriInvoke<{
          timeout: number;
          max_results: number;
          auto_complete: boolean;
          syntax_highlight: boolean;
          format_on_save: boolean;
          enable_lazy_loading: boolean;
          lazy_loading_batch_size: number;
        }>('get_query_settings');

        logger.info('[TableDataBrowser] 加载查询设置成功:', {
          enable_lazy_loading: settings.enable_lazy_loading,
          lazy_loading_batch_size: settings.lazy_loading_batch_size,
          完整设置: settings,
        });

        setQuerySettings({
          enable_lazy_loading: settings.enable_lazy_loading,
          lazy_loading_batch_size: settings.lazy_loading_batch_size,
        });
      } catch (error) {
        logger.error('[TableDataBrowser] 加载查询设置失败:', error);
        // 使用默认值
      }
    };

    loadQuerySettings();
  }, []);

  // 监听 querySettings 变化
  useEffect(() => {
    logger.debug('[TableDataBrowser] 查询设置已更新:', querySettings);
  }, [querySettings]);

  // 拖动选择状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState<number>(-1);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    selectedRows: number[];
  }>({
    visible: false,
    x: 0,
    y: 0,
    selectedRows: [],
  });

  // 表格滚动容器的 ref
  const tableScrollRef = useRef<HTMLDivElement>(null);

  // 拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 检测列的数据类型
  const detectColumnDataType = useCallback(
    (column: string, sampleData: DataRow[]): ColumnDataType => {
      if (column === 'time') return 'time';

      // 取样本数据进行类型检测
      const samples = sampleData
        .slice(0, 10)
        .map((row: DataRow) => row[column])
        .filter(val => val != null && val !== '');
      if (samples.length === 0) return 'string';

      // 检测是否为数字
      const numericSamples = samples.filter(val => {
        const num = parseFloat(String(val));
        return !isNaN(num) && isFinite(num);
      });

      if (numericSamples.length / samples.length > 0.8) {
        return 'number';
      }

      // 检测是否为时间格式
      const timeSamples = samples.filter(val => {
        const dateVal = new Date(String(val));
        return !isNaN(dateVal.getTime());
      });

      if (timeSamples.length / samples.length > 0.8) {
        return 'time';
      }

      return 'string';
    },
    []
  );

  // 根据数据类型获取可用的操作符
  const getAvailableOperators = useCallback(
    (dataType: ColumnDataType): { value: FilterOperator; label: string }[] => {
      switch (dataType) {
        case 'string':
          return [
            { value: 'equals', label: tBrowser('filterOperators.equals') },
            { value: 'not_equals', label: tBrowser('filterOperators.not_equals') },
            { value: 'contains', label: tBrowser('filterOperators.contains') },
            { value: 'not_contains', label: tBrowser('filterOperators.not_contains') },
            { value: 'starts_with', label: tBrowser('filterOperators.starts_with') },
            { value: 'ends_with', label: tBrowser('filterOperators.ends_with') },
          ];
        case 'number':
          return [
            { value: 'equals', label: tBrowser('filterOperators.equals') },
            { value: 'not_equals', label: tBrowser('filterOperators.not_equals') },
            { value: 'gt', label: tBrowser('filterOperators.gt') },
            { value: 'gte', label: tBrowser('filterOperators.gte') },
            { value: 'lt', label: tBrowser('filterOperators.lt') },
            { value: 'lte', label: tBrowser('filterOperators.lte') },
            { value: 'between', label: tBrowser('filterOperators.between') },
          ];
        case 'time':
          return [
            { value: 'time_range', label: tBrowser('filterOperators.timeRange') },
            { value: 'equals', label: tBrowser('filterOperators.equals') },
            { value: 'gt', label: tBrowser('filterOperators.after') },
            { value: 'lt', label: tBrowser('filterOperators.before') },
          ];
        default:
          return [
            { value: 'equals', label: tBrowser('filterOperators.equals') },
            { value: 'not_equals', label: tBrowser('filterOperators.not_equals') },
          ];
      }
    },
    [t, tBrowser]
  );

  // 处理拖拽结束
  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setColumnOrder(items => {
        // 序号列不能被拖拽移动
        if (active.id === '#' || over.id === '#') {
          return items;
        }

        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // 确保序号列始终在第一位
        const sequenceIndex = newOrder.indexOf('#');
        if (sequenceIndex > 0) {
          newOrder.splice(sequenceIndex, 1);
          newOrder.unshift('#');
        }

        return newOrder;
      });
    }
  }, []);

  // 生成查询语句
  const generateQuery = useCallback((customFilters?: ColumnFilter[]) => {
    // 智能检测数据库类型并生成正确的SQL
    const isIoTDB = tableName.startsWith('root.');
    const tableRef = isIoTDB ? tableName : `"${tableName}"`;

    // IoTDB 的 SELECT * 会自动包含 time 列
    let query = `SELECT *
                 FROM ${tableRef}`;

    // 添加 WHERE 条件
    const whereConditions: string[] = [];

    // 搜索条件
    if (searchText.trim() && columns && columns.length > 0) {
      const searchConditions = columns
        .filter(col => col !== 'time' && col !== '#')
        .map(col => `"${col}" =~ /.*${searchText.trim()}.*/`);
      if (searchConditions.length > 0) {
        whereConditions.push(`(${searchConditions.join(' OR ')})`);
      }
    }

    // 过滤条件 - 使用传入的 customFilters 或默认的 filters
    const filtersToUse = customFilters !== undefined ? customFilters : filters;
    filtersToUse.forEach(filter => {
      if (!filter.value.trim() && filter.operator !== 'time_range') return;

      // 根据数据类型决定是否需要引号
      const formatValue = (value: string) => {
        if (filter.dataType === 'number') {
          return value; // 数字不需要引号
        }
        return `'${value}'`; // 字符串和时间需要引号
      };

      switch (filter.operator) {
        case 'equals':
          whereConditions.push(
            `"${filter.column}" = ${formatValue(filter.value)}`
          );
          break;
        case 'not_equals':
          whereConditions.push(
            `"${filter.column}" != ${formatValue(filter.value)}`
          );
          break;
        case 'contains':
          whereConditions.push(`"${filter.column}" =~ /.*${filter.value}.*/`);
          break;
        case 'not_contains':
          whereConditions.push(`"${filter.column}" !~ /.*${filter.value}.*/`);
          break;
        case 'starts_with':
          whereConditions.push(`"${filter.column}" =~ /^${filter.value}.*/`);
          break;
        case 'ends_with':
          whereConditions.push(`"${filter.column}" =~ /.*${filter.value}$/`);
          break;
        case 'gt':
          whereConditions.push(
            `"${filter.column}" > ${formatValue(filter.value)}`
          );
          break;
        case 'gte':
          whereConditions.push(
            `"${filter.column}" >= ${formatValue(filter.value)}`
          );
          break;
        case 'lt':
          whereConditions.push(
            `"${filter.column}" < ${formatValue(filter.value)}`
          );
          break;
        case 'lte':
          whereConditions.push(
            `"${filter.column}" <= ${formatValue(filter.value)}`
          );
          break;
        case 'between':
          if (filter.value2) {
            whereConditions.push(
              `"${filter.column}" >= ${formatValue(filter.value)} AND "${filter.column}" <= ${formatValue(filter.value2)}`
            );
          }
          break;
        case 'time_range':
          // 灵活的时间范围：支持只有开始时间、只有结束时间、或两者都有
          if (filter.value && filter.value2) {
            // 两者都有：使用范围条件
            whereConditions.push(
              `"${filter.column}" >= '${filter.value}' AND "${filter.column}" <= '${filter.value2}'`
            );
          } else if (filter.value) {
            // 只有开始时间：大于等于
            whereConditions.push(`"${filter.column}" >= '${filter.value}'`);
          } else if (filter.value2) {
            // 只有结束时间：小于等于
            whereConditions.push(`"${filter.column}" <= '${filter.value2}'`);
          }
          break;
      }
    });

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // 添加排序 - InfluxDB只支持按时间排序
    if (sortColumn === 'time' && sortDirection) {
      query += ` ORDER BY time ${sortDirection.toUpperCase()}`;
    } else {
      // 对于非时间列或无排序时，使用默认时间排序，客户端排序将在数据加载后处理
      query += ` ORDER BY time DESC`;
    }

    // 添加分页（如果不是"全部"选项）
    if (pageSize > 0) {
      const offset = (currentPage - 1) * pageSize;
      query += ` LIMIT ${pageSize} OFFSET ${offset}`;
    }

    return query;
  }, [
    tableName,
    columns,
    searchText,
    filters,
    sortColumn,
    sortDirection,
    currentPage,
    pageSize,
  ]);

  // 生成不包含过滤条件的基础查询（避免添加过滤器时自动重新加载）
  const generateBaseQuery = useCallback(() => {
    // 从连接配置中获取数据库类型，而不是仅仅依赖表名判断
    const isIoTDB = dbType === 'iotdb' ||
                    detectedType === 'iotdb' ||
                    tableName.startsWith('root.'); // 后备判断

    const tableRef = isIoTDB ? tableName : `"${tableName}"`;

    let query: string;

    if (isIoTDB) {
      // 对于IoTDB，SELECT * 会自动包含 time 列
      logger.debug('🔧 [IoTDB] 使用SELECT *查询，连接类型:', dbType, '检测类型:', detectedType);
      logger.debug('🔧 [IoTDB] 字段路径:', fullFieldPaths);

      query = `SELECT *
               FROM ${tableRef}`;
    } else {
      // 对于InfluxDB，根据字段信息构建查询
      const fieldColumns = columns.filter(col => col !== '#' && col !== 'time');
      if (fieldColumns.length > 0) {
        // 使用明确的字段名
        const fieldList = fieldColumns.map(field => `"${field}"`).join(', ');
        logger.debug('🔧 [InfluxDB] 使用字段明确查询，连接类型:', dbType);
        query = `SELECT time, ${fieldList}
                 FROM ${tableRef}`;
      } else {
        // 如果没有字段信息，使用SELECT *
        logger.debug('🔧 [InfluxDB] 使用SELECT *查询，连接类型:', dbType);
        query = `SELECT *
                 FROM ${tableRef}`;
      }
    }

    // 添加 WHERE 条件（根据数据库类型使用不同语法）
    const whereConditions: string[] = [];

    // 搜索条件
    if (searchText.trim() && columns && columns.length > 0) {
      const searchColumns = columns.filter(col => col !== 'time' && col !== '#');
      if (searchColumns.length > 0) {
        if (isIoTDB) {
          // IoTDB使用LIKE语法进行文本搜索
          const searchConditions = searchColumns
            .map(col => `${col} LIKE '%${searchText.trim()}%'`);
          whereConditions.push(`(${searchConditions.join(' OR ')})`);
        } else {
          // InfluxDB使用正则表达式语法
          const searchConditions = searchColumns
            .map(col => `"${col}" =~ /.*${searchText.trim()}.*/`);
          whereConditions.push(`(${searchConditions.join(' OR ')})`);
        }
      }
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // 添加排序 - IoTDB不支持ORDER BY，InfluxDB支持按时间排序
    if (!isIoTDB) {
      if (sortColumn === 'time' && sortDirection) {
        query += ` ORDER BY time ${sortDirection.toUpperCase()}`;
      } else {
        // 对于非时间列或无排序时，使用默认时间排序，客户端排序将在数据加载后处理
        query += ` ORDER BY time DESC`;
      }
    }

    // 添加分页（如果不是"全部"选项）
    if (pageSize > 0) {
      const offset = (currentPage - 1) * pageSize;
      query += ` LIMIT ${pageSize} OFFSET ${offset}`;
      logger.debug('🔧 [TableDataBrowser] 添加分页参数:', {
        pageSize,
        currentPage,
        offset,
        limitClause: `LIMIT ${pageSize} OFFSET ${offset}`
      });
    } else {
      logger.debug('🔧 [TableDataBrowser] 显示全部数据，不添加分页参数');
    }

    return query;
  }, [
    tableName,
    columns,
    searchText,
    sortColumn,
    sortDirection,
    currentPage,
    pageSize,
    dbType,
    detectedType,
    fullFieldPaths,
  ]);

  // 生成带指定分页参数的基础查询
  const generateBaseQueryWithPagination = useCallback((targetPage: number, targetPageSize: number) => {
    // 从连接配置中获取数据库类型，而不是仅仅依赖表名判断
    const isIoTDB = dbType === 'iotdb' ||
                    detectedType === 'iotdb' ||
                    tableName.startsWith('root.'); // 后备判断

    let query: string;

    if (isIoTDB) {
      // IoTDB查询
      logger.debug('🔧 [IoTDB] 使用IoTDB查询语法，连接类型:', dbType);

      // 为了保证列顺序一致，IoTDB始终使用SELECT *
      // IoTDB在使用指定字段查询时，返回的列顺序可能与SELECT *不同
      // 这会导致数据错位问题
      logger.debug('🔧 [TableDataBrowser] 执行数据查询:', `SELECT * FROM ${tableName}`);
      query = `SELECT * FROM ${tableName}`;

      // 添加搜索条件
      if (searchText.trim()) {
        // IoTDB的WHERE条件需要特殊处理
        query += ` WHERE ${tableName} LIKE '%${searchText}%'`;
      }

      // 添加过滤条件
      if (filters.length > 0) {
        const filterConditions = filters.map(filter => {
          if (filter.dataType === 'string') {
            return `${filter.column} LIKE '%${filter.value}%'`;
          } else if (filter.dataType === 'number') {
            return `${filter.column} = ${filter.value}`;
          }
          return '';
        }).filter(Boolean);

        if (filterConditions.length > 0) {
          const whereClause = searchText.trim() ? ' AND ' : ' WHERE ';
          query += whereClause + filterConditions.join(' AND ');
        }
      }
    } else {
      // InfluxDB查询
      logger.debug('🔧 [InfluxDB] 使用字段明确查询，连接类型:', dbType);

      // 构建字段列表，去重并确保包含time字段
      const fieldColumns = columns.filter(col => col !== '#' && col !== 'time');
      if (fieldColumns.length > 0) {
        // 使用明确的字段名，去重避免重复
        const uniqueFields = [...new Set(fieldColumns)];
        const fieldList = uniqueFields.map(field => `"${field}"`).join(', ');
        query = `SELECT time, ${fieldList}
                   FROM "${tableName}"`;
      } else {
        // 如果没有字段信息，使用SELECT *
        query = `SELECT *
                   FROM "${tableName}"`;
      }

      // 添加搜索条件
      if (searchText.trim()) {
        query += ` WHERE time > now() - 1d`; // 示例时间过滤
      }

      // 添加过滤条件
      if (filters.length > 0) {
        const filterConditions = filters.map(filter => {
          if (filter.dataType === 'string') {
            return `"${filter.column}" =~ /.*${filter.value}.*/`;
          } else if (filter.dataType === 'number') {
            return `"${filter.column}" = ${filter.value}`;
          }
          return '';
        }).filter(Boolean);

        if (filterConditions.length > 0) {
          const whereClause = searchText.trim() ? ' AND ' : ' WHERE ';
          query += whereClause + filterConditions.join(' AND ');
        }
      }
    }

    // 添加排序 - IoTDB不支持ORDER BY，InfluxDB支持按时间排序
    if (!isIoTDB) {
      if (sortColumn === 'time' && sortDirection) {
        query += ` ORDER BY time ${sortDirection.toUpperCase()}`;
      } else {
        // 对于非时间列或无排序时，使用默认时间排序，客户端排序将在数据加载后处理
        query += ` ORDER BY time DESC`;
      }
    }

    // 添加分页（如果不是"全部"选项）
    // targetPageSize === -1 表示加载全部数据
    if (targetPageSize > 0) {
      const offset = (targetPage - 1) * targetPageSize;
      query += ` LIMIT ${targetPageSize} OFFSET ${offset}`;
      logger.debug('🔧 [TableDataBrowser] 添加分页参数:', {
        pageSize: targetPageSize,
        currentPage: targetPage,
        offset,
        limitClause: `LIMIT ${targetPageSize} OFFSET ${offset}`
      });
    } else {
      logger.debug('🔧 [TableDataBrowser] 显示全部数据，不添加 LIMIT 子句');
    }

    return query;
  }, [
    tableName,
    columns,
    searchText,
    filters,
    sortColumn,
    sortDirection,
    dbType,
    detectedType,
    fullFieldPaths,
  ]);

  // 获取表结构信息
  const fetchTableSchema = useCallback(async () => {
    try {
      // 从连接配置中获取数据库类型，而不是仅仅依赖表名判断
      const isIoTDB = dbType === 'iotdb' ||
                      detectedType === 'iotdb' ||
                      tableName.startsWith('root.') || database.startsWith('root.'); // 后备判断

      // 获取字段键
      let fieldKeysQuery: string;
      if (isIoTDB) {
        // IoTDB: 需要构建完整的设备路径
        // tableName 可能是完整路径（root.xxx.device）或者只是设备名
        const fullPath = tableName.startsWith('root.') ? tableName : `${database}.${tableName}`;
        fieldKeysQuery = `SHOW TIMESERIES ${fullPath}.**`;
      } else {
        // InfluxDB: 使用表名
        fieldKeysQuery = `SHOW FIELD KEYS FROM "${tableName}"`;
      }

      logger.debug(`🔧 [${isIoTDB ? 'IoTDB' : 'InfluxDB'}] 执行字段查询:`, fieldKeysQuery);
      logger.debug(`🔧 连接信息:`, {
        connectionId,
        dbType,
        detectedType,
        tableName,
        database,
        fullPath: isIoTDB ? (tableName.startsWith('root.') ? tableName : `${database}.${tableName}`) : tableName
      });

      const fieldResult = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connection_id: connectionId,
          database,
          query: fieldKeysQuery,
        },
      });

      logger.debug(`🔧 [${isIoTDB ? 'IoTDB' : 'InfluxDB'}] 字段查询结果:`, fieldResult);

      const fieldKeys: string[] = [];
      const tagKeys: string[] = [];

      // 获取标签键（仅对 InfluxDB）
      // IoTDB 不需要标签键，因为设备本身就是表
      if (!isIoTDB) {
        const tagKeysQuery = `SHOW TAG KEYS FROM "${tableName}"`;
        const tagResult = await safeTauriInvoke<QueryResult>('execute_query', {
          request: {
            connection_id: connectionId,
            database,
            query: tagKeysQuery,
          },
        });

        // 处理标签键结果
        if (tagResult.results?.[0]?.series?.[0]?.values) {
          tagKeys.push(
            ...tagResult.results[0].series[0].values
              .map((row: any[]) => row[0])
              .filter((col: any) => col !== null && col !== undefined && col !== '')
              .map((col: any) => String(col))
          );
        }
      }

      // 处理字段键结果
      if (fieldResult.results?.[0]?.series?.[0]?.values) {
        // IoTDB 的 SHOW TIMESERIES 查询返回格式：
        // [Time, Timeseries, Alias, Database, DataType, ...]
        // 第0列是时间戳，第1列是时间序列名称
        const timeseriesPaths = fieldResult.results[0].series[0].values
          .map((row: any[]) => {
            // 对于 IoTDB，从第1列获取时间序列名称
            // 对于 InfluxDB，从第0列获取字段名
            return isIoTDB ? (row.length > 1 ? row[1] : row[0]) : row[0];
          })
          .filter((col: any) => col !== null && col !== undefined && col !== '')
          .map((col: any) => String(col));

        // 对于IoTDB，从时间序列路径中提取字段名
        if (isIoTDB) {
          const extractedFieldKeys = timeseriesPaths
            .map(path => {
              // 从路径中提取最后一部分作为字段名
              // 例如：root.city.traffic.intersection01.avg_speed -> avg_speed
              const parts = path.split('.');
              return parts[parts.length - 1];
            })
            .filter(fieldName => fieldName && fieldName !== '');

          fieldKeys.push(...extractedFieldKeys);

          // 同时保存完整路径用于查询构建
          // 过滤掉表名本身，只保留字段路径
          const fullPaths = timeseriesPaths
            .filter(path => path && path !== '' && path !== tableName)
            .filter(path => path.startsWith(`${tableName  }.`));

          logger.debug(`🔧 [${isIoTDB ? 'IoTDB' : 'InfluxDB'}] 字段路径提取:`, {
            原始路径: timeseriesPaths,
            提取的字段名: extractedFieldKeys,
            完整路径: fullPaths,
            表名: tableName,
            数据库类型: isIoTDB ? 'IoTDB' : 'InfluxDB'
          });

          // 将完整路径存储到组件状态中，用于查询构建
          setFullFieldPaths(fullPaths);

          // 为IoTDB创建字段名映射，用于后续数据处理
          // SELECT * 查询返回的列顺序可能与SHOW TIMESERIES不同
          // 需要建立正确的映射关系
          const fieldMapping = new Map<string, string>();
          fullPaths.forEach(path => {
            const fieldName = path.split('.').pop();
            if (fieldName) {
              fieldMapping.set(path, fieldName);
            }
          });

          logger.debug('🔧 [IoTDB] 字段映射关系:', Array.from(fieldMapping.entries()));
        } else {
          fieldKeys.push(...timeseriesPaths);
        }
      }



      // 合并所有列：序号、时间、标签键、字段键，并去重
      // 对于IoTDB，使用大写的'Time'以匹配数据中的键名
      const timeColumnName = isIoTDB ? 'Time' : 'time';
      const allColumns = ['#', timeColumnName, ...new Set([...tagKeys, ...fieldKeys])];

      logger.debug('🔧 [TableDataBrowser] 设置列状态:', {
        设置前columns长度: columns.length,
        设置后columns长度: allColumns.length,
        新列: allColumns,
        tableName
      });

      setColumns(allColumns);

      logger.debug('获取表结构完成:', {
        tableName,
        fieldKeys: fieldKeys.length,
        tagKeys: tagKeys.length,
        totalColumns: allColumns.length,
        columns: allColumns,
        isInitializedRef当前值: isInitializedRef.current
      });
    } catch (error) {
      logger.error('获取表结构失败:', error);
      showMessage.error(tBrowser('getTableStructureFailed'));
    }
  }, [connectionId, database, tableName, dbType, detectedType]);

  // 获取总数
  const fetchTotalCount = useCallback(async () => {
    try {
      // 智能检测数据库类型并生成正确的查询
      const isIoTDB = tableName.startsWith('root.') || database.startsWith('root.');
      const tableRef = isIoTDB ? tableName : `"${tableName}"`;

      const countQuery = `SELECT COUNT(*)
                          FROM ${tableRef}`;
      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connection_id: connectionId,
          database,
          query: countQuery,
        },
      });

      if (result.results?.[0]?.series?.[0]?.values?.[0]?.[1]) {
        setTotalCount(result.results[0].series[0].values[0][1] as number);
      }
    } catch (error) {
      logger.error('获取总数失败:', error);
    }
  }, [connectionId, database, tableName]);

  // 客户端排序函数
  const sortDataClientSide = useCallback(
    (dataToSort: DataRow[], column: string, direction: 'asc' | 'desc') => {
      return [...dataToSort].sort((a: DataRow, b: DataRow) => {
        let aVal = a[column];
        let bVal = b[column];

        // 处理时间列
        if (column === 'time') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        } else {
          // 尝试转换为数字进行比较
          const aNum = parseFloat(String(aVal));
          const bNum = parseFloat(String(bVal));
          if (!isNaN(aNum) && !isNaN(bNum)) {
            aVal = aNum;
            bVal = bNum;
          } else {
            // 字符串比较
            aVal = String(aVal || '').toLowerCase();
            bVal = String(bVal || '').toLowerCase();
          }
        }

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    },
    []
  );

  // 加载数据（带分页参数）
  const loadDataWithPagination = useCallback(async (targetPage: number, targetPageSize: number) => {
    logger.debug('🔧 [TableDataBrowser] loadDataWithPagination被调用:', {
      columns长度: columns.length,
      tableName,
      targetPage,
      targetPageSize,
      是否会执行: columns.length > 0
    });

    if (columns.length === 0) {
      logger.debug('🔧 [TableDataBrowser] loadDataWithPagination跳过：columns长度为0');
      return;
    }

    setLoading(true);
    try {
      const query = generateBaseQueryWithPagination(targetPage, targetPageSize);
      logger.debug('🔧 [TableDataBrowser] 执行数据查询:', query);

      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connection_id: connectionId,
          database,
          query,
        },
      });



      if (result.results?.[0]?.series?.[0]) {
        const series = result.results[0].series[0];
        const { columns: resultColumns, values } = series;

        if (resultColumns && values && Array.isArray(resultColumns) && Array.isArray(values)) {
          // 检测数据库类型
          const isIoTDB = dbType === 'iotdb' ||
                          detectedType === 'iotdb' ||
                          tableName.startsWith('root.');

          // 过滤掉null、undefined或空字符串的列名
          let validColumns = resultColumns.filter(col =>
            col !== null && col !== undefined && col !== '' && typeof col === 'string'
          );

          // 对于IoTDB，需要特殊处理列名
          if (isIoTDB) {
            logger.debug('🔧 [IoTDB] 原始查询返回的列名:', validColumns);
            logger.debug('🔧 [IoTDB] 原始列数据：', resultColumns);
            logger.debug('🔧 [IoTDB] 字段路径:', fullFieldPaths);

            // IoTDB的SELECT *查询可能返回两种列结构：
            // 1. [Time, root.xxx.field1, root.xxx.field2, ...] - 完整路径格式
            // 2. [root.xxx, field1, field2, ...] - 表名列 + 短字段名格式

            // 检查第一列是否是Time
            const hasTimeColumn = validColumns[0]?.toLowerCase() === 'time';

            if (hasTimeColumn) {
              // 如果有Time列，保留原始顺序，只转换列名为短名称
              const iotdbColumns: string[] = validColumns.map((colName, idx) => {
                if (idx === 0 && colName.toLowerCase() === 'time') {
                  return 'Time';
                } else if (colName && colName.includes('.')) {
                  // 提取短名称
                  return colName.split('.').pop() || colName;
                } else {
                  return colName;
                }
              });

              logger.debug('🔧 [IoTDB] 构建的显示列名（包含Time）:', iotdbColumns);
              logger.debug('🔧 [IoTDB] 原始列顺序:', validColumns);
              validColumns = iotdbColumns;

              // 确保resultColumns也保持同步（用于后续的数据映射）
              // resultColumns保持原始值不变，因为它用于映射数据
            } else if (validColumns[0]?.startsWith('root.') &&
                       validColumns.length > 1 &&
                       !validColumns[1]?.startsWith('root.')) {
              // 格式2：第一列是表名，后面是短字段名
              // 这种情况需要过滤掉表名列
              logger.debug('🔧 [IoTDB] 检测到表名列格式，过滤表名列');
              validColumns = validColumns.slice(1);
            } else if (validColumns.every(col => col?.includes('.'))) {
              // 所有列都是完整路径，提取短名称
              // 但是后端可能添加了Time列，需要检查
              const iotdbColumns: string[] = [];

              // 检查后端是否添加了Time列（通过数据长度判断）
              const hasTimeInData = values[0] && values[0].length > validColumns.length;
              if (hasTimeInData) {
                logger.debug('🔧 [IoTDB] 检测到数据中包含Time列（数据长度大于列数）');
                iotdbColumns.push('Time');
                // 后端在数据开头插入了时间戳，需要相应调整
              }

              validColumns.forEach(colName => {
                if (colName) {
                  const fieldName = colName.split('.').pop();
                  if (fieldName) {
                    iotdbColumns.push(fieldName);
                  }
                }
              });
              logger.debug('🔧 [IoTDB] 所有列都是完整路径，转换为短名称:', iotdbColumns);
              validColumns = iotdbColumns;
            }

            logger.debug('🔧 [IoTDB] 列数分析:', {
              后端返回列数: resultColumns.length,
              处理后列数: validColumns.length,
              数据行列数: values[0]?.length || 0,
              最终列名: validColumns
            });
          }

          logger.debug('🔧 [TableDataBrowser] 列名过滤:', {
            数据库类型: isIoTDB ? 'IoTDB' : 'InfluxDB',
            原始列数: resultColumns.length,
            有效列数: validColumns.length,
            原始列名: resultColumns,
            有效列名: validColumns
          });

          logger.debug('🔧 [TableDataBrowser] 开始数据格式化，数据行数:', values.length);

          let formattedData: DataRow[] = [];
          try {
            formattedData = values.map(
              (row: any[], index: number) => {
                try {
                  const record: DataRow = { _id: index };

                  // 添加序号列
                  const offset = pageSize > 0 ? (currentPage - 1) * pageSize : 0;
                  record['#'] = offset + index + 1;

              // 添加其他列数据，只处理有效列
              if (Array.isArray(row) && validColumns.length > 0) {
                try {
                  if (isIoTDB) {
                    // IoTDB 特殊处理：
                    // - resultColumns 是原始列名：["Time", "root.xxx.field1", ...] 或不包含Time
                    // - validColumns 是处理后的短名称：["Time", "field1", ...]
                    // - row 数据与resultColumns对应，需要根据resultColumns的顺序映射到validColumns

                    // 检查是否有Time列
                    const hasTimeInColumns = resultColumns[0]?.toLowerCase() === 'time';
                    const hasTimeInValidColumns = validColumns[0] === 'Time';

                    logger.debug('🔧 [IoTDB] Time列检测:', {
                      hasTimeInColumns,
                      hasTimeInValidColumns,
                      resultColumns第一列: resultColumns[0],
                      validColumns第一列: validColumns[0],
                      数据长度: row.length,
                      列数: resultColumns.length,
                      第一个数据值: row[0]
                    });

                    // 如果validColumns有Time但resultColumns没有，说明后端添加了Time列到数据中
                    if (hasTimeInValidColumns && !hasTimeInColumns) {
                      logger.debug('🔧 [IoTDB] 检测到后端添加的Time列，手动映射时间戳');
                      // 第一个数据是时间戳
                      if (row.length > 0) {
                        record['Time'] = row[0];
                        logger.debug('🔧 [IoTDB] 映射Time值:', row[0]);
                        // 其余数据对应其他列（跳过第一个时间戳）
                        validColumns.slice(1).forEach((col: string, idx: number) => {
                          if (idx + 1 < row.length) {
                            record[col] = row[idx + 1];
                          }
                        });
                      }
                    } else {
                      // 正常映射：建立从resultColumns到validColumns的映射
                      resultColumns.forEach((originalCol: string, idx: number) => {
                        if (idx < row.length) {
                          let targetColName: string;

                          // 处理列名映射
                          if (originalCol.toLowerCase() === 'time') {
                            targetColName = 'Time';
                          } else if (originalCol.includes('.')) {
                            // 提取短名称
                            targetColName = originalCol.split('.').pop() || originalCol;
                          } else {
                            targetColName = originalCol;
                          }

                          // 将数据映射到正确的列名
                          record[targetColName] = row[idx];
                        }
                      });
                    }
                  } else {
                    // 非 IoTDB：列名直接匹配
                    validColumns.forEach((col: string) => {
                      // 找到该列在原始列数组中的索引
                      const colIndex = resultColumns.indexOf(col);
                      if (colIndex !== -1 && colIndex < row.length) {
                        record[col] = row[colIndex];
                      }
                    });
                  }
                } catch (colError) {
                  logger.error('🔧 [TableDataBrowser] 列映射失败:', {
                    error: colError,
                    validColumns,
                    resultColumns,
                    row,
                    rowIndex: index,
                    isIoTDB
                  });
                  throw colError;
                }
              }
              return record;
                } catch (rowError) {
                  logger.error('🔧 [TableDataBrowser] 行处理失败:', {
                    error: rowError,
                    rowIndex: index,
                    row,
                    validColumns,
                    resultColumns
                  });
                  // 返回一个基本的记录，避免整个处理失败
                  return { _id: index, '#': index + 1 };
                }
              }
            );

          // 存储原始数据
          setRawData(formattedData);
          // 直接设置数据，排序将通过 useMemo 处理
          setData(formattedData);

        } catch (formatError) {
          setRawData([]);
          setData([]);
        }
        }
      } else {
        setRawData([]);
        setData([]);
      }

      // 🚀 如果是懒加载模式的首次加载，触发预加载
      // 注意：这里不能直接调用 prefetchNextBatch，因为它在后面定义
      // 使用 setTimeout 和事件循环来延迟调用
      if (targetPageSize > 0 && targetPageSize !== -1 && querySettings.enable_lazy_loading && pageSize === -1) {
        logger.debug('🚀 [TableDataBrowser] 首次加载完成，将触发预加载');
        const dataLength = targetPageSize;
        // 延迟执行预加载，确保所有函数都已定义
        setTimeout(() => {
          // 在这里直接实现预加载逻辑，避免循环依赖
          triggerPrefetch(dataLength);
        }, 100);
      }
    } catch (error) {
      logger.error(tBrowser('loadDataFailed'), error);
      showMessage.error(tBrowser('loadDataFailed'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [
    columns,
    tableName,
    generateBaseQueryWithPagination,
    connectionId,
    database,
    dbType,
    detectedType,
    querySettings.enable_lazy_loading,
    pageSize,
  ]);

  // 兼容的 loadData 函数，使用当前状态
  const loadData = useCallback(async () => {
    // 直接使用当前的分页状态加载数据
    // pageSize === -1 表示加载全部数据
    logger.debug('🔧 [TableDataBrowser] 刷新数据:', {
      currentPage,
      pageSize,
      模式: pageSize === -1 ? '全部数据' : '分页模式'
    });
    return loadDataWithPagination(currentPage, pageSize);
  }, [loadDataWithPagination, currentPage, pageSize]);

  // 应用过滤器（延迟执行，避免添加过滤器时立即重新加载）
  const applyFilters = useCallback(async (customFilters?: ColumnFilter[]) => {
    if (columns.length === 0) return;

    // 使用传入的 customFilters 或默认的 filters
    const filtersToUse = customFilters !== undefined ? customFilters : filters;

    // 验证筛选条件
    const invalidFilters = filtersToUse.filter(filter => {
      // 对于time_range，至少需要有开始或结束时间之一
      if (filter.operator === 'time_range') {
        return !filter.value && !filter.value2;
      }
      // 对于between，需要同时有value和value2
      if (filter.operator === 'between') {
        return !filter.value?.trim() || !filter.value2?.trim();
      }
      // 其他操作符需要有value
      return !filter.value?.trim();
    });

    if (invalidFilters.length > 0) {
      const invalidColumns = invalidFilters.map(f => f.column).join(', ');
      showMessage.warning(
        tBrowser('invalidFilterWarning', { columns: invalidColumns })
      );
      return;
    }

    setCurrentPage(1);
    setLoading(true);
    try {
      const query = generateQuery(customFilters); // 使用包含过滤器的查询
      logger.debug('应用过滤器查询:', query);

      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connection_id: connectionId,
          database,
          query,
        },
      });

      if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
        logger.debug('筛选后数据:', {
          数据行数: result.data.length,
          前3行: result.data.slice(0, 3),
          列名: result.columns || Object.keys(result.data[0] || {}),
          数据类型: Array.isArray(result.data[0]) ? '数组格式' : '对象格式'
        });

        // 处理数据格式：将数组格式转换为对象格式
        const offset = pageSize > 0 ? (currentPage - 1) * pageSize : 0;
        const processedData = result.data.map((record: any, index: number) => {
          if (Array.isArray(record)) {
            // 数组格式：需要转换为对象格式
            const obj: any = {};

            // 使用后端实际返回的列名，确保与数据完全匹配
            const backendColumns = result.columns || [];

            // 只处理有数据的列，避免创建空列
            const actualColumns = backendColumns.slice(0, record.length);

            // 将数组数据映射到对象，只处理有数据的列
            actualColumns.forEach((columnName: string, colIndex: number) => {
              obj[columnName] = record[colIndex] !== undefined ? record[colIndex] : null;
            });

            // 添加序号和ID
            obj['#'] = offset + index + 1;
            obj._id = `row_${offset + index}`;

            return obj;
          } else if (record && typeof record === 'object') {
            // 对象格式：直接处理
            return {
              ...record,
              '#': offset + index + 1,
              _id: (record as DataRow)._id || `row_${index}`,
            };
          }
          return record;
        });

        logger.debug('处理后数据:', {
          数据行数: processedData.length,
          前3行: processedData.slice(0, 3),
          数据字段: Object.keys(processedData[0] || {})
        });

        setRawData(processedData);
        setData(processedData);
      } else {
        setData([]);
        setRawData([]);
        // 提示用户筛选后没有数据
        if (filtersToUse.length > 0) {
          showMessage.info(`${tBrowser('noDataAfterFilter')}，${tBrowser('tryAdjustFilter')}`);
        }
      }
    } catch (error) {
      logger.error('应用过滤器失败:', error);
      showMessage.error(tBrowser('applyFilterFailed'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [connectionId, database, generateQuery, columns, pageSize, currentPage, filters, tBrowser]);

  // 初始化 - 使用ref避免重复加载
  const isInitializedRef = useRef(false);
  const isFetchingSchemaRef = useRef(false); // 防止重复获取表结构

  useEffect(() => {
    logger.debug('[TableDataBrowser] fetchTableSchema useEffect触发:', {
      isInitialized: isInitializedRef.current,
      isFetchingSchema: isFetchingSchemaRef.current,
      connectionId,
      database,
      tableName
    });

    // 如果正在获取表结构，跳过
    if (isFetchingSchemaRef.current) {
      logger.debug('[TableDataBrowser] 跳过：正在获取表结构中');
      return;
    }

    // 每次表名变化时都重新获取表结构
    isInitializedRef.current = true;
    isFetchingSchemaRef.current = true;

    logger.debug('[TableDataBrowser] 开始获取表结构:', {
      connectionId,
      database,
      tableName
    });

    fetchTableSchema().finally(() => {
      isFetchingSchemaRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId, database, tableName]); // 只依赖实际的参数，不依赖函数引用

  // 监听表名变化，清理状态但不重置初始化标志
  useEffect(() => {
    logger.debug('[TableDataBrowser] 表名变化，清理状态:', {
      connectionId,
      database,
      tableName
    });

    // 清理状态，但不重置初始化标志
    // 让fetchTableSchema useEffect来管理初始化状态
    setData([]);
    setRawData([]);
    setColumns([]);
    setColumnOrder([]);
    setSelectedColumns([]);
    setFullFieldPaths([]);
    setCurrentPage(1);
    setPageSize(500); // 重置为默认分页大小
    setTotalCount(0);
  }, [connectionId, database, tableName]);

  useEffect(() => {
    logger.debug('🔧 [TableDataBrowser] columns变化useEffect触发:', {
      columns长度: columns.length,
      是否初始化: isInitializedRef.current,
      会执行数据加载: columns.length > 0 && isInitializedRef.current,
      tableName
    });

    if (columns.length > 0 && isInitializedRef.current) {
      logger.debug('🔧 [TableDataBrowser] 开始并行执行数据加载:', {
        columns,
        tableName
      });

      // 避免重复调用，使用Promise.all并行执行
      Promise.all([
        fetchTotalCount(),
        loadData()
      ]).catch(error => {
        logger.error('初始化数据加载失败:', error);
      }).finally(() => {
        // 🔧 数据加载完成后，清除 tab 的 loading 状态
        if (currentTab?.id) {
          updateTab(currentTab.id, { isLoading: false });
          logger.debug('🔧 [TableDataBrowser] 清除 tab loading 状态:', currentTab.id);
        }
      });
    }
  }, [columns.length, currentTab?.id, updateTab]); // 只依赖columns.length，避免函数引用变化导致的重复调用

  // 🔧 监听 refreshTrigger 变化，触发数据刷新
  useEffect(() => {
    if (currentTab?.refreshTrigger && columns.length > 0) {
      logger.debug('🔧 [TableDataBrowser] 检测到刷新触发器，重新加载数据:', {
        refreshTrigger: currentTab.refreshTrigger,
        tableName,
      });

      // 重新加载数据
      Promise.all([
        fetchTotalCount(),
        loadData()
      ]).catch(error => {
        logger.error('刷新数据失败:', error);
      }).finally(() => {
        // 🔧 数据加载完成后，清除 tab 的 loading 状态
        if (currentTab?.id) {
          updateTab(currentTab.id, { isLoading: false });
          logger.debug('🔧 [TableDataBrowser] 刷新完成，清除 tab loading 状态:', currentTab.id);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab?.refreshTrigger, columns.length]); // 只依赖触发器和列数，避免函数引用变化导致重复执行

  // 统一的列宽度计算函数 - 根据数据内容和表头自动调整
  const calculateColumnWidth = useCallback((column: string, sampleData?: DataRow[]): number => {
    // 安全检查：确保column不为null或undefined
    if (!column || typeof column !== 'string') {
      return 150; // 默认宽度
    }

    // 固定宽度的特殊列
    if (column === '_actions') return 48;
    if (column === '_select') return 48;
    if (column === '#') return 80;

    // Time列特殊处理，考虑格式化后的日期字符串长度
    if (column === 'Time' || column === 'time') {
      // 格式化日期示例："2025-01-15 10:30:45" 约19个字符
      const charWidth = 8;
      const padding = 40;
      return Math.max(200, 19 * charWidth + padding);
    }

    // 计算表头宽度
    const charWidth = 8; // 字符平均宽度（像素）
    const padding = 40; // padding空间（包括排序图标等）
    const headerWidth = column.length * charWidth + padding;

    // 如果有数据样本，计算数据内容的最大宽度
    let maxDataWidth = 0;
    if (sampleData && sampleData.length > 0) {
      // 采样前10行数据
      const sampleRows = sampleData.slice(0, 10);

      sampleRows.forEach(row => {
        const value = row[column];
        if (value != null) {
          // 转换为字符串并计算长度
          let displayValue = String(value);

          // 对于Time列，需要考虑格式化后的长度
          if ((column === 'Time' || column === 'time') && typeof value === 'number') {
            // 格式化时间戳为日期字符串
            try {
              displayValue = new Date(value).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              });
            } catch (e) {
              // 格式化失败则使用原始值
              displayValue = String(value);
            }
          }

          const contentWidth = displayValue.length * charWidth;
          maxDataWidth = Math.max(maxDataWidth, contentWidth);
        }
      });
    }

    // 取表头宽度和数据宽度的最大值
    // headerWidth已包含padding，maxDataWidth需要加padding
    const calculatedWidth = Math.max(headerWidth, maxDataWidth + padding);

    // 设置合理的最小值和最大值
    const minWidth = 120;
    const maxWidth = 500;

    return Math.min(Math.max(calculatedWidth, minWidth), maxWidth);
  }, []);

  // 初始化列宽度
  const initializeColumnWidths = useCallback(
    (cols: string[], sampleData?: DataRow[]) => {
      const widths: Record<string, number> = {};
      // 安全检查：确保cols是数组且每个元素都是有效的字符串
      if (Array.isArray(cols)) {
        cols.forEach(col => {
          if (col && typeof col === 'string') {
            widths[col] = calculateColumnWidth(col, sampleData);
          }
        });
      }
      setColumnWidths(widths);
    },
    [calculateColumnWidth]
  );

  // 使用 useMemo 处理排序后的数据，避免不必要的重新计算
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection || sortColumn.toLowerCase() === 'time' || sortColumn === '#') {
      return data;
    }
    return sortDataClientSide(data, sortColumn, sortDirection);
  }, [data, sortColumn, sortDirection, sortDataClientSide]);

  // 注意：时间列排序现在使用客户端排序，不再需要监听sortColumn变化来重新查询数据
  // 这个useEffect已被移除，以避免不必要的服务器端查询
  // 所有列的排序都在handleSort函数中通过客户端排序处理

  // 初始化选中的列（默认全选，但排除序号列）
  useEffect(() => {
    if (columns.length > 0) {
      const dataColumns = columns.filter(col => col !== '#');
      setSelectedColumns(dataColumns);
      setColumnOrder(dataColumns); // 同时初始化列顺序
      initializeColumnWidths(columns); // 初始化列宽度（包含序号列用于宽度计算）
    }
  }, [columns, initializeColumnWidths]);

  // 当数据更新时，重新计算列宽以适应数据内容
  useEffect(() => {
    if (data.length > 0 && columns.length > 0) {
      logger.debug('🔧 [TableDataBrowser] 数据已加载，重新计算列宽', {
        数据行数: data.length,
        列数: columns.length
      });
      initializeColumnWidths(columns, data);
    }
  }, [data.length, columns.length, initializeColumnWidths, data, columns]); // 添加必要的依赖

  // 处理页面变化 - 直接传递新页码参数
  const handlePageChange = useCallback((page: number) => {
    logger.debug('🔧 [TableDataBrowser] 分页变化:', {
      oldPage: currentPage,
      newPage: page,
      pageSize,
      willReloadData: true
    });

    // 立即更新页码状态
    setCurrentPage(page);

    // 直接使用新的页码参数执行数据加载，避免状态更新延迟
    loadDataWithPagination(page, pageSize);
  }, [currentPage, pageSize, loadDataWithPagination]);

  // 处理页面大小变化 - "全部"模式使用懒加载
  const handlePageSizeChange = useCallback((size: string) => {
    logger.debug('🔧 [TableDataBrowser] 页面大小变化:', {
      oldSize: pageSize,
      newSize: size,
      currentPage,
      totalCount,
      querySettings,
      willReloadData: true
    });

    // 立即更新状态
    const newSize = size === 'all' ? -1 : parseInt(size);
    setPageSize(newSize);
    setCurrentPage(1);

    // 清空预加载缓存（切换分页模式时）
    setPrefetchedData([]);

    // 对于"全部"选项，根据设置决定是否使用懒加载模式
    if (newSize === -1) {
      logger.debug('🔧 [TableDataBrowser] 检查懒加载设置:', {
        enable_lazy_loading: querySettings.enable_lazy_loading,
        lazy_loading_batch_size: querySettings.lazy_loading_batch_size,
        将使用模式: querySettings.enable_lazy_loading ? '懒加载' : '一次性加载'
      });

      if (querySettings.enable_lazy_loading) {
        // 懒加载模式：初始加载一批数据，滚动时自动加载更多
        const INITIAL_BATCH_SIZE = querySettings.lazy_loading_batch_size;
        logger.debug(`🔧 [TableDataBrowser] 启用懒加载模式，初始加载 ${INITIAL_BATCH_SIZE} 行，总数: ${totalCount}`);

        // 加载第一批数据
        loadDataWithPagination(1, INITIAL_BATCH_SIZE);

        // 提示用户已启用懒加载
        if (totalCount > INITIAL_BATCH_SIZE) {
          toast.info(tBrowser('loadedInitialRows', { count: INITIAL_BATCH_SIZE }), {
            duration: 3000
          });
        }
      } else {
        // 一次性加载所有数据（不推荐，可能导致性能问题）
        logger.debug(`🔧 [TableDataBrowser] 一次性加载所有数据，总数: ${totalCount}`);
        loadDataWithPagination(1, -1);

        if (totalCount > 10000) {
          toast.warning(tBrowser('loadingManyRows', { count: totalCount }), {
            duration: 5000
          });
        }
      }
    } else {
      // 正常分页加载
      loadDataWithPagination(1, newSize);
    }
  }, [pageSize, currentPage, totalCount, querySettings.enable_lazy_loading, querySettings.lazy_loading_batch_size, loadDataWithPagination]);

  // 处理搜索
  const handleSearch = useCallback(() => {
    setCurrentPage(1);
    loadData();
  }, [loadData]);

  // 服务器端虚拟化：加载更多数据
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastLoadTime, setLastLoadTime] = useState(0);

  // 预加载下一批数据
  const prefetchNextBatch = useCallback(async (currentDataLength: number) => {
    if (isPrefetching || !querySettings.enable_lazy_loading) {
      return;
    }

    const batchSize = querySettings.lazy_loading_batch_size;
    const nextOffset = currentDataLength + batchSize; // 跳过当前批次和下一批次，预加载再下一批次

    // 如果已经到达或超过总数，不需要预加载
    if (nextOffset >= totalCount) {
      logger.debug('🚀 [TableDataBrowser] 无需预加载：已接近数据末尾');
      return;
    }

    logger.debug('🚀 [TableDataBrowser] 开始预加载下一批数据:', {
      当前数据量: currentDataLength,
      批次大小: batchSize,
      预加载偏移: nextOffset,
      总数据量: totalCount,
    });

    try {
      setIsPrefetching(true);

      // 计算预加载的页码
      const targetPage = Math.floor(nextOffset / batchSize) + 1;
      const query = generateBaseQueryWithPagination(targetPage, batchSize);

      logger.debug('🚀 [TableDataBrowser] 预加载查询:', query);

      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connection_id: connectionId,
          database,
          query,
        },
      });

      if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
        // 处理数据格式：与 loadMoreData 保持一致
        const processedData = result.data.map((record: any, index: number) => {
          if (Array.isArray(record)) {
            // 数组格式：需要转换为对象格式
            const obj: any = {};

            // 使用后端实际返回的列名，确保与数据完全匹配
            const backendColumns = result.columns || [];

            // 只处理有数据的列，避免创建空列
            const actualColumns = backendColumns.slice(0, record.length);

            // 将数组数据映射到对象，只处理有数据的列
            actualColumns.forEach((columnName: string, colIndex: number) => {
              obj[columnName] = record[colIndex] !== undefined ? record[colIndex] : null;
            });

            // 添加序号和ID
            obj['#'] = nextOffset + index + 1;
            obj._id = `row_${nextOffset + index}`;

            return obj;
          } else if (record && typeof record === 'object') {
            // 对象格式：直接处理
            (record as DataRow)['#'] = nextOffset + index + 1;
            (record as DataRow)._id = (record as DataRow)._id || `row_${nextOffset + index}`;
            return record;
          }
          return record;
        });

        setPrefetchedData(processedData);
        logger.info('[TableDataBrowser] 预加载成功:', {
          预加载数据量: processedData.length,
          预加载范围: `${nextOffset + 1} - ${nextOffset + processedData.length}`,
          数据样本: processedData[0],
          数据字段: Object.keys(processedData[0] || {}),
          后端返回列: result.columns,
        });
      }
    } catch (error) {
      logger.error('[TableDataBrowser] 预加载失败:', error);
    } finally {
      setIsPrefetching(false);
    }
  }, [isPrefetching, querySettings.enable_lazy_loading, querySettings.lazy_loading_batch_size, totalCount, generateBaseQueryWithPagination, connectionId, database]);

  // 更新 ref 引用
  useEffect(() => {
    prefetchNextBatchRef.current = prefetchNextBatch;
  }, [prefetchNextBatch]);

  const loadMoreData = useCallback(async () => {
    logger.debug('🔧 [TableDataBrowser] loadMoreData 被调用:', {
      pageSize,
      enable_lazy_loading: querySettings.enable_lazy_loading,
      loading,
      isLoadingMore,
      hasPrefetchedData: prefetchedData.length > 0,
      将执行: pageSize === -1 && querySettings.enable_lazy_loading && !loading && !isLoadingMore,
    });

    // 只在"全部"模式下、启用懒加载、且不在加载中时才加载更多
    if (pageSize !== -1 || !querySettings.enable_lazy_loading || loading || isLoadingMore) {
      logger.debug('🔧 [TableDataBrowser] loadMoreData 跳过执行');
      return;
    }

    // 优化防抖：减少间隔时间以提供更流畅的无缝滚动体验
    const now = Date.now();
    if (now - lastLoadTime < 300) { // 从1000ms减少到300ms
      return;
    }
    setLastLoadTime(now);

    logger.debug('🔧 [TableDataBrowser] 静默加载更多数据，当前数据量:', data.length);

    try {
      setIsLoadingMore(true);

      // 计算下一批数据的偏移量
      const offset = data.length;
      // 懒加载批次大小：从设置中读取
      const batchSize = querySettings.lazy_loading_batch_size;

      // 🚀 优化：优先使用预加载的数据
      if (prefetchedData.length > 0) {
        logger.debug('⚡ [TableDataBrowser] 使用预加载数据，无需等待查询!', {
          预加载数据量: prefetchedData.length,
          当前数据量: data.length,
        });

        // 直接使用预加载的数据
        setData(prevData => [...prevData, ...prefetchedData]);
        setRawData(prevData => [...prevData, ...prefetchedData]);

        // 清空预加载缓存
        const usedPrefetchedData = prefetchedData;
        setPrefetchedData([]);

        // 立即触发下一批数据的预加载
        const newDataLength = data.length + usedPrefetchedData.length;
        logger.debug('🚀 [TableDataBrowser] 触发下一批预加载，当前数据量:', newDataLength);
        triggerPrefetch(newDataLength);

        setIsLoadingMore(false);
        return;
      }

      // 构建查询，强制添加LIMIT和OFFSET
      // 计算目标页码：offset / batchSize + 1
      const targetPage = Math.floor(offset / batchSize) + 1;
      const query = generateBaseQueryWithPagination(targetPage, batchSize);

      logger.debug('🔧 [TableDataBrowser] 加载更多数据查询:', query);

      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connection_id: connectionId,
          database,
          query,
        },
      });

      if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
        // 处理数据格式：将数组格式转换为对象格式
        const offset_for_numbering = data.length;
        const processedData = result.data.map((record: any, index: number) => {
          if (Array.isArray(record)) {
            // 数组格式：需要转换为对象格式
            const obj: any = {};

            // 使用后端实际返回的列名，确保与数据完全匹配
            const backendColumns = result.columns || [];

            // 只处理有数据的列，避免创建空列
            const actualColumns = backendColumns.slice(0, record.length);

            logger.debug('🔧 [TableDataBrowser] 数据格式转换调试:', {
              原始数据长度: record.length,
              后端列定义长度: backendColumns.length,
              实际处理列长度: actualColumns.length,
              跳过的列: backendColumns.slice(record.length),
              后端列定义: backendColumns,
              原始数据前5个: record.slice(0, 5),
              原始数据最后5个: record.slice(-5)
            });

            // 将数组数据映射到对象，只处理有数据的列
            actualColumns.forEach((columnName: string, colIndex: number) => {
              obj[columnName] = record[colIndex] !== undefined ? record[colIndex] : null;
            });

            // 添加序号和ID
            obj['#'] = offset_for_numbering + index + 1;
            obj._id = `row_${offset_for_numbering + index}`;

            return obj;
          } else if (record && typeof record === 'object') {
            // 对象格式：直接处理
            (record as DataRow)['#'] = offset_for_numbering + index + 1;
            (record as DataRow)._id = (record as DataRow)._id || `row_${offset_for_numbering + index}`;
            return record;
          }
          return record;
        });

        logger.debug('🔧 [TableDataBrowser] 处理后的新数据样本:', {
          原始第一条数据: result.data[0],
          处理后第一条数据: processedData[0],
          数据字段: Object.keys(processedData[0] || {}),
          序号字段: processedData[0] ? processedData[0]['#'] : 'N/A'
        });

        // 追加处理后的数据到现有数据
        setData(prevData => [...prevData, ...processedData]);
        setRawData(prevData => [...prevData, ...processedData]);

        logger.debug('🔧 [TableDataBrowser] 成功加载更多数据:', {
          新增数据量: result.data.length,
          总数据量: data.length + result.data.length
        });

        // 🚀 加载完成后，立即预加载下一批数据
        const newDataLength = data.length + processedData.length;
        logger.debug('🚀 [TableDataBrowser] 触发预加载，当前数据量:', newDataLength);
        triggerPrefetch(newDataLength);
      } else {
        logger.debug('🔧 [TableDataBrowser] 没有更多数据了');
      }
    } catch (error) {
      logger.error('🔧 [TableDataBrowser] 加载更多数据失败:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [pageSize, querySettings.enable_lazy_loading, querySettings.lazy_loading_batch_size, loading, isLoadingMore, prefetchedData, lastLoadTime, data.length, generateBaseQueryWithPagination, connectionId, database]);

  // 行点击处理函数
  const handleRowClick = useCallback(
    (index: number, event: React.MouseEvent) => {
      logger.debug('handleRowClick called with index:', index, 'event:', event);

      // 如果正在拖动，不处理点击
      if (isDragging) {
        return;
      }

      const newSelectedRows = new Set(selectedRows);

      if (event.shiftKey && lastSelectedIndex !== -1) {
        // Shift+点击：范围选择
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        newSelectedRows.clear();
        for (let i = start; i <= end; i++) {
          newSelectedRows.add(i);
        }
      } else if (event.ctrlKey || event.metaKey) {
        // Ctrl+点击：切换选择
        if (newSelectedRows.has(index)) {
          newSelectedRows.delete(index);
        } else {
          newSelectedRows.add(index);
        }
      } else {
        // 普通点击：单选
        newSelectedRows.clear();
        newSelectedRows.add(index);
      }

      setSelectedRows(newSelectedRows);
      setLastSelectedIndex(index);
    },
    [selectedRows, lastSelectedIndex, isDragging]
  );

  // 鼠标按下处理函数（开始拖动选择）
  const handleRowMouseDown = useCallback(
    (index: number, event: React.MouseEvent) => {
      logger.debug('handleRowMouseDown called with index:', index);

      // 只有左键才开始拖动选择
      if (event.button !== 0) {
        return;
      }

      setIsDragging(true);
      setDragStartIndex(index);

      // 如果没有按修饰键，清空之前的选择
      if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
        const newSelectedRows = new Set<number>();
        newSelectedRows.add(index);
        setSelectedRows(newSelectedRows);
      }

      setLastSelectedIndex(index);
    },
    []
  );

  // 鼠标进入处理函数（拖动过程中的选择）
  const handleRowMouseEnter = useCallback(
    (index: number, event: React.MouseEvent) => {
      if (!isDragging || dragStartIndex === -1) {
        return;
      }

      const start = Math.min(dragStartIndex, index);
      const end = Math.max(dragStartIndex, index);
      const newSelectedRows = new Set(selectedRows);

      // 拖动选择范围内的所有行
      for (let i = start; i <= end; i++) {
        newSelectedRows.add(i);
      }

      setSelectedRows(newSelectedRows);
    },
    [isDragging, dragStartIndex, selectedRows]
  );

  // 鼠标抬起处理函数（结束拖动选择）
  const handleRowMouseUp = useCallback(
    (index: number, event: React.MouseEvent) => {
      logger.debug('handleRowMouseUp called with index:', index);
      setIsDragging(false);
      setDragStartIndex(-1);
    },
    []
  );

  // 右键菜单处理函数
  const handleRowContextMenu = useCallback(
    (index: number, event: React.MouseEvent) => {
      logger.debug('handleRowContextMenu called with index:', index);

      // 如果右键的行没有被选中，则选中它
      const newSelectedRows = new Set(selectedRows);
      if (!newSelectedRows.has(index)) {
        newSelectedRows.clear();
        newSelectedRows.add(index);
        setSelectedRows(newSelectedRows);
      }

      // 显示右键菜单
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        selectedRows: Array.from(newSelectedRows),
      });
    },
    [selectedRows]
  );

  // 隐藏右键菜单
  const hideContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  // 全选/取消全选
  const handleSelectAll = useCallback(() => {
    logger.debug(
      'handleSelectAll called, current selected:',
      selectedRows.size,
      'total:',
      data.length
    );
    if (selectedRows.size === data.length) {
      logger.debug('Deselecting all rows');
      setSelectedRows(new Set());
    } else {
      logger.debug('Selecting all rows');
      setSelectedRows(new Set(data.map((_, index) => index)));
    }
  }, [selectedRows.size, data.length]);

  // 键盘事件监听
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      // 检查是否在可编辑元素中
      const isEditable = target.isContentEditable ||
                       target.tagName === 'INPUT' ||
                       target.tagName === 'TEXTAREA' ||
                       target.closest('.monaco-editor') ||
                       target.closest('[contenteditable="true"]') ||
                       target.closest('.ProseMirror') ||
                       target.closest('[role="textbox"]');

      // 如果在可编辑元素中，不处理表格快捷键
      if (isEditable) {
        return;
      }

      // Ctrl+A 全选（仅在表格区域）
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        // 检查是否在表格容器内
        if (target.closest('.table-data-browser')) {
          event.preventDefault();
          handleSelectAll();
        }
      }
      // Escape 取消选择
      else if (event.key === 'Escape') {
        setSelectedRows(new Set());
        hideContextMenu();
      }
    };

    const handleGlobalClick = (event: MouseEvent) => {
      // 点击其他地方隐藏右键菜单
      hideContextMenu();
    };

    const handleGlobalMouseUp = () => {
      // 全局鼠标抬起，结束拖动
      setIsDragging(false);
      setDragStartIndex(-1);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleSelectAll, hideContextMenu]);

  // 复制功能
  const handleCopyRow = useCallback(
    async (rowIndex: number, format: 'text' | 'json' | 'csv' = 'text') => {
      const row: DataRow | undefined = data[rowIndex];
      if (!row) return;

      const visibleColumns = columnOrder.filter(col =>
        selectedColumns.includes(col)
      );
      const text = formatRowData(row, visibleColumns, format);

      const success = await copyToClipboard(text);
      if (success) {
        showMessage.success(t('copy_row_success', { format: format.toUpperCase() }));
      } else {
        showMessage.error(t('copy_failed'));
      }
    },
    [data, columnOrder, selectedColumns]
  );

  const handleCopySelectedRows = useCallback(
    async (format: 'text' | 'json' | 'csv' = 'text') => {
      if (selectedRows.size === 0) {
        showMessage.warning(t('please_select_rows'));
        return;
      }

      const selectedData = Array.from(selectedRows)
        .sort((a: number, b: number) => a - b)
        .map((index: number) => data[index])
        .filter(Boolean);

      const visibleColumns = columnOrder.filter(col =>
        selectedColumns.includes(col)
      );
      const text = formatMultipleRows(selectedData, visibleColumns, format);

      const success = await copyToClipboard(text);
      if (success) {
        showMessage.success(
          t('copy_rows_success', { count: selectedRows.size, format: format.toUpperCase() })
        );
      } else {
        showMessage.error(tBrowser('copyFailed'));
      }
    },
    [selectedRows, data, columnOrder, selectedColumns]
  );

  const handleCopyCell = useCallback(
    async (rowIndex: number, column: string) => {
      const row: DataRow | undefined = data[rowIndex];
      if (!row) return;

      const value = String(row[column] || '');
      const success = await copyToClipboard(value);

      if (success) {
        showMessage.success(tBrowser('cellContentCopied'));
      } else {
        showMessage.error(tBrowser('copyFailed'));
      }
    },
    [data]
  );

  // 根据选中的行和格式复制数据（用于键盘快捷键）
  const handleCopyWithFormat = useCallback(
    async (format: CopyFormat, rowsToCopy: DataRow[]) => {
      if (rowsToCopy.length === 0) {
        return;
      }

      const visibleColumns = columnOrder.filter(col =>
        selectedColumns.includes(col) && col !== '#'
      );

      let textToCopy = '';

      try {
        switch (format) {
          case 'text':
            // 文本格式：列之间用制表符分隔
            textToCopy = `${visibleColumns.join('\t')  }\n`;
            textToCopy += rowsToCopy.map(row =>
              visibleColumns.map(col => row[col] || '').join('\t')
            ).join('\n');
            break;

          case 'insert': {
            // INSERT语句格式
            const insertStatements = rowsToCopy.map(row => {
              const values = visibleColumns.map(col => {
                const val = row[col];
                if (val === null || val === undefined) return 'NULL';
                if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                return val;
              }).join(', ');
              return `INSERT INTO "${tableName}" (${visibleColumns.map(c => `"${c}"`).join(', ')}) VALUES (${values});`;
            });
            textToCopy = insertStatements.join('\n');
            break;
          }

          case 'markdown':
            // Markdown表格格式
            textToCopy = `| ${  visibleColumns.join(' | ')  } |\n`;
            textToCopy += `| ${  visibleColumns.map(() => '---').join(' | ')  } |\n`;
            textToCopy += rowsToCopy.map(row =>
              `| ${  visibleColumns.map(col => row[col] || '').join(' | ')  } |`
            ).join('\n');
            break;

          case 'json': {
            // JSON格式
            const jsonData = rowsToCopy.map(row => {
              const obj: Record<string, any> = {};
              visibleColumns.forEach(col => {
                obj[col] = row[col];
              });
              return obj;
            });
            textToCopy = JSON.stringify(jsonData, null, 2);
            break;
          }

          case 'csv': {
            // CSV格式
            const escapeCsvValue = (val: any) => {
              if (val === null || val === undefined) return '';
              const str = String(val);
              if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            };
            textToCopy = `${visibleColumns.map(escapeCsvValue).join(',')  }\n`;
            textToCopy += rowsToCopy.map(row =>
              visibleColumns.map(col => escapeCsvValue(row[col])).join(',')
            ).join('\n');
            break;
          }

          default:
            toast.error(tBrowser('unsupportedCopyFormat'));
            return;
        }

        // 复制到剪贴板
        await navigator.clipboard.writeText(textToCopy);

        toast.success(tBrowser('copiedAs', { format: tBrowser(`copyFormats.${format}`) }), {
          description: tBrowser('copiedRows', { count: rowsToCopy.length })
        });
      } catch (error) {
        logger.error('复制数据失败:', error);
        toast.error(tBrowser('copyFailed'));
      }
    },
    [columnOrder, selectedColumns, tableName]
  );



  // 处理排序
  const handleSort = (column: string) => {
    const newDirection =
      sortColumn === column
        ? sortDirection === 'asc'
          ? 'desc'
          : 'asc'
        : 'desc';

    setSortColumn(column);
    setSortDirection(newDirection);
    setCurrentPage(1);

    // 所有列都使用客户端排序，包括时间列
    // 这样可以避免因排序触发不必要的服务器端查询
    // 也避免了在有筛选条件时重新查询导致的数据丢失问题
    if (rawData.length > 0) {
      const sortedData = sortDataClientSide(rawData, column, newDirection);
      setData(sortedData);
    }
  };

  // 添加过滤器
  const addFilter = (column: string) => {
    // 检查是否已经存在该字段的筛选条件
    if (filters.some(filter => filter.column === column)) {
      showMessage.warning(`字段 "${column}" 已存在筛选条件`);
      return;
    }

    const dataType = detectColumnDataType(column, rawData);
    const availableOperators = getAvailableOperators(dataType);
    const defaultOperator = availableOperators[0]?.value || 'equals';

    const newFilter: ColumnFilter = {
      column,
      operator: defaultOperator,
      value: '',
      dataType,
    };
    setFilters([...filters, newFilter]);
  };

  // 更新过滤器（不立即重新加载）
  const updateFilter = (index: number, updatedFilter: ColumnFilter) => {
    const newFilters = [...filters];
    newFilters[index] = updatedFilter;
    setFilters(newFilters);
  };

  // 移除过滤器
  const removeFilter = (index: number) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
    // 删除后立即应用筛选，传递新的 filters 数组
    setTimeout(() => {
      applyFilters(newFilters);
    }, 0);
  };

  // 处理列选择
  const handleColumnToggle = (column: string) => {
    logger.debug('🔧 [TableDataBrowser] 列切换:', {
      column,
      currentSelected: selectedColumns,
    });
    setSelectedColumns(prev => {
      if (prev.includes(column)) {
        // 如果已选中，则取消选中（但至少保留一列）
        if (prev.length > 1) {
          const newSelected = prev.filter(col => col !== column);
          logger.debug('🔧 [TableDataBrowser] 取消选中列:', {
            column,
            before: prev,
            after: newSelected,
          });
          return newSelected;
        }
        logger.debug('🔧 [TableDataBrowser] 保留最后一列:', { column });
        return prev; // 至少保留一列
      } else {
        // 如果未选中，则添加到选中列表
        const newSelected = [...prev, column];
        logger.debug('🔧 [TableDataBrowser] 选中列:', {
          column,
          before: prev,
          after: newSelected,
        });
        return newSelected;
      }
    });
  };

  // 列全选/取消全选
  const handleSelectAllColumns = () => {
    const dataColumns = columns.filter(col => col !== '#');
    if (selectedColumns.length === dataColumns.length) {
      // 当前全选，取消全选（但保留第一列）
      setSelectedColumns([dataColumns[0]]);
    } else {
      // 当前非全选，全选
      setSelectedColumns(dataColumns);
    }
  };

  // 导出数据
  const exportData = async (options: ExportOptions) => {
    if (data.length === 0) {
      showMessage.warning(tBrowser('noDataToExport'));
      return;
    }

    try {
      // 构造符合 QueryResult 格式的数据（只包含选中的列，按columnOrder排序）
      const orderedSelectedColumns = columnOrder.filter(column =>
        selectedColumns.includes(column)
      );
      const queryResult: QueryResult = {
        results: [
          {
            series: [
              {
                name: tableName,
                columns: orderedSelectedColumns,
                values: data.map((row: DataRow) =>
                  orderedSelectedColumns.map((col: string) => row[col])
                ),
              },
            ],
          },
        ],
        data: data.map((row: DataRow) =>
          orderedSelectedColumns.map((col: string) => row[col])
        ), // 转换为正确的格式
        executionTime: 0,
      };

      // 使用原生导出对话框
      const success = await exportWithNativeDialog(queryResult, {
        format: options.format,
        includeHeaders: options.includeHeaders,
        delimiter: options.delimiter || (options.format === 'tsv' ? '\t' : ','),
        defaultFilename:
          options.filename ||
          generateTimestampedFilename(tableName, options.format),
        tableName: options.tableName || tableName,
      });

      if (success) {
        showMessage.success(
          tBrowser('exportSuccess', { filename: `${tableName}.${options.format}` })
        );
        setShowExportDialog(false);
      }
    } catch (error) {
      logger.error('导出数据失败:', error);
      showMessage.error(tBrowser('exportDataFailed'));
    }
  };

  // 快速导出（CSV格式）
  const quickExportCSV = async () => {
    await exportData({
      format: 'csv',
      includeHeaders: true,
    });
  };

  // 分页信息计算已移至独立的 PaginationControls 组件中

  return (
    <div className='h-full flex flex-col bg-background table-data-browser relative'>
      {/* 🔧 Loading 遮罩层 */}
      {currentTab?.isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <div className="text-sm text-muted-foreground">
              {data.length > 0 ? tBrowser('refreshingData') : tBrowser('loadingData')}
            </div>
          </div>
        </div>
      )}

      {/* 头部工具栏 */}
      <TableToolbar
        title={tableName}
        rowCount={data.length}
        loading={loading}
        showRefresh={true}
        onRefresh={loadData}
        afterRefreshContent={
          <>
            {/* 添加筛选按钮 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='outline' size='sm' className='h-8 px-2'>
                  <Filter className='w-3 h-3 mr-1' />
                  {tBrowser('addFilter')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='max-h-80 overflow-y-auto'>
                <div className='px-2 py-1.5 text-xs font-medium text-muted-foreground'>
                  {tBrowser('selectColumnToFilter')}
                </div>
                {columns
                  .filter(col => col !== '#' && !filters.some(f => f.column === col))
                  .map(column => (
                    <DropdownMenuItem
                      key={column}
                      onClick={() => addFilter(column)}
                    >
                      {column}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* 应用筛选按钮 - 只在有筛选条件时显示 */}
            {filters.length > 0 && (
              <Button
                variant='outline'
                size='sm'
                onClick={() => applyFilters()}
                className='h-8 px-2'
              >
                {tBrowser('apply')}
              </Button>
            )}
          </>
        }
        showCopy={true}
        selectedCopyFormat={copyFormat}
        onCopyFormatChange={setCopyFormat}
        onQuickExportCSV={quickExportCSV}
        onAdvancedExport={() => setShowExportDialog(true)}
        showColumnSelector={true}
        selectedColumnsCount={selectedColumns.length}
        totalColumnsCount={columns.filter(col => col !== '#').length}
        columnSelectorContent={
          <div className='p-3'>
            <div className='flex items-center justify-between mb-3'>
              <span className='text-sm font-medium'>{t('column_display_settings')}</span>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleSelectAllColumns}
                className='h-7 px-2 text-xs'
              >
                {selectedColumns.length ===
                columns.filter(col => col !== '#').length
                  ? t('deselect_all')
                  : t('select_all')}
              </Button>
            </div>
            <div className='text-xs text-muted-foreground mb-3'>
              {t('drag_to_reorder')}
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={columnOrder.filter(col => col !== '#')}
                strategy={verticalListSortingStrategy}
              >
                <div className='space-y-1'>
                  {columnOrder
                    .filter(col => col !== '#')
                    .map(column => (
                      <SortableColumnItem
                        key={column}
                        column={column}
                        isSelected={selectedColumns.includes(column)}
                        onToggle={handleColumnToggle}
                        t={tBrowser}
                      />
                    ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        }
      >
        {/* 复制选中行按钮 */}
        {selectedRows.size > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='sm' className='h-8 px-2'>
                <Copy className='w-3 h-3 mr-1' />
                {tBrowser('copySelected', { count: selectedRows.size })}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={() => handleCopySelectedRows('text')}>
                <FileText className='w-4 h-4 mr-2' />
                {tBrowser('copyAsText')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCopySelectedRows('json')}>
                <Code className='w-4 h-4 mr-2' />
                {tBrowser('copyAsJSON')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCopySelectedRows('csv')}>
                <FileSpreadsheet className='w-4 h-4 mr-2' />
                {tBrowser('copyAsCSV')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableToolbar>

      {/* 过滤栏 */}
      {filters.length > 0 && (
        <Card className='flex-shrink-0 border-0 border-b rounded-none bg-background shadow-none'>
          <CardContent className='pt-3 pb-3'>
            <div className='flex flex-wrap gap-2 items-center'>
              {filters.map((filter, index) => (
                <FilterEditor
                  key={index}
                  filter={filter}
                  onUpdate={updatedFilter =>
                    updateFilter(index, updatedFilter)
                  }
                  onRemove={() => removeFilter(index)}
                  onApply={applyFilters}
                  availableOperators={getAvailableOperators(filter.dataType)}
                  t={tBrowser}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 数据表格 - 使用统一的UnifiedDataTable组件 */}
      <div className='flex-1 min-h-0'>
        <GlideDataTable
          data={sortedData}
          columns={columnOrder
            .filter(col => col !== '#' && selectedColumns.includes(col))
            .map(col => {
              // 对于IoTDB，保持Time列的大写形式以匹配数据键名
              const columnKey = col === 'Time' ? 'Time' : col;

              return {
                key: columnKey,
                title: col,
                width: columnWidths[col] || 120,
                sortable: true,
                filterable: true,
                render:
                  col.toLowerCase() === 'time'
                    ? (value: any) => {
                        if (value) {
                          try {
                            let date: Date | null = null;

                            if (typeof value === 'number') {
                              // IoTDB: 数字时间戳（毫秒）
                              date = new Date(value);
                            } else if (typeof value === 'string') {
                              // InfluxDB: RFC3339/ISO 8601 字符串
                              // 先尝试直接解析字符串格式
                              date = new Date(value);

                              // 如果解析失败（Invalid Date），尝试作为数字字符串
                              if (isNaN(date.getTime())) {
                                const timestamp = parseInt(value);
                                if (!isNaN(timestamp)) {
                                  date = new Date(timestamp);
                                }
                              }
                            }

                            if (date && !isNaN(date.getTime())) {
                              return date.toLocaleString('zh-CN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false
                              });
                            }
                          } catch (e) {
                            logger.debug('时间格式化失败:', e);
                          }
                        }
                        return '-';
                      }
                    : undefined,
              };
            })}
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize,
            total: totalCount,
            showSizeChanger: true,
            pageSizeOptions: ['500', '1000', '2000', '5000', 'all'],
            serverSide: true, // 服务器端分页
          }}
          searchable={false} // 使用外部搜索
          filterable={true}
          sortable={true}
          exportable={false} // 使用外部导出
          columnManagement={true} // 启用内置列管理作为备用
          showToolbar={false} // 使用外部工具栏
          className='h-full'
          tableName={tableName}
          dataSourceType={dataSourceType}
          database={database}
          copyFormat={copyFormat}
          // 传递外部列管理状态
          selectedColumns={selectedColumns}
          columnOrder={columnOrder}
          onSort={sortConfig => {
            if (sortConfig && sortConfig.direction !== null) {
              setSortColumn(sortConfig.column);
              setSortDirection(sortConfig.direction);
            } else {
              setSortColumn('');
              setSortDirection(null);
            }
          }}
          onPageChange={(page, size) => {
            logger.debug('🔧 [TableDataBrowser] UnifiedDataTable分页回调:', {
              page,
              size,
              currentPage,
              pageSize,
              sizeChanged: size !== pageSize
            });

            if (size !== pageSize) {
              // 页面大小变化时，只调用handlePageSizeChange，它会自动重置到第1页
              handlePageSizeChange(size.toString());
            } else {
              // 只有页码变化时，才调用handlePageChange
              handlePageChange(page);
            }
          }}
          onRowSelect={selectedRowsSet => {
            setSelectedRows(selectedRowsSet);
          }}
          onColumnChange={(visibleColumns, newColumnOrder) => {
            logger.debug('🔧 [TableDataBrowser] GlideDataTable列变化回调:', {
              visibleColumns,
              newColumnOrder
            });
            setSelectedColumns(visibleColumns);
            setColumnOrder(newColumnOrder);
          }}
          enableColumnReorder={true}
          onLoadMore={loadMoreData}
          hasNextPage={(() => {
            const hasNext = pageSize === -1 && querySettings.enable_lazy_loading && data.length < totalCount;
            logger.debug('🔧 [TableDataBrowser] hasNextPage 计算:', {
              pageSize,
              enable_lazy_loading: querySettings.enable_lazy_loading,
              dataLength: data.length,
              totalCount,
              hasNext,
            });
            return hasNext;
          })()} // 只有在"全部"模式下、启用懒加载且还有更多数据时才启用懒加载
          isLoadingMore={isLoadingMore}
          totalCount={totalCount}
        />
      </div>

      {/* 导出选项对话框 */}
      <ExportOptionsDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={exportData}
        defaultTableName={tableName}
        rowCount={data.length}
        columnCount={selectedColumns.length}
      />

      {/* 右键菜单 */}
      {contextMenu.visible && (
        <div
          className='fixed bg-background border border-border rounded-md shadow-lg z-50 py-1 min-w-[160px]'
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className='px-3 py-2 text-xs text-muted-foreground border-b'>
            {t('selected_rows_count', { count: contextMenu.selectedRows.length })}
          </div>
          <button
            className='w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2'
            onClick={() => {
              contextMenu.selectedRows.forEach(index =>
                handleCopyRow(index, 'text')
              );
              hideContextMenu();
            }}
          >
            <FileText className='w-4 h-4' />
            {tBrowser('copyAsText')}
          </button>
          <button
            className='w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2'
            onClick={() => {
              contextMenu.selectedRows.forEach(index =>
                handleCopyRow(index, 'json')
              );
              hideContextMenu();
            }}
          >
            <Code className='w-4 h-4' />
            {tBrowser('copyAsJSON')}
          </button>
          <button
            className='w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2'
            onClick={() => {
              contextMenu.selectedRows.forEach(index =>
                handleCopyRow(index, 'csv')
              );
              hideContextMenu();
            }}
          >
            <FileSpreadsheet className='w-4 h-4' />
            {tBrowser('copyAsCSV')}
          </button>
          <div className='border-t my-1'></div>
          <button
            className='w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2'
            onClick={() => {
              handleSelectAll();
              hideContextMenu();
            }}
          >
            <CheckSquare className='w-4 h-4' />
            {t('select_all')}
          </button>
          <button
            className='w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2'
            onClick={() => {
              setSelectedRows(new Set());
              hideContextMenu();
            }}
          >
            <Square className='w-4 h-4' />
            {t('clear_selection')}
          </button>
        </div>
      )}
    </div>
  );
};

export default TableDataBrowser;
