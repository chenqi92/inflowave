# InfloWave - 用户体验增强设计

## 🎯 设计理念

让用户能够通过简单的右键操作完成常用的数据库操作，无需手动编写 SQL 语句，大大提升使用效率和用户体验。

## 🖱️ 右键快捷操作菜单

### 1. 数据库级别操作

#### 数据库右键菜单
```
📁 数据库名称
├── 📊 查看数据库信息
├── 📋 显示所有测量 (SHOW MEASUREMENTS)
├── 🔧 显示保留策略 (SHOW RETENTION POLICIES)
├── ➕ 创建新测量
├── 📤 导出数据库结构
├── 📈 数据库统计信息
├── 🔄 刷新数据库
├── ⚙️ 数据库设置
└── 🗑️ 删除数据库
```

**具体功能**:
- **查看数据库信息**: 显示数据库大小、测量数量、数据点总数、最后更新时间
- **显示所有测量**: 自动执行 `SHOW MEASUREMENTS` 并以表格形式展示
- **显示保留策略**: 自动执行 `SHOW RETENTION POLICIES` 并显示详细信息
- **导出数据库结构**: 生成包含所有测量、字段、标签的结构文档

### 2. 测量(Measurement)级别操作

#### 测量右键菜单
```
📊 测量名称
├── 👁️ 数据预览
│   ├── 最新 100 条数据
│   ├── 最新 1000 条数据
│   ├── 最近 1 小时数据
│   ├── 最近 24 小时数据
│   └── 自定义时间范围
├── 🔍 数据结构
│   ├── 查看字段信息 (SHOW FIELD KEYS)
│   ├── 查看标签键 (SHOW TAG KEYS)
│   ├── 查看标签值 (SHOW TAG VALUES)
│   └── 查看序列信息 (SHOW SERIES)
├── 📊 数据统计
│   ├── 记录总数 (SELECT COUNT(*) FROM measurement)
│   ├── 时间范围 (SELECT MIN(time), MAX(time) FROM measurement)
│   ├── 字段统计 (MIN, MAX, MEAN, STDDEV)
│   └── 标签分布统计
├── 📈 快速图表
│   ├── 时序趋势图
│   ├── 字段分布图
│   ├── 标签统计图
│   └── 自定义图表
├── 📤 数据导出
│   ├── 导出为 CSV
│   ├── 导出为 JSON
│   ├── 导出为 Excel
│   └── 导出查询结果
├── 🔧 数据管理
│   ├── 删除指定时间范围数据
│   ├── 删除指定标签数据
│   ├── 数据备份
│   └── 数据压缩
├── ⚡ 连续查询
│   ├── 创建连续查询
│   ├── 查看相关连续查询
│   └── 管理连续查询
└── 🗑️ 删除测量
```

### 3. 字段(Field)级别操作

#### 字段右键菜单
```
🏷️ 字段名称 (类型)
├── 👁️ 字段数据预览
│   ├── 最新 100 个值
│   ├── 非空值预览
│   └── 唯一值预览
├── 📊 字段统计
│   ├── 基础统计 (MIN, MAX, MEAN, COUNT)
│   ├── 分位数统计 (P50, P90, P95, P99)
│   ├── 数据分布直方图
│   └── 时间序列趋势
├── 📈 字段图表
│   ├── 时序折线图
│   ├── 分布直方图
│   ├── 箱线图
│   └── 散点图
├── 🔍 数据筛选
│   ├── 按值范围筛选
│   ├── 按时间范围筛选
│   ├── 空值/非空值筛选
│   └── 自定义条件筛选
├── 🧮 聚合查询
│   ├── 按时间聚合 (GROUP BY time)
│   ├── 按标签聚合 (GROUP BY tag)
│   ├── 移动平均
│   └── 累计求和
└── 📤 导出字段数据
```

### 4. 标签(Tag)级别操作

#### 标签右键菜单
```
🏷️ 标签名称
├── 👁️ 标签值列表
│   ├── 所有标签值
│   ├── 标签值计数
│   └── 标签值分布
├── 🔍 按标签查询
│   ├── 选择标签值查询
│   ├── 多标签组合查询
│   ├── 标签值模糊匹配
│   └── 标签值范围查询
├── 📊 标签统计
│   ├── 标签值分布图
│   ├── 标签组合统计
│   └── 标签使用频率
├── 🔧 标签管理
│   ├── 重命名标签值
│   ├── 合并标签值
│   ├── 删除标签值
│   └── 标签值映射
└── 📤 导出标签数据
```

## 🚀 快捷操作实现

### 1. 智能 SQL 生成

#### 数据预览操作
```typescript
// 最新 100 条数据
const generateLatestDataQuery = (measurement: string) => {
  return `SELECT * FROM "${measurement}" ORDER BY time DESC LIMIT 100`;
};

// 最近 24 小时数据
const generateRecentDataQuery = (measurement: string, hours: number) => {
  return `SELECT * FROM "${measurement}" WHERE time >= now() - ${hours}h`;
};

// 字段统计查询
const generateFieldStatsQuery = (measurement: string, field: string) => {
  return `SELECT MIN("${field}"), MAX("${field}"), MEAN("${field}"), COUNT("${field}") FROM "${measurement}"`;
};
```

#### 聚合查询生成
```typescript
// 按时间聚合
const generateTimeAggregationQuery = (measurement: string, field: string, interval: string) => {
  return `SELECT MEAN("${field}") FROM "${measurement}" WHERE time >= now() - 24h GROUP BY time(${interval})`;
};

// 按标签分组
const generateTagGroupQuery = (measurement: string, field: string, tagKey: string) => {
  return `SELECT MEAN("${field}") FROM "${measurement}" WHERE time >= now() - 24h GROUP BY "${tagKey}"`;
};
```

