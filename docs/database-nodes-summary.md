# 数据源树节点总结

## 概述

本文档总结了所有数据库类型在数据源树中的节点类型及其图标映射关系，并提供了通用的图标管理方法。

## 数据库节点类型完整列表

### InfluxDB 1.x (influxdb1)
```
connection (连接)
├── database (数据库)
│   ├── retention_policy (保留策略)
│   │   ├── measurement (测量)
│   │   │   ├── field_group (字段组)
│   │   │   │   └── field (字段) [叶子]
│   │   │   ├── tag_group (标签组)
│   │   │   │   └── tag (标签) [叶子]
│   │   │   └── series (序列) [叶子]
│   │   └── continuous_query (连续查询) [叶子]
│   └── shard_group (分片组)
│       └── shard (分片) [叶子]
├── system_database (系统数据库)
└── user1x (用户) [叶子]
    └── privilege (权限) [叶子]
```

### InfluxDB 2.x (influxdb2)
```
connection (连接)
├── organization (组织)
│   ├── bucket (存储桶)
│   │   ├── measurement (测量)
│   │   │   ├── field_group (字段组)
│   │   │   │   └── field (字段) [叶子]
│   │   │   └── tag_group (标签组)
│   │   │       └── tag (标签) [叶子]
│   │   └── system_bucket (系统存储桶)
│   ├── task (任务) [叶子]
│   ├── dashboard (仪表板)
│   │   └── cell (单元格) [叶子]
│   ├── variable (变量) [叶子]
│   ├── check (检查) [叶子]
│   ├── notification_rule (通知规则) [叶子]
│   ├── notification_endpoint (通知端点) [叶子]
│   ├── scraper (采集器) [叶子]
│   ├── telegraf (Telegraf) [叶子]
│   ├── label (标签) [叶子]
│   └── user2x (用户) [叶子]
│       └── authorization (授权) [叶子]
```

### InfluxDB 3.x (influxdb3)
```
connection (连接)
├── database3x (数据库)
│   ├── schema (模式)
│   │   ├── table (数据表)
│   │   │   ├── column (列) [叶子]
│   │   │   ├── index (索引) [叶子]
│   │   │   └── partition (分区) [叶子]
│   │   ├── view (视图)
│   │   ├── materialized_view (物化视图)
│   │   ├── function3x (函数) [叶子]
│   │   └── trigger3x (触发器) [叶子]
│   └── namespace (命名空间)
```

### Apache IoTDB (iotdb)
```
connection (连接)
├── system_info (系统信息) [叶子]
├── cluster_info (集群信息) [叶子]
├── storage_engine_info (存储引擎信息) [叶子]
├── version_info (版本信息) [叶子]
├── schema_template (模式模板)
│   └── template (模板)
├── storage_group (存储组)
│   └── device (设备)
│       ├── timeseries (时间序列) [叶子]
│       ├── aligned_timeseries (对齐时间序列) [叶子]
│       ├── attribute_group (属性组)
│       ├── data_type (数据类型) [叶子]
│       ├── encoding (编码方式) [叶子]
│       └── compression (压缩方式) [叶子]
├── function (函数) [叶子]
├── procedure (存储过程) [叶子]
└── trigger (触发器) [叶子]
```

## 图标文件映射表

| 节点类型 | 图标文件 | 适用数据库 | 是否叶子 |
|---------|---------|-----------|---------|
| connection | connection-active.svg | 全部 | ❌ |
| database | database.svg | influxdb1 | ❌ |
| system_database | database-system.svg | influxdb1 | ❌ |
| database3x | database3x.svg | influxdb3 | ❌ |
| table | table.svg | influxdb3 | ❌ |
| measurement | measurement.svg | influxdb1,2 | ❌ |
| column | column.svg | influxdb3 | ✅ |
| field | field.svg | influxdb1,2 | ✅ |
| field_group | field-group.svg | influxdb1,2 | ❌ |
| tag | tag.svg | influxdb1,2 | ✅ |
| tag_group | tag-group.svg | influxdb1,2 | ❌ |
| index | index.svg | influxdb3 | ✅ |
| view | view.svg | influxdb3 | ❌ |
| materialized_view | materialized-view.svg | influxdb3 | ❌ |
| user1x | user1x.svg | influxdb1 | ✅ |
| user2x | user2x.svg | influxdb2 | ✅ |
| authorization | authorization.svg | influxdb2 | ✅ |
| privilege | privilege.svg | influxdb1 | ✅ |
| bucket | bucket.svg | influxdb2 | ❌ |
| system_bucket | system-bucket.svg | influxdb2 | ❌ |
| organization | organization.svg | influxdb2 | ❌ |
| task | task.svg | influxdb2 | ✅ |
| dashboard | dashboard.svg | influxdb2 | ❌ |
| cell | cell.svg | influxdb2 | ✅ |
| variable | variable.svg | influxdb2 | ✅ |
| check | check.svg | influxdb2 | ✅ |
| notification_rule | notification-rule.svg | influxdb2 | ✅ |
| notification_endpoint | notification-endpoint.svg | influxdb2 | ✅ |
| scraper | scraper.svg | influxdb2 | ✅ |
| telegraf | telegraf.svg | influxdb2 | ✅ |
| label | label.svg | influxdb2 | ✅ |
| storage_group | storage-group.svg | iotdb | ❌ |
| device | device.svg | iotdb | ❌ |
| timeseries | timeseries.svg | iotdb | ✅ |
| aligned_timeseries | aligned-timeseries.svg | iotdb | ✅ |
| attribute_group | attribute-group.svg | iotdb | ❌ |
| data_type | data-type.svg | iotdb | ✅ |
| encoding | encoding.svg | iotdb | ✅ |
| compression | compression.svg | iotdb | ✅ |
| schema_template | schema-template.svg | iotdb | ❌ |
| template | template.svg | iotdb | ❌ |
| system_info | system-info.svg | iotdb | ✅ |
| cluster_info | cluster-info.svg | iotdb | ✅ |
| storage_engine_info | storage-engine-info.svg | iotdb | ✅ |
| version_info | version-info.svg | iotdb | ✅ |
| function | function.svg | iotdb | ✅ |
| function3x | function3x.svg | influxdb3 | ✅ |
| procedure | procedure.svg | iotdb | ✅ |
| trigger | trigger.svg | iotdb | ✅ |
| trigger3x | trigger3x.svg | influxdb3 | ✅ |
| namespace | namespace.svg | influxdb3 | ❌ |
| schema | schema.svg | influxdb3 | ❌ |
| partition | partition.svg | influxdb3 | ✅ |
| shard | shard.svg | influxdb1 | ✅ |
| shard_group | shard-group.svg | influxdb1 | ❌ |
| retention_policy | retention-policy.svg | influxdb1 | ❌ |
| continuous_query | continuous-query.svg | influxdb1 | ✅ |
| series | series.svg | influxdb1 | ✅ |

