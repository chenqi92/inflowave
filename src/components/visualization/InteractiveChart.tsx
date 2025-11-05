import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Switch,
  TooltipWrapper as Tooltip,
  TooltipProvider,
} from '@/components/ui';
import { useTheme } from '@/components/providers/ThemeProvider';
import {
  Maximize,
  Minimize,
  Download,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Settings,
  PlayCircle,
  PauseCircle,
} from 'lucide-react';
import * as echarts from 'echarts';
import { useVisualizationStore } from '@/store/visualization';
import { FormatUtils } from '@/utils/format';
import { useTranslation } from '@/hooks/useTranslation';
import type { QueryResult, ChartConfig } from '@/types';

interface InteractiveChartProps {
  config: ChartConfig;
  data: QueryResult;
  height?: number | string;
  onConfigChange?: (config: ChartConfig) => void;
  onDataPointClick?: (dataPoint: any) => void;
  onLegendClick?: (legendName: string) => void;
  allowEdit?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  config,
  data,
  height = 400,
  onConfigChange,
  onDataPointClick,
  onLegendClick,
  allowEdit = false,
  autoRefresh = false,
  refreshInterval = 30000,
  className,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(autoRefresh);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const { resolvedTheme } = useTheme();
  const { t } = useTranslation();

  const { updateChart } = useVisualizationStore();

  // 处理图表数据
  const chartOption = useMemo(() => {
    return generateChartOption(config, data);
  }, [config, data]);

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return;

    // 创建图表实例
    chartInstance.current = echarts.init(
      chartRef.current,
      resolvedTheme === 'dark' ? 'dark' : 'light'
    );

    // 设置图表选项
    chartInstance.current.setOption(chartOption);

    // 绑定事件
    chartInstance.current.on('click', params => {
      onDataPointClick?.(params);
    });

    chartInstance.current.on('legendselectchanged', (params: any) => {
      onLegendClick?.(params.name);
      setSelectedSeries(
        Object.keys(params.selected).filter(key => params.selected[key])
      );
    });

