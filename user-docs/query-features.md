# 🔍 查询功能

InfloWave 提供了强大的 InfluxQL 查询功能，本指南将详细介绍查询编辑器的使用方法和高级查询技巧。

## 📝 查询编辑器概述

### 编辑器特性
- **Monaco Editor** - 基于 VS Code 的专业代码编辑器
- **语法高亮** - InfluxQL 语法自动高亮显示
- **智能提示** - 数据库、测量、字段名自动补全
- **错误检查** - 实时语法错误检测
- **多标签支持** - 同时编辑多个查询

### 界面布局
- **顶部工具栏** - 执行、保存、格式化等操作按钮
- **左侧面板** - 数据库结构浏览器
- **中央编辑区** - 查询编辑器
- **底部结果区** - 查询结果显示

## ⚡ 基本查询操作

### 执行查询

**方式一：按钮执行**
1. 在编辑器中输入查询语句
2. 点击 **"执行"** 按钮

**方式二：快捷键执行**
- Windows/Linux: `Ctrl + Enter`
- macOS: `Cmd + Enter`

### 查询结果显示

查询结果以表格形式显示，包含：
- **列标题** - 字段名称和数据类型
- **数据行** - 查询返回的数据
- **分页控制** - 大量数据的分页浏览
- **统计信息** - 结果行数、执行时间等

## 🎯 InfluxQL 基础语法

### 基本查询结构

```sql
SELECT <fields> FROM <measurement> WHERE <conditions> GROUP BY <tags> ORDER BY <time>
```

### 常用查询示例

#### 查看数据库和测量
```sql
-- 显示所有数据库
SHOW DATABASES

-- 显示当前数据库的所有测量
SHOW MEASUREMENTS

-- 显示测量的字段
SHOW FIELD KEYS FROM "measurement_name"

-- 显示测量的标签
SHOW TAG KEYS FROM "measurement_name"
```

#### 基本数据查询
```sql
-- 查询最新的10条数据
SELECT * FROM "cpu_usage" LIMIT 10

-- 按时间范围查询
SELECT * FROM "cpu_usage" 
WHERE time > now() - 1h

-- 查询特定字段
SELECT "value", "host" FROM "cpu_usage" 
WHERE time > now() - 1h
```

#### 聚合查询
```sql
-- 计算平均值
SELECT MEAN("value") FROM "cpu_usage" 
WHERE time > now() - 1h

-- 按时间分组聚合
SELECT MEAN("value") FROM "cpu_usage" 
WHERE time > now() - 1h 
GROUP BY time(5m)

-- 按标签分组
SELECT MEAN("value") FROM "cpu_usage" 
WHERE time > now() - 1h 
GROUP BY "host"
```

## 🧠 智能提示功能

### 自动补全类型

**数据库名称补全**
- 输入 `FROM ` 后会提示可用的测量名称
- 支持模糊匹配和过滤

**字段名称补全**
- 在 `SELECT` 子句中自动提示字段名
- 显示字段的数据类型

**标签名称补全**
- 在 `WHERE` 和 `GROUP BY` 中提示标签名
- 显示标签的可能值

**函数补全**
- 聚合函数：`MEAN()`, `SUM()`, `COUNT()` 等
- 时间函数：`now()`, `time()` 等
- 数学函数：`ABS()`, `ROUND()` 等

### 使用技巧

1. **触发补全** - 输入时自动触发，或按 `Ctrl + Space`
2. **选择建议** - 使用方向键选择，回车确认
3. **查看详情** - 鼠标悬停查看字段类型等详细信息

## 📚 查询历史管理

### 自动保存历史

所有执行过的查询都会自动保存到历史记录中，包括：
- 查询语句
- 执行时间
- 执行结果统计
- 使用的数据库

### 查看历史记录

1. 点击 **"历史"** 标签
2. 浏览历史查询列表
3. 点击任意历史记录可重新加载查询

### 历史记录操作

- **重新执行** - 点击查询重新执行
- **复制查询** - 复制查询语句到剪贴板
- **删除记录** - 删除不需要的历史记录
- **搜索过滤** - 按关键词搜索历史查询

## 🔖 查询书签

### 创建书签

1. 在编辑器中编写查询
2. 点击 **"保存为书签"** 按钮
3. 填写书签信息：
   - 书签名称
   - 描述说明
   - 标签分类

### 管理书签

