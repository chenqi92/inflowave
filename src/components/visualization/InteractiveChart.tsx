import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Card, Button, Space, Tooltip, Dropdown, Select, Switch } from '@/components/ui';
import {
  FullscreenOutlined,
  FullscreenExitOutlined,
  DownloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ReloadOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined
} from '@/components/ui';
import * as echarts from 'echarts';
import { useVisualizationStore } from '@/store/visualization';
import { FormatUtils } from '@/utils/format';
import type { ChartConfig, QueryResult } from '@/types';

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

  const { updateChart } = useVisualizationStore();

  // 处理图表数据
  const chartOption = useMemo(() => {
    return generateChartOption(config, data);
  }, [config, data]);

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return;

    // 创建图表实例
    chartInstance.current = echarts.init(chartRef.current, config.settings?.theme || 'default');

    // 设置图表选项
    chartInstance.current.setOption(chartOption);

    // 绑定事件
    chartInstance.current.on('click', (params) => {
      onDataPointClick?.(params);
    });

    chartInstance.current.on('legendselectchanged', (params) => {
      onLegendClick?.(params.name);
      setSelectedSeries(Object.keys(params.selected).filter(key => params.selected[key]));
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
  }, []);

  // 更新图表选项
  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.setOption(chartOption, true);
    }
  }, [chartOption]);

  // 自动刷新
  useEffect(() => {
    if (!isAutoRefreshing || !refreshInterval) return;

    const timer = setInterval(() => {
      // TODO: 触发数据刷新
      console.log('Auto refreshing chart data...');
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

  const handleDownload = () => {
    if (!chartInstance.current) return;

    const downloadMenu = [
      {
        key: 'png',
        label: 'PNG 图片',
        onClick: () => {
          const url = chartInstance.current!.getDataURL({
            type: 'png',
            pixelRatio: 2,
            backgroundColor: '#fff',
          });
          downloadFile(url, `${config.title || 'chart'}.png`);
        },
      },
      {
        key: 'svg',
        label: 'SVG 矢量图',
        onClick: () => {
          const url = chartInstance.current!.getDataURL({
            type: 'svg',
          });
          downloadFile(url, `${config.title || 'chart'}.svg`);
        },
      },
      {
        key: 'json',
        label: 'JSON 数据',
        onClick: () => {
          const dataBlob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json',
          });
          const url = URL.createObjectURL(dataBlob);
          downloadFile(url, `${config.title || 'chart'}-data.json`);
        },
      },
    ];

    return downloadMenu;
  };

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
    updateChart(newConfig);
  };

  const settingsMenu = [
    {
      key: 'grid',
      label: (
        <div className="flex items-center justify-between w-32">
          <span>显示网格</span>
          <Switch
            size="small"
            checked={config.settings?.showGrid}
            onChange={(checked) => handleSettingsChange('showGrid', checked)}
          />
        </div>
      ),
    },
    {
      key: 'legend',
      label: (
        <div className="flex items-center justify-between w-32">
          <span>显示图例</span>
          <Switch
            size="small"
            checked={config.settings?.showLegend}
            onChange={(checked) => handleSettingsChange('showLegend', checked)}
          />
        </div>
      ),
    },
    {
      key: 'tooltip',
      label: (
        <div className="flex items-center justify-between w-32">
          <span>显示提示</span>
          <Switch
            size="small"
            checked={config.settings?.showTooltip}
            onChange={(checked) => handleSettingsChange('showTooltip', checked)}
          />
        </div>
      ),
    },
    {
      key: 'animation',
      label: (
        <div className="flex items-center justify-between w-32">
          <span>启用动画</span>
          <Switch
            size="small"
            checked={config.settings?.animation}
            onChange={(checked) => handleSettingsChange('animation', checked)}
          />
        </div>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <span>{config.title}</span>
          {selectedSeries.length > 0 && (
            <span className="text-sm text-gray-500">
              ({selectedSeries.length} 个系列已选择)
            </span>
          )}
        </Space>
      }
      extra={
        <Space>
          {autoRefresh && (
            <Tooltip title={isAutoRefreshing ? '暂停自动刷新' : '开始自动刷新'}>
              <Button
                size="small"
                icon={isAutoRefreshing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={() => setIsAutoRefreshing(!isAutoRefreshing)}
                type={isAutoRefreshing ? 'primary' : 'default'}
              />
            </Tooltip>
          )}

          <Tooltip title="重新加载">
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => window.location.reload()}
            />
          </Tooltip>

          <Tooltip title="放大">
            <Button
              size="small"
              icon={<ZoomInOutlined />}
              onClick={handleZoomIn}
              disabled={zoomLevel >= 200}
            />
          </Tooltip>

          <Tooltip title="缩小">
            <Button
              size="small"
              icon={<ZoomOutlined />}
              onClick={handleZoomOut}
              disabled={zoomLevel <= 50}
            />
          </Tooltip>

          <Dropdown
            menu={{ items: handleDownload() }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Tooltip title="下载">
              <Button size="small" icon={<DownloadOutlined />} />
            </Tooltip>
          </Dropdown>

          {allowEdit && (
            <Dropdown
              menu={{ items: settingsMenu }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Tooltip title="设置">
                <Button size="small" icon={<SettingOutlined />} />
              </Tooltip>
            </Dropdown>
          )}

          <Tooltip title={isFullscreen ? '退出全屏' : '全屏显示'}>
            <Button
              size="small"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={handleFullscreen}
            />
          </Tooltip>
        </Space>
      }
      className={`transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 m-0' : ''} ${className}`}
      style={{
        height: isFullscreen ? '100vh' : height,
      }}
    >
      <div
        ref={chartRef}
        className="w-full h-full"
        style={{
          transform: `scale(${zoomLevel / 100})`,
          transformOrigin: 'top left',
        }}
      />
      
      {zoomLevel !== 100 && (
        <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded text-xs text-gray-600">
          {zoomLevel}%
        </div>
      )}
    </Card>
  );
};

// 生成 ECharts 配置
function generateChartOption(config: ChartConfig, data: QueryResult): any {
  const { type, xAxis, yAxis, settings } = config;

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
    color: settings?.colors || ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'],
  };

  // 根据图表类型生成特定配置
  switch (type) {
    case 'line':
      return {
        ...baseOption,
        xAxis: {
          type: 'category',
          data: data.data?.map(row => row[xAxis.field]),
          boundaryGap: false,
        },
        yAxis: {
          type: 'value',
          name: yAxis.field,
        },
        series: [{
          name: yAxis.field,
          type: 'line',
          data: data.data?.map(row => row[yAxis.field]),
          smooth: settings?.smooth || false,
          areaStyle: type === 'area' ? { opacity: 0.3 } : undefined,
          label: {
            show: settings?.showDataLabels || false,
          },
        }],
      };

    case 'bar':
      return {
        ...baseOption,
        xAxis: {
          type: 'category',
          data: data.data?.map(row => row[xAxis.field]),
        },
        yAxis: {
          type: 'value',
          name: yAxis.field,
        },
        series: [{
          name: yAxis.field,
          type: 'bar',
          data: data.data?.map(row => row[yAxis.field]),
          label: {
            show: settings?.showDataLabels || false,
          },
        }],
      };

    case 'pie':
      return {
        ...baseOption,
        series: [{
          name: config.title,
          type: 'pie',
          radius: '50%',
          data: data.data?.map(row => ({
            name: row[xAxis.field],
            value: row[yAxis.field],
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
        }],
      };

    case 'scatter':
      return {
        ...baseOption,
        xAxis: {
          type: 'value',
          name: xAxis.field,
        },
        yAxis: {
          type: 'value',
          name: yAxis.field,
        },
        series: [{
          name: `${xAxis.field} vs ${yAxis.field}`,
          type: 'scatter',
          data: data.data?.map(row => [row[xAxis.field], row[yAxis.field]]),
          symbolSize: 8,
          label: {
            show: settings?.showDataLabels || false,
          },
        }],
      };

    default:
      return baseOption;
  }
}