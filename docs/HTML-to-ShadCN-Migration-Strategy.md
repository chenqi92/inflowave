# HTML标签到shadcn/ui组件迁移策略

## 项目概述

本文档详细说明了如何系统性地将项目中的原生HTML标签替换为shadcn/ui组件，以提升主题一致性、可维护性和用户体验。

## 迁移原则

### 1. 渐进式迁移
- 优先处理影响主题切换的关键组件
- 分批次进行，避免大规模破坏性更改
- 保持功能完整性，边迁移边测试

### 2. 向后兼容
- 保持现有API接口不变
- 支持gradual adoption模式
- 允许新旧组件共存

### 3. 性能优先
- 减少bundle大小
- 提升渲染性能
- 优化主题切换响应速度

## 替换策略矩阵

### 高优先级替换（立即执行）

| 原生标签 | shadcn组件 | 影响范围 | 替换难度 | 主题收益 |
|---------|-----------|----------|----------|----------|
| `<button>` | `Button` | 7个位置 | 低 | 高 |
| `<h1>-<h6>` | `Typography` | 42个位置 | 低 | 高 |
| `<label>` | `Label` | 27个位置 | 低 | 中 |
| `<p>` | `Typography.Text` | 120个位置 | 低 | 中 |

### 中优先级替换（分批执行）

| 原生标签 | shadcn组件 | 影响范围 | 替换难度 | 主题收益 |
|---------|-----------|----------|----------|----------|
| `<div class="card">` | `Card` | 估计50+ | 中 | 高 |
| `<span>` | `Typography.Text` | 300+个位置 | 中 | 中 |
| `<pre>` | `Code`或自定义 | 18个位置 | 中 | 中 |
| `<hr>` | `Separator` | 估计10+ | 低 | 中 |

### 低优先级替换（逐步优化）

| 原生标签 | shadcn组件 | 影响范围 | 替换难度 | 主题收益 |
|---------|-----------|----------|----------|----------|
| `<ul><li>` | `List` | 57个位置 | 中 | 低 |
| `<div>`布局 | 布局组件 | 1530+个位置 | 高 | 低 |
| `<img>` | `Avatar` | 少量 | 低 | 低 |

## 具体实施计划

### 第一阶段：按钮和标题标签替换

#### 1.1 按钮标签替换

**目标文件：**
- `src/test-fixes.tsx:29`
- UI组件内部的原生button使用

**替换模式：**
```tsx
// 替换前
<button className="px-4 py-2 bg-blue-500 text-white rounded">
  Hover me
</button>

// 替换后
<Button className="px-4 py-2" variant="primary">
  Hover me
</Button>
```

**实施步骤：**
1. 识别所有原生button标签
2. 分析其样式类和行为
3. 映射到对应的Button组件属性
4. 批量替换并测试

#### 1.2 标题标签替换

**目标文件：**
- `src/pages/FeatureShowcase.tsx`
- `src/pages/DataWrite/index.tsx`
- `src/test-fixes.tsx`

**替换模式：**
```tsx
// 替换前
<h1 className="text-4xl font-bold mb-4 flex items-center justify-center">
  标题文本
</h1>
<h2 className="text-2xl font-bold mb-1">数据写入</h2>
<h3 className="text-xl font-bold mb-4">功能完整性测试</h3>

// 替换后
<Typography variant="h1" className="text-4xl font-bold mb-4 flex items-center justify-center">
  标题文本
</Typography>
<Typography variant="h2" className="text-2xl font-bold mb-1">
  数据写入
</Typography>
<Typography variant="h3" className="text-xl font-bold mb-4">
  功能完整性测试
</Typography>
```

### 第二阶段：表单和文本组件替换

#### 2.1 Label组件替换

**目标范围：** 27个label标签使用

**替换模式：**
```tsx
// 替换前
<label className="block text-sm font-medium text-gray-700">
  字段名称
</label>

// 替换后
<Label className="block text-sm font-medium">
  字段名称
</Label>
```

#### 2.2 段落和文本替换

**目标范围：** 120个p标签，300+个span标签

**替换模式：**
```tsx
// 替换前
<p className="text-gray-500">描述文本</p>
<span className="font-semibold">重要文本</span>

// 替换后
<Typography.Text variant="muted">描述文本</Typography.Text>
<Typography.Text weight="semibold">重要文本</Typography.Text>
```

### 第三阶段：容器和布局组件

#### 3.1 卡片容器替换

**识别模式：**
```tsx
// 需要替换的模式
<div className="bg-gray-50 p-6 rounded-lg">
<div className="bg-gray-100 p-4 rounded max-h-96 overflow-auto">
<div className="border-gray-200 shadow-sm">
```

**替换为：**
```tsx
<Card className="p-6">
  <CardContent>
    内容
  </CardContent>
</Card>
```

#### 3.2 分隔符替换

**替换模式：**
```tsx
// 替换前
<hr className="my-4" />
<div className="border-t border-gray-200 pt-4" />

// 替换后
<Separator className="my-4" />
```

### 第四阶段：代码显示和特殊组件

#### 4.1 代码块替换

**目标：** 18个pre标签，13个code标签

