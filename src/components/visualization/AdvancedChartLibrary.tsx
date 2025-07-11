import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, Select, Button, Row, Col, Typography, Space, Tooltip, Alert } from '@/components/ui';
import { FullscreenOutlined, DownloadOutlined, SettingOutlined, ReloadOutlined } from '@/components/ui';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

const { Text } = Typography;
const { Option } = Select;

// 图表类型定义
export type ChartType = 'scatter' | 'heatmap' | 'gauge' | 'radar' | 'treemap' | 'sankey' | 'funnel' | 'sunburst' | 'parallel' | 'candlestick';

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
  const chartRef = useRef<ReactECharts>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(config.theme || 'light');

  // 图表选项生成器
  const generateChartOptions = useMemo(() => {
    const baseOptions = {
      title: {
        text: config.title,
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
        },
      },
      animation: config.animation !== false,
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
        ...config.grid,
      },
      tooltip: {
        show: true,
        trigger: 'item',
        ...config.tooltip,
      },
      legend: {
        show: config.legend?.show !== false,
        top: config.legend?.position === 'top' ? '10%' : 'auto',
        bottom: config.legend?.position === 'bottom' ? '10%' : 'auto',
        left: config.legend?.position === 'left' ? '10%' : 'auto',
        right: config.legend?.position === 'right' ? '10%' : 'auto',
      },
      color: config.colors || [
        '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
        '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#d4a017'
      ],
    };

    switch (config.type) {
      case 'scatter':
        return generateScatterOptions(baseOptions);
      case 'heatmap':
        return generateHeatmapOptions(baseOptions);
      case 'gauge':
        return generateGaugeOptions(baseOptions);
      case 'radar':
        return generateRadarOptions(baseOptions);
      case 'treemap':
        return generateTreemapOptions(baseOptions);
      case 'sankey':
        return generateSankeyOptions(baseOptions);
      case 'funnel':
        return generateFunnelOptions(baseOptions);
      case 'sunburst':
        return generateSunburstOptions(baseOptions);
      case 'parallel':
        return generateParallelOptions(baseOptions);
      case 'candlestick':
        return generateCandlestickOptions(baseOptions);
      default:
        return baseOptions;
    }
  }, [config]);

  // 散点图配置
  const generateScatterOptions = (baseOptions: any) => ({
    ...baseOptions,
    xAxis: {
      name: config.xAxis || 'X轴',
      type: 'value',
      scale: true,
      splitLine: {
        show: true,
        lineStyle: {
          type: 'dashed'
        }
      }
    },
    yAxis: {
      name: config.yAxis || 'Y轴',
      type: 'value',
      scale: true,
      splitLine: {
        show: true,
        lineStyle: {
          type: 'dashed'
        }
      }
    },
    series: [{
      name: config.series?.[0] || '数据',
      type: 'scatter',
      symbolSize: (data: any) => Math.sqrt(data[2] || 20),
      data: config.data,
      itemStyle: {
        opacity: 0.8,
        shadowColor: 'rgba(0, 0, 0, 0.5)',
        shadowBlur: 10,
      },
      markLine: {
        silent: true,
        lineStyle: {
          color: '#333'
        },
        data: [
          { type: 'average', name: '平均值' },
        ]
      }
    }]
  });

  // 热力图配置
  const generateHeatmapOptions = (baseOptions: any) => ({
    ...baseOptions,
    xAxis: {
      type: 'category',
      data: config.xAxisData || [],
      splitArea: {
        show: true
      }
    },
    yAxis: {
      type: 'category',
      data: config.yAxisData || [],
      splitArea: {
        show: true
      }
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '15%',
      inRange: {
        color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
      }
    },
    series: [{
      name: config.series?.[0] || '热力值',
      type: 'heatmap',
      data: config.data,
      label: {
        show: true
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  });

  // 仪表盘配置
  const generateGaugeOptions = (baseOptions: any) => ({
    ...baseOptions,
    series: [{
      name: config.series?.[0] || '指标',
      type: 'gauge',
      progress: {
        show: true,
        width: 18
      },
      axisLine: {
        lineStyle: {
          width: 18
        }
      },
      axisTick: {
        show: false
      },
      splitLine: {
        length: 15,
        lineStyle: {
          width: 2,
          color: '#999'
        }
      },
      axisLabel: {
        distance: 25,
        color: '#999',
        fontSize: 12
      },
      anchor: {
        show: true,
        showAbove: true,
        size: 25,
        itemStyle: {
          borderWidth: 10
        }
      },
      title: {
        show: true,
        fontSize: 14,
        fontWeight: 'bold',
        color: '#464646'
      },
      detail: {
        valueAnimation: true,
        fontSize: 20,
        color: 'inherit'
      },
      data: Array.isArray(config.data) ? config.data : [config.data]
    }]
  });

  // 雷达图配置
  const generateRadarOptions = (baseOptions: any) => ({
    ...baseOptions,
    radar: {
      indicator: config.indicator || [],
      shape: config.radarShape || 'polygon',
      splitNumber: 5,
      axisName: {
        color: '#666'
      },
      splitLine: {
        lineStyle: {
          color: '#ddd'
        }
      },
      splitArea: {
        show: false
      },
      axisLine: {
        lineStyle: {
          color: '#ddd'
        }
      }
    },
    series: [{
      name: config.series?.[0] || '指标',
      type: 'radar',
      data: config.data,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: {
        width: 2
      },
      areaStyle: {
        opacity: 0.3
      }
    }]
  });

  // 树图配置
  const generateTreemapOptions = (baseOptions: any) => ({
    ...baseOptions,
    series: [{
      name: config.series?.[0] || '树图',
      type: 'treemap',
      data: config.data,
      roam: false,
      nodeClick: 'zoomToNode',
      breadcrumb: {
        show: true,
        height: 22,
        left: 'center',
        itemStyle: {
          color: '#fff',
          textStyle: {
            color: '#333'
          }
        }
      },
      label: {
        show: true,
        formatter: '{b}',
        color: '#fff',
        fontSize: 12
      },
      itemStyle: {
        borderColor: '#fff',
        borderWidth: 1
      },
      levels: [
        {
          itemStyle: {
            borderColor: '#777',
            borderWidth: 0,
            gapWidth: 1
          },
          upperLabel: {
            show: false
          }
        },
        {
          itemStyle: {
            borderColor: '#555',
            borderWidth: 5,
            gapWidth: 1
          },
          emphasis: {
            itemStyle: {
              borderColor: '#ddd'
            }
          }
        }
      ]
    }]
  });

  // 桑基图配置
  const generateSankeyOptions = (baseOptions: any) => ({
    ...baseOptions,
    series: [{
      name: config.series?.[0] || '桑基图',
      type: 'sankey',
      data: config.nodes || [],
      links: config.links || [],
      emphasis: {
        focus: 'adjacency'
      },
      lineStyle: {
        color: 'source',
        curveness: 0.5
      },
      label: {
        position: 'right'
      }
    }]
  });

  // 漏斗图配置
  const generateFunnelOptions = (baseOptions: any) => ({
    ...baseOptions,
    series: [{
      name: config.series?.[0] || '漏斗图',
      type: 'funnel',
      left: '10%',
      top: 60,
      bottom: 60,
      width: '80%',
      min: 0,
      max: 100,
      minSize: '0%',
      maxSize: '100%',
      sort: 'descending',
      gap: 2,
      label: {
        show: true,
        position: 'inside'
      },
      labelLine: {
        length: 10,
        lineStyle: {
          width: 1,
          type: 'solid'
        }
      },
      itemStyle: {
        borderColor: '#fff',
        borderWidth: 1
      },
      emphasis: {
        label: {
          fontSize: 20
        }
      },
      data: config.data
    }]
  });

  // 旭日图配置
  const generateSunburstOptions = (baseOptions: any) => ({
    ...baseOptions,
    series: [{
      name: config.series?.[0] || '旭日图',
      type: 'sunburst',
      data: config.data,
      radius: [0, '95%'],
      sort: null,
      emphasis: {
        focus: 'ancestor'
      },
      levels: [
        {},
        {
          r0: '15%',
          r: '35%',
          itemStyle: {
            borderWidth: 2
          },
          label: {
            rotate: 'tangential'
          }
        },
        {
          r0: '35%',
          r: '70%',
          label: {
            align: 'right'
          }
        },
        {
          r0: '70%',
          r: '72%',
          label: {
            position: 'outside',
            padding: 3,
            silent: false
          },
          itemStyle: {
            borderWidth: 3
          }
        }
      ]
    }]
  });

  // 平行坐标系配置
  const generateParallelOptions = (baseOptions: any) => ({
    ...baseOptions,
    parallel: {
      left: '5%',
      right: '18%',
      bottom: '10%',
      top: '20%',
      parallelAxisDefault: {
        type: 'value',
        nameLocation: 'end',
        nameGap: 20,
        splitNumber: 3,
        tooltip: {
          show: true
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#aaa'
          }
        },
        axisTick: {
          show: false
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#ddd'
          }
        }
      }
    },
    parallelAxis: config.parallelAxis || [],
    series: [{
      name: config.series?.[0] || '平行坐标',
      type: 'parallel',
      lineStyle: {
        width: 1,
        opacity: 0.45
      },
      data: config.data
    }]
  });

  // K线图配置
  const generateCandlestickOptions = (baseOptions: any) => ({
    ...baseOptions,
    xAxis: {
      type: 'category',
      data: config.xAxisData || [],
      scale: true,
      boundaryGap: false,
      axisLine: { onZero: false },
      splitLine: { show: false },
      min: 'dataMin',
      max: 'dataMax'
    },
    yAxis: {
      scale: true,
      splitArea: {
        show: true
      }
    },
    dataZoom: [
      {
        type: 'inside',
        start: 50,
        end: 100
      },
      {
        show: true,
        type: 'slider',
        top: '90%',
        start: 50,
        end: 100
      }
    ],
    series: [{
      name: config.series?.[0] || 'K线',
      type: 'candlestick',
      data: config.data,
      itemStyle: {
        color: '#ec0000',
        color0: '#00da3c',
        borderColor: '#8A0000',
        borderColor0: '#008F28'
      },
      markPoint: {
        label: {
          formatter: function (param: any) {
            return param != null ? Math.round(param.value) + '' : '';
          }
        },
        data: [
          {
            name: 'Mark',
            coord: ['2013/5/31', 2300],
            value: 2300,
            itemStyle: {
              color: 'rgb(41,60,85)'
            }
          },
          {
            name: 'highest value',
            type: 'max',
            valueDim: 'highest'
          },
          {
            name: 'lowest value',
            type: 'min',
            valueDim: 'lowest'
          }
        ]
      }
    }]
  });

  // 导出图表
  const exportChart = (format: 'png' | 'jpg' | 'svg' = 'png') => {
    const chart = chartRef.current?.getEchartsInstance();
    if (chart) {
      const url = chart.getDataURL({
        type: format,
        pixelRatio: 2,
        backgroundColor: '#fff'
      });
      const link = document.createElement('a');
      link.download = `chart.${format}`;
      link.href = url;
      link.click();
    }
  };

  // 刷新图表
  const refreshChart = () => {
    const chart = chartRef.current?.getEchartsInstance();
    if (chart) {
      chart.resize();
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

  // 图表类型选项
  const chartTypeOptions = [
    { value: 'scatter', label: '散点图' },
    { value: 'heatmap', label: '热力图' },
    { value: 'gauge', label: '仪表盘' },
    { value: 'radar', label: '雷达图' },
    { value: 'treemap', label: '树图' },
    { value: 'sankey', label: '桑基图' },
    { value: 'funnel', label: '漏斗图' },
    { value: 'sunburst', label: '旭日图' },
    { value: 'parallel', label: '平行坐标' },
    { value: 'candlestick', label: 'K线图' },
  ];

  return (
    <div className={fullscreen ? 'fixed inset-0 z-50 bg-white' : ''}>
      <Card
        title={
          <div className="flex justify-between items-center">
            <Text strong>{config.title}</Text>
            {showControls && (
              <Space>
                <Select
                  value={config.type}
                  onChange={(value) => {
                    if (onConfigChange) {
                      onConfigChange({ ...config, type: value });
                    }
                  }}
                  style={{ width: 120 }}
                  size="small"
                >
                  {chartTypeOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
                <Select
                  value={currentTheme}
                  onChange={changeTheme}
                  style={{ width: 80 }}
                  size="small"
                >
                  <Option value="light">浅色</Option>
                  <Option value="dark">深色</Option>
                </Select>
                <Tooltip title="刷新">
                  <Button size="small" icon={<ReloadOutlined />} onClick={refreshChart} />
                </Tooltip>
                <Tooltip title="导出">
                  <Button size="small" icon={<DownloadOutlined />} onClick={() => exportChart()} />
                </Tooltip>
                <Tooltip title="全屏">
                  <Button size="small" icon={<FullscreenOutlined />} onClick={toggleFullscreen} />
                </Tooltip>
              </Space>
            )}
          </div>
        }
        className={fullscreen ? 'h-full' : ''}
      >
        {config.data.length === 0 ? (
          <Alert
            message="暂无数据"
            description="请确保查询返回了有效数据"
            type="info"
            showIcon
          />
        ) : (
          <ReactECharts
            ref={chartRef}
            option={generateChartOptions}
            style={{ height: fullscreen ? 'calc(100vh - 120px)' : height }}
            theme={currentTheme}
            showLoading={loading}
            loadingOption={{
              text: '图表加载中...',
              color: '#5470c6',
              textStyle: {
                fontSize: 14
              },
              maskColor: 'rgba(255, 255, 255, 0.8)'
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default AdvancedChartLibrary;