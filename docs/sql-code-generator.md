# SQL代码生成器开发文档

## 📋 项目概述

SQL代码生成器是InfloWave扩展管理系统中的核心功能，旨在通过可视化界面和智能模板，帮助用户快速生成高质量的InfluxDB查询语句，降低SQL编写门槛，提高开发效率。

## 🎯 核心目标

- **降低使用门槛**：为不熟悉InfluxDB语法的用户提供可视化查询构建
- **提高开发效率**：预置常用查询模板，支持一键生成复杂查询
- **保证查询质量**：提供性能优化建议和最佳实践指导
- **支持多场景**：覆盖监控、分析、报表等不同业务场景

## 🏗️ 功能模块设计

### 1. 时序数据查询生成器

#### 1.1 功能特性
- **时间范围选择**：预设时间范围（1h/24h/7d/30d）+ 自定义时间范围
- **聚合函数配置**：支持mean、sum、max、min、count、percentile等
- **分组间隔设置**：智能推荐合适的时间间隔（1m/5m/1h/1d）
- **过滤条件构建**：拖拽式字段过滤器

#### 1.2 生成的查询类型
```sql
-- 基础时序查询
SELECT mean("value") FROM "measurement" 
WHERE time >= '2024-01-01' AND time <= '2024-01-31'
GROUP BY time(1h)

-- 多字段聚合查询
SELECT max("cpu_usage"), min("cpu_usage"), mean("cpu_usage")
FROM "system_metrics"
WHERE time >= now() - 24h
GROUP BY "host", time(5m)

-- 移动平均查询
SELECT moving_average(mean("value"), 10)
FROM "sensor_data"
WHERE time >= now() - 7d
GROUP BY time(1h)

-- 百分位数查询
SELECT percentile("response_time", 95) as p95,
       percentile("response_time", 99) as p99
FROM "api_metrics"
WHERE time >= now() - 1h
GROUP BY time(5m)
```

#### 1.3 界面设计
```typescript
interface TimeSeriesQueryBuilder {
  measurement: string;           // 测量表名
  fields: FieldConfig[];        // 字段配置
  timeRange: TimeRangeConfig;   // 时间范围
  aggregation: AggregationConfig; // 聚合配置
  filters: FilterConfig[];      // 过滤条件
  groupBy: GroupByConfig;       // 分组配置
}

interface FieldConfig {
  name: string;
  aggregateFunction: 'mean' | 'sum' | 'max' | 'min' | 'count' | 'percentile';
  alias?: string;
  percentileValue?: number; // for percentile function
}
```

### 2. 业务场景模板生成器

#### 2.1 监控报警场景
```typescript
const monitoringTemplates = {
  "异常检测": {
    description: "检测指标异常值",
    template: `
      SELECT "{{field}}" FROM "{{measurement}}"
      WHERE time >= now() - {{timeRange}}
      AND "{{field}}" {{operator}} {{threshold}}
      ORDER BY time DESC
    `,
    parameters: ["field", "measurement", "timeRange", "operator", "threshold"]
  },
  
  "阈值告警": {
    description: "基于阈值的告警查询",
    template: `
      SELECT last("{{field}}") FROM "{{measurement}}"
      WHERE "{{tag}}" = '{{tagValue}}'
      AND time >= now() - {{timeWindow}}
      HAVING last("{{field}}") {{operator}} {{threshold}}
    `,
    parameters: ["field", "measurement", "tag", "tagValue", "timeWindow", "operator", "threshold"]
  }
}
```

#### 2.2 性能分析场景
```typescript
const performanceTemplates = {
  "响应时间分析": {
    description: "API响应时间百分位数分析",
    template: `
      SELECT percentile("response_time", 95) as p95,
             percentile("response_time", 99) as p99,
             mean("response_time") as avg_time
      FROM "{{measurement}}"
      WHERE time >= now() - {{timeRange}}
      GROUP BY "{{groupField}}", time({{interval}})
    `,
    parameters: ["measurement", "timeRange", "groupField", "interval"]
  },
  
  "错误率统计": {
    description: "计算服务错误率",
    template: `
      SELECT sum("error_count") / sum("total_requests") * 100 as error_rate
      FROM "{{measurement}}"
      WHERE time >= now() - {{timeRange}}
      GROUP BY "{{serviceField}}", time({{interval}})
    `,
    parameters: ["measurement", "timeRange", "serviceField", "interval"]
  }
}
```

