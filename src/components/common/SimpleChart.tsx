import React, { useEffect, useRef } from 'react';
import { Empty } from 'antd';
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
  height = 400 
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data) return;

    // 初始化图表
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const chart = chartInstance.current;

    // 准备图表配置
    let option: echarts.EChartsOption = {};

    if (type === 'pie') {
      // 饼图配置
      const pieData = data.valueColumns.slice(0, 1).map(col => {
        return data.data.map((item: any, index: number) => ({
          name: item[data.timeColumn || 'index'] || `Item ${index}`,
          value: Number(item[col]) || 0,
        }));
      })[0] || [];

      option = {
        title: {
          text: '数据分布',
          left: 'center',
        },
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)',
        },
        legend: {
          orient: 'vertical',
          left: 'left',
        },
        series: [
          {
            name: data.valueColumns[0] || 'Value',
            type: 'pie',
            radius: '50%',
            data: pieData,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
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
        title: {
          text: '时序数据图表',
          left: 'center',
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            label: {
              backgroundColor: '#6a7985',
            },
          },
        },
        legend: {
          data: data.valueColumns,
          top: 30,
        },
        toolbox: {
          feature: {
            saveAsImage: {},
            dataZoom: {
              yAxisIndex: 'none',
            },
            restore: {},
          },
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true,
        },
        xAxis: [
          {
            type: 'category',
            boundaryGap: type === 'bar',
            data: xAxisData,
            axisLabel: {
              rotate: 45,
              interval: Math.max(1, Math.floor(xAxisData.length / 10)),
            },
          },
        ],
        yAxis: [
          {
            type: 'value',
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
            handleIcon: 'M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23.1h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
            handleSize: '80%',
            handleStyle: {
              color: '#fff',
              shadowBlur: 3,
              shadowColor: 'rgba(0, 0, 0, 0.6)',
              shadowOffsetX: 2,
              shadowOffsetY: 2,
            },
          },
        ],
        series,
      };
    }

    // 设置图表配置
    chart.setOption(option, true);

    // 响应式调整
    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, type]);

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
      <Empty
        description="暂无图表数据"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
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
