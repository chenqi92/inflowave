# 数据源树节点图标映射文档

本文档详细说明了不同数据库类型在数据源树中的所有可能节点类型及其对应的图标映射关系。

## 概述

数据源树支持以下数据库类型：
- **InfluxDB 1.x** - 传统时间序列数据库
- **InfluxDB 2.x** - 现代化时间序列数据库平台
- **InfluxDB 3.x** - 基于Apache Arrow的新一代时间序列数据库
- **Apache IoTDB** - 物联网时间序列数据库

## 图标系统架构

### 图标分类
1. **品牌图标** (`/src/assets/icons/database/brands/`) - 用于数据库连接节点
2. **功能图标** (`/src/assets/icons/database/light|dark/`) - 用于数据库内部结构节点

### 主题支持
- **Light Theme** - 浅色主题图标
- **Dark Theme** - 深色主题图标
- **自动切换** - 根据系统主题自动选择

## 数据库节点类型映射

### InfluxDB 1.x 节点类型

| 节点类型 | 中文描述 | 图标文件 | 说明 |
|---------|---------|---------|------|
| `connection` | 数据库连接 | `brands/influxdb-1x.svg` | 连接状态图标 |
| `database` | 数据库 | `database.svg` | 普通数据库 |
| `system_database` | 系统数据库 | `database-system.svg` | 系统内置数据库 |
| `retention_policy` | 保留策略 | `retention-policy.svg` | 数据保留策略 |
| `measurement` | 测量 | `measurement.svg` | 数据表/测量 |
| `series` | 序列 | `series.svg` | 时间序列 |
| `field_group` | 字段组 | `field-group.svg` | 字段分组 |
| `field` | 字段 | `field.svg` | 数据字段 |
| `continuous_query` | 连续查询 | `continuous-query.svg` | 自动化查询 |
| `user1x` | 用户 | `user1x.svg` | 数据库用户 |
| `privilege` | 权限 | `privilege.svg` | 用户权限 |
| `shard` | 分片 | `shard.svg` | 数据分片 |
| `shard_group` | 分片组 | `shard-group.svg` | 分片组 |

### InfluxDB 2.x 节点类型

| 节点类型 | 中文描述 | 图标文件 | 说明 |
|---------|---------|---------|------|
| `connection` | 数据库连接 | `brands/influxdb-2x.svg` | 连接状态图标 |
| `organization` | 组织 | `organization.svg` | 租户组织 |
| `bucket` | 存储桶 | `bucket.svg` | 数据存储桶 |
| `system_bucket` | 系统存储桶 | `system-bucket.svg` | 系统内置存储桶 |
| `measurement` | 测量 | `measurement.svg` | 数据表/测量 |
| `field_group` | 字段组 | `field-group.svg` | 字段分组 |
| `field` | 字段 | `field.svg` | 数据字段 |
| `task` | 任务 | `task.svg` | 数据处理任务 |
| `dashboard` | 仪表板 | `dashboard.svg` | 数据可视化面板 |
| `cell` | 单元格 | `cell.svg` | 仪表板单元格 |
| `variable` | 变量 | `variable.svg` | 查询变量 |
| `user2x` | 用户 | `user2x.svg` | 数据库用户 |
| `authorization` | 授权 | `authorization.svg` | 访问授权 |
| `check` | 检查 | `check.svg` | 健康检查 |
| `notification_rule` | 通知规则 | `notification-rule.svg` | 告警通知规则 |
| `notification_endpoint` | 通知端点 | `notification-endpoint.svg` | 通知接收端点 |
| `scraper` | 采集器 | `scraper.svg` | 数据采集器 |
| `telegraf` | Telegraf | `telegraf.svg` | 数据采集代理 |
| `label` | 标签 | `label.svg` | 资源标签 |

### InfluxDB 3.x 节点类型

