import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
  startTransition,
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
import {
  UnifiedDataTable,
} from '@/components/ui/UnifiedDataTable';
import { TableToolbar } from '@/components/ui/TableToolbar';
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
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { useConnectionStore } from '@/store/connection';

import { exportWithNativeDialog } from '@/utils/nativeExport';
import type { QueryResult } from '@/types';

// 可拖拽的列项组件
interface SortableColumnItemProps {
  column: string;
  isSelected: boolean;
  onToggle: (column: string) => void;
}

const SortableColumnItem: React.FC<SortableColumnItemProps> = memo(
  ({ column, isSelected, onToggle }) => {
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
            title={column === '#' ? '序号' : column}
          >
            {column === '#' ? '序号' : column}
          </span>
          {column === 'time' && (
            <Badge variant='secondary' className='text-xs ml-2 flex-shrink-0'>
              时间
            </Badge>
          )}
          {column === '#' && (
            <Badge variant='outline' className='text-xs ml-2 flex-shrink-0'>
              必选
            </Badge>
          )}
        </div>
        <div
          {...attributes}
          {...listeners}
          className='text-xs text-muted-foreground ml-2 cursor-move p-1 flex-shrink-0'
          title='拖拽排序'
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
}

const FilterEditor: React.FC<FilterEditorProps> = ({
  filter,
  onUpdate,
  onRemove,
  onApply,
  availableOperators,
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
                placeholder='最小值'
                value={filter.value}
                onChange={e => handleValueChange(e.target.value)}
                className='w-16 h-7 text-xs'
              />
              <span className='text-xs text-muted-foreground'>-</span>
              <Input
                type='number'
                placeholder='最大值'
                value={filter.value2 || ''}
                onChange={e => handleValue2Change(e.target.value)}
                className='w-16 h-7 text-xs'
              />
            </div>
          );
        }
        return (
          <Input
            type='number'
            placeholder='数值'
            value={filter.value}
            onChange={e => handleValueChange(e.target.value)}
            className='w-20 h-7 text-xs'
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
                placeholder='开始时间'
                showTime
                size='small'
                className='w-32'
              />
              <span className='text-xs text-muted-foreground'>-</span>
              <DatePicker
                value={filter.value2 ? new Date(filter.value2) : undefined}
                onChange={date =>
                  handleValue2Change(date ? date.toISOString() : '')
                }
                placeholder='结束时间'
                showTime
                size='small'
                className='w-32'
              />
            </div>
          );
        }
        return (
          <DatePicker
            value={filter.value ? new Date(filter.value) : undefined}
            onChange={date => handleValueChange(date ? date.toISOString() : '')}
            placeholder='选择时间'
            showTime
            size='small'
            className='w-32'
          />
        );

      default:
        return (
          <Input
            placeholder='输入值'
            value={filter.value}
            onChange={e => handleValueChange(e.target.value)}
            className='w-24 h-7 text-xs'
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
    <div className='flex items-center gap-2 p-2 border rounded-md bg-background'>
      <Badge variant='outline' className='text-xs px-2 py-1 flex-shrink-0'>
        {filter.column}
      </Badge>

      <Select value={filter.operator} onValueChange={handleOperatorChange}>
        <SelectTrigger className='w-20 h-7 text-xs'>
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

      <div onKeyPress={handleKeyPress}>{renderValueInput()}</div>

      <Button
        variant='outline'
        size='sm'
        onClick={onApply}
        className='h-7 px-2 text-xs flex-shrink-0'
        title='应用过滤器'
      >
        应用
      </Button>

      <Button
        variant='ghost'
        size='sm'
        onClick={onRemove}
        className='h-6 w-6 p-0 text-muted-foreground hover:text-destructive flex-shrink-0'
        title='删除过滤器'
      >
        ×
      </Button>
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
    console.error('复制失败:', error);
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
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchText, setSearchText] = useState<string>('');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [fullFieldPaths, setFullFieldPaths] = useState<string[]>([]);
  const [connectionConfig, setConnectionConfig] = useState<any>(null);

  // 获取连接配置
  const { connections } = useConnectionStore();
  const currentConnection = connections.find(conn => conn.id === connectionId);

  // 行选择状态
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1);

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
            { value: 'equals', label: '等于' },
            { value: 'not_equals', label: '不等于' },
            { value: 'contains', label: '包含' },
            { value: 'not_contains', label: '不包含' },
            { value: 'starts_with', label: '开始于' },
            { value: 'ends_with', label: '结束于' },
          ];
        case 'number':
          return [
            { value: 'equals', label: '等于' },
            { value: 'not_equals', label: '不等于' },
            { value: 'gt', label: '大于' },
            { value: 'gte', label: '大于等于' },
            { value: 'lt', label: '小于' },
            { value: 'lte', label: '小于等于' },
            { value: 'between', label: '介于' },
          ];
        case 'time':
          return [
            { value: 'time_range', label: '时间范围' },
            { value: 'equals', label: '等于' },
            { value: 'gt', label: '晚于' },
            { value: 'lt', label: '早于' },
          ];
        default:
          return [
            { value: 'equals', label: '等于' },
            { value: 'not_equals', label: '不等于' },
          ];
      }
    },
    []
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
  const generateQuery = useCallback(() => {
    // 智能检测数据库类型并生成正确的SQL
    const isIoTDB = tableName.startsWith('root.');
    const tableRef = isIoTDB ? tableName : `"${tableName}"`;

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

    // 过滤条件
    filters.forEach(filter => {
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
          if (filter.value && filter.value2) {
            whereConditions.push(
              `"${filter.column}" >= '${filter.value}' AND "${filter.column}" <= '${filter.value2}'`
            );
          }
          break;
      }
    });

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // 添加排序 - InfluxDB只支持按时间排序
    if (sortColumn === 'time') {
      query += ` ORDER BY time ${sortDirection.toUpperCase()}`;
    } else {
      // 对于非时间列，使用默认时间排序，客户端排序将在数据加载后处理
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
    const isIoTDB = currentConnection?.dbType === 'iotdb' ||
                    currentConnection?.detectedType === 'iotdb' ||
                    tableName.startsWith('root.'); // 后备判断

    const tableRef = isIoTDB ? tableName : `"${tableName}"`;

    let query: string;

    if (isIoTDB) {
      // 对于IoTDB，使用SELECT *查询但需要特殊处理返回的数据
      console.log('🔧 [IoTDB] 使用SELECT *查询，连接类型:', currentConnection?.dbType, '检测类型:', currentConnection?.detectedType);
      console.log('🔧 [IoTDB] 字段路径:', fullFieldPaths);

      query = `SELECT *
               FROM ${tableRef}`;
    } else {
      // 对于InfluxDB，根据字段信息构建查询
      const fieldColumns = columns.filter(col => col !== '#' && col !== 'time');
      if (fieldColumns.length > 0) {
        // 使用明确的字段名
        const fieldList = fieldColumns.map(field => `"${field}"`).join(', ');
        console.log('🔧 [InfluxDB] 使用字段明确查询，连接类型:', currentConnection?.dbType);
        query = `SELECT time, ${fieldList}
                 FROM ${tableRef}`;
      } else {
        // 如果没有字段信息，使用SELECT *
        console.log('🔧 [InfluxDB] 使用SELECT *查询，连接类型:', currentConnection?.dbType);
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
      if (sortColumn === 'time') {
        query += ` ORDER BY time ${sortDirection.toUpperCase()}`;
      } else {
        // 对于非时间列，使用默认时间排序，客户端排序将在数据加载后处理
        query += ` ORDER BY time DESC`;
      }
    }

    // 添加分页（如果不是"全部"选项）
    if (pageSize > 0) {
      const offset = (currentPage - 1) * pageSize;
      query += ` LIMIT ${pageSize} OFFSET ${offset}`;
      console.log('🔧 [TableDataBrowser] 添加分页参数:', {
        pageSize,
        currentPage,
        offset,
        limitClause: `LIMIT ${pageSize} OFFSET ${offset}`
      });
    } else {
      console.log('🔧 [TableDataBrowser] 显示全部数据，不添加分页参数');
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
    currentConnection?.dbType,
    currentConnection?.detectedType,
    fullFieldPaths,
  ]);

  // 生成带指定分页参数的基础查询
  const generateBaseQueryWithPagination = useCallback((targetPage: number, targetPageSize: number) => {
    // 从连接配置中获取数据库类型，而不是仅仅依赖表名判断
    const isIoTDB = currentConnection?.dbType === 'iotdb' ||
                    currentConnection?.detectedType === 'iotdb' ||
                    tableName.startsWith('root.'); // 后备判断

    let query: string;

    if (isIoTDB) {
      // IoTDB查询
      console.log('🔧 [InfluxDB] 使用IoTDB查询语法，连接类型:', currentConnection?.dbType);

      // 构建字段列表
      const fieldList = fullFieldPaths.length > 0 ? fullFieldPaths.join(', ') : '*';

      query = `SELECT ${fieldList} FROM ${tableName}`;

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
      console.log('🔧 [InfluxDB] 使用字段明确查询，连接类型:', currentConnection?.dbType);

      // 构建字段列表，确保包含time字段
      const fieldList = ['time', ...columns.filter(col => col !== 'time' && col !== '#')];
      const quotedFields = fieldList.map(field => field === 'time' ? 'time' : `"${field}"`);

      query = `SELECT ${quotedFields.join(', ')}
                 FROM "${tableName}"`;

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
      if (sortColumn === 'time') {
        query += ` ORDER BY time ${sortDirection.toUpperCase()}`;
      } else {
        // 对于非时间列，使用默认时间排序，客户端排序将在数据加载后处理
        query += ` ORDER BY time DESC`;
      }
    }

    // 添加分页（如果不是"全部"选项）
    if (targetPageSize > 0) {
      const offset = (targetPage - 1) * targetPageSize;
      query += ` LIMIT ${targetPageSize} OFFSET ${offset}`;
      console.log('🔧 [TableDataBrowser] 添加分页参数:', {
        pageSize: targetPageSize,
        currentPage: targetPage,
        offset,
        limitClause: `LIMIT ${targetPageSize} OFFSET ${offset}`
      });
    } else {
      console.log('🔧 [TableDataBrowser] 显示全部数据，不添加分页参数');
    }

    return query;
  }, [
    tableName,
    columns,
    searchText,
    filters,
    sortColumn,
    sortDirection,
    currentConnection?.dbType,
    currentConnection?.detectedType,
    fullFieldPaths,
  ]);

  // 获取表结构信息
  const fetchTableSchema = useCallback(async () => {
    try {
      // 从连接配置中获取数据库类型，而不是仅仅依赖表名判断
      const isIoTDB = currentConnection?.dbType === 'iotdb' ||
                      currentConnection?.detectedType === 'iotdb' ||
                      tableName.startsWith('root.') || database.startsWith('root.'); // 后备判断

      // 获取字段键
      const fieldKeysQuery = isIoTDB
        ? `SHOW TIMESERIES ${tableName}.**`
        : `SHOW FIELD KEYS FROM "${tableName}"`;

      console.log(`🔧 [${isIoTDB ? 'IoTDB' : 'InfluxDB'}] 执行字段查询:`, fieldKeysQuery);
      console.log(`🔧 连接信息:`, {
        connectionId,
        dbType: currentConnection?.dbType,
        detectedType: currentConnection?.detectedType,
        tableName,
        database
      });

      const fieldResult = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connection_id: connectionId,
          database,
          query: fieldKeysQuery,
        },
      });

      console.log(`🔧 [${isIoTDB ? 'IoTDB' : 'InfluxDB'}] 字段查询结果:`, fieldResult);

      // 获取标签键
      const tagKeysQuery = isIoTDB
        ? `SHOW DEVICES ${tableName}`
        : `SHOW TAG KEYS FROM "${tableName}"`;
      const tagResult = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connection_id: connectionId,
          database,
          query: tagKeysQuery,
        },
      });

      const fieldKeys: string[] = [];
      const tagKeys: string[] = [];

      // 处理字段键结果
      if (fieldResult.results?.[0]?.series?.[0]?.values) {
        const timeseriesPaths = fieldResult.results[0].series[0].values
          .map((row: any[]) => row[0])
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
            .filter(path => path.startsWith(tableName + '.'));

          console.log(`🔧 [${isIoTDB ? 'IoTDB' : 'InfluxDB'}] 字段路径提取:`, {
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

          console.log('🔧 [IoTDB] 字段映射关系:', Array.from(fieldMapping.entries()));
        } else {
          fieldKeys.push(...timeseriesPaths);
        }
      }

      // 处理标签键结果
      if (tagResult.results?.[0]?.series?.[0]?.values) {
        tagKeys.push(
          ...tagResult.results[0].series[0].values
            .map((row: any[]) => row[0])
            .filter((col: any) => col !== null && col !== undefined && col !== '')
            .map((col: any) => String(col))
        );
      }

      // 合并所有列：序号、时间、标签键、字段键
      const allColumns = ['#', 'time', ...tagKeys, ...fieldKeys];

      console.log('🔧 [TableDataBrowser] 设置列状态:', {
        设置前columns长度: columns.length,
        设置后columns长度: allColumns.length,
        新列: allColumns,
        tableName
      });

      setColumns(allColumns);

      console.log('📊 获取表结构完成:', {
        tableName,
        fieldKeys: fieldKeys.length,
        tagKeys: tagKeys.length,
        totalColumns: allColumns.length,
        columns: allColumns,
        isInitializedRef当前值: isInitializedRef.current
      });
    } catch (error) {
      console.error('获取表结构失败:', error);
      showMessage.error('获取表结构失败');
    }
  }, [connectionId, database, tableName, currentConnection?.dbType, currentConnection?.detectedType]);

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
      console.error('获取总数失败:', error);
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
    console.log('🔧 [TableDataBrowser] loadDataWithPagination被调用:', {
      columns长度: columns.length,
      tableName,
      targetPage,
      targetPageSize,
      是否会执行: columns.length > 0
    });

    if (columns.length === 0) {
      console.log('🔧 [TableDataBrowser] loadDataWithPagination跳过：columns长度为0');
      return;
    }

    setLoading(true);
    try {
      const query = generateBaseQueryWithPagination(targetPage, targetPageSize);
      console.log('🔧 [TableDataBrowser] 执行数据查询:', query);

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
          const isIoTDB = currentConnection?.dbType === 'iotdb' ||
                          currentConnection?.detectedType === 'iotdb' ||
                          tableName.startsWith('root.');

          // 过滤掉null、undefined或空字符串的列名
          let validColumns = resultColumns.filter(col =>
            col !== null && col !== undefined && col !== '' && typeof col === 'string'
          );

          // 对于IoTDB，需要特殊处理列名
          if (isIoTDB) {
            console.log('🔧 [IoTDB] 原始查询返回的列名:', validColumns);
            console.log('🔧 [IoTDB] 字段路径:', fullFieldPaths);

            // IoTDB的SELECT *查询返回的列结构：
            // 第1列：表名（需要过滤掉）
            // 第2-N列：字段数据

            // 从完整路径中提取字段名作为显示列名
            const iotdbColumns: string[] = [];
            fullFieldPaths.forEach(path => {
              const fieldName = path.split('.').pop(); // 获取最后一部分作为字段名
              if (fieldName) {
                iotdbColumns.push(fieldName);
              }
            });

            console.log('🔧 [IoTDB] 构建的显示列名:', iotdbColumns);
            console.log('🔧 [IoTDB] 后端返回的列名:', validColumns);
            console.log('🔧 [IoTDB] 列数分析:', {
              后端返回列数: validColumns.length,
              字段路径数量: fullFieldPaths.length,
              构建的显示列数: iotdbColumns.length,
              预期结构: '表名列 + 字段列'
            });

            // 使用构建的显示列名（不包含表名列）
            validColumns = iotdbColumns;
          }

          console.log('🔧 [TableDataBrowser] 列名过滤:', {
            数据库类型: isIoTDB ? 'IoTDB' : 'InfluxDB',
            原始列数: resultColumns.length,
            有效列数: validColumns.length,
            原始列名: resultColumns,
            有效列名: validColumns
          });

          const formattedData: DataRow[] = values.map(
            (row: any[], index: number) => {
              const record: DataRow = { _id: index };

              // 添加序号列
              const offset = pageSize > 0 ? (currentPage - 1) * pageSize : 0;
              record['#'] = offset + index + 1;

              // 添加其他列数据，只处理有效列
              if (Array.isArray(row) && validColumns.length > 0) {
                if (isIoTDB) {
                  // IoTDB特殊处理：SELECT *查询返回的数据结构
                  // 第0列：表名（跳过）
                  // 第1-N列：字段数据
                  validColumns.forEach((col: string, colIdx: number) => {
                    // 跳过第0列（表名），从第1列开始映射字段数据
                    const dataIndex = colIdx + 1;
                    if (dataIndex < row.length) {
                      record[col] = row[dataIndex];
                    } else {
                      record[col] = null;
                    }
                  });

                  console.log('🔧 [IoTDB] 数据映射:', {
                    行索引: index,
                    原始数据: row,
                    原始数据长度: row.length,
                    映射后数据: record,
                    列名: validColumns,
                    映射说明: '跳过第0列(表名)，从第1列开始映射字段数据'
                  });
                } else {
                  // 非IoTDB的正常处理
                  validColumns.forEach((col: string) => {
                    // 找到该列在原始列数组中的索引
                    const colIndex = resultColumns.indexOf(col);
                    if (colIndex !== -1 && colIndex < row.length) {
                      record[col] = row[colIndex];
                    }
                  });
                }
              }
              return record;
            }
          );

          // 存储原始数据
          setRawData(formattedData);
          // 直接设置数据，排序将通过 useMemo 处理
          setData(formattedData);
        }
      } else {
        setRawData([]);
        setData([]);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      showMessage.error('加载数据失败');
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
    currentConnection?.dbType,
    currentConnection?.detectedType,
  ]);

  // 兼容的 loadData 函数，使用当前状态
  const loadData = useCallback(async () => {
    return loadDataWithPagination(currentPage, pageSize);
  }, [loadDataWithPagination, currentPage, pageSize]);

  // 应用过滤器（延迟执行，避免添加过滤器时立即重新加载）
  const applyFilters = useCallback(async () => {
    if (columns.length === 0) return;

    setCurrentPage(1);
    setLoading(true);
    try {
      const query = generateQuery(); // 使用包含过滤器的查询
      console.log('应用过滤器查询:', query);

      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        connectionId,
        database,
        query,
      });

      if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
        setRawData(result.data);

        // 添加序号列 - 直接修改原数组避免创建新引用
        const offset = pageSize > 0 ? (currentPage - 1) * pageSize : 0;
        result.data.forEach((record, index) => {
          if (record && typeof record === 'object') {
            (record as DataRow)['#'] = offset + index + 1;
            (record as DataRow)._id = (record as DataRow)._id || `row_${index}`;
          }
        });

        setData(result.data);
      } else {
        setData([]);
        setRawData([]);
      }
    } catch (error) {
      console.error('应用过滤器失败:', error);
      showMessage.error('应用过滤器失败');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [connectionId, database, generateQuery, columns, pageSize, currentPage]);

  // 初始化 - 使用ref避免重复加载
  const isInitializedRef = useRef(false);

  useEffect(() => {
    console.log('🔄 [TableDataBrowser] fetchTableSchema useEffect触发:', {
      isInitialized: isInitializedRef.current,
      connectionId,
      database,
      tableName
    });

    // 每次表名变化时都重新获取表结构
    isInitializedRef.current = true;

    console.log('🔄 [TableDataBrowser] 开始获取表结构:', {
      connectionId,
      database,
      tableName
    });

    fetchTableSchema();
  }, [fetchTableSchema]);

  // 监听表名变化，清理状态但不重置初始化标志
  useEffect(() => {
    console.log('🔄 [TableDataBrowser] 表名变化，清理状态:', {
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
    setTotalCount(0);
  }, [connectionId, database, tableName]);

  useEffect(() => {
    console.log('🔧 [TableDataBrowser] columns变化useEffect触发:', {
      columns长度: columns.length,
      是否初始化: isInitializedRef.current,
      会执行数据加载: columns.length > 0 && isInitializedRef.current,
      tableName
    });

    if (columns.length > 0 && isInitializedRef.current) {
      console.log('🔧 [TableDataBrowser] 开始并行执行数据加载:', {
        columns: columns,
        tableName
      });

      // 避免重复调用，使用Promise.all并行执行
      Promise.all([
        fetchTotalCount(),
        loadData()
      ]).catch(error => {
        console.error('初始化数据加载失败:', error);
      });
    }
  }, [columns.length]); // 只依赖columns.length，避免函数引用变化导致的重复调用

  // 统一的列宽度计算函数 - 优化字段名显示
  const calculateColumnWidth = useCallback((column: string): number => {
    // 安全检查：确保column不为null或undefined
    if (!column || typeof column !== 'string') {
      return 150; // 默认宽度
    }

    if (column === '_actions') return 48;
    if (column === '_select') return 48;
    if (column === '#') return 80;
    if (column === 'time') return 200;

    // 更精确的列宽度计算，确保字段名完整显示
    // 使用更大的字符宽度系数，并增加padding空间
    const charWidth = 12; // 增加字符宽度
    const padding = 40; // 增加padding空间（包括排序图标等）
    const baseWidth = Math.max(150, column.length * charWidth + padding);
    return Math.min(baseWidth, 400); // 增加最大宽度到400px
  }, []);

  // 初始化列宽度
  const initializeColumnWidths = useCallback(
    (cols: string[]) => {
      const widths: Record<string, number> = {};
      // 安全检查：确保cols是数组且每个元素都是有效的字符串
      if (Array.isArray(cols)) {
        cols.forEach(col => {
          if (col && typeof col === 'string') {
            widths[col] = calculateColumnWidth(col);
          }
        });
      }
      setColumnWidths(widths);
    },
    [calculateColumnWidth]
  );

  // 使用 useMemo 处理排序后的数据，避免不必要的重新计算
  const sortedData = useMemo(() => {
    if (!sortColumn || sortColumn === 'time' || sortColumn === '#') {
      return data;
    }
    return sortDataClientSide(data, sortColumn, sortDirection);
  }, [data, sortColumn, sortDirection, sortDataClientSide]);

  // 处理时间列排序变化 - 添加防抖避免频繁查询
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (sortColumn === 'time' && columns.length > 0 && isInitializedRef.current) {
      // 清除之前的定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 延迟执行，避免快速切换时的重复查询
      timeoutRef.current = setTimeout(() => {
        loadData();
      }, 100);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [sortColumn, sortDirection, columns.length]); // 移除loadData依赖，避免函数引用变化

  // 初始化选中的列（默认全选，但排除序号列）
  useEffect(() => {
    if (columns.length > 0) {
      const dataColumns = columns.filter(col => col !== '#');
      setSelectedColumns(dataColumns);
      setColumnOrder(dataColumns); // 同时初始化列顺序
      initializeColumnWidths(columns); // 初始化列宽度（包含序号列用于宽度计算）
    }
  }, [columns, initializeColumnWidths]);

  // 处理页面变化 - 直接传递新页码参数
  const handlePageChange = useCallback((page: number) => {
    console.log('🔧 [TableDataBrowser] 分页变化:', {
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

  // 处理页面大小变化 - 直接传递新参数
  const handlePageSizeChange = useCallback((size: string) => {
    console.log('🔧 [TableDataBrowser] 页面大小变化:', {
      oldSize: pageSize,
      newSize: size,
      currentPage,
      willReloadData: true
    });

    // 立即更新状态
    const newSize = size === 'all' ? -1 : parseInt(size);
    setPageSize(newSize);
    setCurrentPage(1);

    // 直接使用新的分页参数执行数据加载，避免状态更新延迟
    loadDataWithPagination(1, newSize);
  }, [pageSize, currentPage, loadDataWithPagination]);

  // 处理搜索
  const handleSearch = useCallback(() => {
    setCurrentPage(1);
    loadData();
  }, [loadData]);

  // 行点击处理函数
  const handleRowClick = useCallback(
    (index: number, event: React.MouseEvent) => {
      console.log('handleRowClick called with index:', index, 'event:', event);

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
      console.log('handleRowMouseDown called with index:', index);

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
      console.log('handleRowMouseUp called with index:', index);
      setIsDragging(false);
      setDragStartIndex(-1);
    },
    []
  );

  // 右键菜单处理函数
  const handleRowContextMenu = useCallback(
    (index: number, event: React.MouseEvent) => {
      console.log('handleRowContextMenu called with index:', index);

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
    console.log(
      'handleSelectAll called, current selected:',
      selectedRows.size,
      'total:',
      data.length
    );
    if (selectedRows.size === data.length) {
      console.log('Deselecting all rows');
      setSelectedRows(new Set());
    } else {
      console.log('Selecting all rows');
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
        showMessage.success(`已复制行数据 (${format.toUpperCase()} 格式)`);
      } else {
        showMessage.error('复制失败');
      }
    },
    [data, columnOrder, selectedColumns]
  );

  const handleCopySelectedRows = useCallback(
    async (format: 'text' | 'json' | 'csv' = 'text') => {
      if (selectedRows.size === 0) {
        showMessage.warning('请先选择要复制的行');
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
          `已复制 ${selectedRows.size} 行数据 (${format.toUpperCase()} 格式)`
        );
      } else {
        showMessage.error('复制失败');
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
        showMessage.success('已复制单元格内容');
      } else {
        showMessage.error('复制失败');
      }
    },
    [data]
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

    // 如果是时间列，重新查询数据（服务器端排序）
    if (column === 'time') {
      // 时间列排序会触发 loadData 通过 useEffect
      return;
    }

    // 非时间列使用客户端排序
    if (rawData.length > 0) {
      const sortedData = sortDataClientSide(rawData, column, newDirection);
      setData(sortedData);
    }
  };

  // 添加过滤器
  const addFilter = (column: string) => {
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
    setFilters(filters.filter((_, i) => i !== index));
  };

  // 处理列选择
  const handleColumnToggle = (column: string) => {
    console.log('🔧 [TableDataBrowser] 列切换:', {
      column,
      currentSelected: selectedColumns,
    });
    setSelectedColumns(prev => {
      if (prev.includes(column)) {
        // 如果已选中，则取消选中（但至少保留一列）
        if (prev.length > 1) {
          const newSelected = prev.filter(col => col !== column);
          console.log('🔧 [TableDataBrowser] 取消选中列:', {
            column,
            before: prev,
            after: newSelected,
          });
          return newSelected;
        }
        console.log('🔧 [TableDataBrowser] 保留最后一列:', { column });
        return prev; // 至少保留一列
      } else {
        // 如果未选中，则添加到选中列表
        const newSelected = [...prev, column];
        console.log('🔧 [TableDataBrowser] 选中列:', {
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
      showMessage.warning('没有可导出的数据');
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
          `数据已导出为 ${options.format.toUpperCase()} 格式`
        );
        setShowExportDialog(false);
      }
    } catch (error) {
      console.error('导出数据失败:', error);
      showMessage.error('导出数据失败');
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
    <div className='h-full flex flex-col bg-background table-data-browser'>
      {/* 头部工具栏 */}
      <TableToolbar
        title={tableName}
        rowCount={data.length}
        loading={loading}
        showRefresh={true}
        onRefresh={loadData}
        onQuickExportCSV={quickExportCSV}
        onAdvancedExport={() => setShowExportDialog(true)}
        showColumnSelector={true}
        selectedColumnsCount={selectedColumns.length}
        totalColumnsCount={columns.filter(col => col !== '#').length}
        columnSelectorContent={
          <div className='p-3'>
            <div className='flex items-center justify-between mb-3'>
              <span className='text-sm font-medium'>列显示设置</span>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleSelectAllColumns}
                className='h-7 px-2 text-xs'
              >
                {selectedColumns.length ===
                columns.filter(col => col !== '#').length
                  ? '取消全选'
                  : '全选'}
              </Button>
            </div>
            <div className='text-xs text-muted-foreground mb-3'>
              拖拽调整顺序，勾选显示列
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
                复制 ({selectedRows.size})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={() => handleCopySelectedRows('text')}>
                <FileText className='w-4 h-4 mr-2' />
                复制为文本
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCopySelectedRows('json')}>
                <Code className='w-4 h-4 mr-2' />
                复制为JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCopySelectedRows('csv')}>
                <FileSpreadsheet className='w-4 h-4 mr-2' />
                复制为CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableToolbar>

      {/* 过滤栏 */}
      {filters.length > 0 && (
        <Card className='flex-shrink-0 border-0 border-b rounded-none bg-background'>
          <CardContent className='pt-0 pb-3'>
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <div className='text-sm font-medium text-muted-foreground'>
                  筛选条件 ({filters.length})
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={applyFilters}
                  className='h-7 px-3 text-xs'
                >
                  应用所有过滤器
                </Button>
              </div>
              <div className='flex flex-wrap gap-2'>
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
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 数据表格 - 使用统一的UnifiedDataTable组件 */}
      <div className='flex-1 min-h-0'>
        <UnifiedDataTable
          data={sortedData}
          columns={columnOrder
            .filter(col => col !== '#')
            .map(col => ({
              key: col,
              title: col,
              width: columnWidths[col] || 120,
              sortable: true,
              filterable: true,
              render:
                col === 'time'
                  ? (value: any) =>
                      value ? new Date(value).toLocaleString() : '-'
                  : undefined,
            }))}
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize,
            total: totalCount,
            showSizeChanger: true,
            pageSizeOptions: ['500', '1000', '2000', '5000', 'all'],
          }}
          searchable={false} // 使用外部搜索
          filterable={true}
          sortable={true}
          exportable={false} // 使用外部导出
          columnManagement={true} // 启用内置列管理作为备用
          showToolbar={false} // 使用外部工具栏
          showRowNumbers={true}
          className='h-full'
          // 传递外部列管理状态
          selectedColumns={selectedColumns}
          columnOrder={columnOrder}
          onSort={sortConfig => {
            if (sortConfig) {
              setSortColumn(sortConfig.column);
              setSortDirection(sortConfig.direction);
            } else {
              setSortColumn('');
              setSortDirection('desc');
            }
          }}
          onPageChange={(page, size) => {
            console.log('🔧 [TableDataBrowser] UnifiedDataTable分页回调:', {
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
            已选择 {contextMenu.selectedRows.length} 行
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
            复制为文本
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
            复制为JSON
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
            复制为CSV
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
            全选
          </button>
          <button
            className='w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2'
            onClick={() => {
              setSelectedRows(new Set());
              hideContextMenu();
            }}
          >
            <Square className='w-4 h-4' />
            取消选择
          </button>
        </div>
      )}
    </div>
  );
};

export default TableDataBrowser;
