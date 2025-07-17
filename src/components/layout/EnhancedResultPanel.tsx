import React, { useState, useEffect, useMemo } from 'react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui';
import {
  Play,
  BarChart3,
  Eye,
  Brain,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Download,
  Zap,
  Database,
  Activity,
  PieChart,
  LineChart,
  BarChart,
  Lightbulb,
  AlertTriangle,
  Info,
} from 'lucide-react';
import EChartsReact from 'echarts-for-react';
import type { QueryResult } from '@/types';

interface EnhancedResultPanelProps {
  collapsed?: boolean;
  queryResult?: QueryResult | null;
  executedQueries?: string[];
  executionTime?: number;
  onClearResult?: () => void;
}

interface DataInsight {
  type: 'trend' | 'anomaly' | 'pattern' | 'suggestion';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
}

interface FieldStatistics {
  fieldName: string;
  dataType: string;
  nullCount: number;
  uniqueCount: number;
  min?: number | string;
  max?: number | string;
  mean?: number;
  median?: number;
}

const EnhancedResultPanel: React.FC<EnhancedResultPanelProps> = ({
  collapsed = false,
  queryResult,
  executedQueries = [],
  executionTime = 0,
  onClearResult,
}) => {
  const [activeTab, setActiveTab] = useState('executor');
  const [visualizationType, setVisualizationType] = useState<'line' | 'bar' | 'pie'>('line');

  // 自动切换到数据预览标签页当有查询结果时
  useEffect(() => {
    if (queryResult) {
      setActiveTab('preview');
    }
  }, [queryResult]);

  // 解析查询结果数据
  const parsedData = useMemo(() => {
    if (!queryResult?.results?.[0]?.series?.[0]) return null;
    
    const series = queryResult.results[0].series[0];
    const { columns, values } = series;
    
    if (!columns || !values) return null;

    return {
      columns,
      values,
      rowCount: values.length,
      data: values.map((row, index) => {
        const record: Record<string, any> = { _id: index };
        columns.forEach((col, colIndex) => {
          record[col] = row[colIndex];
        });
        return record;
      })
    };
  }, [queryResult]);

  // 计算字段统计信息
  const fieldStatistics = useMemo((): FieldStatistics[] => {
    if (!parsedData) return [];

    return parsedData.columns.map(column => {
      const values = parsedData.data.map(row => row[column]).filter(val => val !== null && val !== undefined);
      const nullCount = parsedData.rowCount - values.length;
      const uniqueValues = new Set(values);
      
      // 判断数据类型
      const firstValue = values[0];
      let dataType = 'string';
      if (typeof firstValue === 'number') {
        dataType = 'number';
      } else if (typeof firstValue === 'boolean') {
        dataType = 'boolean';
      } else if (firstValue instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(String(firstValue))) {
        dataType = 'datetime';
      }

      const stat: FieldStatistics = {
        fieldName: column,
        dataType,
        nullCount,
        uniqueCount: uniqueValues.size,
      };

      // 计算数值统计
      if (dataType === 'number') {
        const numericValues = values as number[];
        stat.min = Math.min(...numericValues);
        stat.max = Math.max(...numericValues);
        stat.mean = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
        
        const sorted = [...numericValues].sort((a, b) => a - b);
        stat.median = sorted.length % 2 === 0 
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];
      }

      return stat;
    });
  }, [parsedData]);

  // 生成数据洞察
  const dataInsights = useMemo((): DataInsight[] => {
    if (!parsedData || parsedData.rowCount === 0) return [];

    const insights: DataInsight[] = [];

    // 数据量洞察
    if (parsedData.rowCount > 10000) {
      insights.push({
        type: 'suggestion',
        title: '大数据集优化建议',
        description: `查询返回了 ${parsedData.rowCount.toLocaleString()} 行数据，建议使用分页或添加时间范围限制以提高性能。`,
        severity: 'medium',
        confidence: 0.9
      });
    }

    // 数据质量检查
    const highNullFields = fieldStatistics.filter(stat => stat.nullCount / parsedData.rowCount > 0.3);
    if (highNullFields.length > 0) {
      insights.push({
        type: 'anomaly',
        title: '数据质量问题',
        description: `字段 ${highNullFields.map(f => f.fieldName).join(', ')} 包含超过30%的空值，可能影响分析结果。`,
        severity: 'high',
        confidence: 0.95
      });
    }

    // 时序数据模式识别
    const timeColumn = fieldStatistics.find(stat => stat.dataType === 'datetime');
    if (timeColumn) {
      insights.push({
        type: 'pattern',
        title: '时序数据检测',
        description: `检测到时间字段 "${timeColumn.fieldName}"，建议使用时序图表进行可视化分析。`,
        severity: 'low',
        confidence: 0.8
      });
    }

    // 性能洞察
    if (executionTime > 5000) {
      insights.push({
        type: 'suggestion',
        title: '查询性能优化',
        description: `查询耗时 ${(executionTime / 1000).toFixed(2)} 秒，建议检查索引或优化查询条件。`,
        severity: 'medium',
        confidence: 0.85
      });
    }

    return insights;
  }, [parsedData, fieldStatistics, executionTime]);

  // 生成可视化图表配置
  const chartOption = useMemo(() => {
    if (!parsedData || parsedData.rowCount === 0) return null;

    const timeColumn = fieldStatistics.find(stat => stat.dataType === 'datetime')?.fieldName;
    const numericColumns = fieldStatistics.filter(stat => stat.dataType === 'number').map(stat => stat.fieldName);

    if (!timeColumn || numericColumns.length === 0) {
      // 简单柱状图
      const categories = parsedData.data.slice(0, 10).map((_, index) => `行 ${index + 1}`);
      const firstNumericCol = numericColumns[0] || parsedData.columns[1];
      const values = parsedData.data.slice(0, 10).map(row => row[firstNumericCol] || 0);

      return {
        title: { text: '数据预览', left: 'center' },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: categories },
        yAxis: { type: 'value' },
        series: [{
          name: firstNumericCol,
          type: visualizationType === 'pie' ? 'pie' : visualizationType,
          data: visualizationType === 'pie' 
            ? categories.map((cat, index) => ({ name: cat, value: values[index] }))
            : values
        }]
      };
    }

    // 时序图表
    const timeData = parsedData.data.map(row => row[timeColumn]);
    const seriesData = numericColumns.slice(0, 3).map(column => ({
      name: column,
      type: 'line',
      data: parsedData.data.map(row => [row[timeColumn], row[column]])
    }));

    return {
      title: { text: '时序数据趋势', left: 'center' },
      tooltip: { trigger: 'axis' },
      legend: { top: 30 },
      xAxis: { type: 'time' },
      yAxis: { type: 'value' },
      series: seriesData
    };
  }, [parsedData, fieldStatistics, visualizationType]);

  if (collapsed) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <BarChart3 className="w-4 h-4" />
      </div>
    );
  }

  return (
    <div className="h-full bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="inline-flex h-8 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-auto">
          <TabsTrigger value="executor" className="flex items-center gap-1 px-3 py-1 text-xs">
            <Play className="w-3 h-3" />
            执行器
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-1 px-3 py-1 text-xs">
            <Eye className="w-3 h-3" />
            数据预览
            {parsedData && (
              <Badge variant="secondary" className="ml-1 text-xs px-1">
                {parsedData.rowCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="visualization" className="flex items-center gap-1 px-3 py-1 text-xs">
            <BarChart3 className="w-3 h-3" />
            可视化
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-1 px-3 py-1 text-xs">
            <Brain className="w-3 h-3" />
            洞察
            {dataInsights.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1">
                {dataInsights.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 查询执行器标签页 */}
        <TabsContent value="executor" className="flex-1 p-4 space-y-4 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 执行状态卡片 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  执行状态
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">状态</span>
                    <Badge variant={queryResult ? "default" : "secondary"} className="text-xs">
                      {queryResult ? (
                        <><CheckCircle className="w-3 h-3 mr-1" />成功</>
                      ) : (
                        <><Clock className="w-3 h-3 mr-1" />待执行</>
                      )}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">执行时间</span>
                    <span className="text-sm font-mono">{executionTime}ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">查询数</span>
                    <span className="text-sm font-mono">{executedQueries.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 性能指标卡片 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  性能指标
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>执行效率</span>
                      <span>{executionTime < 1000 ? '优秀' : executionTime < 5000 ? '良好' : '需优化'}</span>
                    </div>
                    <Progress value={Math.min(100, Math.max(0, 100 - (executionTime / 100)))} className="h-2" />
                  </div>
                  {parsedData && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>数据量</span>
                        <span className="font-mono">{parsedData.rowCount.toLocaleString()}</span>
                      </div>
                      <Progress value={Math.min(100, (parsedData.rowCount / 10000) * 100)} className="h-2" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 查询历史卡片 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  最近查询
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {executedQueries.length > 0 ? (
                    executedQueries.slice(-3).map((query, index) => (
                      <div key={index} className="text-xs p-2 bg-muted rounded">
                        <div className="font-mono truncate">{query}</div>
                        <div className="text-muted-foreground mt-1">
                          {new Date().toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      暂无查询历史
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 数据预览标签页 */}
        <TabsContent value="preview" className="flex-1 p-4 space-y-4 mt-0">
          {parsedData ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              {/* 字段统计 */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    字段统计
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">字段名</TableHead>
                        <TableHead className="text-xs">类型</TableHead>
                        <TableHead className="text-xs">空值</TableHead>
                        <TableHead className="text-xs">唯一值</TableHead>
                        <TableHead className="text-xs">范围</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fieldStatistics.map((stat, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-xs font-mono">{stat.fieldName}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-xs">{stat.dataType}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">{stat.nullCount}</TableCell>
                          <TableCell className="text-xs">{stat.uniqueCount}</TableCell>
                          <TableCell className="text-xs">
                            {stat.dataType === 'number' && stat.min !== undefined && stat.max !== undefined ? (
                              <span className="font-mono">
                                {typeof stat.min === 'number' ? stat.min.toFixed(2) : stat.min} ~ {typeof stat.max === 'number' ? stat.max.toFixed(2) : stat.max}
                              </span>
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* 数据样本 */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      数据样本 (前10行)
                    </div>
                    <Button variant="outline" size="sm" className="text-xs">
                      <Download className="w-3 h-3 mr-1" />
                      导出
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {parsedData.columns.map((column, index) => (
                          <TableHead key={index} className="text-xs">{column}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.data.slice(0, 10).map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {parsedData.columns.map((column, colIndex) => (
                            <TableCell key={colIndex} className="text-xs font-mono">
                              {String(row[column] || '-')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-sm">请执行查询以预览数据</p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 可视化标签页 */}
        <TabsContent value="visualization" className="flex-1 p-4 space-y-4 mt-0">
          {chartOption ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">数据可视化</h3>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs">
                        {visualizationType === 'line' && <LineChart className="w-3 h-3 mr-1" />}
                        {visualizationType === 'bar' && <BarChart className="w-3 h-3 mr-1" />}
                        {visualizationType === 'pie' && <PieChart className="w-3 h-3 mr-1" />}
                        {visualizationType === 'line' ? '折线图' : visualizationType === 'bar' ? '柱状图' : '饼图'}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setVisualizationType('line')}>
                        <LineChart className="w-3 h-3 mr-2" />折线图
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setVisualizationType('bar')}>
                        <BarChart className="w-3 h-3 mr-2" />柱状图
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setVisualizationType('pie')}>
                        <PieChart className="w-3 h-3 mr-2" />饼图
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="outline" size="sm" className="text-xs">
                    <Download className="w-3 h-3 mr-1" />
                    导出图表
                  </Button>
                </div>
              </div>
              <div className="flex-1 bg-white rounded border">
                <EChartsReact option={chartOption} style={{ height: '100%' }} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-sm">暂无可视化数据</p>
                <p className="text-xs mt-1">执行包含时间和数值字段的查询以生成图表</p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 数据洞察标签页 */}
        <TabsContent value="insights" className="flex-1 p-4 space-y-4 mt-0">
          {dataInsights.length > 0 ? (
            <div className="space-y-3">
              {dataInsights.map((insight, index) => (
                <Card key={index} className={`border-l-4 ${
                  insight.severity === 'high' ? 'border-l-red-500' :
                  insight.severity === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'
                }`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {insight.type === 'trend' && <TrendingUp className="w-4 h-4" />}
                      {insight.type === 'anomaly' && <AlertTriangle className="w-4 h-4" />}
                      {insight.type === 'pattern' && <Eye className="w-4 h-4" />}
                      {insight.type === 'suggestion' && <Lightbulb className="w-4 h-4" />}
                      {insight.title}
                      <Badge variant={
                        insight.severity === 'high' ? 'destructive' :
                        insight.severity === 'medium' ? 'default' : 'secondary'
                      } className="text-xs ml-auto">
                        {insight.severity === 'high' ? '高' : insight.severity === 'medium' ? '中' : '低'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">置信度:</span>
                      <Progress value={insight.confidence * 100} className="h-1 flex-1" />
                      <span className="text-xs font-mono">{(insight.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-sm">暂无数据洞察</p>
                <p className="text-xs mt-1">执行查询后将自动生成智能分析结果</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedResultPanel;