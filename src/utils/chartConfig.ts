/**
 * 图表配置工具
 * 为不同类型的图表生成ECharts配置
 */

export interface ChartThemeConfig {
  backgroundColor: string;
  textColor: string;
  colors: string[];
  tooltipBgColor: string;
  borderColor: string;
  gridColor: string;
}

export interface ChartDataConfig {
  timeColumn?: string;
  numericColumns: string[];
  selectedFields: string[];
  data: any[];
  rowCount: number;
  customTitle?: string;
  fieldAliases?: Record<string, string>;
  timeIndex?: number;  // 用于饼图和雷达图选择特定时间点
}

export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap' | 'radar';

/**
 * 计算时间跨度并返回合适的时间格式
 */
const getTimeAxisFormat = (data: any[], timeColumn: string) => {
  if (data.length < 2) return '{HH}:{mm}:{ss}';

  const times = data.map(row => new Date(row[timeColumn]).getTime());
  const timeSpan = Math.max(...times) - Math.min(...times);

  // 时间跨度（毫秒）
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;

  if (timeSpan < hour) {
    // 小于1小时：显示时:分:秒
    return '{HH}:{mm}:{ss}';
  } else if (timeSpan < day) {
    // 1小时到1天：显示时:分
    return '{HH}:{mm}';
  } else if (timeSpan < week) {
    // 1天到1周：显示月-日 时:分
    return '{MM}-{dd} {HH}:{mm}';
  } else if (timeSpan < month) {
    // 1周到1月：显示月-日
    return '{MM}-{dd}';
  } else {
    // 大于1月：显示年-月-日
    return '{yyyy}-{MM}-{dd}';
  }
};

/**
 * 生成时序折线图配置
 */
export const generateTimeSeriesLineChart = (
  config: ChartDataConfig,
  theme: ChartThemeConfig
) => {
  const { timeColumn, data, selectedFields, customTitle, fieldAliases = {} } = config;

  if (!timeColumn) return null;

  const timeFormat = getTimeAxisFormat(data, timeColumn);

  const series = selectedFields.map((field, index) => ({
    name: fieldAliases[field] || field,  // 使用别名或原名
    type: 'line',
    data: data.map(row => [row[timeColumn], row[field]]),
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    lineStyle: {
      width: 2,
    },
    emphasis: {
      focus: 'series',
    },
  }));

  return {
    backgroundColor: theme.backgroundColor,
    textStyle: { color: theme.textColor },
    color: theme.colors,
    title: {
      text: customTitle || '时序数据趋势',  // 使用自定义标题或默认标题
      left: 'center',
      textStyle: { color: theme.textColor, fontSize: 14 },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985',
        },
      },
      backgroundColor: theme.tooltipBgColor,
      borderColor: theme.borderColor,
      textStyle: { color: theme.textColor },
    },
    legend: {
      top: 35,
      type: 'scroll',
      textStyle: { color: theme.textColor },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '20%',
      containLabel: true,
      borderColor: theme.borderColor,
    },
    xAxis: {
      type: 'time',
      name: '时间',
      nameTextStyle: { color: theme.textColor },
      axisLabel: {
        color: theme.textColor,
        formatter: timeFormat,
      },
      axisLine: { lineStyle: { color: theme.borderColor } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: '数值',
      nameTextStyle: { color: theme.textColor },
      axisLabel: { color: theme.textColor },
      axisLine: { lineStyle: { color: theme.borderColor } },
      splitLine: { lineStyle: { color: theme.gridColor, type: 'dashed' } },
    },
    series,
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
        xAxisIndex: 0,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
      },
      {
        type: 'slider',
        show: true,
        start: 0,
        end: 100,
        xAxisIndex: 0,
        height: 40,
        bottom: 5,
        handleIcon:
          'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23.1h6.6V24.4z M13.3,19.6H6.7v-1.2h6.6V19.6z',
        handleSize: '100%',
        handleStyle: {
          color: theme.colors[0] || '#5470c6',
          shadowBlur: 4,
          shadowColor: 'rgba(0, 0, 0, 0.4)',
          shadowOffsetX: 1,
          shadowOffsetY: 1,
        },
        moveHandleSize: 8,
        textStyle: {
          color: theme.textColor,
          fontSize: 12,
        },
        borderColor: theme.borderColor,
        backgroundColor: theme.backgroundColor,
        fillerColor: 'rgba(84, 112, 198, 0.2)',
        dataBackground: {
          lineStyle: {
            color: theme.colors[0] || '#5470c6',
            opacity: 0.5,
          },
          areaStyle: {
            color: theme.colors[0] || '#5470c6',
            opacity: 0.2,
          },
        },
        selectedDataBackground: {
          lineStyle: {
            color: theme.colors[0] || '#5470c6',
          },
          areaStyle: {
            color: theme.colors[0] || '#5470c6',
            opacity: 0.3,
          },
        },
        emphasis: {
          handleStyle: {
            shadowBlur: 8,
            shadowColor: 'rgba(0, 0, 0, 0.6)',
          },
        },
      },
    ],
    // 移除toolbox，因为在桌面应用中不需要
  };
};

