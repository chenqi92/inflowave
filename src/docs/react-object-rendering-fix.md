# React 对象渲染错误修复

## 问题描述

用户报告了以下 React 错误：

```
Objects are not valid as a React child (found: object with keys {name, retentionPolicies}).
If you meant to render a collection of children, use an array instead.
```

## 错误原因

问题出现在 `src/utils/tauri.ts` 的模拟数据中。`get_databases` 命令原本返回包含 `name` 和 `retentionPolicies` 字段的对象数组，但代码的其他部分期望它返回简单的字符串数组（数据库名称列表）。

### 原始问题代码

```typescript
case 'get_databases':
  return [
    { name: 'mydb', retentionPolicies: ['autogen'] },
    { name: 'telegraf', retentionPolicies: ['autogen', '30d'] },
    { name: '_internal', retentionPolicies: ['monitor'] }
  ] as T;
```

当这些对象被传递给 React 组件并试图作为子元素渲染时，就会产生上述错误。

## 解决方案

### 1. 修复 get_databases 返回值

将 `get_databases` 修改为返回字符串数组：

```typescript
case 'get_databases':
  return [
    'mydb',
    'telegraf',
    '_internal'
  ] as T;
```

### 2. 添加专门的数据库详情 API

为需要详细数据库信息的场景添加新的模拟 API：

```typescript
case 'get_database_info':
  const dbName = args?.database;
  const dbInfoMap: Record<string, any> = {
    'mydb': { name: 'mydb', retentionPolicies: ['autogen'], measurementCount: 5 },
    'telegraf': { name: 'telegraf', retentionPolicies: ['autogen', '30d'], measurementCount: 12 },
    '_internal': { name: '_internal', retentionPolicies: ['monitor'], measurementCount: 3 }
  };
  return dbInfoMap[dbName || 'mydb'] || null as T;
```

### 3. 添加其他相关 API

还添加了：

- `get_measurements` - 返回测量名称列表
- `get_retention_policies` - 返回指定数据库的保留策略详情

## 验证

- ✅ 构建成功：`npm run build` 无错误
- ✅ 开发服务器启动：`npm run dev` 无 React 错误
- ✅ 应用正常运行，默认路由可以正常访问

## 影响范围

此修复确保了：

1. 数据库列表正确显示为字符串数组
2. 需要详细信息的组件可以通过专门的 API 获取数据库对象
3. React 组件不会尝试渲染原始对象作为子元素
4. 所有现有功能继续正常工作

## 相关文件

- `src/utils/tauri.ts` - 主要修复文件
- `src/pages/Database/index.tsx` - 数据库页面组件
- `src/components/database/DatabaseManager.tsx` - 数据库管理组件

## 测试建议

用户可以通过以下方式验证修复：

1. 访问默认路由（/）确认没有 React 错误
2. 导航到数据库页面查看数据库列表
3. 检查浏览器控制台确认没有错误日志
4. 测试数据库相关功能是否正常工作
