import React, { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Text,
} from '@/components/ui';
import { Maximize, Download, RefreshCw } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ChartConfig as ShadcnChartConfig } from '@/components/ui';

// 图表类型定义 - 使用 Recharts 支持的图表类型
export type ChartType =
  | 'line'
  | 'bar'
  | 'area'
  | 'pie'
  | 'scatter';

// 图表配置接口
export interface AdvancedChartConfig {
  type: ChartType;
  title: string;
  data: any[];
  xAxis?: string;
  yAxis?: string;
  series?: string[];
  colors?: string[];
  theme?: 'light' | 'dark';
  animation?: boolean;
  grid?: {
    left?: string | number;
    right?: string | number;
    top?: string | number;
    bottom?: string | number;
  };
  legend?: {
    show?: boolean;
    position?: 'top' | 'bottom' | 'left' | 'right';
  };
  tooltip?: {
    show?: boolean;
    trigger?: 'item' | 'axis';
    formatter?: string | Function;
  };
  [key: string]: any;
}

interface AdvancedChartLibraryProps {
  config: AdvancedChartConfig;
  onConfigChange?: (config: AdvancedChartConfig) => void;
  height?: number;
  loading?: boolean;
  showControls?: boolean;
}

const AdvancedChartLibrary: React.FC<AdvancedChartLibraryProps> = ({
  config,
  onConfigChange,
  height = 400,
  loading = false,
  showControls = true,
}) => {
  const [fullscreen, setFullscreen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(config.theme || 'light');

  // 生成 shadcn 图表配置
  const chartConfig: ShadcnChartConfig = useMemo(() => {
    const baseConfig: ShadcnChartConfig = {};

    // 为每个数据系列生成配置
    config.series?.forEach((seriesName, index) => {
      baseConfig[seriesName] = {
        label: seriesName,
        color: config.colors?.[index] || `hsl(${index * 60}, 70%, 50%)`,
      };
    });

    // 如果没有系列配置，使用默认配置
    if (!config.series?.length) {
      baseConfig.value = {
        label: 'Value',
        color: config.colors?.[0] || 'hsl(220, 70%, 50%)',
      };
    }

    return baseConfig;
  }, [config.series, config.colors]);

  // 处理图表数据
  const processedData = useMemo(() => {
    if (!config.data || !Array.isArray(config.data)) {
      return [];
    }

    return config.data.map((item, index) => {
      if (typeof item === 'object' && item !== null) {
        return { ...item, index };
      }
      return { value: item, index };
    });
  }, [config.data]);

  // 渲染图表组件
  const renderChart = () => {
    if (!processedData.length) {
      return (
        <div className="flex items-center justify-center h-full">
          <Alert>
            <AlertDescription>暂无数据</AlertDescription>
          </Alert>
        </div>
      );
    }

    const chartHeight = fullscreen ? 'calc(100vh - 200px)' : height;

    switch (config.type) {
      case 'line':
        return (
          <ChartContainer config={chartConfig} className="h-full">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <LineChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey={config.xAxis || 'index'}
                  name={config.xAxis || 'X轴'}
                />
                <YAxis name={config.yAxis || 'Y轴'} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {config.legend?.show !== false && <Legend />}
                {config.series?.map((seriesName, index) => (
                  <Line
                    key={seriesName}
                    type="monotone"
                    dataKey={seriesName}
                    stroke={config.colors?.[index] || `hsl(${index * 60}, 70%, 50%)`}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                )) || (
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={config.colors?.[0] || 'hsl(220, 70%, 50%)'}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case 'bar':
        return (
          <ChartContainer config={chartConfig} className="h-full">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey={config.xAxis || 'index'}
                  name={config.xAxis || 'X轴'}
                />
                <YAxis name={config.yAxis || 'Y轴'} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {config.legend?.show !== false && <Legend />}
                {config.series?.map((seriesName, index) => (
                  <Bar
                    key={seriesName}
                    dataKey={seriesName}
                    fill={config.colors?.[index] || `hsl(${index * 60}, 70%, 50%)`}
                  />
                )) || (
                  <Bar
                    dataKey="value"
                    fill={config.colors?.[0] || 'hsl(220, 70%, 50%)'}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case 'area':
        return (
          <ChartContainer config={chartConfig} className="h-full">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <AreaChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey={config.xAxis || 'index'}
                  name={config.xAxis || 'X轴'}
                />
                <YAxis name={config.yAxis || 'Y轴'} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {config.legend?.show !== false && <Legend />}
                {config.series?.map((seriesName, index) => (
                  <Area
                    key={seriesName}
                    type="monotone"
                    dataKey={seriesName}
                    stroke={config.colors?.[index] || `hsl(${index * 60}, 70%, 50%)`}
                    fill={config.colors?.[index] || `hsl(${index * 60}, 70%, 50%)`}
                    fillOpacity={0.6}
                  />
                )) || (
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={config.colors?.[0] || 'hsl(220, 70%, 50%)'}
                    fill={config.colors?.[0] || 'hsl(220, 70%, 50%)'}
                    fillOpacity={0.6}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case 'pie':
        return (
          <ChartContainer config={chartConfig} className="h-full">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <PieChart>
                <Pie
                  data={processedData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {processedData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={config.colors?.[index] || `hsl(${index * 60}, 70%, 50%)`}
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                {config.legend?.show !== false && <Legend />}
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case 'scatter':
        return (
          <ChartContainer config={chartConfig} className="h-full">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ScatterChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey={config.xAxis || 'x'}
                  name={config.xAxis || 'X轴'}
                  type="number"
                />
                <YAxis
                  dataKey={config.yAxis || 'y'}
                  name={config.yAxis || 'Y轴'}
                  type="number"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                {config.legend?.show !== false && <Legend />}
                <Scatter
                  dataKey="value"
                  fill={config.colors?.[0] || 'hsl(220, 70%, 50%)'}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <Alert>
              <AlertDescription>不支持的图表类型: {config.type}</AlertDescription>
            </Alert>
          </div>
        );
    }
  };

  // 导出图表为图片
  const exportChart = (format: 'png' | 'jpg' | 'svg' = 'png') => {
    // 使用 html2canvas 或类似库来导出 SVG 图表
    // 这里提供一个简化的实现
    const chartElement = document.querySelector('[data-chart]');
    if (chartElement) {
      // 创建一个简单的下载链接
      const link = document.createElement('a');
      link.download = `chart.${format}`;
      // 注意：实际实现需要使用 html2canvas 等库
      console.log('导出功能需要集成 html2canvas 库');
    }
  };

  // 刷新图表
  const refreshChart = () => {
    // Recharts 会自动处理数据更新，这里可以触发重新渲染
    if (onConfigChange) {
      onConfigChange({ ...config });
    }
  };





  // 全屏切换
  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  // 主题切换
  const changeTheme = (theme: 'light' | 'dark') => {
    setCurrentTheme(theme);
    if (onConfigChange) {
      onConfigChange({ ...config, theme });
    }
  };

  // 图表类型选项 - 更新为 Recharts 支持的类型
  const chartTypeOptions = [
    { value: 'line', label: '折线图' },
    { value: 'bar', label: '柱状图' },
    { value: 'area', label: '面积图' },
    { value: 'pie', label: '饼图' },
    { value: 'scatter', label: '散点图' },
  ];

  return (
    <div className={fullscreen ? 'fixed inset-0 z-50 bg-background' : ''}>
      <Card className={fullscreen ? 'h-full' : ''}>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Text className="font-semibold">{config.title}</Text>
            </CardTitle>
            {showControls && (
              <div className="flex gap-2">
                <Select
                  value={config.type}
                  onValueChange={(value: ChartType) => {
                    if (onConfigChange) {
                      onConfigChange({ ...config, type: value });
                    }
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chartTypeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={currentTheme}
                  onValueChange={changeTheme}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">浅色</SelectItem>
                    <SelectItem value="dark">深色</SelectItem>
                  </SelectContent>
                </Select>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={refreshChart}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>刷新</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportChart()}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>导出</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={toggleFullscreen}
                      >
                        <Maximize className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>全屏</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                <Text className="text-muted-foreground">图表加载中...</Text>
              </div>
            </div>
          ) : (
            renderChart()
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedChartLibrary;
