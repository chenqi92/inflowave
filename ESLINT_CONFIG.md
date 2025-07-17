# ESLint 配置说明

## ✅ 已完成的修改

我已经将 ESLint 中的**未使用变量**规则从 `error` 改为 `warning`。

### 修改的规则

```javascript
// 之前（错误）
'unused-imports/no-unused-vars': ['error', { ... }]
'unused-imports/no-unused-imports': 'error'

// 现在（警告）
'unused-imports/no-unused-vars': ['warn', { ... }]
'unused-imports/no-unused-imports': 'warn'
```

### 变更影响

| 规则 | 之前 | 现在 | 说明 |
|------|------|------|------|
| 未使用变量 | ❌ Error | ⚠️ Warning | `shortcutsVisible` 等未使用变量 |
| 未使用导入 | ❌ Error | ⚠️ Warning | 导入但未使用的模块 |
| 其他规则 | 保持不变 | 保持不变 | 代码质量规则不受影响 |

## 🚀 新增的 Lint 命令

### `npm run lint:src` - 只检查源代码
```bash
npm run lint:src
# 只检查 src/ 目录，显示警告但不阻止运行
```

### 原有命令
```bash
npm run lint           # 检查所有文件，警告视为错误（CI 用）
npm run lint:fix       # 自动修复可修复的问题
npm run lint:fix-all   # 修复所有问题，警告视为错误
```

## 📋 测试结果

运行 `npm run lint:src` 的示例输出：

```
/Volumes/od/inflowave/src/App.tsx
   15:10  warning  'testBackendConnection' is defined but never used
  136:9   warning  Unexpected console statement
```

✅ **`shortcutsVisible` 等未使用变量现在显示为警告，不会中断开发流程**

## 🔧 配置详情

### 未使用变量处理规则

```javascript
'unused-imports/no-unused-vars': [
  'warn',  // ← 改为 warn
  {
    vars: 'all',
    varsIgnorePattern: '^_',      // 以 _ 开头的变量会被忽略
    args: 'after-used',
    argsIgnorePattern: '^_',      // 以 _ 开头的参数会被忽略
  },
]
```

### 忽略未使用变量的方法

1. **变量名前加下划线**：
```typescript
const _shortcutsVisible = useState(false);  // 不会警告
```

2. **使用 ESLint 注释**：
```typescript
// eslint-disable-next-line unused-imports/no-unused-vars
const shortcutsVisible = useState(false);
```

3. **文件级别忽略**：
```typescript
/* eslint-disable unused-imports/no-unused-vars */
```

## 🎯 推荐做法

### 开发时
- 使用 `npm run lint:src` 查看警告
- 暂时保留未使用的变量用于调试
- 完成开发后清理未使用的代码

### 提交前
- 运行 `npm run lint:fix` 自动修复
- 检查并处理剩余的警告

### CI/CD
- 保持 `npm run lint` 的严格模式
- 确保生产代码质量

## ✅ 总结

现在你可以：
- ✅ **在开发时保留未使用的变量**（如 `shortcutsVisible`）
- ✅ **收到温和的警告提醒**，而不是阻止性错误
- ✅ **保持代码质量标准**，其他规则依然严格
- ✅ **灵活选择检查级别**，使用不同的 lint 命令