/**
 * 生成面积图配置
 */
export const generateAreaChart = (
  config: ChartDataConfig,
  theme: ChartThemeConfig
) => {
  const { timeColumn, data, selectedFields, customTitle, fieldAliases = {} } = config;

  if (!timeColumn) return null;

  const timeFormat = getTimeAxisFormat(data, timeColumn);

  const series = selectedFields.map((field, index) => ({
    name: fieldAliases[field] || field,
    type: 'line',
    data: data.map(row => [row[timeColumn], row[field]]),
    smooth: true,
    symbol: 'none',
    lineStyle: {
      width: 2,
    },
    areaStyle: {
      opacity: 0.5,
    },
    emphasis: {
      focus: 'series',
    },
  }));

  return {
    backgroundColor: theme.backgroundColor,
    textStyle: { color: theme.textColor },
    color: theme.colors,
    title: {
      text: customTitle || '时序数据面积图',
      left: 'center',
      textStyle: { color: theme.textColor, fontSize: 14 },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      backgroundColor: theme.tooltipBgColor,
      borderColor: theme.borderColor,
      textStyle: { color: theme.textColor },
    },
    legend: {
      top: 35,
      type: 'scroll',
      textStyle: { color: theme.textColor },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '20%',
      containLabel: true,
    },
    xAxis: {
      type: 'time',
      name: '时间',
      nameTextStyle: { color: theme.textColor },
      axisLabel: {
        color: theme.textColor,
        formatter: timeFormat,
      },
      axisLine: { lineStyle: { color: theme.borderColor } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: '数值',
      nameTextStyle: { color: theme.textColor },
      axisLabel: { color: theme.textColor },
      axisLine: { lineStyle: { color: theme.borderColor } },
      splitLine: { lineStyle: { color: theme.gridColor, type: 'dashed' } },
    },
    series,
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
        xAxisIndex: 0,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
      },
      {
        type: 'slider',
        show: true,
        start: 0,
        end: 100,
        xAxisIndex: 0,
        height: 40,
        bottom: 5,
        handleIcon:
          'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23.1h6.6V24.4z M13.3,19.6H6.7v-1.2h6.6V19.6z',
        handleSize: '100%',
        handleStyle: {
          color: theme.colors[0] || '#5470c6',
          shadowBlur: 4,
          shadowColor: 'rgba(0, 0, 0, 0.4)',
          shadowOffsetX: 1,
          shadowOffsetY: 1,
        },
        moveHandleSize: 8,
        textStyle: {
          color: theme.textColor,
          fontSize: 12,
        },
        borderColor: theme.borderColor,
        backgroundColor: theme.backgroundColor,
        fillerColor: 'rgba(84, 112, 198, 0.2)',
        dataBackground: {
          lineStyle: {
            color: theme.colors[0] || '#5470c6',
            opacity: 0.5,
          },
          areaStyle: {
            color: theme.colors[0] || '#5470c6',
            opacity: 0.2,
          },
        },
        selectedDataBackground: {
          lineStyle: {
            color: theme.colors[0] || '#5470c6',
          },
          areaStyle: {
            color: theme.colors[0] || '#5470c6',
            opacity: 0.3,
          },
        },
        emphasis: {
          handleStyle: {
            shadowBlur: 8,
            shadowColor: 'rgba(0, 0, 0, 0.6)',
          },
        },
      },
    ],
  };
};

