import React, {useState, useEffect, useCallback} from 'react';
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

const SortableColumnItem: React.FC<SortableColumnItemProps> = ({ column, isSelected, onToggle }) => {
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
        onToggle(column);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center p-2 hover:bg-accent rounded"
        >
            <div className="flex items-center flex-1">
                <Checkbox
                    checked={isSelected}
                    onChange={handleToggle}
                    onClick={handleToggle}
                    className="mr-2"
                />
                <span
                    className="flex-1 cursor-pointer"
                    onClick={handleToggle}
                >
                    {column}
                </span>
                {column === 'time' && (
                    <Badge variant="secondary" className="text-xs ml-2">
                        时间
                    </Badge>
                )}
            </div>
            <div
                {...attributes}
                {...listeners}
                className="text-xs text-muted-foreground ml-2 cursor-move p-1"
                title="拖拽排序"
            >
                ⋮⋮
            </div>
        </div>
    );
};

// 增强的筛选器组件
interface FilterEditorProps {
    filter: ColumnFilter;
    onUpdate: (filter: ColumnFilter) => void;
    onRemove: () => void;
    availableOperators: { value: FilterOperator; label: string }[];
}

const FilterEditor: React.FC<FilterEditorProps> = ({ filter, onUpdate, onRemove, availableOperators }) => {
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

    return (
        <div className="flex items-center gap-2 p-2 border rounded-md bg-background">
            <Badge variant="outline" className="text-xs px-2 py-1">
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

            {renderValueInput()}

            <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
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
} from 'lucide-react';
import {safeTauriInvoke} from '@/utils/tauri';
import {showMessage} from '@/utils/message';
import { exportWithNativeDialog } from '@/utils/nativeExport';
import type {QueryResult} from '@/types';

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
                const oldIndex = items.indexOf(active.id);
                const newIndex = items.indexOf(over.id);
                return arrayMove(items, oldIndex, newIndex);
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
            const searchConditions = columns.filter(col => col !== 'time').map(col => 
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

        // 添加分页
        const offset = (currentPage - 1) * pageSize;
        query += ` LIMIT ${pageSize} OFFSET ${offset}`;

        return query;
    }, [tableName, columns, searchText, filters, sortColumn, sortDirection, currentPage, pageSize]);

    // 获取表结构信息
    const fetchTableSchema = useCallback(async () => {
        try {
            const schemaQuery = `SHOW FIELD KEYS FROM "${tableName}"`;
            const result = await safeTauriInvoke<QueryResult>('execute_query', {
                request: {
                    connection_id: connectionId,
                    database,
                    query: schemaQuery,
                }
            });

            if (result.results?.[0]?.series?.[0]?.values) {
                const fieldKeys = result.results[0].series[0].values.map(row => row[0] as string);
                setColumns(['time', ...fieldKeys]); // InfluxDB 总是有 time 列
            }
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
                        resultColumns.forEach((col, colIndex) => {
                            record[col] = row[colIndex];
                        });
                        return record;
                    });

                    // 存储原始数据
                    setRawData(formattedData);

                    // 应用客户端排序（如果需要）
                    if (sortColumn && sortColumn !== 'time') {
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

    // 处理页面变化
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // 处理页面大小变化
    const handlePageSizeChange = (size: string) => {
        setPageSize(parseInt(size));
        setCurrentPage(1);
    };

    // 处理搜索
    const handleSearch = () => {
        setCurrentPage(1);
        loadData();
    };

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

    // 更新过滤器
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

    // 全选/取消全选
    const handleSelectAll = () => {
        if (selectedColumns.length === columns.length) {
            // 当前全选，取消全选（但保留第一列）
            setSelectedColumns([columns[0]]);
        } else {
            // 当前非全选，全选
            setSelectedColumns(columns);
        }
    };

    // 导出数据
    const exportData = async () => {
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
                format: 'csv',
                includeHeaders: true,
                delimiter: ',',
                defaultFilename: `${tableName}_data`
            });

            if (success) {
                showMessage.success('数据导出成功');
            }
        } catch (error) {
            console.error('导出数据失败:', error);
            showMessage.error('导出数据失败');
        }
    };

    // 计算分页信息
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, totalCount);

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
                                <DropdownMenuContent className="w-64 max-h-80 overflow-y-auto">
                                    <div className="p-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium">列显示设置</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleSelectAll}
                                                className="h-6 text-xs"
                                            >
                                                {selectedColumns.length === columns.length ? '取消全选' : '全选'}
                                            </Button>
                                        </div>
                                        <div className="text-xs text-muted-foreground mb-2">
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
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={exportData}
                                        disabled={data.length === 0}
                                        className="h-8 px-2"
                                    >
                                        <Download className="w-3 h-3"/>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>导出数据</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </CardHeader>

                {/* 过滤栏 */}
                {filters.length > 0 && (
                    <CardContent className="pt-0 pb-3">
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">
                                筛选条件 ({filters.length})
                            </div>
                            <div className="space-y-2">
                                {filters.map((filter, index) => (
                                    <FilterEditor
                                        key={index}
                                        filter={filter}
                                        onUpdate={(updatedFilter) => updateFilter(index, updatedFilter)}
                                        onRemove={() => removeFilter(index)}
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
                        <div className="h-full overflow-auto desktop-page-scroll-container">
                            <table className="w-full caption-bottom text-sm">
                                <thead className="sticky top-0 bg-background z-10 border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50">
                                        {columnOrder.filter(column => selectedColumns.includes(column)).map((column) => (
                                            <th
                                                key={column}
                                                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted/50"
                                                onClick={() => handleSort(column)}
                                            >
                                                <div className="flex items-center gap-1">
                                                    <span>{column}</span>
                                                    {column !== 'time' && (
                                                        <span className="text-xs text-muted-foreground/60" title="客户端排序">
                                                            ⚡
                                                        </span>
                                                    )}
                                                    {sortColumn === column && (
                                                        <span className="text-xs">
                                                            {sortDirection === 'asc' ? '↑' : '↓'}
                                                        </span>
                                                    )}
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
                                                            <DropdownMenuItem onClick={() => addFilter(column)}>
                                                                添加过滤器
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {data.map((row, index) => (
                                        <tr
                                            key={row._id || index}
                                            className="border-b transition-colors hover:bg-muted/50"
                                        >
                                            {columnOrder.filter(column => selectedColumns.includes(column)).map((column) => (
                                                <td key={column} className="p-4 align-middle text-xs font-mono">
                                                    {column === 'time'
                                                        ? new Date(row[column]).toLocaleString()
                                                        : String(row[column] || '-')
                                                    }
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                            <Database className="w-8 h-8 mr-2"/>
                            <span>没有找到数据</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 底部分页 */}
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
                            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                                <SelectTrigger className="w-16 h-8">
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="100">100</SelectItem>
                                    <SelectItem value="500">500</SelectItem>
                                    <SelectItem value="1000">1000</SelectItem>
                                    <SelectItem value="2000">2000</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage <= 1 || loading}
                                className="h-8 px-3"
                            >
                                <ChevronLeft className="w-3 h-3"/>
                                上一页
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage >= totalPages || loading}
                                className="h-8 px-3"
                            >
                                下一页
                                <ChevronRight className="w-3 h-3"/>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TableDataBrowser;