/**
 * 多数据库查询结果组件
 * 
 * 支持不同数据库类型的查询结果展示
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,

  Alert,
  AlertDescription,
  Progress,
  Typography,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui';
import {
  Download,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  Table as TableIcon,
  FileJson,
  FileText,
  Copy,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  TreePine,
  BarChart,
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { writeToClipboard } from '@/utils/clipboard';
import type { DatabaseType, QueryResult } from '@/types';

// 数据库图标映射
const DATABASE_ICONS = {
  influxdb: <Database className="w-4 h-4 text-blue-500" />,
  iotdb: <TreePine className="w-4 h-4 text-green-500" />,
  prometheus: <BarChart className="w-4 h-4 text-orange-500" />,
  elasticsearch: <Search className="w-4 h-4 text-purple-500" />,
} as const;

interface MultiDatabaseQueryResultsProps {
  result: QueryResult | null;
  loading?: boolean;
  error?: string | null;
  executionTime?: number;
  query?: string;
  database?: string;
  onExport?: (format: string) => void;
  onRefresh?: () => void;
}

export const MultiDatabaseQueryResults: React.FC<MultiDatabaseQueryResultsProps> = ({
  result,
  loading = false,
  error = null,
  executionTime = 0,
  query = '',
  database = '',
  onExport,
  onRefresh,
}) => {
  // Store hooks
  const { connections, activeConnectionId } = useConnectionStore();

  // State
  const [activeTab, setActiveTab] = useState('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [showAllColumns, setShowAllColumns] = useState(true);

  // 获取当前连接
  const currentConnection = connections.find(conn => conn.id === activeConnectionId);
  const dbType = currentConnection?.dbType || 'influxdb';

  // 解析查询结果数据
  const parsedData = useMemo(() => {
    if (!result) return { columns: [], rows: [], totalRows: 0 };

    try {
      // 根据数据库类型解析结果
      switch (dbType) {
        case 'influxdb':
          return parseInfluxDBResult(result);
        case 'iotdb':
          return parseIoTDBResult(result);
        case 'prometheus':
          return parsePrometheusResult(result);
        case 'elasticsearch':
          return parseElasticsearchResult(result);
        default:
          return parseGenericResult(result);
      }
    } catch (error) {
      console.error('解析查询结果失败:', error);
      return { columns: [], rows: [], totalRows: 0 };
    }
  }, [result, dbType]);

  // 解析 InfluxDB 结果
  const parseInfluxDBResult = (result: QueryResult) => {
    if (result.results && result.results.length > 0) {
      const series = result.results[0].series || [];
      if (series.length > 0) {
        const firstSeries = series[0];
        return {
          columns: firstSeries.columns || [],
          rows: firstSeries.values || [],
          totalRows: firstSeries.values?.length || 0,
        };
      }
    }
    return { columns: [], rows: [], totalRows: 0 };
  };

  // 解析 IoTDB 结果
  const parseIoTDBResult = (result: QueryResult) => {
    if (result.columns && result.data) {
      return {
        columns: result.columns,
        rows: result.data,
        totalRows: result.data.length,
      };
    }
    return { columns: [], rows: [], totalRows: 0 };
  };

  // 解析 Prometheus 结果
  const parsePrometheusResult = (result: QueryResult) => {
    // Prometheus 结果通常是时间序列数据
    if (result.data && Array.isArray(result.data)) {
      const columns = ['timestamp', 'value', 'labels'];
      const rows = result.data.map((item: any) => [
        item.timestamp || '',
        item.value || '',
        JSON.stringify(item.metric || {}),
      ]);
      return {
        columns,
        rows,
        totalRows: rows.length,
      };
    }
    return { columns: [], rows: [], totalRows: 0 };
  };

  // 解析 Elasticsearch 结果
  const parseElasticsearchResult = (result: QueryResult) => {
    // Elasticsearch 结果通常在 data 字段中，需要特殊处理
    if (result.data && typeof result.data === 'object' && 'hits' in result.data) {
      const esData = result.data as any;
      if (esData.hits && esData.hits.hits) {
        const hits = esData.hits.hits;
        if (hits.length > 0) {
          // 从第一个文档提取字段名
          const firstDoc = hits[0]._source || {};
          const columns = ['_id', '_score', ...Object.keys(firstDoc)];
          const rows = hits.map((hit: any) => [
            hit._id,
            hit._score,
            ...Object.values(hit._source || {}),
          ]);
          return {
            columns,
            rows,
            totalRows: esData.hits.total?.value || rows.length,
          };
        }
      }
    }
    return { columns: [], rows: [], totalRows: 0 };
  };

  // 解析通用结果
  const parseGenericResult = (result: QueryResult) => {
    if (result.columns && result.data) {
      return {
        columns: result.columns,
        rows: result.data,
        totalRows: result.data.length,
      };
    }
    return { columns: [], rows: [], totalRows: 0 };
  };

  // 过滤和分页数据
  const filteredAndPaginatedData = useMemo(() => {
    let filteredRows = parsedData.rows;

    // 搜索过滤
    if (searchTerm.trim()) {
      filteredRows = parsedData.rows.filter((row: any) =>
        row.some((cell: any) =>
          String(cell).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // 列过滤
    let displayColumns = parsedData.columns;
    let displayRows = filteredRows;
    
    if (!showAllColumns && selectedColumns.length > 0) {
      const columnIndices = selectedColumns.map(col => 
        parsedData.columns.indexOf(col)
      ).filter(index => index !== -1);
      
      displayColumns = selectedColumns;
      displayRows = filteredRows.map((row: any) =>
        columnIndices.map(index => row[index])
      );
    }

    // 分页
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedRows = displayRows.slice(startIndex, endIndex);

    return {
      columns: displayColumns,
      rows: paginatedRows,
      totalRows: filteredRows.length,
      totalPages: Math.ceil(filteredRows.length / pageSize),
    };
  }, [parsedData, searchTerm, currentPage, pageSize, selectedColumns, showAllColumns]);

  // 导出数据
  const handleExport = useCallback(async (format: string) => {
    if (!result) {
      showMessage.warning('没有可导出的数据');
      return;
    }

    try {
      await safeTauriInvoke('export_query_result', {
        result,
        format,
        filename: `query_result_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${format}`,
      });
      
      showMessage.success(`数据已导出为 ${format.toUpperCase()} 格式`);
      onExport?.(format);
    } catch (error) {
      console.error('导出失败:', error);
      showMessage.error(`导出失败: ${error}`);
    }
  }, [result, onExport]);

  // 复制数据
  const handleCopy = useCallback(async (data: any) => {
    try {
      const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      await writeToClipboard(text);
      showMessage.success('已复制到剪贴板');
    } catch (error) {
      showMessage.error('复制失败');
    }
  }, []);

  // 切换列显示
  const toggleColumnVisibility = useCallback((column: string) => {
    setSelectedColumns(prev => {
      if (prev.includes(column)) {
        return prev.filter(col => col !== column);
      } else {
        return [...prev, column];
      }
    });
  }, []);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            {DATABASE_ICONS[dbType]}
            <span>查询结果</span>
            {database && (
              <Badge variant="outline">{database}</Badge>
            )}
          </CardTitle>

          <div className="flex items-center space-x-2">
            {/* 搜索 */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索结果..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-48"
              />
            </div>

            {/* 列选择 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllColumns(!showAllColumns)}
                >
                  {showAllColumns ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showAllColumns ? '隐藏部分列' : '显示所有列'}
              </TooltipContent>
            </Tooltip>

            {/* 导出 */}
            <Select onValueChange={handleExport}>
              <SelectTrigger className="w-24">
                <Download className="w-4 h-4" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="xlsx">Excel</SelectItem>
              </SelectContent>
            </Select>

            {/* 刷新 */}
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>

        {/* 统计信息 */}
        {(result || loading || error) && (
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            {executionTime > 0 && (
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{executionTime}ms</span>
              </div>
            )}
            {parsedData.totalRows > 0 && (
              <div className="flex items-center space-x-1">
                <TableIcon className="w-3 h-3" />
                <span>{parsedData.totalRows} 行</span>
              </div>
            )}
            {parsedData.columns.length > 0 && (
              <div className="flex items-center space-x-1">
                <BarChart3 className="w-3 h-3" />
                <span>{parsedData.columns.length} 列</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* 加载状态 */}
        {loading && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>正在加载查询结果...</span>
            </div>
            <Progress value={undefined} className="w-full" />
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 结果展示 */}
        {!loading && !error && result && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="table">表格视图</TabsTrigger>
              <TabsTrigger value="json">JSON 视图</TabsTrigger>
              <TabsTrigger value="chart">图表视图</TabsTrigger>
            </TabsList>

            {/* 表格视图 */}
            <TabsContent value="table" className="space-y-4">
              {filteredAndPaginatedData.columns.length > 0 ? (
                <>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {filteredAndPaginatedData.columns.map((column, index) => (
                            <TableHead key={index} className="font-medium">
                              <div className="flex items-center space-x-2">
                                <span>{column}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopy(column)}
                                  className="h-4 w-4 p-0"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndPaginatedData.rows.map((row: any, rowIndex: number) => (
                          <TableRow key={rowIndex}>
                            {row.map((cell: any, cellIndex: number) => (
                              <TableCell key={cellIndex} className="font-mono text-sm">
                                <div className="flex items-center space-x-2">
                                  <span className="truncate max-w-xs">
                                    {String(cell)}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopy(cell)}
                                    className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* 分页 */}
                  {filteredAndPaginatedData.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          每页显示
                        </span>
                        <Select
                          value={String(pageSize)}
                          onValueChange={(value) => {
                            setPageSize(Number(value));
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="200">200</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-muted-foreground">
                          条，共 {filteredAndPaginatedData.totalRows} 条
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage <= 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm">
                          第 {currentPage} 页，共 {filteredAndPaginatedData.totalPages} 页
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(filteredAndPaginatedData.totalPages, currentPage + 1))}
                          disabled={currentPage >= filteredAndPaginatedData.totalPages}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  没有查询结果
                </div>
              )}
            </TabsContent>

            {/* JSON 视图 */}
            <TabsContent value="json" className="space-y-4">
              <div className="border rounded-md p-4 bg-muted/50">
                <pre className="text-sm overflow-auto max-h-96 font-mono">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
              <Button
                variant="outline"
                onClick={() => handleCopy(result)}
                className="w-full"
              >
                <Copy className="w-4 h-4 mr-2" />
                复制 JSON
              </Button>
            </TabsContent>

            {/* 图表视图 */}
            <TabsContent value="chart" className="space-y-4">
              <div className="text-center text-muted-foreground py-8">
                图表视图功能开发中...
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* 空状态 */}
        {!loading && !error && !result && (
          <div className="text-center text-muted-foreground py-8">
            执行查询以查看结果
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MultiDatabaseQueryResults;