/**
 * 生成散点图配置
 */
export const generateScatterChart = (
  config: ChartDataConfig,
  theme: ChartThemeConfig
) => {
  const { timeColumn, data, selectedFields, customTitle, fieldAliases = {} } = config;

  if (!timeColumn || selectedFields.length === 0) return null;

  const timeFormat = getTimeAxisFormat(data, timeColumn);

  const series = selectedFields.map((field) => ({
    name: fieldAliases[field] || field,
    type: 'scatter',
    data: data.map(row => [row[timeColumn], row[field]]),
    symbolSize: 8,
    emphasis: {
      focus: 'series',
      scale: true,
      scaleSize: 12,
    },
  }));

  return {
    backgroundColor: theme.backgroundColor,
    textStyle: { color: theme.textColor },
    color: theme.colors,
    title: {
      text: customTitle || '时序散点图',
      left: 'center',
      textStyle: { color: theme.textColor, fontSize: 14 },
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: theme.tooltipBgColor,
      borderColor: theme.borderColor,
      textStyle: { color: theme.textColor },
    },
    legend: {
      top: 35,
      type: 'scroll',
      textStyle: { color: theme.textColor },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '20%',
      containLabel: true,
    },
    xAxis: {
      type: 'time',
      name: '时间',
      nameTextStyle: { color: theme.textColor },
      axisLabel: {
        color: theme.textColor,
        formatter: timeFormat,
      },
      axisLine: { lineStyle: { color: theme.borderColor } },
      splitLine: { lineStyle: { color: theme.gridColor, type: 'dashed' } },
    },
    yAxis: {
      type: 'value',
      name: '数值',
      nameTextStyle: { color: theme.textColor },
      axisLabel: { color: theme.textColor },
      axisLine: { lineStyle: { color: theme.borderColor } },
      splitLine: { lineStyle: { color: theme.gridColor, type: 'dashed' } },
    },
    series,
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
        xAxisIndex: 0,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
      },
      {
        type: 'slider',
        show: true,
        start: 0,
        end: 100,
        xAxisIndex: 0,
        height: 40,
        bottom: 5,
        handleIcon:
          'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23.1h6.6V24.4z M13.3,19.6H6.7v-1.2h6.6V19.6z',
        handleSize: '100%',
        handleStyle: {
          color: theme.colors[0] || '#5470c6',
          shadowBlur: 4,
          shadowColor: 'rgba(0, 0, 0, 0.4)',
          shadowOffsetX: 1,
          shadowOffsetY: 1,
        },
        moveHandleSize: 8,
        textStyle: {
          color: theme.textColor,
          fontSize: 12,
        },
        borderColor: theme.borderColor,
        backgroundColor: theme.backgroundColor,
        fillerColor: 'rgba(84, 112, 198, 0.2)',
        dataBackground: {
          lineStyle: {
            color: theme.colors[0] || '#5470c6',
            opacity: 0.5,
          },
          areaStyle: {
            color: theme.colors[0] || '#5470c6',
            opacity: 0.2,
          },
        },
        selectedDataBackground: {
          lineStyle: {
            color: theme.colors[0] || '#5470c6',
          },
          areaStyle: {
            color: theme.colors[0] || '#5470c6',
            opacity: 0.3,
          },
        },
        emphasis: {
          handleStyle: {
            shadowBlur: 8,
            shadowColor: 'rgba(0, 0, 0, 0.6)',
          },
        },
      },
    ],
  };
};

