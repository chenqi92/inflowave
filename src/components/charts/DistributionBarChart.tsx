import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

interface DistributionDataPoint {
  name: string | number;
  value: number;
  [key: string]: string | number;
}

interface DistributionBarChartProps {
  data: DistributionDataPoint[];
  title?: string;
  xAxisKey?: string;
  yAxisKey?: string;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  barColor?: string;
  maxBars?: number;
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

const DistributionBarChart: React.FC<DistributionBarChartProps> = ({
  data,
  title = '数值分布',
  xAxisKey = 'name',
  yAxisKey = 'value',
  height = 300,
  showLegend = false,
  showGrid = true,
  barColor = '#8884d8',
  maxBars = 20,
}) => {
  // 限制显示的条数
  const displayData = React.useMemo(() => {
    if (data.length <= maxBars) return data;
    
    // 按值排序并取前 N 个
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const topN = sorted.slice(0, maxBars - 1);
    
    // 计算其余的总和
    const others = sorted.slice(maxBars - 1);
    const othersSum = others.reduce((sum, item) => sum + item.value, 0);
    
    if (othersSum > 0) {
      return [
        ...topN,
        {
          [xAxisKey]: '其他',
          [yAxisKey]: othersSum,
        } as DistributionDataPoint,
      ];
    }
    
    return topN;
  }, [data, maxBars, xAxisKey, yAxisKey]);

  // 格式化 Y 轴标签
  const formatYAxis = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  // 格式化 X 轴标签
  const formatXAxis = (value: any) => {
    const str = String(value);
    if (str.length > 10) {
      return `${str.substring(0, 10)}...`;
    }
    return str;
  };

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium mb-1">{data[xAxisKey]}</p>
        <div className="flex items-center gap-2 text-xs">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: payload[0].fill }}
          />
          <span className="text-muted-foreground">数量:</span>
          <span className="font-medium">{data[yAxisKey].toLocaleString()}</span>
        </div>
      </div>
    );
  };

  if (displayData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
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
          <BarChart3 className="w-4 h-4 text-purple-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={displayData}
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
              angle={displayData.length > 10 ? -45 : 0}
              textAnchor={displayData.length > 10 ? 'end' : 'middle'}
              height={displayData.length > 10 ? 80 : 30}
            />
            <YAxis
              tickFormatter={formatYAxis}
              className="text-xs"
              stroke="currentColor"
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
            <Bar dataKey={yAxisKey} radius={[4, 4, 0, 0]}>
              {displayData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {data.length > maxBars && (
          <div className="mt-2 text-xs text-muted-foreground text-center">
            显示前 {maxBars - 1} 项，其余 {data.length - maxBars + 1} 项合并为"其他"
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DistributionBarChart;

