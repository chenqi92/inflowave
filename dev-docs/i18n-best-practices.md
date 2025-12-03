# i18n 最佳实践指南

## 概述

本文档提供了项目中使用 i18n（国际化）的最佳实践和规范，确保翻译键的正确使用和维护。

## 核心原则

### 1. 始终使用 Namespace

**✅ 推荐做法**：
```typescript
// 使用专用的翻译 Hook
import { useSettingsTranslation } from '@/hooks/useTranslation';

const { t } = useSettingsTranslation();
// t('quick_settings') 会自动查找 settings:quick_settings
```

**❌ 避免做法**：
```typescript
// 不要直接使用 useTranslation 而不指定 namespace
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
// t('quick_settings') 会查找 common:quick_settings（可能找不到）
```

### 2. 使用专用的翻译 Hooks

项目提供了多个专用的翻译 Hooks，每个对应一个 namespace：

| Hook | Namespace | 用途 |
|------|-----------|------|
| `useCommonTranslation()` | `common` | 通用翻译（按钮、标签等） |
| `useConnectionsTranslation()` | `connections` | 连接管理相关 |
| `useSettingsTranslation()` | `settings` | 设置页面相关 |
| `useIoTDBTranslation()` | `iotdb` | IoTDB 特定功能 |
| `useDatabaseExplorerTranslation()` | `databaseExplorer` | 数据库浏览器 |
| `useExportTranslation()` | `export` | 数据导出功能 |
| `useQueryTranslation()` | `query` | 查询相关 |
| `useLogsTranslation()` | `logs` | 日志相关 |

**示例**：
```typescript
import { useSettingsTranslation, useCommonTranslation } from '@/hooks/useTranslation';

const MyComponent = () => {
  const { t } = useSettingsTranslation();
  const { t: tCommon } = useCommonTranslation();

  return (
    <div>
      <h1>{t('quick_settings')}</h1>
      <button>{tCommon('confirm')}</button>
    </div>
  );
};
```

### 3. 跨 Namespace 调用

如果需要在一个组件中使用多个 namespace 的翻译，有两种方式：

**方式 1：使用多个 Hook**（推荐）
```typescript
const { t } = useSettingsTranslation();
const { t: tCommon } = useCommonTranslation();

<span>{t('quick_settings')}</span>
<span>{tCommon('confirm')}</span>
```

**方式 2：使用完整的键名**
```typescript
const { t } = useSettingsTranslation();

<span>{t('settings:quick_settings')}</span>
<span>{t('common:confirm')}</span>
```

### 4. 翻译文件组织

翻译文件位于 `public/locales/{language}/{namespace}.json`：

```
public/locales/
├── zh-CN/
│   ├── common.json
│   ├── settings.json
│   ├── iotdb.json
│   └── ...
└── en-US/
    ├── common.json
    ├── settings.json
    ├── iotdb.json
    └── ...
```

每个文件对应一个 namespace，键值使用嵌套结构：

```json
{
  "quick_settings": "快速设置",
  "quick_settings_panel": {
    "title": "安全设置",
    "allow_dangerous_operations": "允许危险操作"
  }
}
```

## 开发工具

### 1. 缺失键收集

开发环境下，系统会自动收集缺失的翻译键并保存到 `src-tauri/logs/missing-i18n.txt`。

**手动触发保存**：
```javascript
// 在浏览器控制台执行
window.__I18N_DEV_TOOLS__.saveMissingKeysToFile();
```

**查看缺失的键**：
```javascript
window.__I18N_DEV_TOOLS__.getMissingKeys();
```

### 2. 翻译键检查脚本

运行以下命令检查翻译文件的一致性：

```bash
# 仅检查
node scripts/check-i18n.cjs --check

# 检查并自动修复
node scripts/check-i18n.cjs --fix

# 生成详细报告
node scripts/check-i18n.cjs --check --report
```

## 常见问题

### Q1: 为什么 missing-i18n.txt 中有重复的键？

A: 这是因为 i18next 的 `missingKeyHandler` 会记录所有格式的缺失键，包括：
- 带 namespace 的：`zh-CN:settings:quick_settings`
- 不带 namespace 的：`zh-CN:quick_settings`

只要确保翻译文件中有对应的键值即可，重复记录不影响功能。

### Q2: 如何添加新的翻译键？

A: 
1. 在对应的翻译文件中添加键值（zh-CN 和 en-US 都要添加）
2. 在组件中使用对应的 Hook 和键名
3. 运行 `node scripts/check-i18n.cjs --check` 验证

### Q3: 如何添加新的 namespace？

A:
1. 在 `public/locales/zh-CN/` 和 `public/locales/en-US/` 中创建新的 JSON 文件
2. 在 `src/i18n/config.ts` 的 `ns` 数组中添加 namespace 名称
3. 在 `src/hooks/useTranslation.ts` 中添加对应的 Hook

## 最佳实践总结

1. ✅ 始终使用专用的翻译 Hooks
2. ✅ 保持 zh-CN 和 en-US 翻译文件同步
3. ✅ 使用嵌套结构组织相关的翻译键
4. ✅ 定期运行检查脚本验证翻译完整性
5. ✅ 在开发环境下检查 missing-i18n.txt 文件
6. ❌ 不要直接使用 `useTranslation()` 而不指定 namespace
7. ❌ 不要在翻译文件中使用重复的键名
8. ❌ 不要硬编码文本，始终使用翻译键

