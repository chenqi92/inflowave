# SQL 执行结果展示功能 - 完整测试 SQL 语句

基于日志中的 `app_performance` 表结构生成的测试 SQL 语句集合。

---

## 表结构信息

### 数据库
- **数据库名**: `my_test_db`
- **保留策略**: `autogen` (默认)

### 测量（Measurement）
- **测量名**: `app_performance`

### 字段（Fields）
| 字段名 | 类型 |
|--------|------|
| `concurrent_users` | integer / string |
| `error_rate` | float / string |
| `response_time` | float / string |
| `throughput` | float / string |

### 标签（Tags）
| 标签名 | 说明 |
|--------|------|
| `app_name` | 应用名称 (user-service / payment-service) |
| `endpoint` | API 端点 (/api/auth, /api/users, /api/orders, /api/payments) |
| `method` | HTTP 方法 (GET, POST, PUT, DELETE) |

### 时间字段
- `time` - 时间戳

---

## 一、查询类（SELECT）测试

### 1.1 基础查询

```sql
-- 查询最近 500 条记录
SELECT * FROM "app_performance" 
ORDER BY time DESC 
LIMIT 500;
```

```sql
-- 查询指定时间范围
SELECT * FROM "app_performance" 
WHERE time > now() - 1h;
```

```sql
-- 查询特定应用的数据
SELECT * FROM "app_performance" 
WHERE "app_name" = 'user-service' 
ORDER BY time DESC 
LIMIT 100;
```

```sql
-- 查询特定端点的数据
SELECT * FROM "app_performance" 
WHERE "endpoint" = '/api/payments' 
ORDER BY time DESC 
LIMIT 100;
```

```sql
-- 查询特定 HTTP 方法的数据
SELECT * FROM "app_performance" 
WHERE "method" = 'POST' 
ORDER BY time DESC 
LIMIT 100;
```

```sql
-- 多条件查询
SELECT * FROM "app_performance" 
WHERE "app_name" = 'payment-service' 
  AND "endpoint" = '/api/orders' 
  AND "method" = 'GET'
ORDER BY time DESC 
LIMIT 100;
```

---

### 1.2 聚合查询（会显示聚合统计卡片）

```sql
-- COUNT 聚合
SELECT COUNT(*) FROM "app_performance";
```

```sql
-- COUNT 聚合（按字段）
SELECT COUNT("concurrent_users"), 
       COUNT("error_rate"), 
       COUNT("response_time"), 
       COUNT("throughput")
FROM "app_performance";
```

```sql
-- SUM 聚合
SELECT SUM("concurrent_users") as total_users,
       SUM("throughput") as total_throughput
FROM "app_performance";
```

```sql
-- AVG 聚合
SELECT MEAN("response_time") as avg_response_time,
       MEAN("error_rate") as avg_error_rate,
       MEAN("concurrent_users") as avg_users
FROM "app_performance";
```

```sql
-- MAX/MIN 聚合
SELECT MAX("response_time") as max_response_time,
       MIN("response_time") as min_response_time,
       MAX("concurrent_users") as max_users,
       MIN("concurrent_users") as min_users
FROM "app_performance";
```

```sql
-- 完整聚合统计（会显示所有聚合卡片）
SELECT COUNT(*) as count,
       SUM("concurrent_users") as sum,
       AVG("response_time") as avg,
       MAX("error_rate") as max,
       MIN("throughput") as min
FROM "app_performance";
```

```sql
-- MEAN 聚合（InfluxDB 特有）
SELECT MEAN("response_time") as mean_response_time,
       MEAN("error_rate") as mean_error_rate,
       MEAN("concurrent_users") as mean_users
FROM "app_performance"
WHERE time > now() - 1h;
```

---

### 1.3 分组查询（GROUP BY）

```sql
-- 按应用名称分组
SELECT MEAN("response_time") as avg_response_time
FROM "app_performance"
GROUP BY "app_name";
```

```sql
-- 按端点分组
SELECT COUNT(*) as request_count,
       MEAN("response_time") as avg_response_time
FROM "app_performance"
GROUP BY "endpoint";
```

```sql
-- 按 HTTP 方法分组
SELECT COUNT(*) as count,
       MEAN("error_rate") as avg_error_rate
FROM "app_performance"
GROUP BY "method";
```

```sql
-- 多字段分组
SELECT COUNT(*) as count,
       MEAN("response_time") as avg_response_time
FROM "app_performance"
GROUP BY "app_name", "endpoint";
```

```sql
-- 按时间分组（1小时间隔）
SELECT MEAN("response_time") as avg_response_time,
       MEAN("concurrent_users") as avg_users
FROM "app_performance"
WHERE time > now() - 24h
GROUP BY time(1h);
```

```sql
-- 按时间和标签分组
SELECT MEAN("response_time") as avg_response_time
FROM "app_performance"
WHERE time > now() - 6h
GROUP BY time(30m), "app_name";
```

---

### 1.4 子查询

