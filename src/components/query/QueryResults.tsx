import React, { useState } from 'react';
import {
  DataTable,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
  Typography,
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
  FileText,
} from 'lucide-react';
import { useContextMenu } from '@/hooks/useContextMenu';
import ContextMenu from '@/components/common/ContextMenu';
// 本地类型定义
interface ColumnType<T = Record<string, unknown>> {
  title?: React.ReactNode;
  dataIndex?: string;
  key?: string;
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sorter?: boolean | ((a: T, b: T) => number);
  filters?: Array<{ text: string; value: unknown }>;
  onFilter?: (value: unknown, record: T) => boolean;
  ellipsis?: boolean;
}
import type { QueryResult } from '@/types';
import { safeTauriInvoke } from '@/utils/tauri';
import SimpleChart from '../common/SimpleChart';

const { Text } = Typography;

interface QueryResultsProps {
  result?: QueryResult | null;
  loading?: boolean;
}

const QueryResults: React.FC<QueryResultsProps> = ({
  result,
  loading = false,
}) => {
  const [activeTab, setActiveTab] = useState('table');
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
        columns: result?.series?.[0]?.columns || [],
        totalRows: result?.rowCount || 0
      }
    };
    
    showContextMenu(event, target);
  };

  // 格式化查询结果为表格数据
  const formatResultForTable = (queryResult: QueryResult) => {
    if (
      !queryResult ||
      !queryResult.series ||
      queryResult.series.length === 0
    ) {
      return { columns: [], dataSource: [] };
    }

    const series = queryResult.series[0];
    const columns: ColumnType<Record<string, unknown>>[] = series.columns.map(
      (col: string, index: number) => ({
        title: col,
        dataIndex: col,
        key: col,
        width: index === 0 ? 200 : 120, // 时间列宽一些
        ellipsis: true,
        align: 'left' as const,
        render: (value: unknown, record: Record<string, unknown>) => {
          const cellContent = (() => {
            if (value === null || value === undefined) {
              return <Text className="text-muted-foreground">NULL</Text>;
            }
            if (typeof value === 'number') {
              return <Text className="font-mono bg-muted px-1 rounded text-sm">{value.toLocaleString()}</Text>;
            }
            if (
              typeof value === 'string' &&
              value.includes('T') &&
              value.includes('Z')
            ) {
              // 可能是时间戳
              try {
                const date = new Date(value);
                return <Text className="font-mono bg-muted px-1 rounded text-sm">{date.toLocaleString()}</Text>;
              } catch {
                return <Text>{value}</Text>;
              }
            }
            return <Text>{String(value)}</Text>;
          })();

          return (
            <div
              onContextMenu={(e) => handleCellRightClick(e, record, col, value)}
              className="cursor-context-menu"
            >
              {cellContent}
            </div>
          );
        },
      })
    );

    const dataSource = series.values.map((row: unknown[], index: number) => {
      const record: Record<string, unknown> = { key: index };
      series.columns.forEach((col: string, colIndex: number) => {
        record[col] = row[colIndex];
      });
      return record;
    });

    return { columns, dataSource };
  };

  // 获取结果统计信息
  const getResultStats = (queryResult: QueryResult) => {
    if (!queryResult || !queryResult.series) {
      return null;
    }

    const totalRows = queryResult.rowCount || 0;
    const seriesCount = queryResult.series.length;
    const executionTime = queryResult.executionTime || 0;

    return {
      totalRows,
      seriesCount,
      executionTime,
      columns: queryResult.series[0]?.columns?.length || 0,
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
      !queryResult.series ||
      queryResult.series.length === 0
    ) {
      return false;
    }

    const series = queryResult.series[0];
    return series.columns.length >= 2 && series.values.length > 0;
  };

  // 准备图表数据
  const prepareChartData = (queryResult: QueryResult) => {
    if (!isChartable(queryResult)) return null;

    const series = queryResult.series[0];
    const timeColumn = series.columns.find(
      col =>
        col.toLowerCase().includes('time') ||
        col.toLowerCase().includes('timestamp')
    );

    const valueColumns = series.columns.filter(
      col =>
        col !== timeColumn &&
        typeof series.values[0]?.[series.columns.indexOf(col)] === 'number'
    );

    if (valueColumns.length === 0) return null;

    return {
      timeColumn,
      valueColumns,
      data: series.values.map(row => {
        const record: Record<string, unknown> = {};
        series.columns.forEach((col, index) => {
          record[col] = row[index];
        });
        return record;
      }),
    };
  };

  const { columns, dataSource } = result
    ? formatResultForTable(result)
    : { columns: [], dataSource: [] };
  const stats = result ? getResultStats(result) : null;

  const renderTableTab = () => (
    <ScrollArea className="h-full">
      {result ? (
        <DataTable
          columns={columns}
          dataSource={dataSource}
          scroll={{ x: 'max-content', y: 'calc(100vh - 300px)' }}
          size='small'
          bordered
          className="bg-background"
        />
      ) : (
        <Empty description='暂无查询结果' />
      )}
    </ScrollArea>
  );

  const renderJsonTab = () => (
    <ScrollArea className="h-full">
      <div className="p-4">
        {result ? (
          <pre className="bg-muted p-4 rounded-md text-xs leading-relaxed overflow-auto m-0 font-mono">
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : (
          <Empty description='暂无查询结果' />
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
                <Select value={chartType} onValueChange={(value) => setChartType(value as 'line' | 'bar' | 'area' | 'pie')}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder='选择图表类型' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='line'>
                      <div className='flex items-center gap-2'>
                        <TrendingUp className='w-4 h-4' />
                        <span>折线图</span>
                      </div>
                    </SelectItem>
                    <SelectItem value='bar'>
                      <div className='flex items-center gap-2'>
                        <BarChart className='w-4 h-4' />
                        <span>柱状图</span>
                      </div>
                    </SelectItem>
                    <SelectItem value='area'>
                      <div className='flex items-center gap-2'>
                        <AreaChart className='w-4 h-4' />
                        <span>面积图</span>
                      </div>
                    </SelectItem>
                    <SelectItem value='pie'>
                      <div className='flex items-center gap-2'>
                        <PieChart className='w-4 h-4' />
                        <span>饼图</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <SimpleChart data={prepareChartData(result)} type={chartType} />
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

  return (
    <Card className="h-full border-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Table className='w-5 h-5' />
            <span>查询结果</span>
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
                    <Download className='w-4 h-4 mr-2' />
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
                    <FileText className='w-4 h-4 mr-2' />
                    CSV 格式
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setExportFormat('json');
                      setExportModalVisible(true);
                    }}
                  >
                    <FileText className='w-4 h-4 mr-2' />
                    JSON 格式
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setExportFormat('excel');
                      setExportModalVisible(true);
                    }}
                  >
                    <FileText className='w-4 h-4 mr-2' />
                    Excel 格式
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Info className='w-4 h-4 mr-2' />
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
            <Spin size='large' tip='执行查询中...' />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="mx-4 mb-2">
              <TabsTrigger value="table" className="flex items-center gap-2">
                <Table className='w-4 h-4' />
                表格视图
                {stats && <Badge variant="secondary" className="ml-1">{stats.totalRows}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="json" className="flex items-center gap-2">
                <FileText className='w-4 h-4' />
                JSON 视图
              </TabsTrigger>
              <TabsTrigger value="chart" className="flex items-center gap-2">
                <BarChart className='w-4 h-4' />
                图表视图
              </TabsTrigger>
            </TabsList>

            <TabsContent value="table" className="flex-1 m-0 px-4">
              {renderTableTab()}
            </TabsContent>

            <TabsContent value="json" className="flex-1 m-0 px-4">
              {renderJsonTab()}
            </TabsContent>

            <TabsContent value="chart" className="flex-1 m-0 px-4">
              {renderChartTab()}
            </TabsContent>
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
              <Typography.Text className="font-medium">导出格式:</Typography.Text>
              <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as 'csv' | 'json' | 'excel')}>
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder='选择导出格式' />
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
                <Typography.Text className="text-muted-foreground">
                  将导出 {stats.totalRows} 行 × {stats.columns} 列数据
                </Typography.Text>
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
