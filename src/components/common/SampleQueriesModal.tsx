import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ScrollArea,
  Badge,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui';
import { Copy, Database, Code, BookOpen, Check } from 'lucide-react';
import { writeToClipboard } from '@/utils/clipboard';
import { showMessage } from '@/utils/message';

interface SampleQueriesModalProps {
  visible: boolean;
  onClose: () => void;
}

interface QuerySample {
  id: string;
  title: string;
  description: string;
  query: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

// InfluxDB 1.x 查询示例
const influxDB1Samples: QuerySample[] = [
  {
    id: 'v1-basic-select',
    title: '基础查询',
    description: '查询测量值的所有字段和标签',
    query: `SELECT * FROM "cpu_usage" WHERE time > now() - 1h`,
    category: '基础查询',
    difficulty: 'beginner',
    tags: ['SELECT', '时间过滤'],
  },
  {
    id: 'v1-field-select',
    title: '字段查询',
    description: '查询特定字段值',
    query: `SELECT "usage_idle", "usage_user", "usage_system" 
FROM "cpu_usage" 
WHERE "cpu" = 'cpu-total' AND time > now() - 30m`,
    category: '基础查询',
    difficulty: 'beginner',
    tags: ['字段查询', '标签过滤'],
  },
  {
    id: 'v1-aggregation',
    title: '聚合查询',
    description: '使用聚合函数计算平均值、最大值等',
    query: `SELECT MEAN("usage_idle"), MAX("usage_user"), MIN("usage_system")
FROM "cpu_usage" 
WHERE time > now() - 1h 
GROUP BY time(5m)`,
    category: '聚合查询',
    difficulty: 'intermediate',
    tags: ['MEAN', 'MAX', 'MIN', 'GROUP BY'],
  },
  {
    id: 'v1-regex-filter',
    title: '正则表达式过滤',
    description: '使用正则表达式匹配标签值',
    query: `SELECT * FROM "disk_usage" 
WHERE "device" =~ /^\/dev\/sd.*/ AND time > now() - 1h`,
    category: '高级查询',
    difficulty: 'intermediate',
    tags: ['正则表达式', '标签匹配'],
  },
  {
    id: 'v1-subquery',
    title: '子查询',
    description: '使用子查询进行复杂数据处理',
    query: `SELECT DERIVATIVE(MEAN("bytes_sent"), 1s) AS "bytes_per_second"
FROM (
    SELECT MEAN("bytes_sent") 
    FROM "net" 
    WHERE time > now() - 1h 
    GROUP BY time(10s)
)
GROUP BY time(1m)`,
    category: '高级查询',
    difficulty: 'advanced',
    tags: ['子查询', 'DERIVATIVE', '嵌套'],
  },
  {
    id: 'v1-multiple-measurements',
    title: '多测量值查询',
    description: '同时查询多个测量值',
    query: `SELECT MEAN("usage_idle") AS "cpu_idle", MEAN("used_percent") AS "memory_used"
FROM "cpu_usage", "mem" 
WHERE time > now() - 1h 
GROUP BY time(5m)`,
    category: '复合查询',
    difficulty: 'intermediate',
    tags: ['多测量值', '别名'],
  },
  {
    id: 'v1-continuous-query',
    title: '连续查询创建',
    description: '创建连续查询自动聚合数据',
    query: `CREATE CONTINUOUS QUERY "cpu_mean_1h" ON "telegraf"
BEGIN
  SELECT MEAN("usage_idle") AS "mean_usage_idle"
  INTO "cpu_usage_1h"
  FROM "cpu_usage"
  GROUP BY time(1h), *
END`,
    category: '管理操作',
    difficulty: 'advanced',
    tags: ['连续查询', '数据聚合'],
  },
  {
    id: 'v1-retention-policy',
    title: '保留策略管理',
    description: '创建和管理数据保留策略',
    query: `-- 创建保留策略
CREATE RETENTION POLICY "one_week" ON "telegraf" 
DURATION 7d REPLICATION 1 DEFAULT

-- 查看保留策略
SHOW RETENTION POLICIES ON "telegraf"`,
    category: '管理操作',
    difficulty: 'intermediate',
    tags: ['保留策略', '数据管理'],
  },
];

// InfluxDB 2.x 查询示例 (Flux)
const influxDB2Samples: QuerySample[] = [
  {
    id: 'v2-basic-flux',
    title: '基础 Flux 查询',
    description: '使用 Flux 语言进行基础数据查询',
    query: `from(bucket: "telegraf")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> filter(fn: (r) => r._field == "usage_idle")`,
    category: '基础查询',
    difficulty: 'beginner',
    tags: ['from', 'range', 'filter'],
  },
  {
    id: 'v2-aggregation',
    title: 'Flux 聚合查询',
    description: '使用 Flux 进行数据聚合和分组',
    query: `from(bucket: "telegraf")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> filter(fn: (r) => r._field == "usage_idle")
  |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
  |> yield(name: "mean")`,
    category: '聚合查询',
    difficulty: 'intermediate',
    tags: ['aggregateWindow', 'mean', 'yield'],
  },
  {
    id: 'v2-join',
    title: 'Flux 数据连接',
    description: '连接多个数据流进行复合查询',
    query: `cpu = from(bucket: "telegraf")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> filter(fn: (r) => r._field == "usage_idle")

memory = from(bucket: "telegraf")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "mem")
  |> filter(fn: (r) => r._field == "used_percent")

join(tables: {cpu: cpu, memory: memory}, on: ["_time", "host"])`,
    category: '复合查询',
    difficulty: 'advanced',
    tags: ['join', '多数据流', '变量'],
  },
  {
    id: 'v2-transformation',
    title: '数据转换',
    description: '使用 Flux 进行复杂数据转换',
    query: `from(bucket: "telegraf")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "net")
  |> filter(fn: (r) => r._field == "bytes_sent")
  |> derivative(unit: 1s, nonNegative: false)
  |> map(fn: (r) => ({ r with _value: r._value * 8.0 }))
  |> aggregateWindow(every: 1m, fn: mean)`,
    category: '数据转换',
    difficulty: 'advanced',
    tags: ['derivative', 'map', '计算'],
  },
  {
    id: 'v2-pivot',
    title: '数据透视',
    description: '将数据从长格式转换为宽格式',
    query: `from(bucket: "telegraf")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> filter(fn: (r) => r._field == "usage_idle" or r._field == "usage_user")
  |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")`,
    category: '数据转换',
    difficulty: 'intermediate',
    tags: ['pivot', '数据格式'],
  },
  {
    id: 'v2-task',
    title: '任务定义',
    description: '创建定时执行的 Flux 任务',
    query: `option task = {name: "downsample_cpu", every: 1h}

from(bucket: "telegraf")
  |> range(start: -task.every)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> aggregateWindow(every: 1m, fn: mean)
  |> to(bucket: "telegraf_downsampled", org: "my-org")`,
    category: '管理操作',
    difficulty: 'advanced',
    tags: ['task', 'option', 'to'],
  },
  {
    id: 'v2-alerting',
    title: '告警检查',
    description: '使用 Flux 进行数据监控和告警',
    query: `from(bucket: "telegraf")
  |> range(start: -5m)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> filter(fn: (r) => r._field == "usage_idle")
  |> aggregateWindow(every: 1m, fn: mean)
  |> map(fn: (r) => ({ r with _level: if r._value < 10.0 then "crit" else "ok" }))
  |> filter(fn: (r) => r._level == "crit")`,
    category: '监控告警',
    difficulty: 'advanced',
    tags: ['监控', '告警', '条件判断'],
  },
];

// InfluxDB 3.x 查询示例 (SQL)
const influxDB3Samples: QuerySample[] = [
  {
    id: 'v3-basic-sql',
    title: '基础 SQL 查询',
    description: 'InfluxDB 3.x 使用标准 SQL 语法',
    query: `SELECT time, host, usage_idle, usage_user, usage_system
FROM cpu
WHERE time > now() - INTERVAL '1 hour'
ORDER BY time DESC
LIMIT 100`,
    category: '基础查询',
    difficulty: 'beginner',
    tags: ['SELECT', 'WHERE', 'ORDER BY', 'LIMIT'],
  },
  {
    id: 'v3-aggregation',
    title: 'SQL 聚合查询',
    description: '使用标准 SQL 聚合函数',
    query: `SELECT 
  date_trunc('minute', time) AS minute,
  host,
  AVG(usage_idle) AS avg_idle,
  MAX(usage_user) AS max_user,
  MIN(usage_system) AS min_system
FROM cpu
WHERE time > now() - INTERVAL '1 hour'
GROUP BY date_trunc('minute', time), host
ORDER BY minute DESC`,
    category: '聚合查询',
    difficulty: 'intermediate',
    tags: ['AVG', 'MAX', 'MIN', 'GROUP BY', 'date_trunc'],
  },
  {
    id: 'v3-window-functions',
    title: '窗口函数',
    description: '使用 SQL 窗口函数进行高级分析',
    query: `SELECT 
  time,
  host,
  usage_idle,
  AVG(usage_idle) OVER (
    PARTITION BY host 
    ORDER BY time 
    ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
  ) AS moving_avg_5min
FROM cpu
WHERE time > now() - INTERVAL '1 hour'
ORDER BY host, time`,
    category: '高级查询',
    difficulty: 'advanced',
    tags: ['窗口函数', 'OVER', 'PARTITION BY', '移动平均'],
  },
  {
    id: 'v3-cte',
    title: '公用表表达式 (CTE)',
    description: '使用 WITH 子句进行复杂查询',
    query: `WITH cpu_stats AS (
  SELECT 
    date_trunc('hour', time) AS hour,
    host,
    AVG(usage_idle) AS avg_idle,
    STDDEV(usage_idle) AS stddev_idle
  FROM cpu
  WHERE time > now() - INTERVAL '24 hours'
  GROUP BY date_trunc('hour', time), host
),
anomalies AS (
  SELECT *
  FROM cpu_stats
  WHERE ABS(avg_idle - 50) > 2 * stddev_idle
)
SELECT * FROM anomalies ORDER BY hour DESC`,
    category: '高级查询',
    difficulty: 'advanced',
    tags: ['CTE', 'WITH', 'STDDEV', '异常检测'],
  },
  {
    id: 'v3-join',
    title: '表连接查询',
    description: '连接多个测量值进行关联分析',
    query: `SELECT 
  c.time,
  c.host,
  c.usage_idle AS cpu_idle,
  m.used_percent AS memory_used,
  d.used_percent AS disk_used
FROM cpu c
JOIN mem m ON c.time = m.time AND c.host = m.host
JOIN disk d ON c.time = d.time AND c.host = d.host
WHERE c.time > now() - INTERVAL '1 hour'
  AND c.host = 'server01'
ORDER BY c.time DESC`,
    category: '复合查询',
    difficulty: 'intermediate',
    tags: ['JOIN', '表连接', '关联查询'],
  },
  {
    id: 'v3-time-series',
    title: '时间序列分析',
    description: '进行时间序列数据分析和预测',
    query: `SELECT 
  time,
  host,
  usage_idle,
  LAG(usage_idle, 1) OVER (PARTITION BY host ORDER BY time) AS prev_value,
  usage_idle - LAG(usage_idle, 1) OVER (PARTITION BY host ORDER BY time) AS change_from_prev,
  FIRST_VALUE(usage_idle) OVER (
    PARTITION BY host 
    ORDER BY time 
    RANGE BETWEEN INTERVAL '1 hour' PRECEDING AND CURRENT ROW
  ) AS first_in_hour
FROM cpu
WHERE time > now() - INTERVAL '2 hours'
ORDER BY host, time`,
    category: '时间序列',
    difficulty: 'advanced',
    tags: ['LAG', 'FIRST_VALUE', '时间序列', 'RANGE'],
  },
  {
    id: 'v3-materialized-view',
    title: '物化视图',
    description: '创建物化视图提高查询性能',
    query: `-- 创建物化视图
CREATE MATERIALIZED VIEW hourly_cpu_stats AS
SELECT 
  date_trunc('hour', time) AS hour,
  host,
  AVG(usage_idle) AS avg_idle,
  MAX(usage_user) AS max_user,
  MIN(usage_system) AS min_system,
  COUNT(*) AS sample_count
FROM cpu
GROUP BY date_trunc('hour', time), host;

-- 查询物化视图
SELECT * FROM hourly_cpu_stats 
WHERE hour > now() - INTERVAL '7 days'
ORDER BY hour DESC, host;`,
    category: '管理操作',
    difficulty: 'advanced',
    tags: ['物化视图', 'CREATE', '性能优化'],
  },
];

const SampleQueriesModal: React.FC<SampleQueriesModalProps> = ({ visible, onClose }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyQuery = async (query: string, id: string) => {
    try {
      await writeToClipboard(query, {
        successMessage: '查询已复制到剪贴板'
      });
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      showMessage.error('复制失败');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return '初级';
      case 'intermediate':
        return '中级';
      case 'advanced':
        return '高级';
      default:
        return '未知';
    }
  };

  const renderQueryCard = (sample: QuerySample) => (
    <Card key={sample.id} className="mb-4 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Code className="w-5 h-5 text-blue-600" />
              {sample.title}
            </CardTitle>
            <CardDescription className="mt-2 text-sm">
              {sample.description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Badge className={`text-xs ${getDifficultyColor(sample.difficulty)}`}>
              {getDifficultyText(sample.difficulty)}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline" className="text-xs">
            {sample.category}
          </Badge>
          {sample.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="relative">
          <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto text-sm font-mono border">
            <code>{sample.query}</code>
          </pre>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => copyQuery(sample.query, sample.id)}
                >
                  {copiedId === sample.id ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {copiedId === sample.id ? '已复制' : '复制查询'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            InfluxDB 查询示例
          </DialogTitle>
          <DialogDescription>
            涵盖 InfluxDB 1.x (InfluxQL)、2.x (Flux) 和 3.x (SQL) 版本的各种查询示例
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="v1" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="v1" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              InfluxDB 1.x (InfluxQL)
            </TabsTrigger>
            <TabsTrigger value="v2" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              InfluxDB 2.x (Flux)
            </TabsTrigger>
            <TabsTrigger value="v3" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              InfluxDB 3.x (SQL)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="v1" className="flex-1 mt-4 min-h-0">
            <ScrollArea className="h-full">
              <div className="space-y-6 pr-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">InfluxDB 1.x (InfluxQL)</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    InfluxQL 是 InfluxDB 1.x 版本的 SQL-like 查询语言，专为时间序列数据设计。
                    支持聚合函数、连续查询、保留策略等功能。
                  </p>
                </div>
                {influxDB1Samples.map(renderQueryCard)}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="v2" className="flex-1 mt-4 min-h-0">
            <ScrollArea className="h-full">
              <div className="space-y-6 pr-4">
                <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">InfluxDB 2.x (Flux)</h3>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Flux 是 InfluxDB 2.x 的函数式数据脚本语言，提供更强大的数据处理能力。
                    支持复杂的数据转换、连接操作和自定义函数。
                  </p>
                </div>
                {influxDB2Samples.map(renderQueryCard)}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="v3" className="flex-1 mt-4 min-h-0">
            <ScrollArea className="h-full">
              <div className="space-y-6 pr-4">
                <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">InfluxDB 3.x (SQL)</h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    InfluxDB 3.x 重回标准 SQL，基于 Apache Arrow 和 DataFusion 构建。
                    支持完整的 SQL 语法，包括窗口函数、CTE、物化视图等高级功能。
                  </p>
                </div>
                {influxDB3Samples.map(renderQueryCard)}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SampleQueriesModal;