**书签列表**
- 显示所有保存的书签
- 支持按名称、标签过滤
- 显示创建时间和使用频率

**书签操作**
- **加载查询** - 点击书签加载到编辑器
- **编辑书签** - 修改书签信息
- **删除书签** - 删除不需要的书签
- **导出书签** - 导出书签到文件

### 书签分类

使用标签对书签进行分类：
- `监控` - 监控相关查询
- `报表` - 报表生成查询
- `调试` - 调试和故障排查查询
- `分析` - 数据分析查询

## 📤 结果导出

### 支持的导出格式

**CSV 格式**
- 适合在 Excel 中打开
- 保留数据的原始格式
- 支持自定义分隔符

**JSON 格式**
- 适合程序处理
- 保留完整的数据结构
- 支持嵌套数据

**Excel 格式 (XLSX)**
- 直接在 Excel 中打开
- 支持多个工作表
- 保留数据类型信息

### 导出操作

1. 执行查询获得结果
2. 点击 **"导出"** 按钮
3. 选择导出格式
4. 配置导出选项：
   - 文件名称
   - 包含列标题
   - 时间格式
   - 数据范围

5. 点击 **"下载"** 保存文件

## ⚡ 查询优化

### 性能分析

InfloWave 提供查询性能分析功能：
- **执行时间** - 查询总耗时
- **返回行数** - 结果集大小
- **扫描数据量** - 实际扫描的数据量
- **索引使用** - 是否使用了索引

### 优化建议

**时间范围优化**
```sql
-- 推荐：指定明确的时间范围
SELECT * FROM "cpu_usage" 
WHERE time > now() - 1h AND time < now()

-- 避免：无时间限制的查询
SELECT * FROM "cpu_usage"
```

**字段选择优化**
```sql
-- 推荐：只选择需要的字段
SELECT "value", "host" FROM "cpu_usage"

-- 避免：使用 * 选择所有字段
SELECT * FROM "cpu_usage"
```

**标签过滤优化**
```sql
-- 推荐：使用标签进行过滤
SELECT * FROM "cpu_usage" 
WHERE "host" = 'server1' AND time > now() - 1h

-- 推荐：使用 IN 操作符
SELECT * FROM "cpu_usage" 
WHERE "host" IN ('server1', 'server2')
```

## 🔧 高级查询功能

### 子查询
```sql
SELECT MEAN("mean_value") FROM (
  SELECT MEAN("value") AS "mean_value" 
  FROM "cpu_usage" 
  WHERE time > now() - 1h 
  GROUP BY time(5m)
)
```

### 正则表达式
```sql
SELECT * FROM "cpu_usage" 
WHERE "host" =~ /^server[0-9]+$/
```

### 数学运算
```sql
SELECT "value" * 100 AS "percentage" 
FROM "cpu_usage" 
WHERE time > now() - 1h
```

### 时间窗口函数
```sql
-- 移动平均
SELECT MOVING_AVERAGE(MEAN("value"), 3) 
FROM "cpu_usage" 
WHERE time > now() - 1h 
GROUP BY time(5m)

-- 累积和
SELECT CUMULATIVE_SUM(MEAN("value")) 
FROM "cpu_usage" 
WHERE time > now() - 1h 
GROUP BY time(5m)
```

## 💡 实用技巧

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + Enter` | 执行查询 |
| `Ctrl + S` | 保存查询 |
| `Ctrl + /` | 注释/取消注释 |
| `Ctrl + F` | 查找替换 |
| `Ctrl + Space` | 触发自动补全 |
| `F11` | 全屏编辑器 |

### 查询模板

创建常用查询模板：
```sql
-- 系统监控模板
SELECT MEAN("cpu"), MEAN("memory"), MEAN("disk") 
FROM "system_metrics" 
WHERE time > now() - ${time_range} 
GROUP BY time(${interval})

-- 错误日志模板
SELECT * FROM "error_logs" 
WHERE "level" = 'ERROR' 
AND time > now() - ${time_range}
ORDER BY time DESC
```

### 批量查询

使用分号分隔多个查询：
```sql
SHOW DATABASES;
USE mydb;
SHOW MEASUREMENTS;
SELECT COUNT(*) FROM "cpu_usage";
```

---

**掌握查询功能是使用 InfloWave 的关键技能，建议多练习和实践。** 🎯

下一步：[数据可视化](./data-visualization.md)
