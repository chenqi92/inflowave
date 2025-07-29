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
    id: 'v1-group-by-tags',
    title: '按标签分组',
    description: '使用标签进行数据分组统计',
    query: `SELECT MEAN("usage_idle") 
FROM "cpu_usage" 
WHERE time > now() - 1h 
GROUP BY time(5m), "cpu", "host" 
FILL(null)`,
    category: '聚合查询',
    difficulty: 'intermediate',
    tags: ['GROUP BY', 'FILL', '标签分组'],
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
    id: 'v1-where-conditions',
    title: '复杂WHERE条件',
    description: '使用复杂的WHERE条件过滤数据',
    query: `SELECT "usage_idle", "usage_user" 
FROM "cpu_usage" 
WHERE time > now() - 2h 
  AND time < now() - 1h 
  AND "host" =~ /server.*/ 
  AND ("cpu" = 'cpu-total' OR "cpu" = 'cpu0')
  AND "usage_idle" < 80`,
    category: '基础查询',
    difficulty: 'intermediate',
    tags: ['WHERE', '复杂条件', '逻辑操作符'],
  },
  {
    id: 'v1-math-functions',
    title: '数学函数',
    description: '使用数学函数进行数据计算',
    query: `SELECT 
  MEAN("usage_idle") AS "avg_idle",
  STDDEV("usage_idle") AS "stddev_idle",
  PERCENTILE("usage_idle", 95) AS "p95_idle",
  100 - MEAN("usage_idle") AS "avg_usage"
FROM "cpu_usage" 
WHERE time > now() - 1h 
GROUP BY time(10m)`,
    category: '聚合查询',
    difficulty: 'intermediate',
    tags: ['STDDEV', 'PERCENTILE', '数学运算'],
  },
  {
    id: 'v1-top-bottom',
    title: 'TOP/BOTTOM查询',
    description: '查询最大值和最小值记录',
    query: `SELECT TOP("usage_user", "host", 5)
FROM "cpu_usage" 
WHERE time > now() - 1h

-- 查询最低CPU空闲率的记录
SELECT BOTTOM("usage_idle", 3)
FROM "cpu_usage" 
WHERE time > now() - 1h`,
    category: '聚合查询',
    difficulty: 'intermediate',
    tags: ['TOP', 'BOTTOM', '排序'],
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
    id: 'v1-into-clause',
    title: 'INTO子句',
    description: '将查询结果写入新的测量值',
    query: `SELECT MEAN("usage_idle") AS "mean_idle" 
INTO "cpu_summary" 
FROM "cpu_usage" 
WHERE time > now() - 1h 
GROUP BY time(1h), "host"`,
    category: '数据写入',
    difficulty: 'intermediate',
    tags: ['INTO', '数据写入', '结果存储'],
  },
  {
    id: 'v1-show-commands',
    title: 'SHOW命令',
    description: '查看数据库元数据信息',
    query: `-- 查看所有数据库
SHOW DATABASES

-- 查看测量值
SHOW MEASUREMENTS ON "telegraf"

-- 查看字段键
SHOW FIELD KEYS FROM "cpu_usage"

-- 查看标签键
SHOW TAG KEYS FROM "cpu_usage"

-- 查看标签值
SHOW TAG VALUES FROM "cpu_usage" WITH KEY = "cpu"`,
    category: '管理操作',
    difficulty: 'beginner',
    tags: ['SHOW', '元数据', '数据库管理'],
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
SHOW RETENTION POLICIES ON "telegraf"

-- 删除保留策略
DROP RETENTION POLICY "one_week" ON "telegraf"`,
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
    description: '使用 Flux 语言进行基础数据查询，|> 是管道操作符',
    query: `from(bucket: "telegraf")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> filter(fn: (r) => r._field == "usage_idle")`,
    category: '基础查询',
    difficulty: 'beginner',
    tags: ['from', 'range', 'filter', '管道操作符'],
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
    id: 'v2-multiple-fields',
    title: '多字段查询',
    description: '同时查询多个字段并进行数据处理',
    query: `from(bucket: "telegraf")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> filter(fn: (r) => r._field == "usage_idle" or r._field == "usage_user" or r._field == "usage_system")
  |> group(columns: ["_time", "host"])
  |> aggregateWindow(every: 5m, fn: mean)`,
    category: '基础查询',
    difficulty: 'intermediate',
    tags: ['多字段', 'group', '逻辑操作符'],
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
    id: 'v2-math-operations',
    title: '数学运算',
    description: '使用 Flux 进行数学计算和统计分析',
    query: `from(bucket: "telegraf")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> filter(fn: (r) => r._field == "usage_idle")
  |> aggregateWindow(every: 5m, fn: mean)
  |> map(fn: (r) => ({ r with 
      cpu_usage: 100.0 - r._value,
      threshold_exceeded: if 100.0 - r._value > 80.0 then true else false
    }))`,
    category: '数据转换',
    difficulty: 'intermediate',
    tags: ['数学运算', '条件判断', 'map'],
  },
  {
    id: 'v2-regex-filter',
    title: '正则表达式过滤',
    description: '使用正则表达式进行复杂的字符串匹配',
    query: `from(bucket: "telegraf")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "disk")
  |> filter(fn: (r) => r.device =~ /^\/dev\/sd.*/)
  |> filter(fn: (r) => r._field == "used_percent")
  |> aggregateWindow(every: 5m, fn: mean)`,
    category: '高级查询',
    difficulty: 'intermediate',
    tags: ['正则表达式', '字符串匹配'],
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
  {
    id: 'v2-histogram',
    title: '直方图统计',
    description: '创建数据分布直方图',
    query: `from(bucket: "telegraf")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> filter(fn: (r) => r._field == "usage_idle")
  |> histogram(bins: [0.0, 20.0, 40.0, 60.0, 80.0, 100.0])
  |> group(columns: ["le"])
  |> sum(column: "_value")`,
    category: '统计分析',
    difficulty: 'advanced',
    tags: ['histogram', '统计分析', '分布'],
  },
  {
    id: 'v2-flux-csv',
    title: 'CSV 数据处理',
    description: '从 CSV 数据源读取和处理数据',
    query: `import "csv"

