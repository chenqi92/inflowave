import React, {useState, useEffect} from 'react';
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    DataTable,
    TableHeader,
    TableBody,
    TableRow,
    TableCell,
    TableHead,
    Button,
    Tag,
    Empty,
    Table,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui';
import {
    TableIcon,
    Info,
    X,
    Clock,
    CheckCircle,
    AlertCircle,
    AlertTriangle,
    FileSpreadsheet,
    FileText,
    File,
    FileDown,
    Database
} from 'lucide-react';
import {useConnectionStore} from '@/store/connection';
import {showMessage} from '@/utils/message';
import type {QueryResult} from '@/types';

interface ResultPanelProps {
    collapsed?: boolean;
    queryResult?: QueryResult | null;
    queryResults?: QueryResult[];
    executedQueries?: string[];
    executionTime?: number;
    onClearResult?: () => void;
}

interface QueryHistoryItem {
    id: string;
    query: string;
    status: 'running' | 'success' | 'error' | 'warning';
    duration: number;
    rowCount: number;
    timestamp: Date;
    data?: any[];
    error?: string;
    warnings?: string[];
}

interface LogMessage {
    id: string;
    level: 'info' | 'warning' | 'error';
    message: string;
    timestamp: Date;
    source: string;
}

const ResultPanel: React.FC<ResultPanelProps> = ({
                                                     collapsed = false,
                                                     queryResult,
                                                     queryResults = [],
                                                     executedQueries = [],
                                                     executionTime = 0,
                                                     onClearResult
                                                 }) => {
    const [activeTab, setActiveTab] = useState('messages');
    const {activeConnectionId, connections} = useConnectionStore();
    const activeConnection = activeConnectionId ? connections.find(c => c.id === activeConnectionId) : null;

    // 监听查询结果变化
    useEffect(() => {
        if (queryResult || queryResults.length > 0) {
            setActiveTab('results'); // 自动切换到结果标签页
            console.log('📈 ResultPanel 收到查询结果:', queryResult || queryResults);
        }
    }, [queryResult, queryResults]);

    // 根据当前查询结果生成表格列
    const resultColumns = React.useMemo(() => {
        try {
            const columns = queryResult?.results?.[0]?.series?.[0]?.columns;
            if (!columns || !Array.isArray(columns)) {
                return [];
            }

            return columns.map(col => ({
                title: col,
                dataIndex: col,
                key: col,
                ellipsis: true,
                width: 150
            }));
        } catch (error) {
            console.error('ResultPanel: resultColumns 计算出错:', error);
            return [];
        }
    }, [queryResult]);

    // 将 InfluxDB 的结果转换为表格数据格式
    const tableData = React.useMemo(() => {
        try {
            if (!queryResult?.results?.[0]?.series?.[0]) {
                return [];
            }

            const series = queryResult.results[0].series[0];
            const {columns, values} = series;

            if (!columns || !Array.isArray(columns) || !values || !Array.isArray(values)) {
                return [];
            }

            return values.map((row: any[], index: number) => {
                const record: Record<string, any> = {_key: index};
                columns.forEach((col: string, colIndex: number) => {
                    record[col] = row[colIndex];
                });
                return record;
            });
        } catch (error) {
            console.error('ResultPanel: tableData 计算出错:', error);
            return [];
        }
    }, [queryResult]);

    const getLogMessages = (): LogMessage[] => {
        return [];
    };

    const getStatusDisplay = (status: string) => {
        const displays = {
            running: {icon: <Clock className="w-4 h-4"/>, color: 'blue', text: '运行中'},
            success: {icon: <CheckCircle/>, color: 'green', text: '成功'},
            error: {icon: <AlertCircle/>, color: 'red', text: '错误'},
            warning: {icon: <AlertTriangle/>, color: 'orange', text: '警告'}
        };
        return displays[status as keyof typeof displays] || displays.success;
    };

    // 导出为 CSV 格式
    const exportToCSV = () => {
        if (!queryResult || tableData.length === 0) {
            showMessage.success("没有可导出的数据");
            return;
        }

        const columns = resultColumns.map(col => col.title as string);
        const csvContent = [
            columns.join(','),
            ...tableData.map(row =>
                columns.map(col => {
                    const value = row[col];
                    // 处理包含逗号、引号或换行符的值
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value || '';
                }).join(',')
            )
        ].join('\n');

        downloadFile(csvContent, 'query-result.csv', 'text/csv');
        showMessage.success("CSV 文件导出成功");
    };

    // 导出为 JSON 格式
    const exportToJSON = () => {
        if (!queryResult || tableData.length === 0) {
            showMessage.success("没有可导出的数据");
            return;
        }

        const jsonContent = JSON.stringify(tableData, null, 2);
        downloadFile(jsonContent, 'query-result.json', 'application/json');
        showMessage.success("JSON 文件导出成功");
    };

    // 导出为 Excel 格式 (实际上是 TSV，可以被 Excel 打开)
    const exportToExcel = () => {
        if (!queryResult || tableData.length === 0) {
            showMessage.success("没有可导出的数据");
            return;
        }

        const columns = resultColumns.map(col => col.title as string);
        const tsvContent = [
            columns.join('\t'),
            ...tableData.map(row =>
                columns.map(col => row[col] || '').join('\t')
            )
        ].join('\n');

        downloadFile(tsvContent, 'query-result.xlsx', 'application/vnd.ms-excel');
        showMessage.success("Excel 文件导出成功");
    };

    // 下载文件的通用函数
    const downloadFile = (content: string, filename: string, mimeType: string) => {
        const blob = new Blob([content], {type: mimeType});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // 清空结果
    const handleClearResult = () => {
        onClearResult?.();
        showMessage.success("查询结果已清空");
    };

    // 导出菜单项
    const exportMenuItems = [
        {
            key: 'csv',
            label: 'CSV 格式',
            icon: <FileText className="w-4 h-4"/>,
            onClick: exportToCSV
        },
        {
            key: 'json',
            label: 'JSON 格式',
            icon: <File className="w-4 h-4"/>,
            onClick: exportToJSON
        },
        {
            key: 'excel',
            label: 'Excel 格式',
            icon: <FileSpreadsheet/>,
            onClick: exportToExcel
        },
    ];

    if (collapsed) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                <TableIcon className="w-4 h-4 text-lg"/>
            </div>
        );
    }

    const logMessages = getLogMessages();

    return (
        <div className="h-full bg-background">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList
                    className="inline-flex h-8 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-auto">
                    <TabsTrigger value="messages" className="flex items-center gap-1 px-2 py-1 text-xs">
                        <Info className="w-3 h-3"/>
                        消息
                        {executedQueries.length > 0 && (
                            <Tag color="blue" size="small" className="ml-1 text-xs px-1">
                                {executedQueries.length}
                            </Tag>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="summary" className="flex items-center gap-1 px-2 py-1 text-xs">
                        <FileText className="w-3 h-3"/>
                        摘要
                    </TabsTrigger>
                    <TabsTrigger value="results" className="flex items-center gap-1 px-2 py-1 text-xs">
                        <TableIcon className="w-3 h-3"/>
                        结果
                        {queryResult && (
                            <Tag color="blue" size="small" className="ml-1 text-xs px-1">
                                {tableData.length}
                            </Tag>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="messages" className="flex-1 overflow-auto p-2 mt-0">
                    <div className="space-y-2">
                        {executedQueries.map((query, index) => (
                            <div key={index} className="p-2 bg-muted/50 rounded border">
                                <div className="flex items-start justify-between mb-1">
                                    <div className="flex items-center gap-1">
                                        <Tag color="green" size="small" className="text-xs px-1 py-0">
                                            查询 {index + 1}
                                        </Tag>
                                        <span className="text-xs text-muted-foreground">
                      {new Date().toLocaleTimeString()}
                    </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-muted-foreground"/>
                                        <span className="text-xs">{executionTime}ms</span>
                                    </div>
                                </div>
                                <div className="bg-background p-1 rounded border font-mono text-xs">
                                    {query}
                                </div>
                            </div>
                        ))}
                        {executedQueries.length === 0 && (
                            <div className="text-center text-muted-foreground py-4">
                                <Info className="w-6 h-6 mx-auto mb-2"/>
                                <p className="text-xs">暂无执行记录</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="summary" className="flex-1 flex flex-col overflow-hidden p-2 mt-0">
                    <div className="flex flex-col h-full gap-4">
                        <div className="bg-background rounded border flex-shrink-0">
                            <div className="border-b border-border p-2">
                                <h3 className="text-sm font-semibold text-gray-900">执行摘要</h3>
                            </div>
                            <div className="p-0">
                                <Table className="w-full text-xs">
                                    <TableHeader>
                                        <TableRow className="border-b border-border">
                                            <TableHead className="text-left p-2 bg-muted">项目</TableHead>
                                            <TableHead className="text-left p-2 bg-muted">值</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow className="border-b border-border/50">
                                            <TableCell className="p-2 text-muted-foreground">执行语句数</TableCell>
                                            <TableCell className="p-2 font-mono">{executedQueries.length}</TableCell>
                                        </TableRow>
                                        <TableRow className="border-b border-border/50">
                                            <TableCell className="p-2 text-muted-foreground">总数据量</TableCell>
                                            <TableCell className="p-2 font-mono">
                                                {queryResults.length > 0
                                                    ? queryResults.reduce((sum, result) => sum + (result.data?.length || 0), 0)
                                                    : (queryResult?.data?.length || 0)} 行
                                            </TableCell>
                                        </TableRow>
                                        <TableRow className="border-b border-border/50">
                                            <TableCell className="p-2 text-muted-foreground">总耗时</TableCell>
                                            <TableCell className="p-2 font-mono">{executionTime}ms</TableCell>
                                        </TableRow>
                                        <TableRow className="border-b border-border/50">
                                            <TableCell className="p-2 text-muted-foreground">平均耗时</TableCell>
                                            <TableCell className="p-2 font-mono">
                                                {executedQueries.length > 0 ? Math.round(executionTime / executedQueries.length) : executionTime}ms
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="p-2 text-muted-foreground">执行时间</TableCell>
                                            <TableCell
                                                className="p-2 font-mono">{new Date().toLocaleTimeString()}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {executedQueries.length > 0 ? (
                            <div className="bg-background rounded border flex-1 min-h-0 flex flex-col">
                                <div className="border-b border-border p-2 flex-shrink-0">
                                    <h3 className="text-sm font-semibold text-gray-900">执行的SQL语句</h3>
                                </div>
                                <div className="flex-1 overflow-auto">
                                    <Table className="w-full text-xs">
                                        <TableHeader>
                                            <TableRow className="border-b border-border">
                                                <TableHead className="text-left p-2 bg-muted">序号</TableHead>
                                                <TableHead className="text-left p-2 bg-muted">SQL语句</TableHead>
                                                <TableHead className="text-left p-2 bg-muted">结果行数</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {executedQueries.map((query, index) => (
                                                <TableRow key={index} className="border-b border-border/50">
                                                    <TableCell
                                                        className="p-2 text-muted-foreground">{index + 1}</TableCell>
                                                    <TableCell
                                                        className="p-2 font-mono text-xs max-w-md truncate">{query}</TableCell>
                                                    <TableCell className="p-2 font-mono">
                                                        {queryResults[index]?.data?.length || queryResult?.data?.length || 0} 行
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-center">
                                <div className="text-muted-foreground">
                                    <p className="text-sm">暂无执行的SQL语句详情</p>
                                    <p className="text-xs mt-1">请执行查询以查看详细信息</p>
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="results" className="flex-1 flex flex-col mt-0">
                    {/* 查询状态栏 */}
                    {queryResult && (
                        <div className="p-2 bg-muted/50 border-b border">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <Tag icon={<CheckCircle/>} color="green" className="text-xs px-1">成功</Tag>
                                        <span className="text-xs">{tableData.length} 行</span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                icon={<FileDown className="w-3 h-3"/>}
                                                size="small"
                                                disabled={!queryResult || tableData.length === 0}
                                                className="text-xs px-2 h-6"
                                            >
                                                导出
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start">
                                            {exportMenuItems.map((item) => (
                                                <DropdownMenuItem
                                                    key={item.key}
                                                    onClick={item.onClick}
                                                    className="flex items-center gap-2"
                                                >
                                                    {item.icon}
                                                    {item.label}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Button
                                        icon={<X className="w-3 h-3"/>}
                                        size="small"
                                        onClick={handleClearResult}
                                        disabled={!queryResult}
                                        className="text-xs px-2 h-6"
                                    >
                                        清空
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 结果内容 */}
                    <div className="flex-1 overflow-hidden p-2">
                        {queryResult && tableData.length > 0 ? (
                            <DataTable
                                className="result-table text-xs"
                                columns={resultColumns}
                                dataSource={tableData}
                                size="small"
                                scroll={{x: 'max-content', y: '100%'}}
                                rowKey="_key"
                            />
                        ) : queryResult && tableData.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <Empty
                                    description="查询执行成功，但未返回任何数据"
                                    image={<Database className="h-16 w-16 text-muted-foreground/50"/>}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <Empty
                                    description="请执行查询以查看结果"
                                    image={<TableIcon className="h-16 w-16 text-muted-foreground/50"/>}
                                />
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ResultPanel;
