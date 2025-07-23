import React, {useState, useEffect, useCallback, useMemo, memo, startTransition} from 'react';
import { Virtuoso } from 'react-virtuoso';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Button,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Badge,
    Tooltip,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    Checkbox,
    Input,
    DatePicker,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    Spin,
    TooltipTrigger,
    TooltipContent,
} from '@/components/ui';
import {ScrollArea, ScrollBar} from '@/components/ui/scroll-area';
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
import {
    useSortable,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';

// 可拖拽的列项组件
interface SortableColumnItemProps {
    column: string;
    isSelected: boolean;
    onToggle: (column: string) => void;
}

const SortableColumnItem: React.FC<SortableColumnItemProps> = memo(({ column, isSelected, onToggle }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: column });

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
            className="flex items-center px-2 py-1.5 hover:bg-accent rounded text-sm"
        >
            <div className="flex items-center flex-1 min-w-0">
                <Checkbox
                    checked={isSelected}
                    onChange={handleToggle}
                    onClick={handleToggle}
                    disabled={column === '#'}
                    className="mr-2 h-4 w-4 flex-shrink-0"
                />
                <span
                    className={`flex-1 text-sm truncate ${column === '#' ? 'cursor-default' : 'cursor-pointer'}`}
                    onClick={handleToggle}
                    title={column === '#' ? '序号' : column}
                >
                    {column === '#' ? '序号' : column}
                </span>
                {column === 'time' && (
                    <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
                        时间
                    </Badge>
                )}
                {column === '#' && (
                    <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                        必选
                    </Badge>
                )}
            </div>
            <div
                {...attributes}
                {...listeners}
                className="text-xs text-muted-foreground ml-2 cursor-move p-1 flex-shrink-0"
                title="拖拽排序"
            >
                ⋮⋮
            </div>
        </div>
    );
});

// 原有的 VirtualTableRow 组件已移动到 VirtualizedTableDataBrowser.tsx

// 优化的分页组件 - 独立渲染，避免受表格数据影响
interface PaginationControlsProps {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    loading: boolean;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: string) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = memo(({
    currentPage,
    pageSize,
    totalCount,
    loading,
    onPageChange,
    onPageSizeChange
}) => {
    // 使用 useMemo 缓存分页计算，避免每次渲染都重新计算
    const paginationInfo = useMemo(() => {
        const totalPages = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1;
        const startIndex = pageSize > 0 ? (currentPage - 1) * pageSize + 1 : 1;
        const endIndex = pageSize > 0 ? Math.min(currentPage * pageSize, totalCount) : totalCount;

        return { totalPages, startIndex, endIndex };
    }, [totalCount, pageSize, currentPage]);

    const { totalPages, startIndex, endIndex } = paginationInfo;

    // 使用 useCallback 稳定事件处理函数，并添加防抖优化
    const handlePrevPage = useCallback(() => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    }, [currentPage, onPageChange]);

    const handleNextPage = useCallback(() => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    }, [currentPage, totalPages, onPageChange]);

    // 优化的页面大小变化处理
    const handlePageSizeChangeInternal = useCallback((size: string) => {
        // 避免重复设置相同的值
        if (size !== pageSize.toString()) {
            onPageSizeChange(size);
        }
    }, [pageSize, onPageSizeChange]);

    return (
        <div className="flex-shrink-0 border-t bg-background px-4 py-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                        显示 {startIndex}-{endIndex} 条，共 {totalCount.toLocaleString()} 条
                    </span>
                    <span>
                        第 {currentPage} 页，共 {totalPages} 页
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">每页:</span>
                        <Select value={pageSize.toString()} onValueChange={handlePageSizeChangeInternal}>
                            <SelectTrigger className="w-20 h-8">
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="100">100</SelectItem>
                                <SelectItem value="500">500</SelectItem>
                                <SelectItem value="1000">1000</SelectItem>
                                <SelectItem value="2000">2000</SelectItem>
                                <SelectItem value="5000">5000</SelectItem>
                                <SelectItem value="-1">全部</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrevPage}
                            disabled={currentPage <= 1 || loading || pageSize <= 0}
                            className="h-8 px-3"
                        >
                            <ChevronLeft className="w-3 h-3"/>
                            上一页
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNextPage}
                            disabled={currentPage >= totalPages || loading || pageSize <= 0}
                            className="h-8 px-3"
                        >
                            下一页
                            <ChevronRight className="w-3 h-3"/>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
});

