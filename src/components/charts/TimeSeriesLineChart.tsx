import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface TimeSeriesDataPoint {
  time: string | number;
  [key: string]: string | number;
}

interface TimeSeriesLineChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  xAxisKey?: string;
  lines?: Array<{
    dataKey: string;
    name?: string;
    color?: string;
    strokeWidth?: number;
  }>;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
}

const DEFAULT_COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7c7c',
  '#a28fd0',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
];

const TimeSeriesLineChart: React.FC<TimeSeriesLineChartProps> = ({
  data,
  title = '时间序列数据',
  xAxisKey = 'time',
  lines = [],
  height = 300,
  showLegend = true,
  showGrid = true,
}) => {
  // 如果没有指定 lines，自动从数据中提取（排除时间字段）
  const autoLines = React.useMemo(() => {
    if (lines.length > 0) return lines;
    
    if (data.length === 0) return [];
    
    const firstDataPoint = data[0];
    const keys = Object.keys(firstDataPoint).filter(key => key !== xAxisKey);
    
    return keys.map((key, index) => ({
      dataKey: key,
      name: key,
      color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      strokeWidth: 2,
    }));
  }, [data, lines, xAxisKey]);

  // 格式化时间轴标签
  const formatXAxis = (value: any) => {
    if (typeof value === 'string') {
      // 尝试解析为日期
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }
    return value;
  };

  // 格式化 Y 轴标签
  const formatYAxis = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(2);
  };

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium mb-2">
          {typeof label === 'string' && label.includes('T') 
            ? new Date(label).toLocaleString('zh-CN')
            : label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">{entry.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            暂无数据
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            )}
            <XAxis
              dataKey={xAxisKey}
              tickFormatter={formatXAxis}
              className="text-xs"
              stroke="currentColor"
            />
            <YAxis
              tickFormatter={formatYAxis}
              className="text-xs"
              stroke="currentColor"
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && (
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                iconType="line"
              />
            )}
            {autoLines.map((line, index) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                name={line.name || line.dataKey}
                stroke={line.color}
                strokeWidth={line.strokeWidth || 2}
                dot={data.length <= 20}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default TimeSeriesLineChart;