/**
 * 生成柱状图配置
 */
export const generateBarChart = (
  config: ChartDataConfig,
  theme: ChartThemeConfig
) => {
  const { timeColumn, data, selectedFields, customTitle, fieldAliases = {} } = config;

  if (!timeColumn) return null;

  const timeFormat = getTimeAxisFormat(data, timeColumn);

  const series = selectedFields.map((field) => ({
    name: fieldAliases[field] || field,
    type: 'bar',
    data: data.map(row => [row[timeColumn], row[field]]),
    emphasis: {
      focus: 'series',
    },
  }));

  return {
    backgroundColor: theme.backgroundColor,
    textStyle: { color: theme.textColor },
    color: theme.colors,
    title: {
      text: customTitle || '时序柱状图',
      left: 'center',
      textStyle: { color: theme.textColor, fontSize: 14 },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      backgroundColor: theme.tooltipBgColor,
      borderColor: theme.borderColor,
      textStyle: { color: theme.textColor },
    },
    legend: {
      top: 35,
      type: 'scroll',
      textStyle: { color: theme.textColor },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '20%',
      containLabel: true,
    },
    xAxis: {
      type: 'time',
      name: '时间',
      nameTextStyle: { color: theme.textColor },
      axisLabel: {
        color: theme.textColor,
        formatter: timeFormat,
      },
      axisLine: { lineStyle: { color: theme.borderColor } },
    },
    yAxis: {
      type: 'value',
      name: '数值',
      nameTextStyle: { color: theme.textColor },
      axisLabel: { color: theme.textColor },
      axisLine: { lineStyle: { color: theme.borderColor } },
      splitLine: { lineStyle: { color: theme.gridColor, type: 'dashed' } },
    },
    series,
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
        xAxisIndex: 0,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
      },
      {
        type: 'slider',
        show: true,
        start: 0,
        end: 100,
        xAxisIndex: 0,
        height: 40,
        bottom: 5,
        handleIcon:
          'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23.1h6.6V24.4z M13.3,19.6H6.7v-1.2h6.6V19.6z',
        handleSize: '100%',
        handleStyle: {
          color: theme.colors[0] || '#5470c6',
          shadowBlur: 4,
          shadowColor: 'rgba(0, 0, 0, 0.4)',
          shadowOffsetX: 1,
          shadowOffsetY: 1,
        },
        moveHandleSize: 8,
        textStyle: {
          color: theme.textColor,
          fontSize: 12,
        },
        borderColor: theme.borderColor,
        backgroundColor: theme.backgroundColor,
        fillerColor: 'rgba(84, 112, 198, 0.2)',
        dataBackground: {
          lineStyle: {
            color: theme.colors[0] || '#5470c6',
            opacity: 0.5,
          },
          areaStyle: {
            color: theme.colors[0] || '#5470c6',
            opacity: 0.2,
          },
        },
        selectedDataBackground: {
          lineStyle: {
            color: theme.colors[0] || '#5470c6',
          },
          areaStyle: {
            color: theme.colors[0] || '#5470c6',
            opacity: 0.3,
          },
        },
        emphasis: {
          handleStyle: {
            shadowBlur: 8,
            shadowColor: 'rgba(0, 0, 0, 0.6)',
          },
        },
      },
    ],
  };
};

/**
 * 生成饼图配置
 */