// 优化的表头组件
interface TableHeaderProps {
    columnOrder: string[];
    selectedColumns: string[];
    sortColumn: string;
    sortDirection: 'asc' | 'desc';
    selectedRowsCount: number;
    totalRowsCount: number;
    onSort: (column: string) => void;
    onAddFilter: (column: string) => void;
    onSelectAll: () => void;
    onCopySelectedRows: (format: 'text' | 'json' | 'csv') => void;
}

const TableHeader: React.FC<TableHeaderProps> = memo(({
    columnOrder,
    selectedColumns,
    sortColumn,
    sortDirection,
    selectedRowsCount,
    totalRowsCount,
    onSort,
    onAddFilter,
    onSelectAll,
    onCopySelectedRows
}) => {
    const visibleColumns = useMemo(() =>
        ['_actions', '_select', ...columnOrder.filter(column => selectedColumns.includes(column))],
        [columnOrder, selectedColumns]
    );

    const isAllSelected = selectedRowsCount > 0 && selectedRowsCount === totalRowsCount;
    const isIndeterminate = selectedRowsCount > 0 && selectedRowsCount < totalRowsCount;

    return (
        <thead className="sticky top-0 bg-background z-10 border-b">
            <tr className="border-b transition-colors hover:bg-muted/50">
                {visibleColumns.map((column) => {
                    if (column === '_actions') {
                        return (
                            <th key="_actions" className="h-12 px-2 text-left align-middle font-medium text-muted-foreground w-12">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            title="批量操作"
                                        >
                                            <MoreVertical className="w-3 h-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        {selectedRowsCount > 0 && (
                                            <>
                                                <DropdownMenuItem onClick={() => onCopySelectedRows('text')}>
                                                    <FileText className="w-4 h-4 mr-2" />
                                                    复制为文本 ({selectedRowsCount})
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onCopySelectedRows('json')}>
                                                    <Code className="w-4 h-4 mr-2" />
                                                    复制为JSON ({selectedRowsCount})
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onCopySelectedRows('csv')}>
                                                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                                                    复制为CSV ({selectedRowsCount})
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                            </>
                                        )}
                                        <DropdownMenuItem onClick={onSelectAll}>
                                            {selectedRowsCount === totalRowsCount ? (
                                                <>
                                                    <Square className="w-4 h-4 mr-2" />
                                                    取消全选
                                                </>
                                            ) : (
                                                <>
                                                    <CheckSquare className="w-4 h-4 mr-2" />
                                                    全选
                                                </>
                                            )}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </th>
                        );
                    }

                    if (column === '_select') {
                        return (
                            <th key="_select" className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-12">
                                <Checkbox
                                    checked={isAllSelected}
                                    onCheckedChange={onSelectAll}
                                    className="h-4 w-4"
                                    title={isAllSelected ? '取消全选' : '全选'}
                                />
                            </th>
                        );
                    }
                    // 计算列的最小宽度
                    const getColumnMinWidth = (col: string) => {
                        if (col === '#') return '60px';
                        if (col === 'time') return '180px';
                        const colLength = col.length;
                        return `${Math.max(120, colLength * 12)}px`;
                    };

                    const minWidth = getColumnMinWidth(column);

                    return (
                        <th
                            key={column}
                            className={cn(
                                'h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap',
                                column === '#' ? '' : 'cursor-pointer hover:bg-muted/50'
                            )}
                            style={{ minWidth }}
                            onClick={() => column !== '#' && onSort(column)}
                        >
                            <div className="flex items-center gap-1 whitespace-nowrap">
                                <span className="truncate" title={column === '#' ? '序号' : column}>
                                    {column === '#' ? '序号' : column}
                                </span>
                                {column === 'time' && (
                                    <Badge variant="secondary" className="text-xs">
                                        时间
                                    </Badge>
                                )}
                                {column === '#' && (
                                    <Badge variant="outline" className="text-xs">
                                        #
                                    </Badge>
                                )}
                                {column !== 'time' && column !== '#' && (
                                    <span className="text-xs text-muted-foreground/60" title="客户端排序">
                                        ⚡
                                    </span>
                                )}
                                {sortColumn === column && column !== '#' && (
                                    <span className="text-xs">
                                        {sortDirection === 'asc' ? '↑' : '↓'}
                                    </span>
                                )}
                                {column !== '#' && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-4 w-4 p-0 ml-1"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Filter className="w-3 h-3"/>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => onAddFilter(column)}>
                                                添加过滤器
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        </th>
                    );
                })}
            </tr>
        </thead>
    );
});