csv.from(csv: "
#group,false,false,true,true
#datatype,string,long,dateTime:RFC3339,double
#default,_result,,,
,result,table,_time,_value
,mean,0,2023-01-01T00:00:00Z,85.2
,mean,0,2023-01-01T01:00:00Z,86.1
")
  |> filter(fn: (r) => r._value > 85.0)`,
    category: '数据导入',
    difficulty: 'intermediate',
    tags: ['CSV', '数据导入', 'import'],
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
    id: 'v3-where-conditions',
    title: '复杂WHERE条件',
    description: '使用多种条件操作符进行数据过滤',
    query: `SELECT time, host, usage_idle, usage_user
FROM cpu
WHERE time BETWEEN now() - INTERVAL '2 hours' AND now() - INTERVAL '1 hour'
  AND host LIKE 'server%'
  AND usage_idle < 80.0
  AND (usage_user > 10.0 OR usage_system > 5.0)
ORDER BY time DESC`,
    category: '基础查询',
    difficulty: 'intermediate',
    tags: ['BETWEEN', 'LIKE', '逻辑操作符'],
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
  MIN(usage_system) AS min_system,
  COUNT(*) AS sample_count
FROM cpu
WHERE time > now() - INTERVAL '1 hour'
GROUP BY date_trunc('minute', time), host
ORDER BY minute DESC`,
    category: '聚合查询',
    difficulty: 'intermediate',
    tags: ['AVG', 'MAX', 'MIN', 'GROUP BY', 'date_trunc'],
  },
  {
    id: 'v3-having-clause',
    title: 'HAVING子句',
    description: '使用HAVING对聚合结果进行过滤',
    query: `SELECT 
  host,
  AVG(usage_idle) AS avg_idle,
  COUNT(*) AS measurement_count
FROM cpu
WHERE time > now() - INTERVAL '1 hour'
GROUP BY host
HAVING AVG(usage_idle) < 50.0 AND COUNT(*) > 10
ORDER BY avg_idle ASC`,
    category: '聚合查询',
    difficulty: 'intermediate',
    tags: ['HAVING', '聚合过滤'],
  },
  {
    id: 'v3-subqueries',
    title: '子查询',
    description: '使用子查询进行复杂数据分析',
    query: `SELECT 
  host,
  current_idle,
  avg_idle,
  current_idle - avg_idle AS idle_diff
FROM (
  SELECT 
    host,
    usage_idle AS current_idle,
    AVG(usage_idle) OVER (PARTITION BY host) AS avg_idle
  FROM cpu
  WHERE time > now() - INTERVAL '1 hour'
) subquery
WHERE ABS(current_idle - avg_idle) > 10.0
ORDER BY ABS(current_idle - avg_idle) DESC`,
    category: '高级查询',
    difficulty: 'advanced',
    tags: ['子查询', '相关查询'],
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
  ) AS moving_avg_5min,
  ROW_NUMBER() OVER (PARTITION BY host ORDER BY usage_idle DESC) AS idle_rank
