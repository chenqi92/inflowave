# InfluxDB 3 SQL 测试指令集

本文档覆盖了在 InfluxDB 3 (IOx) 中从建库、建表、写入、查询到维护的完整测试 SQL，用于验证客户端在 InfluxDB 3 环境下的连接与操作流程。

---

## 🗄️ 库与表初始化

```sql
-- 创建数据库（如已存在会忽略）
CREATE DATABASE IF NOT EXISTS telemetry_db;

-- 切换至目标数据库
USE telemetry_db;

-- 创建带 TAG 字段的测量表
CREATE TABLE IF NOT EXISTS sensor_metrics (
    time        TIMESTAMP,
    device_id   STRING TAG,
    location    STRING TAG,
    status      STRING,
    temperature DOUBLE,
    humidity    DOUBLE,
    pressure    DOUBLE
);

-- 可选：为时间列和标签列设置分区与主键（部分环境支持）
-- CREATE TABLE sensor_metrics (
--     time TIMESTAMP,
--     device_id STRING TAG,
--     location STRING TAG,
--     status STRING,
--     temperature DOUBLE,
--     humidity DOUBLE,
--     pressure DOUBLE
-- ) WITH (
--     primary_key = (time, device_id, location),
--     partition_key = (device_id, location)
-- );
```

---

## ✍️ 数据写入

```sql
-- 插入单条观测数据
INSERT INTO sensor_metrics VALUES
  (NOW(), 'device-001', 'hangzhou', 'ok', 23.6, 55.1, 1012.8);

-- 插入多条观测数据
INSERT INTO sensor_metrics (time, device_id, location, status, temperature, humidity, pressure) VALUES
  (NOW() - INTERVAL '10' MINUTE, 'device-001', 'hangzhou', 'ok', 24.2, 54.3, 1012.5),
  (NOW() - INTERVAL '5' MINUTE, 'device-002', 'beijing', 'warning', 26.1, 58.2, 1011.9),
  (NOW() - INTERVAL '3' MINUTE, 'device-003', 'shanghai', 'ok', 22.4, 63.5, 1013.3);

-- 从 CSV 或 Parquet 批量写入（Flight SQL 支持 COPY 指令）
COPY sensor_metrics FROM 's3://bucket/metrics.parquet' WITH (format = 'parquet');
```

---

## 🔍 基础查询

```sql
-- 查询最近 20 条数据
SELECT *
FROM sensor_metrics
ORDER BY time DESC
LIMIT 20;

-- 查询指定设备在最近 1 小时内的数据
SELECT *
FROM sensor_metrics
WHERE device_id = 'device-001'
  AND time BETWEEN NOW() - INTERVAL '1' HOUR AND NOW()
ORDER BY time DESC;

-- 查询状态为 warning 的设备及最近的温度
SELECT device_id, location, temperature, time
FROM sensor_metrics
WHERE status = 'warning'
ORDER BY time DESC
LIMIT 50;
```

---

## 📊 聚合与分组

```sql
-- 计算各设备的平均温度与最大湿度
SELECT device_id,
       AVG(temperature) AS avg_temp,
       MAX(humidity)    AS max_humidity
FROM sensor_metrics
WHERE time > NOW() - INTERVAL '24' HOUR
GROUP BY device_id
ORDER BY avg_temp DESC;

-- 按 15 分钟窗口聚合
SELECT DATE_BIN(INTERVAL '15' MINUTE, time) AS window_start,
       location,
       AVG(temperature) AS avg_temp,
       MIN(temperature) AS min_temp,
       MAX(temperature) AS max_temp
FROM sensor_metrics
WHERE time > NOW() - INTERVAL '6' HOUR
GROUP BY window_start, location
ORDER BY window_start DESC;

-- 统计不同状态的数量
SELECT status, COUNT(*) AS count
FROM sensor_metrics
WHERE time > NOW() - INTERVAL '7' DAY
GROUP BY status;
```

---

## 🧰 运维与 Schema 查询

```sql
-- 查看当前数据库中的所有表
SHOW TABLES;

-- 查看表的列与标签定义
SHOW COLUMNS FROM sensor_metrics;

-- 查看最近成功写入的时间范围
SELECT MAX(time) AS latest_point
FROM sensor_metrics;

-- 删除过期数据
DELETE FROM sensor_metrics
WHERE time < NOW() - INTERVAL '30' DAY;

-- 清空整张表（仅测试环境使用）
TRUNCATE TABLE sensor_metrics;

-- 删除表与数据库
DROP TABLE IF EXISTS sensor_metrics;
DROP DATABASE IF EXISTS telemetry_db;
```

以上命令覆盖了 InfluxDB 3 在测试流程中常用的建库、建表、数据写入、查询、聚合与运维操作，可用于验证客户端的完整工作流。
