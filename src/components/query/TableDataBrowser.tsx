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
    Spin,
    TooltipTrigger,
    TooltipContent,
} from '@/components/ui';
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

interface ColumnFilter {
    column: string;
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'between';
    value: string;
    value2?: string; // for between operator
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
    const [loading, setLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(500);
    const [filters, setFilters] = useState<ColumnFilter[]>([]);
    const [sortColumn, setSortColumn] = useState<string>('');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [searchText, setSearchText] = useState<string>('');

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
            switch (filter.operator) {
                case 'equals':
                    whereConditions.push(`"${filter.column}" = '${filter.value}'`);
                    break;
                case 'contains':
                    whereConditions.push(`"${filter.column}" =~ /.*${filter.value}.*/`);
                    break;
                case 'startsWith':
                    whereConditions.push(`"${filter.column}" =~ /^${filter.value}.*/`);
                    break;
                case 'endsWith':
                    whereConditions.push(`"${filter.column}" =~ /.*${filter.value}$/`);
                    break;
                case 'gt':
                    whereConditions.push(`"${filter.column}" > '${filter.value}'`);
                    break;
                case 'lt':
                    whereConditions.push(`"${filter.column}" < '${filter.value}'`);
                    break;
                case 'between':
                    if (filter.value2) {
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
        const newFilter: ColumnFilter = {
            column,
            operator: 'equals',
            value: '',
        };
        setFilters([...filters, newFilter]);
    };

    // 移除过滤器
    const removeFilter = (index: number) => {
        setFilters(filters.filter((_, i) => i !== index));
    };

    // 导出数据
    const exportData = async () => {
        if (data.length === 0) {
            showMessage.warning('没有可导出的数据');
            return;
        }

        try {
            // 构造符合 QueryResult 格式的数据
            const queryResult: QueryResult = {
                results: [{
                    series: [{
                        name: tableName,
                        columns,
                        values: data.map(row => columns.map(col => row[col]))
                    }]
                }],
                data: data.map(row => columns.map(col => row[col])), // 转换为正确的格式
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
                        <div className="flex flex-wrap gap-2">
                            {filters.map((filter, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                    {filter.column} {filter.operator} {filter.value}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="ml-1 h-4 w-4 p-0"
                                        onClick={() => removeFilter(index)}
                                    >
                                        ×
                                    </Button>
                                </Badge>
                            ))}
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
                                        {columns.map((column) => (
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
                                            {columns.map((column) => (
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