#### 2.3 业务指标场景
```typescript
const businessTemplates = {
  "用户活跃度": {
    description: "统计活跃用户数量",
    template: `
      SELECT count(distinct "user_id") as active_users
      FROM "{{measurement}}"
      WHERE time >= now() - {{timeRange}}
      GROUP BY time({{interval}})
    `,
    parameters: ["measurement", "timeRange", "interval"]
  },
  
  "转化率分析": {
    description: "计算业务转化率",
    template: `
      SELECT sum("{{conversionField}}") / sum("{{totalField}}") * 100 as conversion_rate
      FROM "{{measurement}}"
      WHERE time >= now() - {{timeRange}}
      GROUP BY "{{dimensionField}}", time({{interval}})
    `,
    parameters: ["conversionField", "totalField", "measurement", "timeRange", "dimensionField", "interval"]
  }
}
```

### 3. 智能SQL构建器

#### 3.1 拖拽式查询构建
```typescript
interface QueryBuilder {
  // 数据源选择
  dataSource: {
    database: string;
    measurement: string;
    retentionPolicy?: string;
  };
  
  // 字段选择
  fields: {
    name: string;
    type: 'field' | 'tag';
    dataType: 'string' | 'number' | 'boolean' | 'time';
    aggregation?: AggregationFunction;
    alias?: string;
  }[];
  
  // 条件构建
  conditions: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';
    value: any;
    logic?: 'AND' | 'OR';
  }[];
  
  // 分组配置
  groupBy: {
    time?: {
      interval: string;
      offset?: string;
    };
    tags?: string[];
  };
  
  // 排序和限制
  orderBy?: {
    field: string;
    direction: 'ASC' | 'DESC';
  };
  limit?: number;
  offset?: number;
}
```

#### 3.2 查询构建算法
```typescript
class SQLGenerator {
  static generateQuery(config: QueryBuilder): string {
    const selectClause = this.buildSelectClause(config.fields);
    const fromClause = this.buildFromClause(config.dataSource);
    const whereClause = this.buildWhereClause(config.conditions);
    const groupByClause = this.buildGroupByClause(config.groupBy);
    const orderByClause = this.buildOrderByClause(config.orderBy);
    const limitClause = this.buildLimitClause(config.limit, config.offset);
    
    return [
      selectClause,
      fromClause,
      whereClause,
      groupByClause,
      orderByClause,
      limitClause
    ].filter(Boolean).join('\n');
  }
  
  private static buildSelectClause(fields: FieldConfig[]): string {
    const fieldParts = fields.map(field => {
      if (field.aggregation) {
        const aggFunc = field.aggregation === 'percentile' 
          ? `percentile("${field.name}", ${field.percentileValue || 95})`
          : `${field.aggregation}("${field.name}")`;
        return field.alias ? `${aggFunc} AS "${field.alias}"` : aggFunc;
      }
      return `"${field.name}"`;
    });
    
    return `SELECT ${fieldParts.join(', ')}`;
  }
  
  // 其他构建方法...
}
```

### 4. 代码导出功能

#### 4.1 多语言支持
```typescript
interface CodeGenerator {
  generatePython(query: string, connectionConfig: ConnectionConfig): string;
  generateJavaScript(query: string, connectionConfig: ConnectionConfig): string;
  generateJava(query: string, connectionConfig: ConnectionConfig): string;
  generateGo(query: string, connectionConfig: ConnectionConfig): string;
  generateCurl(query: string, connectionConfig: ConnectionConfig): string;
}
```

#### 4.2 Python代码模板
```python
# Python InfluxDB客户端代码模板
PYTHON_TEMPLATE = """
from influxdb import InfluxDBClient
import pandas as pd
from datetime import datetime

# 连接配置
client = InfluxDBClient(
    host='{{host}}',
    port={{port}},
    username='{{username}}',
    password='{{password}}',
    database='{{database}}'
)

# 执行查询
query = '''
{{query}}
'''

try:
    result = client.query(query)
    
    # 转换为DataFrame（可选）
    points = list(result.get_points())
    df = pd.DataFrame(points)
    
    # 处理结果
    for point in points:
        print(f"时间: {point.get('time', 'N/A')}")
        {{#each fields}}
        print(f"{{this}}: {point.get('{{this}}', 'N/A')}")
        {{/each}}
        print("-" * 50)
        
except Exception as e:
    print(f"查询执行失败: {e}")
finally:
    client.close()
"""
```

#### 4.3 JavaScript代码模板
```javascript
// JavaScript InfluxDB客户端代码模板
const JAVASCRIPT_TEMPLATE = `
const { InfluxDB } = require('@influxdata/influxdb-client');

// 连接配置
const url = 'http://{{host}}:{{port}}';
const token = '{{token}}'; // InfluxDB 2.x使用token
const org = '{{org}}';
const bucket = '{{bucket}}';

