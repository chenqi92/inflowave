import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  Label,
  Slider,
  Switch,
} from '@/components/ui';
import { useTheme } from '@/components/providers/ThemeProvider';
import { getUIInteractionError, formatErrorMessage } from '@/utils/userFriendlyErrors';
import { showMessage } from '@/utils/message';
import {
  TrendingUp,
  BarChart,
  PieChart,
  AreaChart,
  Circle,
  Settings,
  Download,
  Maximize,
} from 'lucide-react';
import * as echarts from 'echarts';
import type { QueryResult, Series } from '@/types';

interface ChartConfig {
  type: 'line' | 'bar' | 'area' | 'pie' | 'scatter' | 'gauge' | 'heatmap';
  title: string;
  theme: 'light' | 'dark';
  showLegend: boolean;
  showGrid: boolean;
  showTooltip: boolean;
  showDataZoom: boolean;
  smooth: boolean;
  stack: boolean;
  colorScheme: string[];
  animation: boolean;
  animationDuration: number;
}

interface AdvancedChartProps {
  data: QueryResult | null;
  height?: number;
  onConfigChange?: (config: ChartConfig) => void;
  initialConfig?: Partial<ChartConfig>;
}

const AdvancedChart: React.FC<AdvancedChartProps> = ({
  data,
  height = 400,
  onConfigChange,
  initialConfig = {},
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { resolvedTheme } = useTheme();
  const [config, setConfig] = useState<ChartConfig>({
    type: 'line',
    title: '数据图表',
    theme: resolvedTheme === 'dark' ? 'dark' : 'light',
    showLegend: true,
    showGrid: true,
    showTooltip: true,
    showDataZoom: true,
    smooth: true,
    stack: false,
    colorScheme: [
      '#5470c6',
      '#91cc75',
      '#fac858',
      '#ee6666',
      '#73c0de',
      '#3ba272',
      '#fc8452',
      '#9a60b4',
    ],
    animation: true,
    animationDuration: 1000,
    ...initialConfig,
  });

  // 预定义颜色方案
  const colorSchemes = {
    default: [
      '#5470c6',
      '#91cc75',
      '#fac858',
      '#ee6666',
      '#73c0de',
      '#3ba272',
      '#fc8452',
      '#9a60b4',
    ],
    blue: ['#1890ff', '#40a9ff', '#69c0ff', '#91d5ff', '#bae7ff', '#e6f7ff'],
    green: ['#52c41a', '#73d13d', '#95de64', '#b7eb8f', '#d9f7be', '#f6ffed'],
    red: ['#ff4d4f', '#ff7875', '#ffa39e', '#ffccc7', '#ffe1e1', '#fff1f0'],
    purple: ['#722ed1', '#9254de', '#b37feb', '#d3adf7', '#efdbff', '#f9f0ff'],
    orange: ['#fa8c16', '#ffa940', '#ffc069', '#ffd591', '#ffe7ba', '#fff7e6'],
  };

  // 处理图表数据
  const processChartData = useCallback(() => {
    if (!data || !data.results || data.results.length === 0) {
      return null;
    }

    // 获取第一个结果的第一个系列
    const firstResult = data.results[0];
    if (!firstResult.series || firstResult.series.length === 0) {
      return null;
    }

    const series: Series = firstResult.series[0];
    const timeColumn = series.columns.find(
      (col: string) =>
        col.toLowerCase().includes('time') ||
        col.toLowerCase().includes('timestamp')
    );

    const valueColumns = series.columns.filter(
      (col: string) =>
        col !== timeColumn &&
        series.values.some((row: (string | number | boolean | null)[]) => {
          const value = row[series.columns.indexOf(col)];
          return typeof value === 'number' || !isNaN(Number(value));
        })
    );

    if (valueColumns.length === 0) return null;

    const xAxisData = series.values.map((row: (string | number | boolean | null)[]) => {
      try {
        const timeValue = timeColumn
          ? row[series.columns.indexOf(timeColumn)]
          : row[0];
        if (typeof timeValue === 'string' && timeValue.includes('T')) {
          try {
            return new Date(timeValue).toLocaleString();
          } catch {
            return String(timeValue);
          }
        }
        // Convert null/undefined to string to satisfy ECharts type requirements
        return timeValue === null || timeValue === undefined ? '' : String(timeValue);
      } catch (error) {
        console.error('处理X轴数据时发生错误:', error);
        return '';
      }
    });

    const seriesData = valueColumns.map((col: string, index: number) => {
      const colIndex = series.columns.indexOf(col);
      const values = series.values.map((row: (string | number | boolean | null)[]) => {
        const value = row[colIndex];
        return typeof value === 'number' ? value : Number(value) || 0;
      });

      // 根据图表类型创建不同的系列配置
      const baseConfig = {
        name: col,
        itemStyle: {
          color: config.colorScheme[index % config.colorScheme.length],
        },
      };

      // 根据不同图表类型返回相应的配置
      switch (config.type) {
        case 'line':
          return {
            ...baseConfig,
            type: 'line' as const,
            data: values,
            smooth: config.smooth,
            lineStyle: { width: 2 },
            stack: config.stack ? 'total' : undefined,
          };
        case 'area':
          return {
            ...baseConfig,
            type: 'line' as const,
            data: values,
            smooth: config.smooth,
            areaStyle: {},
            stack: config.stack ? 'total' : undefined,
          };
        case 'bar':
          return {
            ...baseConfig,
            type: 'bar' as const,
            data: values,
            stack: config.stack ? 'total' : undefined,
          };
        case 'pie':
          return {
            ...baseConfig,
            type: 'pie' as const,
            data: values.map((value: number, i: number) => ({
              name: String(xAxisData[i]),
              value
            })),
            radius: '50%',
          };
        case 'scatter':
          return {
            ...baseConfig,
            type: 'scatter' as const,
            data: values,
          };
        case 'gauge':
          return {
            ...baseConfig,
            type: 'gauge' as const,
            data: [{ value: values[values.length - 1] || 0, name: col }],
          };
        case 'heatmap':
          return {
            ...baseConfig,
            type: 'heatmap' as const,
            data: values.map((value: number, i: number) => [i, 0, value]),
          };
        default:
          return {
            ...baseConfig,
            type: 'line' as const,
            data: values,
          };
      }
    });

    return { xAxisData, seriesData };
  }, [data, config]);

  // 更新图表
  const updateChart = useCallback(() => {
    if (!chartRef.current || !chartInstance.current) return;

    const chartData = processChartData();
    if (!chartData) return;

    const { xAxisData, seriesData } = chartData;

    const option: echarts.EChartsOption = {
      title: {
        text: config.title,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
        },
      },
      tooltip: config.showTooltip
        ? {
            trigger: config.type === 'pie' ? 'item' : 'axis',
            axisPointer: {
              type: 'cross',
              label: {
                backgroundColor: '#6a7985',
              },
            },
            formatter:
              config.type === 'pie' ? '{a} <br/>{b}: {c} ({d}%)' : undefined,
          }
        : undefined,
      legend: config.showLegend
        ? {
            data: seriesData.map(s => s.name),
            top: 30,
          }
        : undefined,
      grid:
        config.showGrid && config.type !== 'pie' && config.type !== 'gauge'
          ? {
              left: '3%',
              right: '4%',
              bottom: config.showDataZoom ? '15%' : '3%',
              containLabel: true,
              show: true,
              borderColor: '#ddd',
            }
          : undefined,
      xAxis:
        config.type !== 'pie' && config.type !== 'gauge'
          ? {
              type: 'category',
              boundaryGap: config.type === 'bar',
              data: xAxisData as string[],
              axisLabel: {
                rotate: xAxisData.length > 10 ? 45 : 0,
                interval: Math.max(0, Math.floor(xAxisData.length / 20)),
              },
            }
          : undefined,
      yAxis:
        config.type !== 'pie' && config.type !== 'gauge'
          ? {
              type: 'value',
              splitLine: {
                show: config.showGrid,
              },
            }
          : undefined,
      dataZoom:
        config.showDataZoom && config.type !== 'pie' && config.type !== 'gauge'
          ? [
              {
                type: 'inside',
                start: 0,
                end: 100,
              },
              {
                start: 0,
                end: 100,
                handleIcon:
                  'M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23.1h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
                handleSize: '80%',
                handleStyle: {
                  color: '#fff',
                  shadowBlur: 3,
                  shadowColor: 'rgba(0, 0, 0, 0.6)',
                  shadowOffsetX: 2,
                  shadowOffsetY: 2,
                },
              },
            ]
          : undefined,
      series: seriesData as any,
      animation: config.animation,
      animationDuration: config.animationDuration,
      backgroundColor: 'transparent',
    };

    // 特殊处理饼图 - 添加额外的样式配置
    if (config.type === 'pie' && seriesData.length > 0) {
      const pieData = seriesData[0] as any;
      option.series = [
        {
          ...pieData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          label: {
            show: true,
            formatter: '{b}: {c} ({d}%)',
          },
        },
      ];
    }

    chartInstance.current.setOption(option, true);
  }, [processChartData, config]);

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return;

    try {
      if (!chartInstance.current) {
        chartInstance.current = echarts.init(
          chartRef.current, 
          resolvedTheme === 'dark' ? 'dark' : 'light'
        );
      }

      updateChart();

      const handleResize = () => {
        try {
          chartInstance.current?.resize();
        } catch (error) {
          console.error('图表尺寸调整失败:', error);
          const friendlyError = getUIInteractionError('chart', String(error), config.type);
          showMessage.error(formatErrorMessage(friendlyError));
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    } catch (error) {
      console.error('图表初始化失败:', error);
      const friendlyError = getUIInteractionError('chart', String(error), config.type);
      showMessage.error(formatErrorMessage(friendlyError));
    }
  }, [data, config, updateChart, resolvedTheme]);

  // 监听主题变化，重新初始化图表和更新配置
  useEffect(() => {
    const newTheme = resolvedTheme === 'dark' ? 'dark' : 'light';
    if (config.theme !== newTheme) {
      setConfig(prev => ({ ...prev, theme: newTheme }));
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    }
  }, [resolvedTheme, config.theme]);

  // 清理图表实例
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  // 更新配置
  const updateConfig = (updates: Partial<ChartConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  // 导出图表
  const exportChart = () => {
    if (chartInstance.current) {
      const url = chartInstance.current.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#fff',
      });
      const link = document.createElement('a');
      link.download = `${config.title}.png`;
      link.href = url;
      link.click();
    }
  };

  // 全屏显示
  const toggleFullscreen = () => {
    if (chartRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        chartRef.current.requestFullscreen();
      }
    }
  };

  return (
    <Card className="w-full" style={{ height: showSettings ? height + 200 : height + 100 }}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          高级图表
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant={showSettings ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            设置
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportChart}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="flex items-center gap-2"
          >
            <Maximize className="w-4 h-4" />
            全屏
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Collapsible open={showSettings} onOpenChange={setShowSettings}>
          <CollapsibleContent className="px-6 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">图表类型</Label>
                <Select
                  value={config.type}
                  onValueChange={(value: string) => updateConfig({
                    type: value as 'line' | 'bar' | 'area' | 'pie' | 'scatter' | 'gauge' | 'heatmap'
                  })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择图表类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        折线图
                      </div>
                    </SelectItem>
                    <SelectItem value="bar">
                      <div className="flex items-center gap-2">
                        <BarChart className="w-4 h-4" />
                        柱状图
                      </div>
                    </SelectItem>
                    <SelectItem value="area">
                      <div className="flex items-center gap-2">
                        <AreaChart className="w-4 h-4" />
                        面积图
                      </div>
                    </SelectItem>
                    <SelectItem value="pie">
                      <div className="flex items-center gap-2">
                        <PieChart className="w-4 h-4" />
                        饼图
                      </div>
                    </SelectItem>
                    <SelectItem value="scatter">
                      <div className="flex items-center gap-2">
                        <Circle className="w-4 h-4" />
                        散点图
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">颜色方案</Label>
                <Select
                  value="default"
                  onValueChange={(value: string) =>
                    updateConfig({
                      colorScheme:
                        colorSchemes[value as keyof typeof colorSchemes],
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择颜色方案" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(colorSchemes).map(scheme => (
                      <SelectItem key={scheme} value={scheme}>
                        {scheme}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">动画时长</Label>
                <Slider
                  min={0}
                  max={3000}
                  value={[config.animationDuration]}
                  onValueChange={(values: number[]) =>
                    updateConfig({ animationDuration: values[0] })
                  }
                  className="w-full"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">显示选项</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-legend"
                      checked={config.showLegend}
                      onCheckedChange={(checked: boolean) =>
                        updateConfig({ showLegend: checked })
                      }
                    />
                    <Label htmlFor="show-legend" className="text-sm">显示图例</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-grid"
                      checked={config.showGrid}
                      onCheckedChange={(checked: boolean) =>
                        updateConfig({ showGrid: checked })
                      }
                    />
                    <Label htmlFor="show-grid" className="text-sm">显示网格</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="smooth-curve"
                      checked={config.smooth}
                      onCheckedChange={(checked: boolean) => updateConfig({ smooth: checked })}
                    />
                    <Label htmlFor="smooth-curve" className="text-sm">平滑曲线</Label>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div
          ref={chartRef}
          className="w-full"
          style={{
            height: showSettings ? height - 100 : height - 50,
            minHeight: 300,
          }}
        />
      </CardContent>
    </Card>
  );
};

export default AdvancedChart;
