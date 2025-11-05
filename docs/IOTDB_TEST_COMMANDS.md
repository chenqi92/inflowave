# IoTDB SQL 测试指令集

本文档列出了 IoTDB (Apache IoTDB) 从库初始化、时间序列建模、数据写入、查询到维护的常用 SQL，帮助验证客户端在 IoTDB 上的完整操作链路。

---

## 🗄️ 库与时间序列初始化

```sql
-- 创建数据库（存储组）
CREATE DATABASE IF NOT EXISTS root.telemetry;

-- 展示所有数据库
SHOW DATABASES;

-- 在设备下创建时间序列
CREATE TIMESERIES root.telemetry.device001.temperature WITH DATATYPE=FLOAT, ENCODING=RLE, COMPRESSOR=SNAPPY;
CREATE TIMESERIES root.telemetry.device001.humidity    WITH DATATYPE=FLOAT, ENCODING=RLE, COMPRESSOR=SNAPPY;
CREATE TIMESERIES root.telemetry.device001.pressure    WITH DATATYPE=FLOAT, ENCODING=RLE, COMPRESSOR=SNAPPY;

-- 批量创建对齐时间序列（推荐，用于同类字段）
CREATE ALIGNED TIMESERIES root.telemetry.device002(
    temperature FLOAT ENCODING=RLE COMPRESSOR=SNAPPY,
    humidity    FLOAT ENCODING=RLE COMPRESSOR=SNAPPY,
    pressure    FLOAT ENCODING=RLE COMPRESSOR=SNAPPY
);
```

---

## ✍️ 数据写入

```sql
-- 写入单条记录
INSERT INTO root.telemetry.device001(timestamp, temperature, humidity, pressure)
VALUES (now(), 22.8, 55.4, 1012.6);

-- 写入指定时间戳数据
INSERT INTO root.telemetry.device001(timestamp, temperature, humidity, pressure)
VALUES
  (1699000000000, 23.5, 52.1, 1013.2),
  (1699003600000, 24.1, 50.6, 1012.8);

-- 对齐时间序列写入（device002）
INSERT INTO root.telemetry.device002(timestamp, temperature, humidity, pressure)
VALUES
  (now() - 600000, 25.6, 48.2, 1011.9),
  (now() - 300000, 26.1, 47.8, 1011.6),
  (now(),          26.4, 47.5, 1011.5);
```

---

## 🔍 基础查询

```sql
-- 查看某设备的全部数据
SELECT temperature, humidity, pressure
FROM root.telemetry.device001
LIMIT 100;

-- 查询最近 1 小时数据
SELECT temperature, humidity, pressure
FROM root.telemetry.device001
WHERE time >= now() - 1h
ALIGN BY TIME;

-- 按设备对齐查询（跨多个设备）
SELECT temperature, humidity
FROM root.telemetry.device001, root.telemetry.device002
WHERE time >= now() - 2h
ALIGN BY DEVICE;
```

---

## 📊 聚合、降采样与填充

```sql
-- 统计最大/最小/平均值
SELECT MAX_VALUE(temperature), MIN_VALUE(temperature), AVG(temperature)
FROM root.telemetry.device001
WHERE time >= now() - 1d;

-- 分组聚合（每 15 分钟）
SELECT AVG(temperature)
FROM root.telemetry.device001
GROUP BY ([now() - 6h, now()), 15m);

-- 使用 FILL 填充缺失值
SELECT temperature
FROM root.telemetry.device002
WHERE time >= now() - 2h
FILL(float[PREVIOUS]);

-- 使用 UDF 或内置函数（示例：导数）
SELECT DERIVATIVE(temperature)
FROM root.telemetry.device002
WHERE time >= now() - 1h
ALIGN BY TIME;
```

---

## 🧰 运维与管理

```sql
-- 查看时间序列结构
SHOW TIMESERIES root.telemetry.*;

-- 查看设备节点
SHOW DEVICES root.telemetry;

-- 查看当前库的 TTL 设置
SHOW TTL root.telemetry;

-- 设置 TTL（例如 30 天）
SET TTL TO root.telemetry 30d;

-- 删除指定时间范围数据
DELETE FROM root.telemetry.device001.temperature
WHERE time < now() - 30d;

-- 删除整条时间序列
DROP TIMESERIES root.telemetry.device001.pressure;

-- 清空并删除数据库（测试环境使用）
DELETE FROM root.telemetry.device001 WHERE time >= 0;
DROP DATABASE IF EXISTS root.telemetry;
```

以上 SQL 覆盖了 IoTDB 中常见的建库、建模、写入、查询、聚合与维护操作，适合作为客户端的端到端测试用例集合。
