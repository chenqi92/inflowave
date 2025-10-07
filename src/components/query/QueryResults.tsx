import React, {useState, useCallback, startTransition} from 'react';
import { GlideDataTable, type ColumnConfig, type DataRow } from '@/components/ui/GlideDataTable';
import { TableToolbar } from '@/components/ui/TableToolbar';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Button,
    Text,
    Empty,
    Spin,
    Badge,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    ScrollArea,
    showMessage,
} from '@/components/ui';
import {
    Download,
    BarChart,
    Info,
    TrendingUp,
    PieChart,
    AreaChart,
    Table,
    CheckCircle,
    Database,
    Trash2,
    Shield,
    FileText,
} from 'lucide-react';
import {useContextMenu} from '@/hooks/useContextMenu';
import ContextMenu from '@/components/common/ContextMenu';
import type {QueryResult} from '@/types';
import {safeTauriInvoke} from '@/utils/tauri';
import SimpleChart from '../common/SimpleChart';

// SQL语句类型检测工具函数
const detectQueryType = (query?: string): string => {
    if (!query) return 'UNKNOWN';

    const trimmed = query.trim().toUpperCase();

    if (trimmed.startsWith('SELECT')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('CREATE')) return 'CREATE';
    if (trimmed.startsWith('DROP')) return 'DROP';
    if (trimmed.startsWith('ALTER')) return 'ALTER';
    if (trimmed.startsWith('SHOW')) return 'SHOW';
    if (trimmed.startsWith('EXPLAIN')) return 'EXPLAIN';
    if (trimmed.startsWith('GRANT')) return 'GRANT';
    if (trimmed.startsWith('REVOKE')) return 'REVOKE';

    return 'UNKNOWN';
};

// 获取语句类型的分类
const getStatementCategory = (queryType: string): 'query' | 'write' | 'delete' | 'ddl' | 'permission' | 'unknown' => {
    switch (queryType) {
        case 'SELECT':
        case 'SHOW':
        case 'EXPLAIN':
            return 'query';
        case 'INSERT':
            return 'write';
        case 'DELETE':
            return 'delete';
        case 'CREATE':
        case 'DROP':
        case 'ALTER':
            return 'ddl';
        case 'GRANT':
        case 'REVOKE':
            return 'permission';
        default:
            return 'unknown';
    }
};

interface QueryResultsProps {
    result?: QueryResult | null;
    loading?: boolean;
    executedQuery?: string; // 执行的SQL语句
    queryType?: string; // SQL语句类型
}

