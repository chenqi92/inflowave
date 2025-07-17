import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const chartRef = useRef<any>(null);

  // 自动切换到数据标签页当有查询结果时
  useEffect(() => {
    if (queryResult) {
      setActiveTab('data');
    }
  }, [queryResult]);

  // 解析查询结果数据
  const parsedData = useMemo(() => {
    if (!queryResult?.results?.[0]?.series?.[0]) return null;
    
    const series = queryResult.results[0].series[0];
    const { columns, values } = series;
    
    if (!columns || !values) return null;

    let data = values.map((row, index) => {
      const record: Record<string, any> = { _id: index };
      columns.forEach((col, colIndex) => {
        record[col] = row[colIndex];
      });
      return record;
    });

    // 排序逻辑
    if (sortColumn) {
      data = [...data].sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];

        // 处理null和undefined
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
        if (bVal == null) return sortDirection === 'asc' ? -1 : 1;

        // 时间字段特殊处理
        if (sortColumn === 'time') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }
        
        // 数字比较
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        // 字符串比较
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        
        if (sortDirection === 'asc') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }

    return {
      columns,
      values,
      rowCount: values.length,
      data
    };
  }, [queryResult, sortColumn, sortDirection]);

  // 处理列排序
  const handleColumnSort = (column: string) => {
    if (sortColumn === column) {
      // 切换排序方向
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 新列，默认升序
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

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

    if (!timeColumn && numericColumns.length > 0) {
      // 数值型数据图表
      const categories = parsedData.data.slice(0, 10).map((_, index) => `行 ${index + 1}`);
      const firstNumericCol = numericColumns[0];
      const values = parsedData.data.slice(0, 10).map(row => row[firstNumericCol] || 0);

      if (visualizationType === 'pie') {
        // 饼图配置
        return {
          title: { text: `${firstNumericCol} 分布`, left: 'center' },
          tooltip: { 
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
          },
          legend: {
            type: 'scroll',
            orient: 'vertical',
            right: 10,
            top: 20,
            bottom: 20
          },
          series: [{
            name: firstNumericCol,
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['40%', '50%'],
            data: categories.map((cat, index) => ({ 
              name: cat, 
              value: Math.abs(values[index]) || 1
            })),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            label: {
              show: true,
              formatter: '{b}: {d}%'
            }
          }]
        };
      } else if (visualizationType === 'bar') {
        // 柱状图配置
        return {
          title: { text: `${firstNumericCol} 数据分布`, left: 'center' },
          tooltip: { 
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
          },
          xAxis: { 
            type: 'category', 
            data: categories,
            axisTick: { alignWithLabel: true }
          },
          yAxis: { 
            type: 'value',
            name: firstNumericCol
          },
          series: [{
            name: firstNumericCol,
            type: 'bar',
            data: values,
            itemStyle: {
              color: new Proxy({}, {
                get: function(target, prop) {
                  const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];
                  return colors[parseInt(prop) % colors.length];
                }
              })
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }]
        };
      } else {
        // 折线图配置
        return {
          title: { text: `${firstNumericCol} 趋势`, left: 'center' },
          tooltip: { trigger: 'axis' },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
          },
          xAxis: { 
            type: 'category', 
            data: categories,
            boundaryGap: false
          },
          yAxis: { 
            type: 'value',
            name: firstNumericCol
          },
          series: [{
            name: firstNumericCol,
            type: 'line',
            data: values,
            smooth: true,
            itemStyle: { color: '#5470c6' },
            areaStyle: { opacity: 0.3 }
          }]
        };
      }
    }

    if (timeColumn && numericColumns.length > 0) {
      // 时序图表
      const seriesData = numericColumns.slice(0, 3).map((column, index) => {
        const colors = ['#5470c6', '#91cc75', '#fac858'];
        return {
          name: column,
          type: visualizationType === 'pie' ? 'line' : visualizationType, // 时序数据不支持饼图
          data: parsedData.data.map(row => [row[timeColumn], row[column]]),
          smooth: visualizationType === 'line',
          itemStyle: { color: colors[index] },
          ...(visualizationType === 'line' ? { areaStyle: { opacity: 0.2 } } : {})
        };
      });

      return {
        title: { text: '时序数据趋势', left: 'center' },
        tooltip: { 
          trigger: 'axis',
          axisPointer: { type: 'cross' }
        },
        legend: { 
          top: 30,
          type: 'scroll'
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: { 
          type: 'time',
          name: timeColumn
        },
        yAxis: { 
          type: 'value',
          name: '数值'
        },
        series: seriesData,
        dataZoom: [{
          type: 'inside',
          start: 0,
          end: 100
        }, {
          start: 0,
          end: 100,
          handleIcon: 'M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23.1h6.6V24.4z M13.3,19.6H6.7v-1.2h6.6V19.6z',
          handleSize: '80%',
          handleStyle: {
            color: '#fff',
            shadowBlur: 3,
            shadowColor: 'rgba(0, 0, 0, 0.6)',
            shadowOffsetX: 2,
            shadowOffsetY: 2
          }
        }]
      };
    }

    // 无可视化数据
    return null;
  }, [parsedData, fieldStatistics, visualizationType]);

  // 导出图表功能
  const handleExportChart = useCallback((format: 'png' | 'svg' | 'pdf' = 'png') => {
    if (!chartRef.current) {
      console.error('图表实例未找到');
      return;
    }

    try {
      const chartInstance = chartRef.current.getEchartsInstance();
      if (!chartInstance) {
        console.error('ECharts实例未找到');
        return;
      }

      let dataURL: string;
      let fileName: string;
      
      switch (format) {
        case 'svg':
          dataURL = chartInstance.renderToSVGString();
          fileName = `chart_${new Date().getTime()}.svg`;
          // 创建SVG Blob并下载
          const svgBlob = new Blob([dataURL], { type: 'image/svg+xml' });
          const svgUrl = URL.createObjectURL(svgBlob);
          const svgLink = document.createElement('a');
          svgLink.href = svgUrl;
          svgLink.download = fileName;
          document.body.appendChild(svgLink);
          svgLink.click();
          document.body.removeChild(svgLink);
          URL.revokeObjectURL(svgUrl);
          break;
          
        case 'pdf':
          // PDF导出需要额外的库支持，这里先使用PNG替代
          dataURL = chartInstance.getDataURL({
            type: 'png',
            pixelRatio: 2,
            backgroundColor: '#fff'
          });
          fileName = `chart_${new Date().getTime()}.png`;
          break;
          
        default: // png
          dataURL = chartInstance.getDataURL({
            type: 'png',
            pixelRatio: 2,
            backgroundColor: '#fff'
          });
          fileName = `chart_${new Date().getTime()}.png`;
      }

      if (format !== 'svg') {
        // 对于PNG和PDF，使用dataURL下载
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      console.log(`图表已导出为 ${format.toUpperCase()} 格式`);
    } catch (error) {
      console.error('导出图表失败:', error);
    }
  }, []);

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
          <TabsTrigger value="data" className="flex items-center gap-1 px-3 py-1 text-xs">
            <Database className="w-3 h-3" />
            数据
            {parsedData && (
              <Badge variant="secondary" className="ml-1 text-xs px-1">
                {parsedData.rowCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-1 px-3 py-1 text-xs">
            <Info className="w-3 h-3" />
            字段统计
            {fieldStatistics.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1">
                {fieldStatistics.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="executor" className="flex items-center gap-1 px-3 py-1 text-xs">
            <Play className="w-3 h-3" />
            执行器
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-1 px-3 py-1 text-xs">
            <Eye className="w-3 h-3" />
            数据样本
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

        {/* 数据标签页 - 默认显示所有查询结果 */}
        <TabsContent value="data" className="flex-1 overflow-hidden mt-0">
          {parsedData ? (
            <div className="h-full flex flex-col">
              {/* 数据表格头部 */}
              <div className="flex-shrink-0 bg-muted/50 border-b px-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    <span className="text-sm font-medium">查询结果</span>
                    <Badge variant="outline" className="text-xs">
                      {parsedData.rowCount} 行
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="text-xs">
                      <Download className="w-3 h-3 mr-1" />
                      导出
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs" onClick={onClearResult}>
                      清空
                    </Button>
                  </div>
                </div>
              </div>

              {/* 可滚动的数据表格 */}
              <div className="flex-1 overflow-auto relative">
                <div className="min-w-full">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        {parsedData.columns.map((column, index) => (
                          <TableHead
                            key={index}
                            className={`px-3 py-2 text-left font-medium cursor-pointer hover:bg-muted/50 transition-colors ${
                              sortColumn === column ? 'bg-muted/50 text-foreground' : 'text-muted-foreground'
                            }`}
                            onClick={() => handleColumnSort(column)}
                          >
                            <div className="flex items-center gap-1 select-none">
                              <span className="text-xs">{column}</span>
                              <span className="text-xs opacity-60">
                                {sortColumn === column ? (
                                  sortDirection === 'asc' ? '↑' : '↓'
                                ) : '↕️'}
                              </span>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.data.map((row, rowIndex) => (
                        <TableRow
                          key={rowIndex}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          {parsedData.columns.map((column, colIndex) => (
                            <TableCell
                              key={colIndex}
                              className="px-3 py-2 font-mono text-xs"
                              style={{ maxWidth: '200px' }}
                            >
                              <div 
                                className="truncate" 
                                title={String(row[column] || '')}
                                style={{ 
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {column === 'time' && row[column]
                                  ? new Date(row[column]).toLocaleString()
                                  : String(row[column] || '-')
                                }
                              </div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* 底部状态栏 */}
              <div className="flex-shrink-0 bg-muted/30 border-t px-4 py-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>共 {parsedData.rowCount} 行数据</span>
                  <span>执行时间: {executionTime}ms</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-sm">请执行查询以查看数据</p>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 字段统计标签页 */}
        <TabsContent value="statistics" className="flex-1 overflow-hidden mt-0">
          {parsedData ? (
            <div className="h-full flex flex-col">
              {/* 字段统计头部 */}
              <div className="flex-shrink-0 bg-muted/50 border-b px-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    <span className="text-sm font-medium">字段统计信息</span>
                    <Badge variant="outline" className="text-xs">
                      {fieldStatistics.length} 个字段
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="text-xs">
                      <Download className="w-3 h-3 mr-1" />
                      导出统计
                    </Button>
                  </div>
                </div>
              </div>

              {/* 可滚动的统计表格 */}
              <div className="flex-1 overflow-auto relative">
                <div className="min-w-full">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="px-3 py-2 text-xs font-medium">字段名</TableHead>
                        <TableHead className="px-3 py-2 text-xs font-medium">数据类型</TableHead>
                        <TableHead className="px-3 py-2 text-xs font-medium">空值数量</TableHead>
                        <TableHead className="px-3 py-2 text-xs font-medium">唯一值数量</TableHead>
                        <TableHead className="px-3 py-2 text-xs font-medium">最小值</TableHead>
                        <TableHead className="px-3 py-2 text-xs font-medium">最大值</TableHead>
                        <TableHead className="px-3 py-2 text-xs font-medium">平均值</TableHead>
                        <TableHead className="px-3 py-2 text-xs font-medium">中位数</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fieldStatistics.map((stat, index) => (
                        <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="px-3 py-2 font-mono text-xs font-medium">
                            {stat.fieldName}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-xs">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                stat.dataType === 'number' ? 'border-blue-200 text-blue-700' :
                                stat.dataType === 'datetime' ? 'border-green-200 text-green-700' :
                                stat.dataType === 'boolean' ? 'border-purple-200 text-purple-700' :
                                'border-gray-200 text-gray-700'
                              }`}
                            >
                              {stat.dataType}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-3 py-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{stat.nullCount}</span>
                              {stat.nullCount > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {((stat.nullCount / parsedData.rowCount) * 100).toFixed(1)}%
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-3 py-2 text-xs font-mono">
                            {stat.uniqueCount.toLocaleString()}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-xs font-mono">
                            {stat.dataType === 'number' && stat.min !== undefined ? (
                              typeof stat.min === 'number' ? stat.min.toFixed(2) : stat.min
                            ) : '-'}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-xs font-mono">
                            {stat.dataType === 'number' && stat.max !== undefined ? (
                              typeof stat.max === 'number' ? stat.max.toFixed(2) : stat.max
                            ) : '-'}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-xs font-mono">
                            {stat.dataType === 'number' && stat.mean !== undefined ? 
                              stat.mean.toFixed(3) : '-'
                            }
                          </TableCell>
                          <TableCell className="px-3 py-2 text-xs font-mono">
                            {stat.dataType === 'number' && stat.median !== undefined ? 
                              stat.median.toFixed(3) : '-'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* 底部状态栏 */}
              <div className="flex-shrink-0 bg-muted/30 border-t px-4 py-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>共 {fieldStatistics.length} 个字段</span>
                  <span>数据总行数: {parsedData.rowCount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Info className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-sm">请执行查询以查看字段统计</p>
              </div>
            </div>
          )}
        </TabsContent>

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

        {/* 数据样本标签页 */}
        <TabsContent value="preview" className="flex-1 overflow-hidden mt-0">
          {parsedData ? (
            <div className="h-full flex flex-col">
              {/* 数据样本头部 */}
              <div className="flex-shrink-0 bg-muted/50 border-b px-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm font-medium">数据样本</span>
                    <Badge variant="outline" className="text-xs">
                      前 10 行
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="text-xs">
                      <Download className="w-3 h-3 mr-1" />
                      导出样本
                    </Button>
                  </div>
                </div>
              </div>

              {/* 可滚动的数据样本表格 */}
              <div className="flex-1 overflow-auto relative">
                <div className="min-w-full">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        {parsedData.columns.map((column, index) => (
                          <TableHead key={index} className="px-3 py-2 text-xs font-medium">
                            {column}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.data.slice(0, 10).map((row, rowIndex) => (
                        <TableRow key={rowIndex} className="hover:bg-muted/30 transition-colors">
                          {parsedData.columns.map((column, colIndex) => (
                            <TableCell 
                              key={colIndex} 
                              className="px-3 py-2 font-mono text-xs"
                              style={{ maxWidth: '200px' }}
                            >
                              <div 
                                className="truncate" 
                                title={String(row[column] || '')}
                                style={{ 
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {column === 'time' && row[column]
                                  ? new Date(row[column]).toLocaleString()
                                  : String(row[column] || '-')
                                }
                              </div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* 底部状态栏 */}
              <div className="flex-shrink-0 bg-muted/30 border-t px-4 py-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>显示前 10 行数据样本</span>
                  <span>总数据: {parsedData.rowCount.toLocaleString()} 行</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-sm">请执行查询以预览数据样本</p>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs">
                        <Download className="w-3 h-3 mr-1" />
                        导出图表
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleExportChart('png')}>
                        <Download className="w-3 h-3 mr-2" />导出为 PNG
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportChart('svg')}>
                        <Download className="w-3 h-3 mr-2" />导出为 SVG
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportChart('pdf')}>
                        <Download className="w-3 h-3 mr-2" />导出为 PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="flex-1 bg-white rounded border">
                <EChartsReact 
                  ref={chartRef}
                  option={chartOption} 
                  style={{ height: '100%' }} 
                  notMerge={true}
                  lazyUpdate={true}
                />
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