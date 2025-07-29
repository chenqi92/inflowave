import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Input,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ScrollArea,
  Badge,
  TooltipProvider,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Textarea,
} from '@/components/ui';
import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Plus,
  RefreshCw,
  MoreVertical,
  Trash2,
  Eye,
  Database,
  Activity,
  AlertCircle,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import type { QueryResult } from '@/types';

interface ChartConfig {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  query: string;
  database: string;
  connectionId: string;
  options?: any;
  createdAt: Date;
  updatedAt: Date;
}

interface VerticalVisualizationProps {
  className?: string;
}

export const VerticalVisualization: React.FC<VerticalVisualizationProps> = ({
  className = '',
}) => {
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedChart, setSelectedChart] = useState<ChartConfig | null>(null);

  // 创建图表表单状态
  const [newChart, setNewChart] = useState({
    title: '',
    type: 'line' as ChartConfig['type'],
    query: '',
    database: '',
  });

  const { resolvedTheme } = useTheme();
  const { activeConnectionId, connections } = useConnectionStore();

  // 获取可用数据库列表
  const [databases, setDatabases] = useState<string[]>([]);

  useEffect(() => {
    if (activeConnectionId) {
      loadDatabases();
      loadCharts();
    }
  }, [activeConnectionId]);

  const loadDatabases = async () => {
    if (!activeConnectionId) return;
    
    try {
      const result = await safeTauriInvoke<string[]>('get_databases', {
        connectionId: activeConnectionId,
      });
      setDatabases(result || []);
    } catch (error) {
      console.error('加载数据库列表失败:', error);
    }
  };

  const loadCharts = async () => {
    try {
      // 从本地存储加载图表配置
      const savedCharts = localStorage.getItem('visualization-charts');
      if (savedCharts) {
        const parsedCharts: ChartConfig[] = JSON.parse(savedCharts);
        setCharts(parsedCharts);
      } else {
        // 如果没有保存的图表，初始化为空数组
        setCharts([]);
      }
    } catch (error) {
      console.error('加载图表配置失败:', error);
      setCharts([]);
    }
  };

  // 过滤图表
  const filteredCharts = useMemo(() => {
    return charts.filter(chart => {
      const matchesSearch = !searchText ||
        chart.title.toLowerCase().includes(searchText.toLowerCase()) ||
        chart.query.toLowerCase().includes(searchText.toLowerCase());
      const matchesType = !selectedType || selectedType === 'all' || chart.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [charts, searchText, selectedType]);

  // 执行查询并生成图表
  const executeQueryForChart = async (chartConfig: ChartConfig): Promise<QueryResult | null> => {
    if (!activeConnectionId) return null;

    try {
      setLoading(true);
      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        connectionId: activeConnectionId,
        database: chartConfig.database,
        query: chartConfig.query,
      });
      return result;
    } catch (error) {
      showMessage.error(`查询执行失败: ${error}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 转换查询结果为 ECharts 配置
  const convertToEChartsOption = (result: QueryResult, chartConfig: ChartConfig) => {
    if (!result.results?.[0]?.series?.[0]) return null;

    const series = result.results[0].series[0];
    const isDark = resolvedTheme === 'dark';
    
    const baseOption = {
      backgroundColor: 'transparent',
      textStyle: {
        color: isDark ? '#ffffff' : '#000000',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
        borderColor: isDark ? '#404040' : '#d9d9d9',
        textStyle: {
          color: isDark ? '#ffffff' : '#000000',
        },
      },
      legend: {
        textStyle: {
          color: isDark ? '#ffffff' : '#000000',
        },
      },
    };

    switch (chartConfig.type) {
      case 'line':
      case 'area':
        return {
          ...baseOption,
          xAxis: {
            type: 'category',
            data: series.values.map(row => {
              const timeValue = row[0];
              return timeValue ? new Date(timeValue as string).toLocaleTimeString() : '';
            }),
            axisLabel: { color: isDark ? '#ffffff' : '#000000' },
            axisLine: { lineStyle: { color: isDark ? '#404040' : '#d9d9d9' } },
          },
          yAxis: {
            type: 'value',
            axisLabel: { color: isDark ? '#ffffff' : '#000000' },
            axisLine: { lineStyle: { color: isDark ? '#404040' : '#d9d9d9' } },
            splitLine: { lineStyle: { color: isDark ? '#404040' : '#f0f0f0' } },
          },
          series: [{
            name: series.columns[1] || 'Value',
            type: chartConfig.type === 'area' ? 'line' : 'line',
            data: series.values.map(row => row[1]),
            areaStyle: chartConfig.type === 'area' ? {} : undefined,
            smooth: true,
          }],
          grid: {
            left: '10%',
            right: '10%',
            bottom: '15%',
            top: '15%',
          },
        };

      case 'bar':
        return {
          ...baseOption,
          xAxis: {
            type: 'category',
            data: series.values.map(row => row[0]),
            axisLabel: { color: isDark ? '#ffffff' : '#000000' },
            axisLine: { lineStyle: { color: isDark ? '#404040' : '#d9d9d9' } },
          },
          yAxis: {
            type: 'value',
            axisLabel: { color: isDark ? '#ffffff' : '#000000' },
            axisLine: { lineStyle: { color: isDark ? '#404040' : '#d9d9d9' } },
            splitLine: { lineStyle: { color: isDark ? '#404040' : '#f0f0f0' } },
          },
          series: [{
            name: series.columns[1] || 'Value',
            type: 'bar',
            data: series.values.map(row => row[1]),
          }],
          grid: {
            left: '10%',
            right: '10%',
            bottom: '15%',
            top: '15%',
          },
        };

      case 'pie':
        return {
          ...baseOption,
          series: [{
            name: 'Data',
            type: 'pie',
            radius: ['30%', '70%'],
            center: ['50%', '50%'],
            data: series.values.map(row => ({
              name: row[0],
              value: row[1],
            })),
            label: {
              color: isDark ? '#ffffff' : '#000000',
            },
          }],
        };

      default:
        return null;
    }
  };

  // 创建新图表
  const handleCreateChart = async () => {
    if (!newChart.title || !newChart.query || !newChart.database) {
      showMessage.error('请填写完整的图表信息');
      return;
    }

    const chartConfig: ChartConfig = {
      id: `chart-${Date.now()}`,
      title: newChart.title,
      type: newChart.type,
      query: newChart.query,
      database: newChart.database,
      connectionId: activeConnectionId || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 执行查询并生成图表选项
    const result = await executeQueryForChart(chartConfig);
    if (result) {
      const options = convertToEChartsOption(result, chartConfig);
      if (options) {
        chartConfig.options = options;
        const updatedCharts = [...charts, chartConfig];
        setCharts(updatedCharts);
        // 保存到本地存储
        localStorage.setItem('visualization-charts', JSON.stringify(updatedCharts));
        setCreateModalOpen(false);
        setNewChart({ title: '', type: 'line', query: '', database: '' });
        showMessage.success('图表创建成功');
      }
    }
  };

  // 刷新图表
  const handleRefreshChart = async (chart: ChartConfig) => {
    const result = await executeQueryForChart(chart);
    if (result) {
      const options = convertToEChartsOption(result, chart);
      if (options) {
        const updatedCharts = charts.map(c =>
          c.id === chart.id ? { ...c, options, updatedAt: new Date() } : c
        );
        setCharts(updatedCharts);
        // 更新本地存储
        localStorage.setItem('visualization-charts', JSON.stringify(updatedCharts));
        showMessage.success('图表已刷新');
      }
    }
  };

  // 删除图表
  const handleDeleteChart = (chartId: string) => {
    const updatedCharts = charts.filter(c => c.id !== chartId);
    setCharts(updatedCharts);
    // 更新本地存储
    localStorage.setItem('visualization-charts', JSON.stringify(updatedCharts));
    showMessage.success('图表已删除');
  };

  // 预览图表
  const handlePreviewChart = (chart: ChartConfig) => {
    setSelectedChart(chart);
    setPreviewModalOpen(true);
  };

  // 获取图表类型图标
  const getChartTypeIcon = (type: ChartConfig['type']) => {
    switch (type) {
      case 'line':
        return <LineChart className="w-4 h-4" />;
      case 'bar':
        return <BarChart3 className="w-4 h-4" />;
      case 'pie':
        return <PieChart className="w-4 h-4" />;
      case 'area':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (!activeConnectionId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">需要连接数据库</h3>
        <p className="text-sm text-muted-foreground">
          请先在连接管理中选择一个活跃的数据库连接
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={`h-full flex flex-col bg-background ${className}`}>
        {/* 头部 */}
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">数据可视化</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadCharts}
                disabled={loading}
                className="h-7 w-7 p-0"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    <Plus className="w-3 h-3 mr-1" />
                    新建
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>创建新图表</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium">图表标题</label>
                      <Input
                        value={newChart.title}
                        onChange={(e) => setNewChart(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="输入图表标题"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">图表类型</label>
                      <Select
                        value={newChart.type}
                        onValueChange={(value) => setNewChart(prev => ({ ...prev, type: value as ChartConfig['type'] }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="line">折线图</SelectItem>
                          <SelectItem value="bar">柱状图</SelectItem>
                          <SelectItem value="pie">饼图</SelectItem>
                          <SelectItem value="area">面积图</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium">数据库</label>
                      <Select
                        value={newChart.database}
                        onValueChange={(value) => setNewChart(prev => ({ ...prev, database: value }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="选择数据库" />
                        </SelectTrigger>
                        <SelectContent>
                          {databases.map(db => (
                            <SelectItem key={db} value={db}>{db}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium">查询语句</label>
                      <Textarea
                        value={newChart.query}
                        onChange={(e) => setNewChart(prev => ({ ...prev, query: e.target.value }))}
                        placeholder="输入 InfluxQL 查询语句"
                        className="text-xs min-h-[80px]"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCreateModalOpen(false)}
                      >
                        取消
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleCreateChart}
                        disabled={loading}
                      >
                        创建
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* 搜索和过滤 */}
          <div className="space-y-2">
            <SearchInput
              placeholder="搜索图表..."
              value={searchText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              onClear={() => setSearchText('')}
              className="h-8 text-xs"
              iconSize="sm"
            />
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="所有类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有类型</SelectItem>
                <SelectItem value="line">折线图</SelectItem>
                <SelectItem value="bar">柱状图</SelectItem>
                <SelectItem value="pie">饼图</SelectItem>
                <SelectItem value="area">面积图</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 图表列表 */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : filteredCharts.length > 0 ? (
              filteredCharts.map(chart => (
                <Card key={chart.id} className="hover:shadow-sm transition-shadow">
                  <CardHeader className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getChartTypeIcon(chart.type)}
                          <h4 className="text-sm font-medium truncate">{chart.title}</h4>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            <Database className="w-3 h-3 mr-1" />
                            {chart.database}
                          </Badge>
                          <span>{formatTime(chart.updatedAt)}</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePreviewChart(chart)}>
                            <Eye className="w-4 h-4 mr-2" />
                            预览
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRefreshChart(chart)}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            刷新
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteChart(chart.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    {chart.options ? (
                      <div className="h-32 w-full">
                        <ReactECharts
                          option={chart.options}
                          style={{ height: '100%', width: '100%' }}
                          opts={{ renderer: 'canvas' }}
                        />
                      </div>
                    ) : (
                      <div className="h-32 flex items-center justify-center bg-muted/50 rounded">
                        <Activity className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BarChart3 className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchText || selectedType ? '没有匹配的图表' : '暂无图表'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  点击"新建"创建您的第一个图表
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 预览模态框 */}
        <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedChart && getChartTypeIcon(selectedChart.type)}
                {selectedChart?.title}
              </DialogTitle>
            </DialogHeader>
            {selectedChart?.options && (
              <div className="h-96">
                <ReactECharts
                  option={selectedChart.options}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default VerticalVisualization;
