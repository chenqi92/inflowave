# InfluxDB 2.x Flux 查询测试指令集

本文档包含 InfluxDB 2.x 的 Flux 查询语言的所有常用指令，用于测试 InfloWave 的功能。

---

## 📋 目录

1. [基础查询](#1-基础查询)
2. [数据写入](#2-数据写入)
3. [时间范围查询](#3-时间范围查询)
4. [过滤和筛选](#4-过滤和筛选)
5. [聚合函数](#5-聚合函数)
6. [分组操作](#6-分组操作)
7. [窗口函数](#7-窗口函数)
8. [数学运算](#8-数学运算)
9. [字符串操作](#9-字符串操作)
10. [连接和合并](#10-连接和合并)
11. [Schema 查询](#11-schema-查询)
12. [高级功能](#12-高级功能)

---

## 1. 基础查询

### 1.1 查询所有数据（最近1小时）
```flux
from(bucket: "allbs")
  |> range(start: -1h)
```

### 1.2 查询特定 measurement
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
```

### 1.3 查询特定 field
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature" and r._field == "value")
```

### 1.4 限制返回行数
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> limit(n: 10)
```

### 1.5 查询最新的数据点
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> last()
```

---

## 2. 数据写入

### 2.1 写入单条数据（使用 Line Protocol）
```
temperature,location=room1,sensor=sensor1 value=23.5 1699000000000000000
```

### 2.2 写入多条数据
```
temperature,location=room1,sensor=sensor1 value=23.5 1699000000000000000
temperature,location=room1,sensor=sensor1 value=24.1 1699000060000000000
temperature,location=room1,sensor=sensor1 value=23.8 1699000120000000000
```

### 2.3 写入带多个 field 的数据
```
weather,location=room1 temperature=23.5,humidity=65.2,pressure=1013.25 1699000000000000000
```

### 2.4 写入带多个 tag 的数据
```
cpu,host=server01,region=us-west,datacenter=dc1 usage_idle=85.5,usage_system=5.2,usage_user=9.3 1699000000000000000
```

---

## 3. 时间范围查询

### 3.1 查询最近 5 分钟
```flux
from(bucket: "allbs")
  |> range(start: -5m)
```

### 3.2 查询最近 1 小时
```flux
from(bucket: "allbs")
  |> range(start: -1h)
```

### 3.3 查询最近 24 小时
```flux
from(bucket: "allbs")
  |> range(start: -24h)
```

### 3.4 查询最近 7 天
```flux
from(bucket: "allbs")
  |> range(start: -7d)
```

### 3.5 查询指定时间范围
```flux
from(bucket: "allbs")
  |> range(start: 2025-11-01T00:00:00Z, stop: 2025-11-03T23:59:59Z)
```

### 3.6 查询从某个时间点到现在
```flux
from(bucket: "allbs")
  |> range(start: 2025-11-01T00:00:00Z)
```

---

## 4. 过滤和筛选

### 4.1 按 measurement 过滤
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
```

### 4.2 按 tag 过滤
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r.host == "server01")
```

### 4.3 按多个条件过滤（AND）
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu" and r.host == "server01")
```

### 4.4 按多个条件过滤（OR）
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r.host == "server01" or r.host == "server02")
```

### 4.5 按数值范围过滤
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._value > 50.0 and r._value < 100.0)
```

### 4.6 使用正则表达式过滤
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r.host =~ /^server/)
```

---

## 5. 聚合函数

### 5.1 计算平均值
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> mean()
```

### 5.2 计算总和
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "requests")
  |> sum()
```

### 5.3 计算最大值
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> max()
```

### 5.4 计算最小值
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> min()
```

### 5.5 计算中位数
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> median()
```

### 5.6 计算标准差
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> stddev()
```

### 5.7 计数
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "requests")
  |> count()
```

---

## 6. 分组操作

### 6.1 按 tag 分组
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> group(columns: ["host"])
  |> mean()
```

### 6.2 按多个 tag 分组
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> group(columns: ["host", "region"])
  |> mean()
```

### 6.3 取消分组
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> group()
```

### 6.4 按 measurement 和 field 分组
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> group(columns: ["_measurement", "_field"])
  |> mean()
```

---

## 7. 窗口函数

### 7.1 按时间窗口聚合（1分钟）
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> aggregateWindow(every: 1m, fn: mean)
```

### 7.2 按时间窗口聚合（5分钟）
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> aggregateWindow(every: 5m, fn: mean)
```

### 7.3 按时间窗口聚合（1小时）
```flux
from(bucket: "allbs")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> aggregateWindow(every: 1h, fn: mean)
```

### 7.4 使用不同的聚合函数
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> aggregateWindow(every: 5m, fn: max)
```

### 7.5 滑动窗口
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> window(every: 5m, period: 10m)
  |> mean()
```

---

## 8. 数学运算

### 8.1 加法
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> map(fn: (r) => ({ r with _value: r._value + 10.0 }))
```

### 8.2 减法
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> map(fn: (r) => ({ r with _value: r._value - 5.0 }))
```

### 8.3 乘法
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> map(fn: (r) => ({ r with _value: r._value * 1.8 + 32.0 }))
```

### 8.4 除法
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "bytes")
  |> map(fn: (r) => ({ r with _value: r._value / 1024.0 }))
```

### 8.5 计算百分比
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu")
  |> map(fn: (r) => ({ r with _value: r._value * 100.0 }))
```

### 8.6 计算差值（derivative）
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "counter")
  |> derivative(unit: 1s, nonNegative: true)
```

---

## 9. 字符串操作

### 9.1 字符串拼接
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> map(fn: (r) => ({ r with location: r.host + "_" + r.region }))
```

### 9.2 字符串替换
```flux
import "strings"

from(bucket: "allbs")
  |> range(start: -1h)
  |> map(fn: (r) => ({ r with host: strings.replaceAll(v: r.host, t: "server", u: "srv") }))
```

### 9.3 字符串转大写
```flux
import "strings"

from(bucket: "allbs")
  |> range(start: -1h)
  |> map(fn: (r) => ({ r with host: strings.toUpper(v: r.host) }))
```

### 9.4 字符串转小写
```flux
import "strings"

from(bucket: "allbs")
  |> range(start: -1h)
  |> map(fn: (r) => ({ r with host: strings.toLower(v: r.host) }))
```

### 9.5 字符串包含判断
```flux
import "strings"

from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => strings.containsStr(v: r.host, substr: "server"))
```

---

## 10. 连接和合并

### 10.1 合并多个查询结果
```flux
data1 = from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")

data2 = from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "humidity")

union(tables: [data1, data2])
```

### 10.2 按时间连接两个数据流
```flux
temp = from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature" and r._field == "value")

humidity = from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "humidity" and r._field == "value")

join(
  tables: {temp: temp, humidity: humidity},
  on: ["_time", "location"]
)
```

### 10.3 Pivot 操作（行转列）
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "weather")
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
```

---

## 11. Schema 查询

### 11.1 查询所有 measurements
```flux
import "influxdata/influxdb/schema"

schema.measurements(bucket: "allbs")
```

### 11.2 查询特定 measurement 的所有 tags
```flux
import "influxdata/influxdb/schema"

schema.measurementTagKeys(
  bucket: "allbs",
  measurement: "cpu"
)
```

### 11.3 查询特定 tag 的所有值
```flux
import "influxdata/influxdb/schema"

schema.measurementTagValues(
  bucket: "allbs",
  measurement: "cpu",
  tag: "host"
)
```

### 11.4 查询特定 measurement 的所有 fields
```flux
import "influxdata/influxdb/schema"

schema.measurementFieldKeys(
  bucket: "allbs",
  measurement: "cpu"
)
```

### 11.5 查询所有 tag keys
```flux
import "influxdata/influxdb/schema"

schema.tagKeys(bucket: "allbs")
```

### 11.6 查询所有 tag values
```flux
import "influxdata/influxdb/schema"

schema.tagValues(
  bucket: "allbs",
  tag: "host"
)
```

---

## 12. 高级功能

### 12.1 计算移动平均
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> movingAverage(n: 5)
```

### 12.2 计算累积和
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "requests")
  |> cumulativeSum()
```

### 12.3 数据采样（降采样）
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> sample(n: 10)
```

### 12.4 数据去重
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> unique(column: "_value")
```

### 12.5 数据排序
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> sort(columns: ["_value"], desc: true)
```

### 12.6 Top N 查询
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> top(n: 10, columns: ["_value"])
```

### 12.7 Bottom N 查询
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> bottom(n: 10, columns: ["_value"])
```

### 12.8 百分位数计算
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> quantile(q: 0.95)
```

### 12.9 数据填充（处理缺失值）
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> fill(value: 0.0)
```

### 12.10 时间偏移
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> timeShift(duration: 1h)
```

### 12.11 变化率计算
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> difference()
```

### 12.12 条件赋值
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> map(fn: (r) => ({
      r with
      status: if r._value > 30.0 then "high" else if r._value < 10.0 then "low" else "normal"
    }))
```

---

## 📊 完整示例：综合查询

### 示例 1：计算每个主机的 CPU 平均使用率（5分钟窗口）
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "cpu" and r._field == "usage_percent")
  |> group(columns: ["host"])
  |> aggregateWindow(every: 5m, fn: mean)
  |> yield(name: "mean_cpu_by_host")
```

### 示例 2：查询温度异常（超过阈值）的数据点
```flux
from(bucket: "allbs")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "temperature" and r._field == "value")
  |> filter(fn: (r) => r._value > 35.0 or r._value < 5.0)
  |> group(columns: ["location"])
  |> count()
```

### 示例 3：计算多个指标的相关性
```flux
temp = from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature" and r._field == "value")
  |> aggregateWindow(every: 1m, fn: mean)

humidity = from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "humidity" and r._field == "value")
  |> aggregateWindow(every: 1m, fn: mean)

join(
  tables: {temp: temp, humidity: humidity},
  on: ["_time", "location"]
)
  |> map(fn: (r) => ({
      r with
      temp_value: r._value_temp,
      humidity_value: r._value_humidity
    }))
```

---

## 🔧 实用技巧

### 1. 调试查询
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> limit(n: 5)
  |> yield(name: "debug")
```

### 2. 查看查询执行计划
在 InfluxDB UI 中使用 "Explain" 功能查看查询执行计划。

### 3. 优化查询性能
- 尽早使用 `filter()` 减少数据量
- 使用 `range()` 限制时间范围
- 避免不必要的 `group()` 操作
- 使用 `limit()` 限制返回行数

---

## 📝 注意事项

1. **Bucket 名称**：将示例中的 `"allbs"` 替换为你的实际 bucket 名称
2. **Measurement 名称**：根据实际数据调整 measurement 名称
3. **时间范围**：根据数据量调整时间范围，避免查询过多数据
4. **数据写入**：Line Protocol 格式的数据需要通过 InfluxDB 的写入 API 或 CLI 工具写入
5. **权限**：确保你的 token 有足够的权限读写数据

---

## 🚀 快速开始

### 步骤 1：写入测试数据
```
# 温度数据
temperature,location=room1,sensor=sensor1 value=23.5
temperature,location=room1,sensor=sensor1 value=24.1
temperature,location=room2,sensor=sensor2 value=22.8

# CPU 数据
cpu,host=server01,region=us-west usage_percent=45.2
cpu,host=server02,region=us-east usage_percent=67.8

# 天气数据
weather,location=room1 temperature=23.5,humidity=65.2,pressure=1013.25
```

### 步骤 2：验证数据写入
```flux
from(bucket: "allbs")
  |> range(start: -1h)
  |> limit(n: 10)
```

### 步骤 3：开始测试查询
从简单的查询开始，逐步尝试更复杂的功能。

---

**文档版本**: 1.0
**最后更新**: 2025-11-03
**适用版本**: InfluxDB 2.x