// 增强的筛选器组件
interface FilterEditorProps {
    filter: ColumnFilter;
    onUpdate: (filter: ColumnFilter) => void;
    onRemove: () => void;
    onApply: () => void;
    availableOperators: { value: FilterOperator; label: string }[];
}

const FilterEditor: React.FC<FilterEditorProps> = ({ filter, onUpdate, onRemove, onApply, availableOperators }) => {
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
                        <div className="flex items-center gap-1">
                            <Input
                                type="number"
                                placeholder="最小值"
                                value={filter.value}
                                onChange={(e) => handleValueChange(e.target.value)}
                                className="w-16 h-7 text-xs"
                            />
                            <span className="text-xs text-muted-foreground">-</span>
                            <Input
                                type="number"
                                placeholder="最大值"
                                value={filter.value2 || ''}
                                onChange={(e) => handleValue2Change(e.target.value)}
                                className="w-16 h-7 text-xs"
                            />
                        </div>
                    );
                }
                return (
                    <Input
                        type="number"
                        placeholder="数值"
                        value={filter.value}
                        onChange={(e) => handleValueChange(e.target.value)}
                        className="w-20 h-7 text-xs"
                    />
                );

            case 'time':
                if (filter.operator === 'time_range') {
                    return (
                        <div className="flex items-center gap-1">
                            <DatePicker
                                value={filter.value ? new Date(filter.value) : undefined}
                                onChange={(date) => handleValueChange(date ? date.toISOString() : '')}
                                placeholder="开始时间"
                                showTime
                                size="small"
                                className="w-32"
                            />
                            <span className="text-xs text-muted-foreground">-</span>
                            <DatePicker
                                value={filter.value2 ? new Date(filter.value2) : undefined}
                                onChange={(date) => handleValue2Change(date ? date.toISOString() : '')}
                                placeholder="结束时间"
                                showTime
                                size="small"
                                className="w-32"
                            />
                        </div>
                    );
                }
                return (
                    <DatePicker
                        value={filter.value ? new Date(filter.value) : undefined}
                        onChange={(date) => handleValueChange(date ? date.toISOString() : '')}
                        placeholder="选择时间"
                        showTime
                        size="small"
                        className="w-32"
                    />
                );

            default:
                return (
                    <Input
                        placeholder="输入值"
                        value={filter.value}
                        onChange={(e) => handleValueChange(e.target.value)}
                        className="w-24 h-7 text-xs"
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
        <div className="flex items-center gap-2 p-2 border rounded-md bg-background">
            <Badge variant="outline" className="text-xs px-2 py-1 flex-shrink-0">
                {filter.column}
            </Badge>

            <Select value={filter.operator} onValueChange={handleOperatorChange}>
                <SelectTrigger className="w-20 h-7 text-xs">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {availableOperators.map(op => (
                        <SelectItem key={op.value} value={op.value} className="text-xs">
                            {op.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <div onKeyPress={handleKeyPress}>
                {renderValueInput()}
            </div>

            <Button
                variant="outline"
                size="sm"
                onClick={onApply}
                className="h-7 px-2 text-xs flex-shrink-0"
                title="应用过滤器"
            >
                应用
            </Button>

            <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                title="删除过滤器"
            >
                ×
            </Button>
        </div>
    );
};
import {
    RefreshCw,
    Filter,
    Download,
    ChevronLeft,
    ChevronRight,
    Database,
    Table as TableIcon,
    FileText,
    FileSpreadsheet,
    Code,
    Hash,
    ChevronDown,
    Copy,
    Check,
    Square,
    CheckSquare,
    MoreVertical,
} from 'lucide-react';
import {cn} from '@/lib/utils';
import {safeTauriInvoke} from '@/utils/tauri';
import {showMessage} from '@/utils/message';
import { VirtualTableRow, VirtualTableHeader } from './VirtualizedTableDataBrowser';
import { exportWithNativeDialog } from '@/utils/nativeExport';
import type {QueryResult} from '@/types';

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
const formatRowData = (row: DataRow, columns: string[], format: 'text' | 'json' | 'csv' = 'text'): string => {
    switch (format) {
        case 'json':
            const jsonData: Record<string, any> = {};
            columns.forEach(col => {
                if (col !== '#') {
                    jsonData[col] = row[col];
                }
            });
            return JSON.stringify(jsonData, null, 2);

        case 'csv':
            return columns
                .filter(col => col !== '#')
                .map(col => {
                    const value = String(row[col] || '');
                    // CSV格式需要处理包含逗号、引号、换行的值
                    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
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
const formatMultipleRows = (rows: DataRow[], columns: string[], format: 'text' | 'json' | 'csv' = 'text'): string => {
    switch (format) {
        case 'json':
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

        case 'csv':
            const headers = columns.filter(col => col !== '#').join(',');
            const dataRows = rows.map(row => formatRowData(row, columns, 'csv'));
            return [headers, ...dataRows].join('\n');

        case 'text':
        default:
            return rows.map(row => formatRowData(row, columns, 'text')).join('\n');
    }
};
import ExportOptionsDialog, { type ExportOptions } from './ExportOptionsDialog';

// 生成带时间戳的文件名
const generateTimestampedFilename = (tableName: string, format: string): string => {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/:/g, '-')  // 替换冒号为连字符
    .replace(/\./g, '-') // 替换点为连字符
    .slice(0, 19);       // 只保留到秒，格式：2025-07-20T09-30-45

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
    | 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with'
    // 数字操作符
    | 'gt' | 'gte' | 'lt' | 'lte' | 'between'
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
    const [loading, setLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(500);
    const [filters, setFilters] = useState<ColumnFilter[]>([]);
    const [sortColumn, setSortColumn] = useState<string>('');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [searchText, setSearchText] = useState<string>('');
    const [showExportDialog, setShowExportDialog] = useState(false);

    // 行选择状态
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1);

    // 拖拽传感器
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // 检测列的数据类型
    const detectColumnDataType = useCallback((column: string, sampleData: DataRow[]): ColumnDataType => {
        if (column === 'time') return 'time';

        // 取样本数据进行类型检测
        const samples = sampleData.slice(0, 10).map(row => row[column]).filter(val => val != null && val !== '');
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
    }, []);

    // 根据数据类型获取可用的操作符
    const getAvailableOperators = useCallback((dataType: ColumnDataType): { value: FilterOperator; label: string }[] => {
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
    }, []);

    // 处理拖拽结束
    const handleDragEnd = useCallback((event: any) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setColumnOrder((items) => {
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
        let query = `SELECT *
                     FROM "${tableName}"`;

        // 添加 WHERE 条件
        const whereConditions: string[] = [];

        // 搜索条件
        if (searchText.trim()) {
            const searchConditions = columns.filter(col => col !== 'time' && col !== '#').map(col =>
                `"${col}" =~ /.*${searchText.trim()}.*/`
            );
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
                    whereConditions.push(`"${filter.column}" = ${formatValue(filter.value)}`);
                    break;
                case 'not_equals':
                    whereConditions.push(`"${filter.column}" != ${formatValue(filter.value)}`);
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
                    whereConditions.push(`"${filter.column}" > ${formatValue(filter.value)}`);
                    break;
                case 'gte':
                    whereConditions.push(`"${filter.column}" >= ${formatValue(filter.value)}`);
                    break;
                case 'lt':
                    whereConditions.push(`"${filter.column}" < ${formatValue(filter.value)}`);
                    break;
                case 'lte':
                    whereConditions.push(`"${filter.column}" <= ${formatValue(filter.value)}`);
                    break;
                case 'between':
                    if (filter.value2) {
                        whereConditions.push(`"${filter.column}" >= ${formatValue(filter.value)} AND "${filter.column}" <= ${formatValue(filter.value2)}`);
                    }
                    break;
                case 'time_range':
                    if (filter.value && filter.value2) {
                        whereConditions.push(`"${filter.column}" >= '${filter.value}' AND "${filter.column}" <= '${filter.value2}'`);
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
    }, [tableName, columns, searchText, filters, sortColumn, sortDirection, currentPage, pageSize]);

    // 获取表结构信息
    const fetchTableSchema = useCallback(async () => {
        try {
            // 获取字段键
            const fieldKeysQuery = `SHOW FIELD KEYS FROM "${tableName}"`;
            const fieldResult = await safeTauriInvoke<QueryResult>('execute_query', {
                request: {
                    connection_id: connectionId,
                    database,
                    query: fieldKeysQuery,
                }
            });

            // 获取标签键
            const tagKeysQuery = `SHOW TAG KEYS FROM "${tableName}"`;
            const tagResult = await safeTauriInvoke<QueryResult>('execute_query', {
                request: {
                    connection_id: connectionId,
                    database,
                    query: tagKeysQuery,
                }
            });

            const fieldKeys: string[] = [];
            const tagKeys: string[] = [];

            // 处理字段键结果
            if (fieldResult.results?.[0]?.series?.[0]?.values) {
                fieldKeys.push(...fieldResult.results[0].series[0].values.map(row => row[0] as string));
            }

            // 处理标签键结果
            if (tagResult.results?.[0]?.series?.[0]?.values) {
                tagKeys.push(...tagResult.results[0].series[0].values.map(row => row[0] as string));
            }

            // 合并所有列：序号、时间、标签键、字段键
            const allColumns = ['#', 'time', ...tagKeys, ...fieldKeys];
            setColumns(allColumns);

            console.log('📊 获取表结构完成:', {
                tableName,
                fieldKeys: fieldKeys.length,
                tagKeys: tagKeys.length,
                totalColumns: allColumns.length,
                columns: allColumns
            });
        } catch (error) {
            console.error('获取表结构失败:', error);
            showMessage.error('获取表结构失败');
        }
    }, [connectionId, database, tableName]);

    // 获取总数
    const fetchTotalCount = useCallback(async () => {
        try {
            const countQuery = `SELECT COUNT(*)
                                FROM "${tableName}"`;
            const result = await safeTauriInvoke<QueryResult>('execute_query', {
                request: {
                    connection_id: connectionId,
                    database,
                    query: countQuery,
                }
            });

            if (result.results?.[0]?.series?.[0]?.values?.[0]?.[1]) {
                setTotalCount(result.results[0].series[0].values[0][1] as number);
            }
        } catch (error) {
            console.error('获取总数失败:', error);
        }
    }, [connectionId, database, tableName]);

    // 客户端排序函数
    const sortDataClientSide = useCallback((dataToSort: DataRow[], column: string, direction: 'asc' | 'desc') => {
        return [...dataToSort].sort((a, b) => {
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
    }, []);

    // 加载数据
    const loadData = useCallback(async () => {
        if (columns.length === 0) return;

        setLoading(true);
        try {
            const query = generateQuery();
            console.log('执行查询:', query);

            const result = await safeTauriInvoke<QueryResult>('execute_query', {
                request: {
                    connection_id: connectionId,
                    database,
                    query,
                }
            });

            if (result.results?.[0]?.series?.[0]) {
                const series = result.results[0].series[0];
                const {columns: resultColumns, values} = series;

                if (resultColumns && values) {
                    const formattedData: DataRow[] = values.map((row, index) => {
                        const record: DataRow = {_id: index};

                        // 添加序号列
                        const offset = pageSize > 0 ? (currentPage - 1) * pageSize : 0;
                        record['#'] = offset + index + 1;

                        // 添加其他列数据
                        resultColumns.forEach((col, colIndex) => {
                            record[col] = row[colIndex];
                        });
                        return record;
                    });

                    // 存储原始数据
                    setRawData(formattedData);

                    // 应用客户端排序（如果需要）
                    if (sortColumn && sortColumn !== 'time' && sortColumn !== '#') {
                        const sortedData = sortDataClientSide(formattedData, sortColumn, sortDirection);
                        setData(sortedData);
                    } else {
                        setData(formattedData);
                    }
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
    }, [connectionId, database, generateQuery, columns]);

    // 应用过滤器（延迟执行，避免添加过滤器时立即重新加载）
    const applyFilters = useCallback(() => {
        setCurrentPage(1);
        loadData();
    }, [loadData]);

    // 初始化
    useEffect(() => {
        fetchTableSchema();
    }, [fetchTableSchema]);

    useEffect(() => {
        if (columns.length > 0) {
            fetchTotalCount();
            loadData();
        }
    }, [columns, loadData, fetchTotalCount]);

    // 处理时间列排序变化
    useEffect(() => {
        if (sortColumn === 'time' && columns.length > 0) {
            loadData();
        }
    }, [sortColumn, sortDirection, loadData, columns.length]);

    // 初始化选中的列（默认全选）
    useEffect(() => {
        if (columns.length > 0) {
            setSelectedColumns(columns);
            setColumnOrder(columns); // 同时初始化列顺序
        }
    }, [columns]);

    // 处理页面变化 - 使用 startTransition 优化响应性
    const handlePageChange = useCallback((page: number) => {
        startTransition(() => {
            setCurrentPage(page);
        });
    }, []);

    // 处理页面大小变化 - 使用 startTransition 优化响应性
    const handlePageSizeChange = useCallback((size: string) => {
        startTransition(() => {
            const newSize = parseInt(size);
            setPageSize(newSize);
            setCurrentPage(1);
        });
    }, []);

    // 处理搜索
    const handleSearch = useCallback(() => {
        setCurrentPage(1);
        loadData();
    }, [loadData]);



    // 行选择处理函数
    const handleRowSelect = useCallback((index: number, event?: React.MouseEvent) => {
        const newSelectedRows = new Set(selectedRows);

        if (event?.shiftKey && lastSelectedIndex !== -1) {
            // Shift+点击：范围选择
            const start = Math.min(lastSelectedIndex, index);
            const end = Math.max(lastSelectedIndex, index);
            for (let i = start; i <= end; i++) {
                newSelectedRows.add(i);
            }
        } else if (event?.ctrlKey || event?.metaKey) {
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
    }, [selectedRows, lastSelectedIndex]);

    // 全选/取消全选
    const handleSelectAll = useCallback(() => {
        if (selectedRows.size === data.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(data.map((_, index) => index)));
        }
    }, [selectedRows.size, data.length]);

    // 复制功能
    const handleCopyRow = useCallback(async (rowIndex: number, format: 'text' | 'json' | 'csv' = 'text') => {
        const row = data[rowIndex];
        if (!row) return;

        const visibleColumns = columnOrder.filter(col => selectedColumns.includes(col));
        const text = formatRowData(row, visibleColumns, format);

        const success = await copyToClipboard(text);
        if (success) {
            showMessage.success(`已复制行数据 (${format.toUpperCase()} 格式)`);
        } else {
            showMessage.error('复制失败');
        }
    }, [data, columnOrder, selectedColumns]);

    const handleCopySelectedRows = useCallback(async (format: 'text' | 'json' | 'csv' = 'text') => {
        if (selectedRows.size === 0) {
            showMessage.warning('请先选择要复制的行');
            return;
        }

        const selectedData = Array.from(selectedRows)
            .sort((a, b) => a - b)
            .map(index => data[index])
            .filter(Boolean);

        const visibleColumns = columnOrder.filter(col => selectedColumns.includes(col));
        const text = formatMultipleRows(selectedData, visibleColumns, format);

        const success = await copyToClipboard(text);
        if (success) {
            showMessage.success(`已复制 ${selectedRows.size} 行数据 (${format.toUpperCase()} 格式)`);
        } else {
            showMessage.error('复制失败');
        }
    }, [selectedRows, data, columnOrder, selectedColumns]);

    const handleCopyCell = useCallback(async (rowIndex: number, column: string) => {
        const row = data[rowIndex];
        if (!row) return;

        const value = String(row[column] || '');
        const success = await copyToClipboard(value);

        if (success) {
            showMessage.success('已复制单元格内容');
        } else {
            showMessage.error('复制失败');
        }
    }, [data]);

    // 处理排序
    const handleSort = (column: string) => {
        const newDirection = sortColumn === column ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'desc';

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
        setSelectedColumns(prev => {
            if (prev.includes(column)) {
                // 如果已选中，则取消选中（但至少保留一列）
                if (prev.length > 1) {
                    return prev.filter(col => col !== column);
                }
                return prev; // 至少保留一列
            } else {
                // 如果未选中，则添加到选中列表
                return [...prev, column];
            }
        });
    };

    // 列全选/取消全选
    const handleSelectAllColumns = () => {
        if (selectedColumns.length === columns.length) {
            // 当前全选，取消全选（但保留第一列）
            setSelectedColumns([columns[0]]);
        } else {
            // 当前非全选，全选
            setSelectedColumns(columns);
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
            const orderedSelectedColumns = columnOrder.filter(column => selectedColumns.includes(column));
            const queryResult: QueryResult = {
                results: [{
                    series: [{
                        name: tableName,
                        columns: orderedSelectedColumns,
                        values: data.map(row => orderedSelectedColumns.map(col => row[col]))
                    }]
                }],
                data: data.map(row => orderedSelectedColumns.map(col => row[col])), // 转换为正确的格式
                executionTime: 0
            };

            // 使用原生导出对话框
            const success = await exportWithNativeDialog(queryResult, {
                format: options.format,
                includeHeaders: options.includeHeaders,
                delimiter: options.delimiter || (options.format === 'tsv' ? '\t' : ','),
                defaultFilename: options.filename || generateTimestampedFilename(tableName, options.format),
                tableName: options.tableName || tableName
            });

            if (success) {
                showMessage.success(`数据已导出为 ${options.format.toUpperCase()} 格式`);
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
            includeHeaders: true
        });
    };

    // 分页信息计算已移至独立的 PaginationControls 组件中

    return (
        <div className="h-full flex flex-col bg-background">
            {/* 头部工具栏 */}
            <Card className="flex-shrink-0 border-0 border-b rounded-none bg-background">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TableIcon className="w-5 h-5 text-blue-600"/>
                            <CardTitle className="text-lg">{tableName}</CardTitle>
                            <Badge variant="outline" className="text-xs">
                                {database}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* 列选择下拉菜单 */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-3"
                                    >
                                        <span className="text-xs">
                                            列 ({selectedColumns.length}/{columns.length})
                                        </span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-72 max-h-80 overflow-y-auto">
                                    <div className="p-3">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm font-medium">列显示设置</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleSelectAllColumns}
                                                className="h-7 px-2 text-xs"
                                            >
                                                {selectedColumns.length === columns.length ? '取消全选' : '全选'}
                                            </Button>
                                        </div>
                                        <div className="text-xs text-muted-foreground mb-3">
                                            拖拽调整顺序，勾选显示列
                                        </div>
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <SortableContext
                                                items={columnOrder}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                <div className="space-y-1">
                                                    {columnOrder.map((column) => (
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
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* 复制选中行按钮 */}
                            {selectedRows.size > 0 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-2"
                                        >
                                            <Copy className="w-3 h-3 mr-1"/>
                                            复制 ({selectedRows.size})
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleCopySelectedRows('text')}>
                                            <FileText className="w-4 h-4 mr-2"/>
                                            复制为文本
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleCopySelectedRows('json')}>
                                            <Code className="w-4 h-4 mr-2"/>
                                            复制为JSON
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleCopySelectedRows('csv')}>
                                            <FileSpreadsheet className="w-4 h-4 mr-2"/>
                                            复制为CSV
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={loadData}
                                        disabled={loading}
                                        className="h-8 px-2"
                                    >
                                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`}/>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>刷新数据</TooltipContent>
                            </Tooltip>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={data.length === 0}
                                        className="h-8 px-2"
                                    >
                                        <Download className="w-3 h-3 mr-1"/>
                                        <ChevronDown className="w-3 h-3"/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={quickExportCSV}>
                                        <FileText className="w-4 h-4 mr-2"/>
                                        快速导出 CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator/>
                                    <DropdownMenuItem onClick={() => setShowExportDialog(true)}>
                                        <Download className="w-4 h-4 mr-2"/>
                                        更多导出选项...
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardHeader>

                {/* 过滤栏 */}
                {filters.length > 0 && (
                    <CardContent className="pt-0 pb-3">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-medium text-muted-foreground">
                                    筛选条件 ({filters.length})
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={applyFilters}
                                    className="h-7 px-3 text-xs"
                                >
                                    应用所有过滤器
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {filters.map((filter, index) => (
                                    <FilterEditor
                                        key={index}
                                        filter={filter}
                                        onUpdate={(updatedFilter) => updateFilter(index, updatedFilter)}
                                        onRemove={() => removeFilter(index)}
                                        onApply={applyFilters}
                                        availableOperators={getAvailableOperators(filter.dataType)}
                                    />
                                ))}
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* 数据表格 */}
            <div className="flex-1 min-h-0 p-4">
                <div className="h-full border rounded-md overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <Spin/>
                            <span className="ml-2">加载中...</span>
                        </div>
                    ) : data.length > 0 ? (
                        <div className="h-full flex flex-col">
                            {/* 固定表头 */}
                            <VirtualTableHeader
                                columnOrder={columnOrder}
                                selectedColumns={selectedColumns}
                                sortColumn={sortColumn}
                                sortDirection={sortDirection}
                                selectedRowsCount={selectedRows.size}
                                totalRowsCount={data.length}
                                onSort={handleSort}
                                onAddFilter={addFilter}
                                onSelectAll={handleSelectAll}
                                onCopySelectedRows={handleCopySelectedRows}
                            />

                            {/* 虚拟化表格内容 */}
                            <div className="flex-1">
                                <Virtuoso
                                    style={{ height: '100%' }}
                                    data={data}
                                    itemContent={(index, row) => (
                                        <VirtualTableRow
                                            key={row._id !== undefined ? `row_${row._id}_${index}` : `row_index_${index}_${currentPage}_${pageSize}`}
                                            row={row}
                                            index={index}
                                            columnOrder={columnOrder}
                                            selectedColumns={selectedColumns}
                                            isSelected={selectedRows.has(index)}
                                            onRowSelect={handleRowSelect}
                                            onCopyRow={handleCopyRow}
                                            onCopyCell={handleCopyCell}
                                        />
                                    )}
                                    overscan={5}
                                    increaseViewportBy={200}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                            <Database className="w-8 h-8 mr-2"/>
                            <span>没有找到数据</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 底部分页 - 使用独立的分页组件 */}
            <PaginationControls
                currentPage={currentPage}
                pageSize={pageSize}
                totalCount={totalCount}
                loading={loading}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
            />

            {/* 导出选项对话框 */}
            <ExportOptionsDialog
                open={showExportDialog}
                onClose={() => setShowExportDialog(false)}
                onExport={exportData}
                defaultTableName={tableName}
                rowCount={data.length}
                columnCount={selectedColumns.length}
            />
        </div>
    );
};

export default TableDataBrowser;