```sql
-- 子查询：查找响应时间高于平均值的记录
SELECT * FROM "app_performance"
WHERE "response_time" > (
  SELECT MEAN("response_time") FROM "app_performance"
)
LIMIT 100;
```

```sql
-- 子查询：查找错误率最高的应用
SELECT * FROM "app_performance"
WHERE "app_name" = (
  SELECT "app_name" FROM "app_performance"
  GROUP BY "app_name"
  ORDER BY MEAN("error_rate") DESC
  LIMIT 1
)
LIMIT 100;
```

---

### 1.5 条件过滤查询

```sql
-- 高响应时间查询（>500ms）
SELECT * FROM "app_performance"
WHERE "response_time" > 500
ORDER BY "response_time" DESC
LIMIT 100;
```

```sql
-- 高错误率查询（>5%）
SELECT * FROM "app_performance"
WHERE "error_rate" > 5.0
ORDER BY "error_rate" DESC
LIMIT 100;
```

```sql
-- 高并发用户查询（>300）
SELECT * FROM "app_performance"
WHERE "concurrent_users" > 300
ORDER BY "concurrent_users" DESC
LIMIT 100;
```

```sql
-- 复合条件查询
SELECT * FROM "app_performance"
WHERE "response_time" > 500
  AND "error_rate" > 5.0
  AND "concurrent_users" > 200
ORDER BY time DESC
LIMIT 100;
```

---

## 二、SHOW 类查询

```sql
-- 显示所有数据库
SHOW DATABASES;
```

```sql
-- 显示所有测量
SHOW MEASUREMENTS;
```

```sql
-- 显示指定测量的字段
SHOW FIELD KEYS FROM "app_performance";
```

```sql
-- 显示指定测量的标签
SHOW TAG KEYS FROM "app_performance";
```

```sql
-- 显示标签值
SHOW TAG VALUES FROM "app_performance" WITH KEY = "app_name";
```

```sql
-- 显示标签值（endpoint）
SHOW TAG VALUES FROM "app_performance" WITH KEY = "endpoint";
```

```sql
-- 显示标签值（method）
SHOW TAG VALUES FROM "app_performance" WITH KEY = "method";
```

```sql
-- 显示保留策略
SHOW RETENTION POLICIES ON "my_test_db";
```

```sql
-- 显示连续查询
SHOW CONTINUOUS QUERIES;
```

```sql
-- 显示序列
SHOW SERIES FROM "app_performance" LIMIT 10;
```

---

## 三、写入类（INSERT）测试

```sql
-- 插入单条记录（使用 Line Protocol）
INSERT app_performance,app_name=test-service,endpoint=/api/test,method=GET concurrent_users=100,error_rate=1.5,response_time=250.5,throughput=500.0
```

```sql
-- 插入多条记录
INSERT app_performance,app_name=test-service,endpoint=/api/test,method=POST concurrent_users=150,error_rate=2.0,response_time=300.0,throughput=600.0
INSERT app_performance,app_name=test-service,endpoint=/api/test,method=PUT concurrent_users=120,error_rate=1.8,response_time=280.0,throughput=550.0
INSERT app_performance,app_name=test-service,endpoint=/api/test,method=DELETE concurrent_users=80,error_rate=1.2,response_time=200.0,throughput=450.0
```

---

## 四、删除类（DELETE）测试

```sql
-- 删除指定时间范围的数据
DELETE FROM "app_performance" WHERE time < now() - 365d;
```

```sql
-- 删除指定标签的数据
DELETE FROM "app_performance" WHERE "app_name" = 'test-service';
```

```sql
-- 删除指定端点的数据
DELETE FROM "app_performance" WHERE "endpoint" = '/api/test';
```

```sql
-- DROP SERIES（删除序列）
DROP SERIES FROM "app_performance" WHERE "app_name" = 'test-service';
```

---

## 五、DDL 类测试

### 5.1 CREATE

```sql
-- 创建数据库
CREATE DATABASE test_db;
```

```sql
-- 创建保留策略
CREATE RETENTION POLICY "one_week" ON "my_test_db" DURATION 7d REPLICATION 1;
```

```sql
-- 创建连续查询
CREATE CONTINUOUS QUERY "cq_avg_response_time" ON "my_test_db"
BEGIN
  SELECT MEAN("response_time") AS "mean_response_time"
  INTO "average_response_time"
  FROM "app_performance"
  GROUP BY time(1h), "app_name"
END;
```

---

### 5.2 DROP

```sql
-- 删除数据库
DROP DATABASE test_db;
```

```sql
-- 删除测量
DROP MEASUREMENT "test_measurement";
```

```sql
-- 删除保留策略
DROP RETENTION POLICY "one_week" ON "my_test_db";
```

```sql
-- 删除连续查询
DROP CONTINUOUS QUERY "cq_avg_response_time" ON "my_test_db";
```

---

### 5.3 ALTER

```sql
-- 修改保留策略
ALTER RETENTION POLICY "autogen" ON "my_test_db" DURATION 30d;
```

---

## 六、批量执行测试

### 6.1 混合查询批量执行