FROM cpu
WHERE time > now() - INTERVAL '1 hour'
ORDER BY host, time`,
    category: '高级查询',
    difficulty: 'advanced',
    tags: ['窗口函数', 'OVER', 'PARTITION BY', '移动平均', 'ROW_NUMBER'],
  },
  {
    id: 'v3-case-when',
    title: 'CASE WHEN 条件语句',
    description: '使用CASE WHEN进行条件逻辑处理',
    query: `SELECT 
  time,
  host,
  usage_idle,
  CASE 
    WHEN usage_idle > 80 THEN 'Low Load'
    WHEN usage_idle > 60 THEN 'Medium Load' 
    WHEN usage_idle > 40 THEN 'High Load'
    ELSE 'Critical Load'
  END AS load_category,
  CASE 
    WHEN usage_idle < 20 THEN 'ALERT'
    ELSE 'OK'
  END AS alert_status
FROM cpu
WHERE time > now() - INTERVAL '1 hour'
ORDER BY time DESC`,
    category: '数据转换',
    difficulty: 'intermediate',
    tags: ['CASE WHEN', '条件逻辑', '数据分类'],
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
  SELECT *,
    ABS(avg_idle - 50.0) / stddev_idle AS z_score
  FROM cpu_stats
  WHERE ABS(avg_idle - 50.0) > 2 * stddev_idle
)
SELECT * FROM anomalies 
ORDER BY z_score DESC, hour DESC`,
    category: '高级查询',
    difficulty: 'advanced',
    tags: ['CTE', 'WITH', 'STDDEV', '异常检测', 'Z-Score'],
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
INNER JOIN mem m ON c.time = m.time AND c.host = m.host
LEFT JOIN disk d ON c.time = d.time AND c.host = d.host
WHERE c.time > now() - INTERVAL '1 hour'
  AND c.host = 'server01'
ORDER BY c.time DESC`,
    category: '复合查询',
    difficulty: 'intermediate',
    tags: ['JOIN', 'INNER JOIN', 'LEFT JOIN', '表连接', '关联查询'],
  },
  {
    id: 'v3-union-queries',
    title: 'UNION 联合查询',
    description: '使用UNION合并多个查询结果',
    query: `SELECT 
  'CPU' AS metric_type,
  time,
  host,
  usage_idle AS value
FROM cpu
WHERE time > now() - INTERVAL '1 hour'
  AND usage_idle < 20.0

UNION ALL

SELECT 
  'Memory' AS metric_type,
  time,
  host,
  used_percent AS value
FROM mem
WHERE time > now() - INTERVAL '1 hour'
  AND used_percent > 80.0

