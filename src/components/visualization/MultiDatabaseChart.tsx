/**
 * 多数据库可视化图表组件
 * 
 * 支持不同数据库类型的数据可视化
 */

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Alert,
  AlertDescription,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Zap as ScatterIcon,
  Activity,
  Download,
  RefreshCw,
  Database,
  TreePine,
  BarChart as BarChartIcon,
  Search,
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import type { QueryResult, DatabaseType } from '@/types';

// 图表类型配置
const CHART_TYPES = {
  line: {
    name: '折线图',
    icon: <TrendingUp className="w-4 h-4" />,
    component: LineChart,
    suitable: ['time_series', 'numeric'],
  },
  area: {
    name: '面积图',
    icon: <Activity className="w-4 h-4" />,
    component: AreaChart,
    suitable: ['time_series', 'numeric'],
  },
  bar: {
    name: '柱状图',
    icon: <BarChart3 className="w-4 h-4" />,
    component: BarChart,
    suitable: ['categorical', 'numeric'],
  },
  scatter: {
    name: '散点图',
    icon: <ScatterIcon className="w-4 h-4" />,
    component: ScatterChart,
    suitable: ['numeric'],
  },
  pie: {
    name: '饼图',
    icon: <PieChartIcon className="w-4 h-4" />,
    component: PieChart,
    suitable: ['categorical'],
  },
} as const;

// 数据库图标映射
const DATABASE_ICONS: Record<DatabaseType, React.ReactElement> = {
  influxdb: <Database className="w-4 h-4 text-blue-500" />,
  iotdb: <TreePine className="w-4 h-4 text-green-500" />,
  prometheus: <BarChartIcon className="w-4 h-4 text-orange-500" />,
  elasticsearch: <Search className="w-4 h-4 text-purple-500" />,
  'object-storage': <Database className="w-4 h-4 text-yellow-500" />,
};

// 颜色主题
const CHART_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00',
  '#0088fe', '#00c49f', '#ffbb28', '#ff8042', '#8dd1e1',
];

interface MultiDatabaseChartProps {
  data: QueryResult | null;
  loading?: boolean;
  title?: string;
  database?: string;
  onRefresh?: () => void;
  onExport?: () => void;
}