| 节点类型 | 中文描述 | 图标文件 | 说明 |
|---------|---------|---------|------|
| `connection` | 数据库连接 | `brands/influxdb-3x.svg` | 连接状态图标 |
| `database3x` | 数据库 | `database3x.svg` | InfluxDB 3.x 数据库 |
| `schema` | 模式 | `schema.svg` | 数据库模式 |
| `table` | 数据表 | `table.svg` | 数据表 |
| `column` | 列 | `column.svg` | 表列 |
| `index` | 索引 | `index.svg` | 数据索引 |
| `view` | 视图 | `view.svg` | 数据视图 |
| `materialized_view` | 物化视图 | `materialized-view.svg` | 物化视图 |
| `function3x` | 函数 | `function3x.svg` | 用户定义函数 |
| `namespace` | 命名空间 | `namespace.svg` | 命名空间 |
| `partition` | 分区 | `partition.svg` | 表分区 |
| `trigger3x` | 触发器 | `trigger3x.svg` | 数据库触发器 |

### Apache IoTDB 节点类型

| 节点类型 | 中文描述 | 图标文件 | 说明 |
|---------|---------|---------|------|
| `connection` | 数据库连接 | `brands/iotdb.svg` | 连接状态图标 |
| `system_info` | 系统信息 | `system-info.svg` | 系统状态信息 |
| `schema_template` | 模式模板 | `schema-template.svg` | 设备模式模板 |
| `storage_group` | 存储组 | `storage-group.svg` | 数据存储组 |
| `device` | 设备 | `device.svg` | 物联网设备 |
| `timeseries` | 时间序列 | `timeseries.svg` | 普通时间序列 |
| `aligned_timeseries` | 对齐时间序列 | `aligned-timeseries.svg` | 对齐时间序列 |
| `attribute_group` | 属性组 | `attribute-group.svg` | 设备属性组 |
| `data_type` | 数据类型 | `data-type.svg` | 传感器数据类型 |
| `encoding` | 编码方式 | `encoding.svg` | 数据编码方式 |
| `compression` | 压缩方式 | `compression.svg` | 数据压缩方式 |
| `function` | 函数 | `function.svg` | 用户定义函数 |
| `procedure` | 存储过程 | `procedure.svg` | 存储过程 |
| `trigger` | 触发器 | `trigger.svg` | 数据库触发器 |
| `template` | 模板 | `template.svg` | 设备模板 |
| `cluster_info` | 集群信息 | `cluster-info.svg` | 集群状态信息 |
| `storage_engine_info` | 存储引擎信息 | `storage-engine-info.svg` | 存储引擎状态 |
| `version_info` | 版本信息 | `version-info.svg` | 系统版本信息 |

## 通用节点类型

以下节点类型在多个数据库中通用：

| 节点类型 | 中文描述 | 图标文件 | 适用数据库 |
|---------|---------|---------|-----------|
| `tag` | 标签 | `tag.svg` | InfluxDB 1.x/2.x |
| `tag_group` | 标签组 | `tag-group.svg` | InfluxDB 1.x/2.x |
| `user` | 用户 | `user1x.svg` / `user2x.svg` | 所有数据库 |
| `default` | 默认 | `default.svg` | 回退图标 |

## 图标加载机制

### 1. 图标路径生成
```typescript
// 品牌图标路径
const getBrandIconPath = (dbType: string, isConnected: boolean): string => {
  return `/src/assets/icons/database/brands/${dbType}${isConnected ? '' : '-dark'}.svg`;
};

// 功能图标路径  
const getFunctionalIconPath = (nodeType: TreeNodeType, theme: 'light' | 'dark'): string => {
  return `/src/assets/icons/database/${theme}/${iconFile}`;
};
```

### 2. 图标加载优先级
1. **SVG文件加载** - 优先从文件系统加载SVG图标
2. **内联SVG回退** - 文件加载失败时使用内联SVG
3. **默认图标** - 最终回退到默认图标

### 3. 图标缓存机制
- SVG内容会被缓存在组件状态中
- 避免重复网络请求
- 支持主题切换时的图标更新

## 双击可打开节点

以下节点类型支持双击打开操作，并具有对应的"打开"状态图标：