ORDER BY time DESC, host`,
    category: '复合查询',
    difficulty: 'intermediate',
    tags: ['UNION', 'UNION ALL', '联合查询'],
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
  ) AS first_in_hour,
  RANK() OVER (
    PARTITION BY host 
    ORDER BY usage_idle DESC
  ) AS idle_rank
FROM cpu
WHERE time > now() - INTERVAL '2 hours'
ORDER BY host, time`,
    category: '时间序列',
    difficulty: 'advanced',
    tags: ['LAG', 'FIRST_VALUE', '时间序列', 'RANGE', 'RANK'],
  },
  {
    id: 'v3-percentiles',
    title: '百分位数统计',
    description: '计算数据分布的百分位数',
    query: `SELECT 
  host,
  COUNT(*) AS sample_count,
  AVG(usage_idle) AS avg_idle,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY usage_idle) AS median_idle,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY usage_idle) AS p95_idle,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY usage_idle) AS p99_idle,
  MIN(usage_idle) AS min_idle,
  MAX(usage_idle) AS max_idle
FROM cpu
WHERE time > now() - INTERVAL '1 hour'
GROUP BY host
ORDER BY avg_idle ASC`,
    category: '统计分析',
    difficulty: 'advanced',
    tags: ['PERCENTILE_CONT', '百分位数', '统计分析'],
  },
  {
    id: 'v3-date-functions',
    title: '日期时间函数',
    description: '使用各种日期时间函数进行时间操作',
    query: `SELECT 
  time,
  EXTRACT(HOUR FROM time) AS hour_of_day,
  EXTRACT(DOW FROM time) AS day_of_week,
  date_trunc('hour', time) AS hour_bucket,
  date_trunc('day', time) AS day_bucket,
  age(now(), time) AS time_ago,
  host,
  usage_idle
FROM cpu
WHERE time > now() - INTERVAL '1 day'
  AND EXTRACT(HOUR FROM time) BETWEEN 9 AND 17  -- 工作时间
ORDER BY time DESC`,
    category: '时间处理',
    difficulty: 'intermediate',
    tags: ['EXTRACT', 'date_trunc', 'age', '时间函数'],
  },
  {
    id: 'v3-regex-patterns',
    title: '正则表达式匹配',
    description: '使用正则表达式进行模式匹配',
    query: `SELECT 
  time,
  host,
  device,
  used_percent
FROM disk
WHERE time > now() - INTERVAL '1 hour'
  AND device ~ '^/dev/sd[a-z][0-9]+$'  -- 匹配标准磁盘分区
  AND host ~ '^(web|db|app)-server-[0-9]+$'  -- 匹配服务器命名模式
  AND used_percent > 80.0
ORDER BY used_percent DESC, time DESC`,
    category: '高级查询',
    difficulty: 'intermediate',
    tags: ['正则表达式', '模式匹配', '~操作符'],
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
  COUNT(*) AS sample_count,
  STDDEV(usage_idle) AS idle_stddev
FROM cpu
GROUP BY date_trunc('hour', time), host;

-- 查询物化视图
SELECT * FROM hourly_cpu_stats 
WHERE hour > now() - INTERVAL '7 days'
  AND avg_idle < 50.0
ORDER BY hour DESC, avg_idle ASC;

-- 删除物化视图
-- DROP MATERIALIZED VIEW hourly_cpu_stats;`,
    category: '管理操作',
    difficulty: 'advanced',
    tags: ['物化视图', 'CREATE', '性能优化', 'DROP'],
  },
  {
    id: 'v3-explain-query',
    title: '查询执行计划',
    description: '分析和优化查询性能',
    query: `-- 查看查询执行计划
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT 
  date_trunc('hour', time) AS hour,
  host,
  AVG(usage_idle) AS avg_idle,
  COUNT(*) AS sample_count
FROM cpu
WHERE time > now() - INTERVAL '7 days'
  AND host IN ('server01', 'server02', 'server03')
GROUP BY date_trunc('hour', time), host
ORDER BY hour DESC, host;

-- 简单的执行计划查看
EXPLAIN 
SELECT * FROM cpu 
WHERE time > now() - INTERVAL '1 hour' 
  AND usage_idle < 20.0;`,
    category: '性能优化',
    difficulty: 'advanced',
    tags: ['EXPLAIN', '执行计划', '性能分析'],
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
      <DialogContent className="max-w-6xl w-full h-[85vh] p-0 flex flex-col gap-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            InfluxDB 查询示例
          </DialogTitle>
          <DialogDescription>
            涵盖 InfluxDB 1.x (InfluxQL)、2.x (Flux) 和 3.x (SQL) 版本的各种查询示例
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="v1" className="h-full flex flex-col">
            <div className="px-6 py-3 border-b flex-shrink-0">
              <TabsList className="grid w-full grid-cols-3">
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
            </div>

            <TabsContent value="v1" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full px-6 py-4">
                <div className="space-y-6">
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

            <TabsContent value="v2" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full px-6 py-4">
                <div className="space-y-6">
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

            <TabsContent value="v3" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full px-6 py-4">
                <div className="space-y-6">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SampleQueriesModal;