const client = new InfluxDB({ url, token });
const queryApi = client.getQueryApi(org);

// Flux查询（InfluxDB 2.x）
const query = \`
{{fluxQuery}}
\`;

// 执行查询
queryApi.queryRows(query, {
  next(row, tableMeta) {
    const record = tableMeta.toObject(row);
    console.log('记录:', record);
  },
  error(error) {
    console.error('查询失败:', error);
  },
  complete() {
    console.log('查询完成');
    client.close();
  }
});
`;
```

### 5. 智能优化建议

#### 5.1 性能优化规则
```typescript
interface OptimizationRule {
  name: string;
  description: string;
  detector: (query: ParsedQuery) => boolean;
  suggestion: string;
  optimizedQuery?: (query: ParsedQuery) => string;
}

const optimizationRules: OptimizationRule[] = [
  {
    name: "时间范围优化",
    description: "建议为时间查询添加上下边界",
    detector: (query) => query.timeRange.start && !query.timeRange.end,
    suggestion: "为了提高查询性能，建议为时间范围添加结束时间",
    optimizedQuery: (query) => {
      // 自动添加合理的结束时间
      return query.addTimeUpperBound();
    }
  },
  
  {
    name: "字段选择优化",
    description: "避免使用SELECT *",
    detector: (query) => query.hasSelectAll(),
    suggestion: "使用SELECT *会降低查询性能，建议只选择需要的字段",
    optimizedQuery: (query) => {
      return query.replaceSelectAllWithFields();
    }
  },
  
  {
    name: "分组间隔优化",
    description: "根据时间范围调整分组间隔",
    detector: (query) => query.groupBy.time && this.isIntervalTooSmall(query),
    suggestion: "当前分组间隔可能产生过多数据点，建议增大间隔",
    optimizedQuery: (query) => {
      return query.adjustGroupByInterval();
    }
  }
];
```

#### 5.2 最佳实践检查
```typescript
interface BestPracticeChecker {
  checkIndexUsage(query: ParsedQuery): Suggestion[];
  checkTimeRangeEfficiency(query: ParsedQuery): Suggestion[];
  checkGroupByEfficiency(query: ParsedQuery): Suggestion[];
  checkLimitUsage(query: ParsedQuery): Suggestion[];
}

interface Suggestion {
  type: 'warning' | 'info' | 'error';
  title: string;
  description: string;
  example?: string;
  action?: () => void;
}
```

## 🎨 用户界面设计

### 1. 主界面布局
```
┌─────────────────────────────────────────────────────────────┐
│ SQL代码生成器                                    [导出] [运行] │
├─────────────────────────────────────────────────────────────┤
│ [模板库] [可视化构建器] [智能优化] [代码导出]                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐ ┌───────────────────────────────────────┐   │
│  │  数据源     │ │           查询构建区域                  │   │
│  │             │ │                                       │   │
│  │ □ 数据库    │ │  时间范围: [最近24小时] [自定义]        │   │
│  │ □ 测量表    │ │  字段选择: ☑ cpu_usage ☑ memory_used  │   │
│  │ □ 字段列表  │ │  聚合函数: [平均值] [最大值] [最小值]   │   │
│  │             │ │  分组间隔: [5分钟] [1小时] [自定义]     │   │
│  └─────────────┘ │  过滤条件: + 添加条件                  │   │
│                  └───────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    生成的SQL查询                              │
│  SELECT mean("cpu_usage"), max("memory_used")               │
│  FROM "system_metrics"                                      │
│  WHERE time >= now() - 24h                                 │
│  GROUP BY time(5m)                                         │
├─────────────────────────────────────────────────────────────┤
│ [优化建议] 建议添加LIMIT子句以限制返回结果数量                │
└─────────────────────────────────────────────────────────────┘
```

### 2. 模板库界面
```typescript
interface TemplateLibrary {
  categories: {
    name: string;
    templates: QueryTemplate[];
  }[];
}

interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  sqlTemplate: string;
  parameters: TemplateParameter[];
  example: string;
}
```

## 🔧 技术实现方案

### 1. 技术栈选择
- **前端框架**: React + TypeScript
- **状态管理**: Zustand
- **UI组件库**: 已有的组件系统
- **SQL解析**: 自定义InfluxQL解析器
- **代码生成**: 模板引擎（Handlebars或自定义）

### 2. 核心组件结构
```
src/components/sql-generator/
├── SQLGenerator.tsx              # 主组件
├── TemplateLibrary/
│   ├── TemplateGrid.tsx         # 模板网格
│   ├── TemplateCard.tsx         # 模板卡片
│   └── TemplateDetail.tsx       # 模板详情
├── QueryBuilder/
│   ├── VisualQueryBuilder.tsx   # 可视化构建器
│   ├── DataSourceSelector.tsx   # 数据源选择器
│   ├── FieldSelector.tsx        # 字段选择器
│   ├── TimeRangeSelector.tsx    # 时间范围选择器
│   ├── FilterBuilder.tsx        # 过滤条件构建器
│   └── GroupByBuilder.tsx       # 分组构建器
├── CodeGenerator/
│   ├── CodeExporter.tsx         # 代码导出器
│   ├── LanguageSelector.tsx     # 语言选择器
│   └── CodePreview.tsx          # 代码预览
├── Optimizer/
│   ├── OptimizationPanel.tsx    # 优化建议面板
│   └── BestPractices.tsx        # 最佳实践检查
└── utils/
    ├── sqlParser.ts             # SQL解析器
    ├── codeTemplates.ts         # 代码模板
    ├── optimizationRules.ts     # 优化规则
    └── queryTemplates.ts        # 查询模板
```

### 3. 数据模型设计
```typescript
// 查询配置数据模型
interface QueryConfig {
  id: string;
  name: string;
  description?: string;
  dataSource: DataSourceConfig;
  fields: FieldConfig[];
  timeRange: TimeRangeConfig;
  conditions: ConditionConfig[];
  groupBy: GroupByConfig;
  orderBy?: OrderByConfig;
  limit?: number;
  offset?: number;
}

// 模板数据模型
interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sqlTemplate: string;
  parameters: TemplateParameter[];
  examples: TemplateExample[];
  metadata: {
    author: string;
    createdAt: Date;
    updatedAt: Date;
    version: string;
    downloads: number;
    rating: number;
  };
}
```

### 4. API接口设计
```typescript
// SQL生成器相关API
interface SQLGeneratorAPI {
  // 模板管理
  getTemplates(category?: string): Promise<Template[]>;
  getTemplate(id: string): Promise<Template>;
  saveTemplate(template: Template): Promise<void>;
  deleteTemplate(id: string): Promise<void>;
  
  // 查询构建
  validateQuery(sql: string): Promise<ValidationResult>;
  optimizeQuery(sql: string): Promise<OptimizationResult>;
  parseQuery(sql: string): Promise<ParsedQuery>;
  
  // 代码生成
  generateCode(sql: string, language: string, config: ConnectionConfig): Promise<string>;
  getCodeTemplates(language: string): Promise<CodeTemplate[]>;
  
  // 数据源信息
  getDatabaseSchema(connectionId: string): Promise<DatabaseSchema>;
  getMeasurements(connectionId: string, database: string): Promise<string[]>;
  getFields(connectionId: string, database: string, measurement: string): Promise<FieldInfo[]>;
}
```

## 📅 开发计划

### Phase 1: 基础框架搭建（1-2周）
- [ ] 创建SQL生成器主界面框架
- [ ] 实现基础的查询构建器UI
- [ ] 建立模板数据结构和存储
- [ ] 实现简单的SQL生成逻辑

### Phase 2: 核心功能开发（2-3周）
- [ ] 完善可视化查询构建器
- [ ] 实现模板库功能
- [ ] 开发时序数据查询生成器
- [ ] 添加基础的代码导出功能

### Phase 3: 高级功能开发（2-3周）
- [ ] 实现智能优化建议
- [ ] 添加多语言代码生成
- [ ] 开发业务场景模板
- [ ] 完善用户界面和交互

### Phase 4: 测试和优化（1-2周）
- [ ] 单元测试和集成测试
- [ ] 性能优化和bug修复
- [ ] 用户体验优化
- [ ] 文档完善

## 🎯 成功指标

1. **功能完整性**
   - 支持90%以上的常见InfluxDB查询场景
   - 提供至少50个预置查询模板
   - 支持5种以上编程语言的代码导出

2. **易用性**
   - 非SQL专家能在5分钟内生成复杂查询
   - 可视化构建器覆盖80%的查询需求
   - 模板库分类清晰，搜索便捷

3. **性能和质量**
   - 生成的SQL查询性能优于手写查询平均水平
   - 优化建议准确率达到85%以上
   - 生成的客户端代码可直接运行

## 🔗 相关文档
- [InfluxDB查询语言文档](https://docs.influxdata.com/influxdb/)
- [扩展管理系统架构文档](./extension-architecture.md)
- [UI组件库文档](./ui-components.md)
- [API接口规范](./api-specification.md)

---

*该文档将随着开发进度持续更新，请定期查看最新版本。*