```sql
-- 批量执行：多个 SELECT 查询
SELECT COUNT(*) FROM "app_performance";
SELECT MEAN("response_time") FROM "app_performance";
SELECT MAX("error_rate") FROM "app_performance";
SELECT * FROM "app_performance" LIMIT 10;
```

### 6.2 混合类型批量执行

```sql
-- 批量执行：查询 + 写入 + 删除
SELECT COUNT(*) FROM "app_performance";
INSERT app_performance,app_name=batch-test,endpoint=/api/batch,method=GET concurrent_users=100,error_rate=1.0,response_time=200.0,throughput=500.0;
SELECT * FROM "app_performance" WHERE "app_name" = 'batch-test';
DELETE FROM "app_performance" WHERE "app_name" = 'batch-test';
```

---

## 七、高级查询测试

### 7.1 数学运算

```sql
-- 计算响应时间百分比
SELECT "response_time", 
       "response_time" / 1000 as response_time_seconds
FROM "app_performance"
LIMIT 100;
```

```sql
-- 计算吞吐量总和
SELECT SUM("throughput") * 60 as throughput_per_minute
FROM "app_performance"
WHERE time > now() - 1h;
```

---

### 7.2 DISTINCT 查询

```sql
-- 查询不同的应用名称
SHOW TAG VALUES FROM "app_performance" WITH KEY = "app_name";
```

```sql
-- 查询不同的端点
SHOW TAG VALUES FROM "app_performance" WITH KEY = "endpoint";
```

---

### 7.3 ORDER BY 查询

```sql
-- 按响应时间降序
SELECT * FROM "app_performance"
ORDER BY "response_time" DESC
LIMIT 50;
```

```sql
-- 按错误率升序
SELECT * FROM "app_performance"
ORDER BY "error_rate" ASC
LIMIT 50;
```

```sql
-- 按时间升序
SELECT * FROM "app_performance"
ORDER BY time ASC
LIMIT 50;
```

---

### 7.4 LIMIT 和 OFFSET

```sql
-- 分页查询：第1页
SELECT * FROM "app_performance"
ORDER BY time DESC
LIMIT 50 OFFSET 0;
```

```sql
-- 分页查询：第2页
SELECT * FROM "app_performance"
ORDER BY time DESC
LIMIT 50 OFFSET 50;
```

```sql
-- 分页查询：第3页
SELECT * FROM "app_performance"
ORDER BY time DESC
LIMIT 50 OFFSET 100;
```

---

## 八、性能测试查询

### 8.1 大数据量查询

```sql
-- 查询所有数据（无限制）
SELECT * FROM "app_performance";
```

```sql
-- 查询大量数据（1000条）
SELECT * FROM "app_performance"
ORDER BY time DESC
LIMIT 1000;
```

```sql
-- 查询大量数据（5000条）
SELECT * FROM "app_performance"
ORDER BY time DESC
LIMIT 5000;
```

---

### 8.2 复杂聚合查询

```sql
-- 多维度聚合
SELECT COUNT(*) as count,
       MEAN("response_time") as avg_response_time,
       MEAN("error_rate") as avg_error_rate,
       MEAN("concurrent_users") as avg_users,
       MEAN("throughput") as avg_throughput,
       MAX("response_time") as max_response_time,
       MIN("response_time") as min_response_time,
       MAX("error_rate") as max_error_rate,
       MIN("error_rate") as min_error_rate
FROM "app_performance"
WHERE time > now() - 24h
GROUP BY "app_name", "endpoint";
```

---

## 九、错误测试查询

### 9.1 语法错误

```sql
-- 拼写错误
SELEC * FROM "app_performance";
```

```sql
-- 缺少引号
SELECT * FROM app_performance;
```

```sql
-- 错误的字段名
SELECT "non_existent_field" FROM "app_performance";
```

---

### 9.2 不存在的对象

```sql
-- 不存在的测量
SELECT * FROM "non_existent_measurement";
```

```sql
-- 不存在的数据库
SHOW MEASUREMENTS ON "non_existent_db";
```

---

## 十、使用说明

### 测试顺序建议

1. **基础查询** → 验证表格视图、JSON 视图正常工作
2. **聚合查询** → 验证聚合统计卡片显示
3. **分组查询** → 验证分组结果展示
4. **SHOW 查询** → 验证元数据查询展示
5. **写入测试** → 验证写入状态卡片（绿色）
6. **删除测试** → 验证删除状态卡片（橙色/红色）
7. **DDL 测试** → 验证 DDL 操作状态卡片
8. **批量执行** → 验证批量结果展示
9. **错误测试** → 验证错误消息展示

### 预期结果验证

每个查询执行后，应验证：
- ✅ Tab 结构正确（根据 SQL 类型）
- ✅ 数据正确显示
- ✅ 执行时间显示
- ✅ 行数统计正确
- ✅ 消息 Tab 显示执行信息
- ✅ 主题切换正常
- ✅ 虚拟滚动流畅（大数据量）

---

**测试数据库**: `my_test_db`  
**测试测量**: `app_performance`  
**数据行数**: 481 行（根据日志）  
**生成时间**: 2025-10-26