### 可打开的节点类型
- **database** - 数据库可以打开查看内容
- **database3x** - InfluxDB 3.x数据库
- **bucket** - InfluxDB 2.x存储桶
- **system_bucket** - InfluxDB 2.x系统存储桶
- **measurement** - 测量/表可以打开查看数据
- **table** - InfluxDB 3.x数据表
- **storage_group** - IoTDB存储组
- **device** - IoTDB设备
- **organization** - InfluxDB 2.x组织
- **schema** - InfluxDB 3.x模式
- **namespace** - InfluxDB 3.x命名空间
- **view** - InfluxDB 3.x视图
- **materialized_view** - InfluxDB 3.x物化视图
- **dashboard** - InfluxDB 2.x仪表板

### 打开状态图标命名规则
打开状态的图标文件名在原文件名基础上添加 `_cur` 后缀：
- `database.svg` → `database_cur.svg`
- `measurement.svg` → `measurement_cur.svg`
- `storage-group.svg` → `storage-group_cur.svg`
- `system-bucket.svg` → `system-bucket_cur.svg`

## 使用方法

### 基本用法
```tsx
import { DatabaseIcon } from '@/components/common/DatabaseIcon';

// 连接节点图标
<DatabaseIcon
  nodeType="connection"
  dbType="influxdb2"
  isConnected={true}
  size={16}
/>

// 功能节点图标
<DatabaseIcon
  nodeType="measurement"
  size={16}
/>

// 打开状态的节点图标
<DatabaseIcon
  nodeType="database"
  isOpen={true}
  size={16}
/>
```

### 自定义样式
```tsx
<DatabaseIcon
  nodeType="database"
  className="text-blue-500"
  size={20}
  title="自定义提示文本"
/>
```

### 检查节点是否可打开
```tsx
import { isOpenableNode } from '@/components/common/DatabaseIcon';

const canOpen = isOpenableNode('database'); // true
const cannotOpen = isOpenableNode('field'); // false
```

## 维护指南

### 添加新图标
1. 将SVG文件放入对应的主题目录
2. 在 `getFunctionalIconPath` 函数中添加映射
3. 在 `getIconDescription` 函数中添加描述
4. 更新本文档

### 图标设计规范
- **尺寸**: 24x24px 画布，16px 实际内容
- **格式**: SVG矢量格式
- **颜色**: 使用 `currentColor` 支持主题切换
- **风格**: 简洁线性图标，2px描边
- **对齐**: 图标内容居中对齐

### 命名规范
- 使用kebab-case命名：`storage-group.svg`
- 描述性命名：功能明确，易于理解
- 版本后缀：如 `user1x.svg`, `user2x.svg`

## 图标对齐问题修复

### 问题描述
之前的图标在数据源树中显示时会出现轻微向下偏移的问题，导致图标与文本不能完美对齐。

### 修复方案
1. **移除vertical-align**: 从SVG样式中移除可能导致偏移的vertical-align属性
2. **精确边距计算**: 通过 `margin-top: 2px` 实现16px图标在20px容器中的完美居中
3. **容器对齐**: 在DatabaseTree组件中使用 `flex items-center` 确保垂直居中
4. **统一处理**: 对所有SVG图标（包括内联回退图标）应用相同的对齐样式

### 技术实现
```typescript
// SVG加载时的样式处理
content = content.replace(
  /<svg([^>]*)>/,
  `<svg$1 width="${size}" height="${size}" style="display: block;">`
);

// 图标容器样式 - 关键修复
<div
  className="inline-flex items-center justify-center"
  style={{
    width: size,
    height: size,
    lineHeight: 1,
    marginTop: '2px'  // 关键：实现在20px容器中的垂直居中
  }}
/>

// 树节点中的图标容器
<div className="mr-2 flex items-center justify-center" style={{ height: '20px' }}>
  <DatabaseIcon className="flex-shrink-0" />
</div>
```

### 居中计算逻辑
- **容器高度**: 20px (DatabaseTree中设定)
- **图标尺寸**: 16px × 16px
- **所需上边距**: (20 - 16) ÷ 2 = 2px
- **实现方式**: `margin-top: 2px`

### 验证方法
1. 在不同主题下检查图标对齐
2. 测试不同尺寸的图标显示
3. 验证回退图标的对齐效果
4. 确保在不同浏览器中的一致性