**需要创建或使用现有的Code组件：**
```tsx
// 替换前
<pre className="bg-gray-50 p-4 rounded overflow-auto max-h-96">
  {code}
</pre>

// 替换后
<Code language="sql" className="max-h-96">
  {code}
</Code>
```

## 自动化迁移工具

### 创建迁移脚本

```javascript
// scripts/migrate-html-to-shadcn.js
const fs = require('fs');
const path = require('path');

const migrations = [
  // 按钮替换
  {
    pattern: /<button\s+className="([^"]*)"([^>]*)>/g,
    replacement: '<Button className="$1"$2>',
    addImport: "import { Button } from '@/components/ui';"
  },
  
  // 标题替换
  {
    pattern: /<h([1-6])\s+className="([^"]*)"([^>]*)>/g,
    replacement: '<Typography variant="h$1" className="$2"$3>',
    addImport: "import { Typography } from '@/components/ui';"
  },
  
  // 标签替换
  {
    pattern: /<label\s+className="([^"]*)"([^>]*)>/g,
    replacement: '<Label className="$1"$2>',
    addImport: "import { Label } from '@/components/ui';"
  }
];

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  const importsToAdd = new Set();

  migrations.forEach(migration => {
    if (content.match(migration.pattern)) {
      content = content.replace(migration.pattern, migration.replacement);
      importsToAdd.add(migration.addImport);
      hasChanges = true;
    }
  });

  if (hasChanges) {
    // 添加导入语句
    const existingImports = content.match(/import.*from.*@\/components\/ui.*;/g) || [];
    importsToAdd.forEach(importStr => {
      if (!existingImports.some(existing => existing.includes(importStr.split(' ')[2]))) {
        content = importStr + '\n' + content;
      }
    });

    fs.writeFileSync(filePath, content);
    console.log(`已更新: ${filePath}`);
  }
}
```

## 样式迁移策略

### 硬编码颜色替换

**识别需要替换的颜色模式：**
```tsx
// 需要替换的硬编码颜色
className="text-gray-500"     → className="text-muted-foreground"
className="bg-gray-100"       → className="bg-muted"
className="border-gray-200"   → className="border"
className="text-blue-500"     → className="text-primary"
className="bg-blue-500"       → className="bg-primary"
className="text-red-500"      → className="text-destructive"
className="bg-red-50"         → className="bg-destructive/10"
```

### CSS变量映射表

| 硬编码值 | CSS变量 | shadcn类名 |
|---------|---------|-----------|
| `#1890ff` | `--primary` | `text-primary` |
| `#gray-500` | `--muted-foreground` | `text-muted-foreground` |
| `#gray-100` | `--muted` | `bg-muted` |
| `#red-500` | `--destructive` | `text-destructive` |
| `#green-500` | `--success` | `text-success` |

## 测试策略

### 1. 单元测试更新
```typescript
// 更新测试文件中的选择器
// 替换前
const button = screen.getByRole('button');

// 替换后  
const button = screen.getByRole('button');
// 或使用data-testid
const button = screen.getByTestId('submit-button');
```

### 2. 视觉回归测试
- 截图对比测试
- 主题切换测试
- 响应式布局测试

### 3. 性能测试
- Bundle大小对比
- 渲染性能测试
- 主题切换响应时间

## 风险评估与缓解

### 高风险项目
1. **大批量div替换** - 可能破坏布局
   - 缓解：分批次，小范围测试
   
2. **样式覆盖冲突** - 新旧样式冲突
   - 缓解：建立样式优先级规则

3. **功能回归** - 替换导致功能异常
   - 缓解：完整的功能测试

### 中风险项目
1. **TypeScript类型错误** - 组件属性不匹配
   - 缓解：渐进式类型检查

2. **性能影响** - 组件替换影响性能
   - 缓解：性能监控和优化

## 验收标准

### 功能验收
- [ ] 所有页面正常渲染
- [ ] 交互功能完整
- [ ] 表单提交正常
- [ ] 导航功能正常

### 视觉验收
- [ ] 主题切换正常
- [ ] 响应式布局正确
- [ ] 颜色系统一致
- [ ] 字体排版统一

### 性能验收
- [ ] Bundle大小不增加超过10%
- [ ] 首屏渲染时间不降低
- [ ] 主题切换响应时间<100ms

## 实施时间表

| 阶段 | 工作内容 | 预计时间 | 负责人 |
|-----|---------|----------|--------|
| 第1周 | 按钮和标题替换 | 2天 | 开发团队 |
| 第2周 | 表单组件替换 | 3天 | 开发团队 |
| 第3周 | 容器布局替换 | 3天 | 开发团队 |
| 第4周 | 样式优化和测试 | 2天 | QA团队 |

## 维护指南

### 代码规范
1. 优先使用shadcn/ui组件
2. 避免硬编码颜色值
3. 使用CSS变量和设计令牌
4. 保持组件API一致性

### 开发流程
1. 新功能开发时强制使用shadcn组件
2. Code Review检查HTML标签使用
3. 定期审查和重构
4. 文档更新和培训

---

**文档版本**: v1.0  
**最后更新**: 2025-07-13  
**维护者**: 开发团队