## 双击可打开的节点类型

以下节点类型支持双击打开操作，具有对应的"打开"状态图标：

### 可打开节点列表
- `database` - 数据库
- `database3x` - InfluxDB 3.x数据库
- `bucket` - InfluxDB 2.x存储桶
- `system_bucket` - InfluxDB 2.x系统存储桶
- `measurement` - 测量/表
- `table` - InfluxDB 3.x数据表
- `storage_group` - IoTDB存储组
- `device` - IoTDB设备
- `organization` - InfluxDB 2.x组织
- `schema` - InfluxDB 3.x模式
- `namespace` - InfluxDB 3.x命名空间
- `view` - InfluxDB 3.x视图
- `materialized_view` - InfluxDB 3.x物化视图
- `dashboard` - InfluxDB 2.x仪表板

## 通用方法使用

### 1. 使用DatabaseIcon组件
```tsx
import { DatabaseIcon, isOpenableNode } from '@/components/common/DatabaseIcon';

// 连接节点
<DatabaseIcon
  nodeType="connection"
  dbType="influxdb2"
  isConnected={true}
  size={16}
/>

// 功能节点
<DatabaseIcon
  nodeType="measurement"
  size={16}
/>

// 打开状态节点
<DatabaseIcon
  nodeType="database"
  isOpen={true}
  size={16}
/>

// 检查是否可打开
const canOpen = isOpenableNode('database'); // true
```

### 2. 使用图标映射工具
```tsx
import {
  getIconFileName,
  getIconDescription,
  isLeafNode,
  isOpenableNodeType,
  getOpenIconFileName,
  getSupportedNodeTypes
} from '@/utils/databaseIconMapping';

// 获取图标文件名
const fileName = getIconFileName('storage_group'); // 'storage-group.svg'

// 获取打开状态图标文件名
const openFileName = getOpenIconFileName('database'); // 'database-open.svg'

// 获取描述
const description = getIconDescription('storage_group'); // '存储组'

// 检查是否为叶子节点
const isLeaf = isLeafNode('field'); // true

// 检查是否可打开
const canOpen = isOpenableNodeType('measurement'); // true

// 获取数据库支持的节点类型
const nodeTypes = getSupportedNodeTypes('iotdb');
```

### 3. 图标路径生成
```tsx
import { generateIconPath } from '@/utils/databaseIconMapping';

// 生成普通图标路径
const lightPath = generateIconPath('measurement', 'light');
// '/src/assets/icons/database/light/measurement.svg'

// 生成打开状态图标路径
const openPath = generateIconPath('database', 'light', true);
// '/src/assets/icons/database/light/database_cur.svg'

const darkPath = generateIconPath('measurement', 'dark');
// '/src/assets/icons/database/dark/measurement.svg'
```

## 对齐问题解决方案

图标对齐问题已通过以下方式修复：

### 问题分析
- **原因**: 20px高度容器中的16px图标未能正确居中
- **表现**: 图标显示偏上或偏下，与文本不对齐

### 解决方案
1. **移除vertical-align**: 从SVG样式中移除 `vertical-align` 属性
2. **容器对齐**: 外层使用 `flex items-center justify-center` 确保垂直居中
3. **简化样式**: SVG只保留 `display: block` 样式
4. **统一处理**: 所有图标（包括回退图标）使用相同对齐样式

### 技术实现
```css
/* 外层容器 (DatabaseTree) */
.icon-container {
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 图标容器 (DatabaseIcon) */
.database-icon {
  width: 16px;
  height: 16px;
  margin-top: 2px; /* 关键：在20px容器中实现16px图标的垂直居中 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* SVG样式 */
svg {
  display: block;
  width: 16px;
  height: 16px;
}
```

### 居中计算
- 容器高度：20px
- 图标尺寸：16px
- 所需上边距：(20-16)/2 = 2px
- 通过 `margin-top: 2px` 实现完美居中

## 维护建议

1. **新增图标**: 按照命名规范添加SVG文件到对应主题目录
2. **更新映射**: 在 `databaseIconMapping.ts` 中添加新的节点类型配置
3. **测试验证**: 使用提供的测试用例验证图标显示和对齐
4. **文档更新**: 及时更新本文档和映射表

## 相关文件

- `src/components/common/DatabaseIcon.tsx` - 图标组件
- `src/utils/databaseIconMapping.ts` - 图标映射工具
- `src/assets/icons/database/` - 图标文件目录
- `docs/database-icons-mapping.md` - 详细映射文档
