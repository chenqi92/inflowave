import React, { useEffect, useRef } from 'react';
import { Empty } from '@/components/ui';
import { useTheme } from '@/components/providers/ThemeProvider';
import * as echarts from 'echarts';

interface ChartData {
  timeColumn?: string;
  valueColumns: string[];
  data: any[];
}

interface SimpleChartProps {
  data: ChartData | null;
  type: 'line' | 'bar' | 'area' | 'pie';
  height?: number;
}

const SimpleChart: React.FC<SimpleChartProps> = ({
  data,
  type,
  height = 400,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!chartRef.current || !data) return;

    // 初始化图表
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(
        chartRef.current,
        resolvedTheme === 'dark' ? 'dark' : 'light'
      );
    }

    const chart = chartInstance.current;

    // 主题颜色配置
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#e4e4e7' : '#09090b';
    const backgroundColor = isDark ? '#020817' : '#ffffff';
    const borderColor = isDark ? '#27272a' : '#e4e4e7';
    
    // 图表颜色配置
    const chartColors = [
      '#3b82f6', // blue
      '#10b981', // emerald
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // violet
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316', // orange
    ];

    // 准备图表配置
    let option: echarts.EChartsOption = {
      backgroundColor,
      textStyle: {
        color: textColor,
      },
      color: chartColors,
    };

    if (type === 'pie') {
      // 饼图配置 - 修复数据处理逻辑
      const pieData = data.data.map((item: any, index: number) => {
        const name = item[data.timeColumn || Object.keys(item)[0]] || `Item ${index + 1}`;
        const value = data.valueColumns.reduce((sum, col) => {
          return sum + (Number(item[col]) || 0);
        }, 0);
        return {
          name: String(name),
          value,
        };
      }).filter(item => item.value > 0);

      option = {
        ...option,
        title: {
          text: '数据分布',
          left: 'center',
          textStyle: {
            color: textColor,
          },
        },
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)',
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          borderColor,
          textStyle: {
            color: textColor,
          },
        },
        legend: {
          orient: 'vertical',
          left: 'left',
          textStyle: {
            color: textColor,
          },
        },
        series: [
          {
            name: '数据分布',
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '50%'],
            data: pieData,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.5)',
              },
            },
            label: {
              show: true,
              formatter: '{b}: {d}%',
              color: textColor,
            },
          },
        ],
      };
    } else {
      // 时序图表配置
      const xAxisData = data.data.map(item => {
        const timeValue = item[data.timeColumn || Object.keys(item)[0]];
        if (typeof timeValue === 'string' && timeValue.includes('T')) {
          try {
            return new Date(timeValue).toLocaleString();
          } catch {
            return timeValue;
          }
        }
        return timeValue;
      });

      const series = data.valueColumns.map(col => ({
        name: col,
        type: type === 'area' ? 'line' : type,
        data: data.data.map(item => Number(item[col]) || 0),
        smooth: type === 'line' || type === 'area',
        areaStyle: type === 'area' ? {} : undefined,
      }));

      option = {
        ...option,
        title: {
          text: '时序数据图表',
          left: 'center',
          textStyle: {
            color: textColor,
          },
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            label: {
              backgroundColor: isDark ? '#374151' : '#6a7985',
              color: textColor,
            },
          },
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          borderColor,
          textStyle: {
            color: textColor,
          },
        },
        legend: {
          data: data.valueColumns,
          top: 30,
          textStyle: {
            color: textColor,
          },
        },
        toolbox: {
          feature: {
            saveAsImage: {},
            dataZoom: {
              yAxisIndex: 'none',
            },
            restore: {},
          },
          iconStyle: {
            borderColor: textColor,
          },
          emphasis: {
            iconStyle: {
              borderColor: '#3b82f6',
            },
          },
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true,
          borderColor,
        },
        xAxis: [
          {
            type: 'category',
            boundaryGap: type === 'bar',
            data: xAxisData,
            axisLabel: {
              rotate: 45,
              interval: Math.max(1, Math.floor(xAxisData.length / 10)),
              color: textColor,
            },
            axisLine: {
              lineStyle: {
                color: borderColor,
              },
            },
            axisTick: {
              lineStyle: {
                color: borderColor,
              },
            },
          },
        ],
        yAxis: [
          {
            type: 'value',
            axisLabel: {
              color: textColor,
            },
            axisLine: {
              lineStyle: {
                color: borderColor,
              },
            },
            axisTick: {
              lineStyle: {
                color: borderColor,
              },
            },
            splitLine: {
              lineStyle: {
                color: borderColor,
              },
            },
          },
        ],
        dataZoom: [
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
              color: isDark ? '#374151' : '#fff',
              shadowBlur: 3,
              shadowColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.6)',
              shadowOffsetX: 2,
              shadowOffsetY: 2,
            },
            textStyle: {
              color: textColor,
            },
          },
        ],
        series,
      };
    }

    // 设置图表配置 - 强制清除旧配置
    chart.clear();
    chart.setOption(option, true);

    // 响应式调整
    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, type, resolvedTheme]);

  // 监听主题变化，重新初始化图表
  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.dispose();
      chartInstance.current = null;
    }
  }, [resolvedTheme]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  if (!data) {
    return (
      <Empty description='暂无图表数据' />
    );
  }

  return (
    <div
      ref={chartRef}
      style={{
        width: '100%',
        height,
        minHeight: 300,
      }}
    />
  );
};

export default SimpleChart;