export const generatePieChart = (
  config: ChartDataConfig,
  theme: ChartThemeConfig
) => {
  const { data, selectedFields, customTitle, fieldAliases = {}, timeIndex, timeColumn } = config;

  if (selectedFields.length === 0 || data.length === 0) return null;

  // 使用指定时间点的数据，默认使用最后一个时间点
  const dataIndex = timeIndex !== undefined ? timeIndex : data.length - 1;
  const currentData = data[dataIndex];
  const pieData = selectedFields
    .map(field => ({
      name: fieldAliases[field] || field,
      value: Math.abs(currentData[field]) || 0,
    }))
    .filter(item => item.value > 0);

  // 获取时间标签
  let timeLabel = '';
  if (timeColumn && currentData[timeColumn]) {
    const time = new Date(currentData[timeColumn]);
    timeLabel = time.toLocaleString();
  }

  return {
    backgroundColor: theme.backgroundColor,
    textStyle: { color: theme.textColor },
    color: theme.colors,
    title: {
      text: customTitle || '数据分布',
      subtext: timeLabel ? `时间: ${timeLabel}` : '',
      left: 'center',
      textStyle: { color: theme.textColor, fontSize: 14 },
      subtextStyle: { color: theme.textColor, fontSize: 11 },
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
      backgroundColor: theme.tooltipBgColor,
      borderColor: theme.borderColor,
      textStyle: { color: theme.textColor },
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: 10,
      top: 60,
      bottom: 20,
      textStyle: { color: theme.textColor },
    },
    series: [
      {
        name: '数据分布',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        data: pieData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        label: {
          show: true,
          formatter: '{b}: {d}%',
          color: theme.textColor,
        },
      },
    ],
  };
};

/**
 * 生成热力图配置
 */