export const MultiDatabaseChart: React.FC<MultiDatabaseChartProps> = ({
  data,
  loading = false,
  title = '数据可视化',
  database = '',
  onRefresh,
  onExport,
}) => {
  // Store hooks
  const { connections, activeConnectionId } = useConnectionStore();

  // State
  const [chartType, setChartType] = useState<keyof typeof CHART_TYPES>('line');
  const [xAxisField, setXAxisField] = useState<string>('');
  const [yAxisFields, setYAxisFields] = useState<string[]>([]);
  const [groupByField, setGroupByField] = useState<string>('');

  // 获取当前连接
  const currentConnection = connections.find(conn => conn.id === activeConnectionId);
  const dbType = currentConnection?.dbType || 'influxdb';

  // 解析数据
  const parsedData = useMemo(() => {
    if (!data) return { fields: [], records: [], timeField: null };

    try {
      // 根据数据库类型解析数据
      switch (dbType) {
        case 'influxdb':
          return parseInfluxDBData(data);
        case 'iotdb':
          return parseIoTDBData(data);
        case 'prometheus':
          return parsePrometheusData(data);
        case 'elasticsearch':
          return parseElasticsearchData(data);
        default:
          return parseGenericData(data);
      }
    } catch (error) {
      console.error('解析数据失败:', error);
      return { fields: [], records: [], timeField: null };
    }
  }, [data, dbType]);

  // 解析 InfluxDB 数据
  const parseInfluxDBData = (data: QueryResult) => {
    if (data.results && data.results[0]?.series?.[0]) {
      const series = data.results[0].series[0];
      const columns = series.columns || [];
      const values = series.values || [];
      
      const records = values.map(row => {
        const record: any = {};
        columns.forEach((col, index) => {
          record[col] = row[index];
        });
        return record;
      });

      return {
        fields: columns,
        records,
        timeField: columns.find(col => col.toLowerCase().includes('time')) || columns[0],
      };
    }
    return { fields: [], records: [], timeField: null };
  };

  // 解析 IoTDB 数据
  const parseIoTDBData = (data: QueryResult) => {
    if (data.columns && data.data) {
      const records = data.data.map(row => {
        const record: any = {};
        data.columns!.forEach((col, index) => {
          record[col] = row[index];
        });
        return record;
      });

      return {
        fields: data.columns,
        records,
        timeField: data.columns.find(col => col.toLowerCase().includes('time')) || data.columns[0],
      };
    }
    return { fields: [], records: [], timeField: null };
  };

  // 解析 Prometheus 数据
  const parsePrometheusData = (data: QueryResult) => {
    if (data.data && Array.isArray(data.data)) {
      const records = data.data.map((item: any, index) => ({
        timestamp: item.timestamp || index,
        value: parseFloat(item.value) || 0,
        metric: JSON.stringify(item.metric || {}),
        ...item.metric,
      }));

      const fields = ['timestamp', 'value', 'metric'];
      if (records.length > 0) {
        const metricKeys = Object.keys(records[0]).filter(key => 
          !['timestamp', 'value', 'metric'].includes(key)
        );
        fields.push(...metricKeys);
      }

      return {
        fields,
        records,
        timeField: 'timestamp',
      };
    }
    return { fields: [], records: [], timeField: null };
  };

  // 解析 Elasticsearch 数据
  const parseElasticsearchData = (data: QueryResult) => {
    if (data.data && typeof data.data === 'object' && 'hits' in data.data) {
      const esData = data.data as any;
      if (esData.hits?.hits) {
        const hits = esData.hits.hits;
      const records = hits.map((hit: any) => ({
        _id: hit._id,
        _score: hit._score,
        ...hit._source,
      }));

      const fields = records.length > 0 ? Object.keys(records[0]) : [];
      const timeField = fields.find(field => 
        field.toLowerCase().includes('time') || 
        field.toLowerCase().includes('date') ||
        field === '@timestamp'
      );

        return {
          fields,
          records,
          timeField,
        };
      }
    }
    return { fields: [], records: [], timeField: null };
  };

  // 解析通用数据
  const parseGenericData = (data: QueryResult) => {
    if (data.columns && data.data) {
      const records = data.data.map(row => {
        const record: any = {};
        data.columns!.forEach((col, index) => {
          record[col] = row[index];
        });
        return record;
      });

      return {
        fields: data.columns,
        records,
        timeField: data.columns.find(col => col.toLowerCase().includes('time')),
      };
    }
    return { fields: [], records: [], timeField: null };
  };

  // 获取数值字段
  const numericFields = useMemo(() => {
    return parsedData.fields.filter(field => {
      if (parsedData.records.length === 0) return false;
      const sampleValue = parsedData.records[0][field];
      return typeof sampleValue === 'number' || !isNaN(Number(sampleValue));
    });
  }, [parsedData]);

  // 获取分类字段
  const categoricalFields = useMemo(() => {
    return parsedData.fields.filter(field => !numericFields.includes(field));
  }, [parsedData.fields, numericFields]);

  // 自动设置默认字段
  React.useEffect(() => {
    if (parsedData.fields.length > 0) {
      // 设置 X 轴字段（优先时间字段）
      if (!xAxisField) {
        setXAxisField(parsedData.timeField || parsedData.fields[0]);
      }
      
      // 设置 Y 轴字段（数值字段）
      if (yAxisFields.length === 0 && numericFields.length > 0) {
        setYAxisFields([numericFields[0]]);
      }
    }
  }, [parsedData, xAxisField, yAxisFields, numericFields]);

  // 准备图表数据
  const chartData = useMemo(() => {
    if (!parsedData.records.length || !xAxisField || yAxisFields.length === 0) {
      return [];
    }

    return parsedData.records.map((record: any) => {
      const item: any = { [xAxisField]: record[xAxisField] };
      yAxisFields.forEach(field => {
        item[field] = parseFloat(record[field]) || 0;
      });
      if (groupByField) {
        item.group = record[groupByField];
      }
      return item;
    });
  }, [parsedData.records, xAxisField, yAxisFields, groupByField]);

  // 渲染图表
  const renderChart = () => {
    if (!chartData.length) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          没有可显示的数据
        </div>
      );
    }

    const ChartComponent = CHART_TYPES[chartType].component;

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisField} />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              {yAxisFields.map((field, index) => (
                <Line
                  key={field}
                  type="monotone"
                  dataKey={field}
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisField} />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              {yAxisFields.map((field, index) => (
                <Area
                  key={field}
                  type="monotone"
                  dataKey={field}
                  stackId="1"
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisField} />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              {yAxisFields.map((field, index) => (
                <Bar
                  key={field}
                  dataKey={field}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisField} />
              <YAxis dataKey={yAxisFields[0]} />
              <RechartsTooltip />
              <Scatter
                dataKey={yAxisFields[0]}
                fill={CHART_COLORS[0]}
              />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'pie': {
        const pieData = chartData.slice(0, 10).map((item: any, index: number) => ({
          name: item[xAxisField],
          value: item[yAxisFields[0]],
          fill: CHART_COLORS[index % CHART_COLORS.length],
        }));

        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            {DATABASE_ICONS[dbType]}
            <span>{title}</span>
            {database && (
              <Badge variant="outline">{database}</Badge>
            )}
          </CardTitle>

          <div className="flex items-center space-x-2">
            {/* 图表类型选择 */}
            <Select value={chartType} onValueChange={(value: keyof typeof CHART_TYPES) => setChartType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CHART_TYPES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center space-x-2">
                      {config.icon}
                      <span>{config.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 操作按钮 */}
            {onRefresh && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>刷新数据</TooltipContent>
              </Tooltip>
            )}

            {onExport && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onExport}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>导出图表</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="chart" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chart">图表</TabsTrigger>
            <TabsTrigger value="settings">设置</TabsTrigger>
          </TabsList>

          {/* 图表视图 */}
          <TabsContent value="chart">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span className="ml-2">加载中...</span>
              </div>
            ) : parsedData.records.length > 0 ? (
              renderChart()
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                没有可显示的数据
              </div>
            )}
          </TabsContent>

          {/* 设置视图 */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* X 轴字段 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">X 轴字段</label>
                <Select value={xAxisField} onValueChange={setXAxisField}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择 X 轴字段" />
                  </SelectTrigger>
                  <SelectContent>
                    {parsedData.fields.map(field => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Y 轴字段 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Y 轴字段</label>
                <Select 
                  value={yAxisFields[0] || ''} 
                  onValueChange={(value) => setYAxisFields([value])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择 Y 轴字段" />
                  </SelectTrigger>
                  <SelectContent>
                    {numericFields.map(field => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 分组字段 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">分组字段（可选）</label>
                <Select value={groupByField} onValueChange={setGroupByField}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择分组字段" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">无分组</SelectItem>
                    {categoricalFields.map(field => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 数据统计 */}
            <Alert>
              <AlertDescription>
                数据记录: {parsedData.records.length} 条 | 
                字段数量: {parsedData.fields.length} 个 | 
                数值字段: {numericFields.length} 个
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MultiDatabaseChart;