const QueryResults: React.FC<QueryResultsProps> = ({
                                                       result,
                                                       loading = false,
                                                       executedQuery,
                                                       queryType,
                                                   }) => {
    // 检测SQL语句类型
    const detectedQueryType = queryType || detectQueryType(executedQuery);
    const statementCategory = getStatementCategory(detectedQueryType);

    // 根据语句类型设置默认tab
    const getDefaultTab = (category: string) => {
        switch (category) {
            case 'query':
                return 'table';
            case 'write':
            case 'delete':
            case 'ddl':
            case 'permission':
                return 'status';
            default:
                return 'json';
        }
    };

    const [activeTab, setActiveTab] = useState(() => getDefaultTab(statementCategory));

    // 当语句类型改变时，重置activeTab
    React.useEffect(() => {
        setActiveTab(getDefaultTab(statementCategory));
    }, [statementCategory]);
    const [exportModalVisible, setExportModalVisible] = useState(false);
    const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'excel'>(
        'csv'
    );
    const [chartType, setChartType] = useState<'line' | 'bar' | 'area' | 'pie'>(
        'line'
    );



    // 初始化右键菜单
    const {
        contextMenu,
        showContextMenu,
        hideContextMenu,
        handleContextMenuAction
    } = useContextMenu({
        onSqlGenerated: (sql: string, description: string) => {
            // 可以在这里将生成的SQL传递给查询编辑器
            showMessage.success(`SQL 已生成: ${description}`);
        },
        onActionExecuted: (_action: string) => {
            // Context menu action executed
        },
        onError: (error: string) => {
            showMessage.error(error);
        }
    });

    // 处理表格单元格右键菜单
    const handleCellRightClick = (event: React.MouseEvent, record: Record<string, unknown>, column: string, value: unknown) => {
        event.preventDefault();
        event.stopPropagation();

        const target = {
            type: 'result-table-cell',
            record,
            column,
            value,
            isNull: value === null || value === undefined,
            isNumber: typeof value === 'number',
            isString: typeof value === 'string',
            isTimeColumn: column.toLowerCase().includes('time') || column.toLowerCase().includes('timestamp'),
            tableData: {
                columns: result?.results?.[0]?.series?.[0]?.columns || [],
                totalRows: result?.rowCount || 0
            }
        };

        showContextMenu(event, target);
    };

    // 格式化查询结果为高级表格数据
    const formatResultForAdvancedTable = (queryResult: QueryResult) => {
        if (
            !queryResult ||
            !queryResult.results ||
            queryResult.results.length === 0 ||
            !queryResult.results[0].series ||
            queryResult.results[0].series.length === 0
        ) {
            return {columns: [], dataSource: []};
        }

        const series = queryResult.results[0].series[0];

        // 创建列配置 - 符合 GlideDataTable 的 ColumnConfig 类型
        const columns = series.columns.map((col: string) => ({
            key: col,
            title: col,
            width: col === 'time' ? 180 : 120,
            sortable: true,
            filterable: true,
            render: col === 'time'
                ? (value: any) => value ? new Date(value).toLocaleString() : '-'
                : undefined,
        }));

        // 创建数据源
        const dataSource: DataRow[] = series.values.map((row: unknown[], index: number) => {
            const record: DataRow = {_id: index};
            series.columns.forEach((col: string, colIndex: number) => {
                record[col] = row[colIndex];
            });
            return record;
        });

        console.log('📊 QueryResults formatResultForAdvancedTable:', {
            列数: columns.length,
            数据行数: dataSource.length,
            列配置样本: columns.slice(0, 3),
            数据样本: dataSource.slice(0, 2)
        });

        return {columns, dataSource};
    };



    // 获取结果统计信息
    const getResultStats = (queryResult: QueryResult) => {
        if (!queryResult || !queryResult.results || !queryResult.results[0]?.series) {
            return null;
        }

        const totalRows = queryResult.rowCount || 0;
        const seriesCount = queryResult.results[0].series.length;
        const executionTime = queryResult.executionTime || 0;

        return {
            totalRows,
            seriesCount,
            executionTime,
            columns: queryResult.results[0].series[0]?.columns?.length || 0,
        };
    };

    // 导出数据
    const handleExport = async () => {
        if (!result) return;

        try {
            const exportData = {
                format: exportFormat,
                data: result,
                filename: `query_result_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`,
            };

            await safeTauriInvoke('export_query_data', exportData);
            showMessage.success(`数据已导出为 ${exportFormat.toUpperCase()} 格式`);
            setExportModalVisible(false);
        } catch (error) {
            showMessage.error(`导出失败: ${error}`);
        }
    };

    // 检查数据是否适合图表显示
    const isChartable = (queryResult: QueryResult) => {
        if (
            !queryResult ||
            !queryResult.results ||
            !queryResult.results[0]?.series ||
            queryResult.results[0].series.length === 0
        ) {
            return false;
        }

        const series = queryResult.results[0].series[0];
        return series.columns.length >= 2 && series.values.length > 0;
    };

    // 准备图表数据
    const prepareChartData = (queryResult: QueryResult) => {
        // 安全检查
        if (!result?.results?.[0]?.series?.[0]?.values) {
            return null;
        }

        const series = result.results[0].series[0];
        const timeColumn = series?.columns.find(
            col =>
                col.toLowerCase().includes('time') ||
                col.toLowerCase().includes('timestamp')
        );

        const valueColumns = series?.columns.filter(
            col =>
                col !== timeColumn &&
                typeof series?.values[0]?.[series?.columns.indexOf(col)] === 'number'
        );

        if (valueColumns?.length === 0) return null;

        return {
            timeColumn,
            valueColumns,
            data: series?.values.map(row => {
                const record: Record<string, unknown> = {};
                series.columns.forEach((col, index) => {
                    record[col] = row[index];
                });
                return record;
            }),
        };
    };

    // 为表格准备数据
    const {columns: advancedColumns, dataSource: advancedDataSource} = result
        ? formatResultForAdvancedTable(result)
        : {columns: [], dataSource: []};

    const stats = result ? getResultStats(result) : null;

    // 分页状态管理
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(500);

    // 动态生成分页选项 - 根据数据量智能生成，以500为基础阶段
    const generatePaginationOptions = useCallback((totalRows: number) => {
        console.log(`🔢 生成分页选项，总行数: ${totalRows}`);
        const options: string[] = [];

        // 如果数据量小于等于500，只显示"全部"
        if (totalRows <= 500) {
            options.push('all');
            console.log(`📄 数据量≤500，分页选项: [${options.join(', ')}]`);
            return options;
        }

        // 始终包含500
        options.push('500');

        // 根据数据量动态添加选项
        if (totalRows > 500 && totalRows <= 1000) {
            // 500-1000: 显示 [500, 全部]
        } else if (totalRows > 1000 && totalRows <= 2000) {
            // 1000-2000: 显示 [500, 1000, 全部]
            options.push('1000');
        } else if (totalRows > 2000 && totalRows <= 5000) {
            // 2000-5000: 显示 [500, 1000, 2000, 全部]
            options.push('1000', '2000');
        } else if (totalRows > 5000) {
            // >5000: 显示 [500, 1000, 2000, 5000, 全部]
            options.push('1000', '2000', '5000');
        }

        // 始终添加"全部"选项
        options.push('all');

        console.log(`📊 最终分页选项: [${options.join(', ')}]`);
        return options;
    }, []);

    // 分页处理函数 - 完全按照 TableDataBrowser.tsx 的实现
    const handlePageChange = useCallback((page: number) => {
        startTransition(() => {
            setCurrentPage(page);
        });
    }, []);

    // 页面大小变化处理 - 修复"全部"选项的处理逻辑
    const handlePageSizeChange = useCallback((size: string) => {
        startTransition(() => {
            const newSize = size === 'all' ? -1 : parseInt(size);
            console.log(`📏 页面大小变更: ${pageSize} -> ${newSize} (原始值: ${size})`);
            setPageSize(newSize);
            setCurrentPage(1);
        });
    }, [pageSize]);

    // 根据数据量动态调整初始 pageSize
    useEffect(() => {
        if (advancedDataSource.length > 0) {
            const options = generatePaginationOptions(advancedDataSource.length);
            // 如果当前 pageSize 不在选项中，重置为第一个选项
            const currentSizeStr = pageSize === -1 ? 'all' : String(pageSize);
            if (!options.includes(currentSizeStr)) {
                const firstOption = options[0];
                const newSize = firstOption === 'all' ? -1 : parseInt(firstOption);
                console.log(`📏 初始化页面大小: ${pageSize} -> ${newSize} (数据量: ${advancedDataSource.length})`);
                setPageSize(newSize);
                setCurrentPage(1);
            }
        }
    }, [advancedDataSource.length, generatePaginationOptions]);

    const renderTableTab = () => (
        <div className="h-full flex flex-col bg-background">
            {result ? (
                <>
                    {/* 头部工具栏 - 使用统一的TableToolbar组件 */}
                    <TableToolbar
                        title="查询结果"
                        rowCount={advancedDataSource.length}
                        loading={false}
                        showRefresh={false}
                        onQuickExportCSV={() => {
                            console.log('快速导出CSV');
                            // 这里可以添加快速导出逻辑
                        }}
                        onAdvancedExport={() => {
                            console.log('高级导出选项');
                            // 这里可以添加高级导出逻辑
                        }}
                        showColumnSelector={false}
                    />

                    {/* 数据表格 - 完全按照 TableDataBrowser.tsx 的配置 */}
                    <div className="flex-1 min-h-0">
                        <GlideDataTable
                            data={advancedDataSource}
                            columns={advancedColumns}
                            loading={false}
                            pagination={{
                                current: currentPage,
                                pageSize,
                                total: advancedDataSource.length,
                                showSizeChanger: true,
                                pageSizeOptions: generatePaginationOptions(advancedDataSource.length),
                                serverSide: false, // 客户端分页
                            }}
                            searchable={false} // 使用外部搜索
                            filterable={true}
                            sortable={true}
                            exportable={false} // 使用外部导出
                            columnManagement={true}
                            showToolbar={false} // 使用外部工具栏
                            className="h-full"
                            onPageChange={(page, size) => {
                                handlePageChange(page);
                                if (size !== pageSize) {
                                    handlePageSizeChange(size.toString());
                                }
                            }}
                        />
                    </div>
                </>
            ) : (
                <div className="h-full flex items-center justify-center">
                    <Empty description='暂无查询结果'/>
                </div>
            )}
        </div>
    );

    const renderJsonTab = () => (
        <ScrollArea className="h-full">
            <div className="p-4">
                {result ? (
                    <pre className="bg-muted p-4 rounded-md text-xs leading-relaxed overflow-auto m-0 font-mono">
            {JSON.stringify(result, null, 2)}
          </pre>
                ) : (
                    <Empty description='暂无查询结果'/>
                )}
            </div>
        </ScrollArea>
    );

    const renderChartTab = () => (
        <ScrollArea className="h-full">
            <div className="p-4 h-full">
                {result && isChartable(result) ? (
                    <div className="h-full flex flex-col">
                        <div className="mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">图表类型:</span>
                                <Select value={chartType}
                                        onValueChange={(value) => setChartType(value as 'line' | 'bar' | 'area' | 'pie')}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue placeholder='选择图表类型'/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value='line'>
                                            <div className='flex items-center gap-2'>
                                                <TrendingUp className='w-4 h-4'/>
                                                <span>折线图</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value='bar'>
                                            <div className='flex items-center gap-2'>
                                                <BarChart className='w-4 h-4'/>
                                                <span>柱状图</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value='area'>
                                            <div className='flex items-center gap-2'>
                                                <AreaChart className='w-4 h-4'/>
                                                <span>面积图</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value='pie'>
                                            <div className='flex items-center gap-2'>
                                                <PieChart className='w-4 h-4'/>
                                                <span>饼图</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex-1 min-h-0">
                            <SimpleChart data={prepareChartData(result)} type={chartType}/>
                        </div>
                    </div>
                ) : (
                    <Empty
                        description={result ? '当前数据不适合图表显示' : '暂无查询结果'}
                    />
                )}
            </div>
        </ScrollArea>
    );

    // 渲染写入操作结果
    const renderWriteResultTab = () => (
        <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <Text className="font-medium text-green-700">写入操作执行成功</Text>
                </div>

                {stats && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">执行时间:</span>
                            <span className="font-mono">{stats.executionTime}ms</span>
                        </div>
                        {result?.rowCount !== undefined && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">影响行数:</span>
                                <span className="font-mono">{result.rowCount}</span>
                            </div>
                        )}
                    </div>
                )}

                {executedQuery && (
                    <div>
                        <Text className="font-medium mb-2">执行的语句:</Text>
                        <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto">
                            {executedQuery}
                        </pre>
                    </div>
                )}
            </div>
        </ScrollArea>
    );

    // 渲染删除操作结果
    const renderDeleteResultTab = () => (
        <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-orange-500" />
                    <Text className="font-medium text-orange-700">删除操作执行成功</Text>
                </div>

                {stats && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">执行时间:</span>
                            <span className="font-mono">{stats.executionTime}ms</span>
                        </div>
                        {result?.rowCount !== undefined && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">删除行数:</span>
                                <span className="font-mono text-orange-600">{result.rowCount}</span>
                            </div>
                        )}
                    </div>
                )}

                {executedQuery && (
                    <div>
                        <Text className="font-medium mb-2">执行的语句:</Text>
                        <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto">
                            {executedQuery}
                        </pre>
                    </div>
                )}
            </div>
        </ScrollArea>
    );

    // 渲染DDL操作结果
    const renderDDLResultTab = () => (
        <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-500" />
                    <Text className="font-medium text-blue-700">结构操作执行成功</Text>
                </div>

                {stats && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">执行时间:</span>
                            <span className="font-mono">{stats.executionTime}ms</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">操作类型:</span>
                            <span className="font-mono">{detectedQueryType}</span>
                        </div>
                    </div>
                )}

                {executedQuery && (
                    <div>
                        <Text className="font-medium mb-2">执行的语句:</Text>
                        <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto">
                            {executedQuery}
                        </pre>
                    </div>
                )}
            </div>
        </ScrollArea>
    );

    // 渲染权限操作结果
    const renderPermissionResultTab = () => (
        <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-500" />
                    <Text className="font-medium text-purple-700">权限操作执行成功</Text>
                </div>

                {stats && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">执行时间:</span>
                            <span className="font-mono">{stats.executionTime}ms</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">操作类型:</span>
                            <span className="font-mono">{detectedQueryType}</span>
                        </div>
                    </div>
                )}

                {executedQuery && (
                    <div>
                        <Text className="font-medium mb-2">执行的语句:</Text>
                        <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto">
                            {executedQuery}
                        </pre>
                    </div>
                )}
            </div>
        </ScrollArea>
    );

    return (
        <Card className="h-full border-none">
            <CardHeader className="py-2 pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        {statementCategory === 'query' && <Table className='w-5 h-5'/>}
                        {statementCategory === 'write' && <CheckCircle className='w-5 h-5'/>}
                        {statementCategory === 'delete' && <Trash2 className='w-5 h-5'/>}
                        {statementCategory === 'ddl' && <Database className='w-5 h-5'/>}
                        {statementCategory === 'permission' && <Shield className='w-5 h-5'/>}
                        {statementCategory === 'unknown' && <FileText className='w-5 h-5'/>}
                        <span>
                            {statementCategory === 'query' && '查询结果'}
                            {statementCategory === 'write' && '写入结果'}
                            {statementCategory === 'delete' && '删除结果'}
                            {statementCategory === 'ddl' && '操作结果'}
                            {statementCategory === 'permission' && '权限结果'}
                            {statementCategory === 'unknown' && '执行结果'}
                        </span>
                        {stats && (
                            <div className='flex items-center gap-2 ml-4'>
                                <Badge variant="secondary">{stats.totalRows} 行</Badge>
                                <Badge variant="outline">{stats.columns} 列</Badge>
                                <Badge variant="outline">{stats.executionTime}ms</Badge>
                            </div>
                        )}
                    </CardTitle>
                    {result && (
                        <div className='flex items-center gap-2'>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Download className='w-4 h-4 mr-2'/>
                                        导出
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setExportFormat('csv');
                                            setExportModalVisible(true);
                                        }}
                                    >
                                        <FileText className='w-4 h-4 mr-2'/>
                                        CSV 格式
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setExportFormat('json');
                                            setExportModalVisible(true);
                                        }}
                                    >
                                        <FileText className='w-4 h-4 mr-2'/>
                                        JSON 格式
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setExportFormat('excel');
                                            setExportModalVisible(true);
                                        }}
                                    >
                                        <FileText className='w-4 h-4 mr-2'/>
                                        Excel 格式
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Info className='w-4 h-4 mr-2'/>
                                        详情
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>查询结果详情</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="font-medium">总行数:</span>
                                            <span>{stats?.totalRows}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium">列数:</span>
                                            <span>{stats?.columns}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium">序列数:</span>
                                            <span>{stats?.seriesCount}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium">执行时间:</span>
                                            <span>{stats?.executionTime}ms</span>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-0 h-[calc(100%-5rem)]">
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <Spin size='large' tip='执行查询中...'/>
                    </div>
                ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                        <TabsList className="mx-4 mb-2">
                            {/* 查询类语句显示传统的表格、JSON、图表视图 */}
                            {statementCategory === 'query' && (
                                <>
                                    <TabsTrigger value="table" className="flex items-center gap-2">
                                        <Table className='w-4 h-4'/>
                                        表格视图
                                        {stats && <Badge variant="secondary" className="ml-1">{stats.totalRows}</Badge>}
                                    </TabsTrigger>
                                    <TabsTrigger value="json" className="flex items-center gap-2">
                                        <FileText className='w-4 h-4'/>
                                        JSON 视图
                                    </TabsTrigger>
                                    <TabsTrigger value="chart" className="flex items-center gap-2">
                                        <BarChart className='w-4 h-4'/>
                                        图表视图
                                    </TabsTrigger>
                                </>
                            )}

                            {/* 写入类语句显示执行状态 */}
                            {statementCategory === 'write' && (
                                <>
                                    <TabsTrigger value="status" className="flex items-center gap-2">
                                        <CheckCircle className='w-4 h-4'/>
                                        执行状态
                                    </TabsTrigger>
                                    <TabsTrigger value="json" className="flex items-center gap-2">
                                        <FileText className='w-4 h-4'/>
                                        JSON 视图
                                    </TabsTrigger>
                                </>
                            )}

                            {/* 删除类语句显示删除状态 */}
                            {statementCategory === 'delete' && (
                                <>
                                    <TabsTrigger value="status" className="flex items-center gap-2">
                                        <Trash2 className='w-4 h-4'/>
                                        删除状态
                                    </TabsTrigger>
                                    <TabsTrigger value="json" className="flex items-center gap-2">
                                        <FileText className='w-4 h-4'/>
                                        JSON 视图
                                    </TabsTrigger>
                                </>
                            )}

                            {/* DDL类语句显示结构操作状态 */}
                            {statementCategory === 'ddl' && (
                                <>
                                    <TabsTrigger value="status" className="flex items-center gap-2">
                                        <Database className='w-4 h-4'/>
                                        操作状态
                                    </TabsTrigger>
                                    <TabsTrigger value="json" className="flex items-center gap-2">
                                        <FileText className='w-4 h-4'/>
                                        JSON 视图
                                    </TabsTrigger>
                                </>
                            )}

                            {/* 权限类语句显示权限操作状态 */}
                            {statementCategory === 'permission' && (
                                <>
                                    <TabsTrigger value="status" className="flex items-center gap-2">
                                        <Shield className='w-4 h-4'/>
                                        权限状态
                                    </TabsTrigger>
                                    <TabsTrigger value="json" className="flex items-center gap-2">
                                        <FileText className='w-4 h-4'/>
                                        JSON 视图
                                    </TabsTrigger>
                                </>
                            )}

                            {/* 未知类型默认显示JSON视图 */}
                            {statementCategory === 'unknown' && (
                                <TabsTrigger value="json" className="flex items-center gap-2">
                                    <FileText className='w-4 h-4'/>
                                    JSON 视图
                                </TabsTrigger>
                            )}
                        </TabsList>

                        {/* 查询类语句的内容 */}
                        {statementCategory === 'query' && (
                            <>
                                <TabsContent value="table" className="flex-1 m-0 px-4">
                                    {renderTableTab()}
                                </TabsContent>
                                <TabsContent value="json" className="flex-1 m-0 px-4">
                                    {renderJsonTab()}
                                </TabsContent>
                                <TabsContent value="chart" className="flex-1 m-0 px-4">
                                    {renderChartTab()}
                                </TabsContent>
                            </>
                        )}

                        {/* 写入类语句的内容 */}
                        {statementCategory === 'write' && (
                            <>
                                <TabsContent value="status" className="flex-1 m-0 px-4">
                                    {renderWriteResultTab()}
                                </TabsContent>
                                <TabsContent value="json" className="flex-1 m-0 px-4">
                                    {renderJsonTab()}
                                </TabsContent>
                            </>
                        )}

                        {/* 删除类语句的内容 */}
                        {statementCategory === 'delete' && (
                            <>
                                <TabsContent value="status" className="flex-1 m-0 px-4">
                                    {renderDeleteResultTab()}
                                </TabsContent>
                                <TabsContent value="json" className="flex-1 m-0 px-4">
                                    {renderJsonTab()}
                                </TabsContent>
                            </>
                        )}

                        {/* DDL类语句的内容 */}
                        {statementCategory === 'ddl' && (
                            <>
                                <TabsContent value="status" className="flex-1 m-0 px-4">
                                    {renderDDLResultTab()}
                                </TabsContent>
                                <TabsContent value="json" className="flex-1 m-0 px-4">
                                    {renderJsonTab()}
                                </TabsContent>
                            </>
                        )}

                        {/* 权限类语句的内容 */}
                        {statementCategory === 'permission' && (
                            <>
                                <TabsContent value="status" className="flex-1 m-0 px-4">
                                    {renderPermissionResultTab()}
                                </TabsContent>
                                <TabsContent value="json" className="flex-1 m-0 px-4">
                                    {renderJsonTab()}
                                </TabsContent>
                            </>
                        )}

                        {/* 未知类型的内容 */}
                        {statementCategory === 'unknown' && (
                            <TabsContent value="json" className="flex-1 m-0 px-4">
                                {renderJsonTab()}
                            </TabsContent>
                        )}
                    </Tabs>
                )}
            </CardContent>

            {/* 导出对话框 */}
            <Dialog open={exportModalVisible} onOpenChange={setExportModalVisible}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>导出查询结果</DialogTitle>
                        <DialogDescription>
                            选择导出格式并确认导出数据
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Text className="font-medium">导出格式:</Text>
                            <Select value={exportFormat}
                                    onValueChange={(value) => setExportFormat(value as 'csv' | 'json' | 'excel')}>
                                <SelectTrigger className="w-full mt-2">
                                    <SelectValue placeholder='选择导出格式'/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='csv'>CSV - 逗号分隔值</SelectItem>
                                    <SelectItem value='json'>JSON - JavaScript 对象表示法</SelectItem>
                                    <SelectItem value='excel'>Excel - Microsoft Excel 格式</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {stats && (
                            <div>
                                <Text className="text-muted-foreground">
                                    将导出 {stats.totalRows} 行 × {stats.columns} 列数据
                                </Text>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setExportModalVisible(false)}>
                            取消
                        </Button>
                        <Button onClick={handleExport}>
                            导出
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 右键菜单 */}
            <ContextMenu
                open={contextMenu.visible}
                x={contextMenu.x}
                y={contextMenu.y}
                target={contextMenu.target}
                onClose={hideContextMenu}
                onAction={handleContextMenuAction}
                onExecuteQuery={(sql: string, description?: string) => {
                    // 可以在这里将生成的SQL传递给查询编辑器
                    if (description) {
                        showMessage.success(`SQL 已生成: ${description}`);
                    }
                }}
            />
        </Card>
    );
};

export default QueryResults;