    // 处理窗口大小变化
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [resolvedTheme]);

  // 更新图表选项
  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.setOption(chartOption, true);
    }
  }, [chartOption]);

  // 自动刷新
  useEffect(() => {
    if (!isAutoRefreshing || !refreshInterval) return;

    const timer = setInterval(async () => {
      try {
        console.log('🔄 自动刷新图表数据...');

        // 触发数据刷新 - 重新执行查询
        if (config.query && config.connectionId) {
          // 这里可以调用查询API重新获取数据
          // 暂时通过事件通知父组件刷新数据
          window.dispatchEvent(new CustomEvent('chart-auto-refresh', {
            detail: {
              chartId: config.id,
              query: config.query,
              connectionId: config.connectionId,
            }
          }));

          console.log('✅ 图表自动刷新请求已发送');
        }
      } catch (error) {
        console.error('❌ 图表自动刷新失败:', error);
      }
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [isAutoRefreshing, refreshInterval]);

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // 延迟调整大小以确保DOM更新完成
    setTimeout(() => {
      chartInstance.current?.resize();
    }, 100);
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel + 25, 200);
    setZoomLevel(newZoom);
    chartInstance.current?.resize();
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel - 25, 50);
    setZoomLevel(newZoom);
    chartInstance.current?.resize();
  };

  const handleDownloadPNG = () => {
    if (!chartInstance.current) return;
    const url = chartInstance.current.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff',
    });
    downloadFile(url, `${config.title || 'chart'}.png`);
  };

  const handleDownloadSVG = () => {
    if (!chartInstance.current) return;
    const url = chartInstance.current.getDataURL({
      type: 'svg',
    });
    downloadFile(url, `${config.title || 'chart'}.svg`);
  };

  const handleDownloadJSON = () => {
    const dataBlob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(dataBlob);
    downloadFile(url, `${config.title || 'chart'}-data.json`);
  };

  const renderDownloadMenu = () => (
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={handleDownloadPNG}>
        {t('menu.context_menu.png_image')}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleDownloadSVG}>
        {t('menu.context_menu.svg_vector')}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleDownloadJSON}>
        {t('menu.context_menu.json_data')}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSettingsChange = (key: string, value: any) => {
    if (!allowEdit) return;

    const newConfig = {
      ...config,
      settings: {
        ...config.settings,
        [key]: value,
      },
    };

    onConfigChange?.(newConfig);
    // updateChart expects (id, updates) but we don't have chart id here
    // This call might need to be removed or modified based on the component's context
  };

  const renderSettingsMenu = () => (
    <DropdownMenuContent align="end" className="w-48">
      <DropdownMenuItem className="flex items-center justify-between p-3">
        <span>显示网格</span>
        <Switch
          checked={config.settings?.showGrid}
          onCheckedChange={checked => handleSettingsChange('showGrid', checked)}
        />
      </DropdownMenuItem>
      <DropdownMenuItem className="flex items-center justify-between p-3">
        <span>显示图例</span>
        <Switch
          checked={config.settings?.showLegend}
          onCheckedChange={checked =>
            handleSettingsChange('showLegend', checked)
          }
        />
      </DropdownMenuItem>
      <DropdownMenuItem className="flex items-center justify-between p-3">
        <span>显示提示</span>
        <Switch
          checked={config.settings?.showTooltip}
          onCheckedChange={checked =>
            handleSettingsChange('showTooltip', checked)
          }
        />
      </DropdownMenuItem>
      <DropdownMenuItem className="flex items-center justify-between p-3">
        <span>启用动画</span>
        <Switch
          checked={config.settings?.animation}
          onCheckedChange={checked =>
            handleSettingsChange('animation', checked)
          }
        />
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  return (
    <TooltipProvider>
      <Card
        className={`transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 m-0' : ''} ${className}`}
        style={{
          height: isFullscreen ? '100vh' : height,
        }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <span>{config.title}</span>
            {selectedSeries.length > 0 && (
              <span className="text-sm text-muted-foreground font-normal">
                ({selectedSeries.length} 个系列已选择)
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {autoRefresh && (
              <Tooltip title={isAutoRefreshing ? '暂停自动刷新' : '开始自动刷新'}>
                <Button
                  size="sm"
                  onClick={() => setIsAutoRefreshing(!isAutoRefreshing)}
                  variant={isAutoRefreshing ? 'default' : 'outline'}
                >
                  {isAutoRefreshing ? (
                    <PauseCircle className="w-4 h-4" />
                  ) : (
                    <PlayCircle className="w-4 h-4" />
                  )}
                </Button>
              </Tooltip>
            )}

            <Tooltip title="重新加载">
              <Button
                size="sm"
                onClick={() => window.location.reload()}
                variant="outline"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </Tooltip>

            <Tooltip title="放大">
              <Button
                size="sm"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 200}
                variant="outline"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </Tooltip>

            <Tooltip title="缩小">
              <Button
                size="sm"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 50}
                variant="outline"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Tooltip title="下载">
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4" />
                  </Button>
                </Tooltip>
              </DropdownMenuTrigger>
              {renderDownloadMenu()}
            </DropdownMenu>

            {allowEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Tooltip title="设置">
                    <Button size="sm" variant="outline">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </Tooltip>
                </DropdownMenuTrigger>
                {renderSettingsMenu()}
              </DropdownMenu>
            )}

            <Tooltip title={isFullscreen ? '退出全屏' : '全屏显示'}>
              <Button size="sm" onClick={handleFullscreen} variant="outline">
                {isFullscreen ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </Button>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div
            ref={chartRef}
            className="w-full h-full"
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top left',
            }}
          />

          {zoomLevel !== 100 && (
            <div className="absolute bottom-2 right-2 bg-background/90 border rounded px-2 py-1 text-xs text-muted-foreground">
              {zoomLevel}%
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

// 生成 ECharts 配置
function generateChartOption(config: ChartConfig, data: QueryResult): any {
  const { type, xAxis, yAxis, settings } = config;

  // 获取第一个系列的数据
  const series = data.results?.[0]?.series?.[0];
  if (!series) {
    return {};
  }

  // 基础配置
  const baseOption = {
    title: {
      text: config.title,
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal',
      },
    },
    tooltip: {
      show: settings?.showTooltip !== false,
      trigger: type === 'pie' ? 'item' : 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985',
        },
      },
      formatter: (params: any) => {
        if (Array.isArray(params)) {
          return params
            .map(p => `${p.seriesName}: ${FormatUtils.formatNumber(p.value)}`)
            .join('<br/>');
        }
        return `${params.seriesName}: ${FormatUtils.formatNumber(params.value)}`;
      },
    },
    legend: {
      show: settings?.showLegend !== false,
      top: 30,
      type: 'scroll',
    },
    grid: {
      show: settings?.showGrid !== false,
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    animation: settings?.animation !== false,
    color: settings?.colors || [
      '#1890ff',
      '#52c41a',
      '#faad14',
      '#f5222d',
      '#722ed1',
    ],
  };

  // 获取列索引
  const xAxisIndex = series.columns.indexOf(xAxis?.field || '');
  const yAxisIndex = series.columns.indexOf(yAxis?.field || '');

  if (xAxisIndex === -1 || yAxisIndex === -1) {
    return baseOption;
  }

  // 根据图表类型生成特定配置
  switch (type) {
    case 'line':
      return {
        ...baseOption,
        xAxis: {
          type: 'category',
          data: series.values?.map(row => row[xAxisIndex]),
          boundaryGap: false,
        },
        yAxis: {
          type: 'value',
          name: yAxis?.field || 'Value',
        },
        series: [
          {
            name: yAxis?.field || 'Value',
            type: 'line',
            data: series.values?.map(row => row[yAxisIndex]),
            smooth: settings?.smooth || false,
            label: {
              show: settings?.showDataLabels || false,
            },
          },
        ],
      };

    case 'area':
      return {
        ...baseOption,
        xAxis: {
          type: 'category',
          data: series.values?.map(row => row[xAxisIndex]),
          boundaryGap: false,
        },
        yAxis: {
          type: 'value',
          name: yAxis?.field || 'Value',
        },
        series: [
          {
            name: yAxis?.field || 'Value',
            type: 'line',
            data: series.values?.map(row => row[yAxisIndex]),
            smooth: settings?.smooth || false,
            areaStyle: { opacity: 0.3 },
            label: {
              show: settings?.showDataLabels || false,
            },
          },
        ],
      };

    case 'bar':
      return {
        ...baseOption,
        xAxis: {
          type: 'category',
          data: series.values?.map(row => row[xAxisIndex]),
        },
        yAxis: {
          type: 'value',
          name: yAxis?.field || 'Value',
        },
        series: [
          {
            name: yAxis?.field || 'Value',
            type: 'bar',
            data: series.values?.map(row => row[yAxisIndex]),
            label: {
              show: settings?.showDataLabels || false,
            },
          },
        ],
      };

    case 'pie':
      return {
        ...baseOption,
        series: [
          {
            name: config.title,
            type: 'pie',
            radius: '50%',
            data: series.values?.map(row => ({
              name: row[xAxisIndex],
              value: row[yAxisIndex],
            })),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
            label: {
              show: settings?.showDataLabels !== false,
            },
          },
        ],
      };

    case 'scatter':
      return {
        ...baseOption,
        xAxis: {
          type: 'value',
          name: xAxis?.field || 'X',
        },
        yAxis: {
          type: 'value',
          name: yAxis?.field || 'Y',
        },
        series: [
          {
            name: `${xAxis?.field || 'X'} vs ${yAxis?.field || 'Y'}`,
            type: 'scatter',
            data: series.values?.map(row => [row[xAxisIndex], row[yAxisIndex]]),
            symbolSize: 8,
            label: {
              show: settings?.showDataLabels || false,
            },
          },
        ],
      };

    default:
      return baseOption;
  }
}
