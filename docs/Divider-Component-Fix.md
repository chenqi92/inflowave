# Divider组件错误修复指南

## 问题描述

遇到 "Can't find variable: Divider" 错误，表示 `Divider` 组件在运行时无法正确引用。

## 可能的原因

### 1. 导入语句问题
某些文件可能没有正确导入 `Divider` 组件。

### 2. 组件导出问题
`Divider` 组件可能没有正确从模块中导出。

### 3. 浏览器缓存问题
开发环境的热重载可能导致组件缓存问题。

## 解决方案

### 方案1：检查并修复导入语句

确保所有使用 `Divider` 的文件都正确导入了该组件：

```tsx
// 正确的导入方式
import { Divider } from '@/components/ui';

// 或者
import { Divider } from '@/components/ui/Divider';
```

### 方案2：替换为Separator组件

由于shadcn/ui标准组件是 `Separator`，建议将所有 `Divider` 使用替换为 `Separator`：

```tsx
// 替换前
import { Divider } from '@/components/ui';
<Divider />

// 替换后  
import { Separator } from '@/components/ui';
<Separator />
```

### 方案3：清理缓存并重新构建

```bash
# 清理缓存
rm -rf node_modules/.vite
rm -rf dist

# 重新安装依赖
npm install

# 重新构建
npm run build
```

## 批量替换脚本

如果决定将 `Divider` 替换为 `Separator`，可以运行以下脚本：

```javascript
// scripts/replace-divider-with-separator.cjs
const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.{tsx,ts}');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let hasChanges = false;

  // 替换导入语句
  if (content.includes('Divider')) {
    content = content.replace(
      /import\s*{([^}]*)\bDivider\b([^}]*)\}\s*from\s*['"]@\/components\/ui['"];?/g,
      (match, before, after) => {
        const components = (before + after).split(',').map(c => c.trim()).filter(c => c);
        const withoutDivider = components.filter(c => c !== 'Divider');
        if (!withoutDivider.includes('Separator')) {
          withoutDivider.push('Separator');
        }
        return `import { ${withoutDivider.join(', ')} } from '@/components/ui';`;
      }
    );

    // 替换JSX使用
    content = content.replace(/<Divider\s*\/>/g, '<Separator />');
    content = content.replace(/<Divider\s+([^>]*)>/g, '<Separator $1>');
    content = content.replace(/<\/Divider>/g, '</Separator>');

    hasChanges = true;
  }

  if (hasChanges) {
    fs.writeFileSync(file, content);
    console.log(`Updated: ${file}`);
  }
});
```

## 推荐解决方案

建议采用**方案2**：将项目中的 `Divider` 组件全部替换为标准的 `Separator` 组件，原因：

1. **标准化**：`Separator` 是shadcn/ui的标准组件
2. **兼容性**：避免自定义组件可能的兼容性问题  
3. **维护性**：减少自定义组件的维护成本
4. **一致性**：与shadcn/ui设计系统保持一致

## 执行步骤

### 1. 创建替换脚本
```bash
# 创建替换脚本
cat > scripts/replace-divider.cjs << 'EOF'
const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.{tsx,ts}');
let totalChanges = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;
  
  // 替换导入中的Divider为Separator
  content = content.replace(
    /(\{[^}]*)\bDivider\b([^}]*\})/g,
    (match, before, after) => {
      if (match.includes('Separator')) return match;
      return before.replace('Divider', 'Separator') + after;
    }
  );
  
  // 替换JSX中的<Divider />为<Separator />
  content = content.replace(/<Divider\s*\/>/g, '<Separator />');
  content = content.replace(/<Divider(\s[^>]*)>/g, '<Separator$1>');
  content = content.replace(/<\/Divider>/g, '</Separator>');
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    totalChanges++;
    console.log(`✅ Updated: ${file}`);
  }
});

console.log(`\n🎉 Total files updated: ${totalChanges}`);
EOF
```

### 2. 运行替换脚本
```bash
node scripts/replace-divider.cjs
```

### 3. 删除自定义Divider组件
```bash
# 删除Divider组件文件
rm src/components/ui/Divider.tsx

# 从index.ts中移除导出
sed -i '' '/Divider/d' src/components/ui/index.ts
```

### 4. 测试修复结果
```bash
npm run build
npm run dev
```

## 验证修复

修复完成后，检查以下几点：

1. ✅ 项目构建成功，无错误
2. ✅ 开发服务器启动正常
3. ✅ 页面加载无JavaScript错误
4. ✅ 分隔线组件显示正常

## 注意事项

- 在替换之前建议先提交当前代码，以便回滚
- 替换后要测试所有使用分隔线的页面
- 检查是否有样式差异，必要时调整CSS

---

**修复时间预估**: 10-15分钟  
**风险级别**: 低（主要是组件替换）  
**推荐优先级**: 高（影响应用运行）