### 2. 快速图表生成

#### 自动图表类型推荐
```typescript
interface ChartRecommendation {
  fieldType: 'numeric' | 'string' | 'boolean';
  dataPattern: 'timeseries' | 'categorical' | 'distribution';
  recommendedChart: 'line' | 'bar' | 'pie' | 'histogram' | 'heatmap';
  query: string;
}

const recommendChart = (measurement: string, field: string): ChartRecommendation => {
  // 智能分析字段类型和数据模式
  // 推荐最适合的图表类型
};
```

### 3. 数据导出功能

#### 多格式导出
```typescript
interface ExportOptions {
  format: 'csv' | 'json' | 'excel' | 'sql';
  timeRange?: {
    start: Date;
    end: Date;
  };
  fields?: string[];
  tags?: Record<string, string[]>;
  limit?: number;
}

const exportData = async (measurement: string, options: ExportOptions) => {
  // 生成导出查询
  // 执行查询并格式化数据
  // 下载文件
};
```

## 🎨 用户界面设计

### 1. 右键菜单样式

#### 菜单层级结构
```
┌─────────────────────────────┐
│ 📊 数据预览               ▶ │ ┌─────────────────────────┐
│ 🔍 数据结构               ▶ │ │ 最新 100 条数据          │
│ 📈 快速图表               ▶ │ │ 最新 1000 条数据         │
│ 📤 数据导出               ▶ │ │ 最近 1 小时数据          │
│ ─────────────────────────── │ │ 最近 24 小时数据         │
│ 🔧 数据管理                 │ │ 自定义时间范围...        │
│ 🗑️ 删除测量                 │ └─────────────────────────┘
└─────────────────────────────┘
```

#### 图标和颜色设计
- **查看操作**: 蓝色图标 (👁️, 📊, 🔍)
- **创建操作**: 绿色图标 (➕, 📈, ⚡)
- **导出操作**: 橙色图标 (📤, 💾, 📋)
- **管理操作**: 灰色图标 (🔧, ⚙️, 🔄)
- **删除操作**: 红色图标 (🗑️, ❌, 🚫)

### 2. 快速操作面板

#### 浮动操作面板
```
┌─────────────────────────────────────┐
│ 📊 measurement_name                 │
├─────────────────────────────────────┤
│ 📈 最新数据: 1,234 条                │
│ ⏰ 最后更新: 2 分钟前                │
│ 🏷️ 标签数: 5 个                     │
│ 📊 字段数: 8 个                     │
├─────────────────────────────────────┤
│ [查看数据] [快速图表] [导出数据]      │
└─────────────────────────────────────┘
```

### 3. 智能提示和帮助

#### 操作提示
- **悬停提示**: 显示操作说明和生成的 SQL 预览
- **快捷键提示**: 显示相关快捷键
- **操作历史**: 记录用户常用操作，提供快速访问

#### SQL 预览
```
┌─────────────────────────────────────┐
│ 将执行以下查询:                      │
│                                     │
│ SELECT * FROM "temperature"         │
│ ORDER BY time DESC                  │
│ LIMIT 100                          │
│                                     │
│ [执行] [编辑] [取消]                 │
└─────────────────────────────────────┘
```

## 🔧 高级功能

### 1. 查询模板系统

#### 预定义模板
```typescript
interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'aggregation' | 'analysis' | 'maintenance';
  template: string;
  parameters: TemplateParameter[];
}

const queryTemplates: QueryTemplate[] = [
  {
    id: 'latest_data',
    name: '最新数据',
    description: '获取测量的最新 N 条数据',
    category: 'basic',
    template: 'SELECT * FROM "{measurement}" ORDER BY time DESC LIMIT {limit}',
    parameters: [
      { name: 'measurement', type: 'measurement', required: true },
      { name: 'limit', type: 'number', default: 100 }
    ]
  }
];
```

### 2. 批量操作

#### 多选操作
- 支持多选测量进行批量操作
- 批量导出多个测量的数据
- 批量创建图表
- 批量设置保留策略

### 3. 操作历史和收藏

#### 操作历史
```typescript
interface OperationHistory {
  id: string;
  timestamp: Date;
  operation: string;
  target: string;
  query?: string;
  result?: any;
  duration: number;
}
```

#### 收藏功能
- 收藏常用查询
- 收藏常用操作
- 快速访问收藏夹

## 📱 响应式设计

### 1. 移动端适配
- 触摸友好的右键菜单
- 手势操作支持
- 简化的菜单结构

### 2. 键盘快捷键
```
Ctrl + R: 刷新当前视图
Ctrl + E: 导出当前数据
Ctrl + Q: 快速查询
F5: 刷新数据
Delete: 删除选中项
Enter: 执行默认操作
```

## 🎯 用户体验优化

### 1. 性能优化
- 懒加载右键菜单内容
- 缓存常用查询结果
- 异步执行耗时操作
- 进度指示器

### 2. 错误处理
- 友好的错误提示
- 操作撤销功能
- 自动重试机制
- 错误恢复建议

### 3. 个性化设置
- 自定义右键菜单
- 操作偏好设置
- 快捷键自定义
- 界面主题选择

这些设计将让用户能够通过简单的右键操作完成大部分常用的数据库操作，大大提升使用效率和用户体验。
