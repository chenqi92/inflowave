import React, {useState, useCallback, startTransition, useEffect, useRef} from 'react';
import { GlideDataTable, type DataRow } from '@/components/ui/glide-data-table';
import { TableToolbar } from '@/components/ui/table-toolbar';
import { ExportConfigDialog } from './ExportConfigDialog';
import { exportQueryResult, ExportConfig } from '@/utils/dataExport';
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

    // 导出配置对话框状态
    const [exportDialogOpen, setExportDialogOpen] = useState(false);

    // 处理导出
    const handleExport = useCallback(async (config: ExportConfig) => {
        if (!result) {
            showMessage.warning('没有数据可导出');
            return;
        }

        try {
            const success = await exportQueryResult(
                result,
                config,
                {
                    database: undefined, // 可以从上下文获取
                    tableName: 'query_result',
                    query: executedQuery,
                }
            );

            if (success) {
                showMessage.success('数据导出成功');
            }
        } catch (error) {
            console.error('导出失败:', error);
            showMessage.error(`导出失败: ${error}`);
        }
    }, [result, executedQuery]);

    // 快速导出 CSV
    const handleQuickExportCSV = useCallback(async () => {
        if (!result) {
            showMessage.warning('没有数据可导出');
            return;
        }

        await handleExport({
            format: 'csv',
            filename: `query_result_${Date.now()}`,
        });
    }, [result, handleExport]);

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

        // 计算自适应列宽
        const columnCount = series.columns.length;
        const minColumnWidth = 120;
        const timeColumnWidth = 180;
        // 假设容器宽度约为 1200px（可以根据实际情况调整）
        const containerWidth = 1200;
        const availableWidth = containerWidth - 60; // 减去行号列和边距

        // 统计 time 列和其他列的数量
        const hasTimeColumn = series.columns.includes('time');
        const timeColumnCount = hasTimeColumn ? 1 : 0;
        const otherColumnCount = columnCount - timeColumnCount;

        // 计算每列的宽度
        let defaultColumnWidth = minColumnWidth;
        if (columnCount > 0) {
            const totalMinWidth = timeColumnCount * timeColumnWidth + otherColumnCount * minColumnWidth;
            if (totalMinWidth < availableWidth) {
                // 如果总宽度小于容器宽度，平均分配剩余空间
                if (otherColumnCount > 0) {
                    const remainingWidth = availableWidth - timeColumnCount * timeColumnWidth;
                    defaultColumnWidth = Math.floor(remainingWidth / otherColumnCount);
                } else {
                    // 只有 time 列，让它占满整个宽度
                    defaultColumnWidth = availableWidth;
                }
            }
        }

        // 创建列配置 - 符合 GlideDataTable 的 ColumnConfig 类型
        const columns = series.columns.map((col: string) => ({
            key: col,
            title: col,
            width: col === 'time' ? (hasTimeColumn && otherColumnCount > 0 ? timeColumnWidth : defaultColumnWidth) : defaultColumnWidth,
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
            列配置: columns.map(c => ({ key: c.key, title: c.title, width: c.width })),
            数据样本: dataSource.slice(0, 2),
            原始列: series.columns,
            容器宽度: containerWidth,
            可用宽度: availableWidth,
            time列数: timeColumnCount,
            其他列数: otherColumnCount,
            默认列宽: defaultColumnWidth
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

    // 旧的导出函数已被新的 handleExport (line 153) 替代
    // 已删除重复的 handleExport 函数

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
    const previousResultRef = useRef<QueryResult | null>(null);

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

    // 当查询结果变化时（新的查询），重置分页状态
    useEffect(() => {
        // 检查是否是新的查询结果
        if (result && result !== previousResultRef.current) {
            previousResultRef.current = result;

            // 直接从 result 中获取数据长度
            const actualDataLength = result.results?.[0]?.series?.[0]?.values?.length || 0;
            if (actualDataLength > 0) {
                const options = generatePaginationOptions(actualDataLength);
                const firstOption = options[0];
                const defaultSize = firstOption === 'all' ? -1 : parseInt(firstOption);

                console.log(`📏 新查询结果，重置分页:`, {
                    实际数据量: actualDataLength,
                    默认大小: defaultSize,
                    默认大小字符串: firstOption,
                    选项: options,
                    rowCount: result.rowCount
                });

                setPageSize(defaultSize);
                setCurrentPage(1);
            }
        }
    }, [result, generatePaginationOptions]);

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
                        onQuickExportCSV={handleQuickExportCSV}
                        onAdvancedExport={() => setExportDialogOpen(true)}
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

            {/* 旧的导出对话框已被 ExportConfigDialog 替代 */}

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

            {/* 导出配置对话框 */}
            <ExportConfigDialog
                open={exportDialogOpen}
                onClose={() => setExportDialogOpen(false)}
                onExport={handleExport}
                defaultFilename={`query_result_${Date.now()}`}
                totalRows={result?.rowCount || 0}
                totalColumns={result?.columns?.length || 0}
            />
        </Card>
    );
};

export default QueryResults;