export const generateHeatmapChart = (
  config: ChartDataConfig,
  theme: ChartThemeConfig
) => {
  const { timeColumn, data, selectedFields, customTitle, fieldAliases = {} } = config;

  if (!timeColumn || selectedFields.length === 0) return null;

  // 准备热力图数据：[时间索引, 字段索引, 值]
  const heatmapData: any[] = [];
  data.forEach((row, timeIndex) => {
    selectedFields.forEach((field, fieldIndex) => {
      const value = row[field];
      if (typeof value === 'number') {
        heatmapData.push([timeIndex, fieldIndex, value]);
      }
    });
  });

  if (heatmapData.length === 0) return null;

  // 获取时间标签（采样显示，避免过多标签）
  const maxLabels = 50;
  const step = Math.max(1, Math.ceil(data.length / maxLabels));
  const timeLabels = data.map((row) => {
    const time = new Date(row[timeColumn]);
    return time.toLocaleTimeString();
  });

  // 计算数值范围
  const values = heatmapData.map(d => d[2]);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  // 确保min和max不相同，否则visualMap会报错
  const safeMin = minValue;
  const safeMax = maxValue === minValue ? minValue + 1 : maxValue;

  return {
    backgroundColor: theme.backgroundColor,
    textStyle: { color: theme.textColor },
    title: {
      text: customTitle || '数据热力图',
      left: 'center',
      textStyle: { color: theme.textColor, fontSize: 14 },
    },
    tooltip: {
      position: 'top',
      formatter: (params: any) => {
        const field = selectedFields[params.value[1]];
        const fieldName = fieldAliases[field] || field;
        const value = params.value[2];
        const time = data[params.value[0]][timeColumn];
        return `${new Date(time).toLocaleString()}<br/>${fieldName}: ${value.toFixed(2)}`;
      },
      backgroundColor: theme.tooltipBgColor,
      borderColor: theme.borderColor,
      textStyle: { color: theme.textColor },
    },
    grid: {
      left: '15%',
      right: '10%',
      bottom: '15%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: timeLabels,
      splitArea: {
        show: true,
      },
      axisLabel: {
        color: theme.textColor,
        rotate: 45,
        interval: Math.max(0, step - 1),
      },
      axisLine: { lineStyle: { color: theme.borderColor } },
    },
    yAxis: {
      type: 'category',
      data: selectedFields.map(field => fieldAliases[field] || field),
      splitArea: {
        show: true,
      },
      axisLabel: { color: theme.textColor },
      axisLine: { lineStyle: { color: theme.borderColor } },
    },
    visualMap: {
      min: safeMin,
      max: safeMax,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '5%',
      textStyle: { color: theme.textColor },
      inRange: {
        color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
      },
    },
    series: [
      {
        name: '数值',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: false,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };
};

/**
 * 生成雷达图配置
 */
export const generateRadarChart = (
  config: ChartDataConfig,
  theme: ChartThemeConfig
) => {
  const { data, selectedFields, customTitle, fieldAliases = {}, timeIndex, timeColumn } = config;

  if (selectedFields.length === 0 || data.length === 0) return null;

  // 使用指定时间点的数据，默认使用最后一个时间点
  const dataIndex = timeIndex !== undefined ? timeIndex : data.length - 1;
  const currentData = data[dataIndex];

  // 计算每个字段的最大值用于雷达图的最大范围
  const indicators = selectedFields.map(field => {
    const values = data.map(row => Math.abs(row[field] || 0));
    const maxValue = Math.max(...values);
    // 确保max值至少为1，避免为0导致的问题
    const safeMax = maxValue === 0 ? 1 : maxValue * 1.2;
    return {
      name: fieldAliases[field] || field,
      max: safeMax,
    };
  });

  const radarData = selectedFields.map(field => Math.abs(currentData[field]) || 0);

  // 获取时间标签
  let timeLabel = '';
  if (timeColumn && currentData[timeColumn]) {
    const time = new Date(currentData[timeColumn]);
    timeLabel = time.toLocaleString();
  }

  return {
    backgroundColor: theme.backgroundColor,
    textStyle: { color: theme.textColor },
    color: theme.colors,
    title: {
      text: customTitle || '多维度雷达图',
      subtext: timeLabel ? `时间: ${timeLabel}` : '',
      left: 'center',
      top: 10,
      textStyle: { color: theme.textColor, fontSize: 14 },
      subtextStyle: { color: theme.textColor, fontSize: 11 },
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: theme.tooltipBgColor,
      borderColor: theme.borderColor,
      textStyle: { color: theme.textColor },
    },
    legend: {
      show: false,  // 隐藏legend避免与字段名称重叠
    },
    radar: {
      indicator: indicators,
      shape: 'polygon',
      splitNumber: 5,
      center: ['50%', '55%'],  // 向下移动中心点，避免与标题重叠
      radius: '65%',  // 调整半径
      name: {
        textStyle: {
          color: theme.textColor,
          fontSize: 12,
        },
      },
      splitLine: {
        lineStyle: {
          color: theme.gridColor,
        },
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: theme.colors.map((c, i) =>
            i % 2 === 0 ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0)'
          ),
        },
      },
      axisLine: {
        lineStyle: {
          color: theme.borderColor,
        },
      },
    },
    series: [
      {
        name: '数据指标',
        type: 'radar',
        data: [
          {
            value: radarData,
            name: '当前值',
            areaStyle: {
              opacity: 0.3,
            },
          },
        ],
      },
    ],
  };
};

/**
 * 根据图表类型生成配置
 */
export const generateChartConfig = (
  chartType: ChartType,
  dataConfig: ChartDataConfig,
  themeConfig: ChartThemeConfig
) => {
  switch (chartType) {
    case 'line':
      return generateTimeSeriesLineChart(dataConfig, themeConfig);
    case 'area':
      return generateAreaChart(dataConfig, themeConfig);
    case 'bar':
      return generateBarChart(dataConfig, themeConfig);
    case 'scatter':
      return generateScatterChart(dataConfig, themeConfig);
    case 'pie':
      return generatePieChart(dataConfig, themeConfig);
    case 'heatmap':
      return generateHeatmapChart(dataConfig, themeConfig);
    case 'radar':
      return generateRadarChart(dataConfig, themeConfig);
    default:
      return generateTimeSeriesLineChart(dataConfig, themeConfig);
  }
};
