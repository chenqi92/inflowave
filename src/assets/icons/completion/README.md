# 自动补全图标说明

## 图标尺寸建议
- **推荐尺寸**: 16x16 像素 或 20x20 像素
- **格式**: SVG（矢量图，支持主题切换）或 PNG（需要准备亮色和暗色两套）
- **命名规范**: 使用描述性名称，如 `table.svg`, `field.svg` 等

## 需要的图标列表

### 1. 数据库相关图标

#### `table.svg` / `table-light.svg` + `table-dark.svg`
- **用途**: 表/Measurement
- **建议图标**: 表格图标、数据表图标
- **示例**: 📊 类似的表格图标
- **使用场景**: 显示数据库表名、InfluxDB measurement名称

#### `field.svg` / `field-light.svg` + `field-dark.svg`
- **用途**: 字段/列
- **建议图标**: 列图标、字段图标、文本框图标
- **示例**: 📝 类似的文档/字段图标
- **使用场景**: 显示表的字段名、列名

#### `tag.svg` / `tag-light.svg` + `tag-dark.svg`
- **用途**: 标签（InfluxDB特有）
- **建议图标**: 标签图标、tag图标
- **示例**: 🏷️ 类似的标签图标
- **使用场景**: 显示InfluxDB的tag名称

### 2. 代码相关图标

#### `keyword.svg` / `keyword-light.svg` + `keyword-dark.svg`
- **用途**: SQL关键词
- **建议图标**: 钥匙图标、关键词图标、代码块图标
- **示例**: 🔑 类似的钥匙图标
- **使用场景**: SELECT, FROM, WHERE等SQL关键词

#### `function.svg` / `function-light.svg` + `function-dark.svg`
- **用途**: 函数
- **建议图标**: 函数图标、fx图标、方法图标
- **示例**: ƒ 符号或函数图标
- **使用场景**: COUNT(), SUM(), AVG()等函数

#### `type.svg` / `type-light.svg` + `type-dark.svg`
- **用途**: 数据类型
- **建议图标**: 类型图标、T图标
- **示例**: 📘 类似的类型图标
- **使用场景**: INTEGER, STRING, FLOAT等数据类型

#### `constant.svg` / `constant-light.svg` + `constant-dark.svg`
- **用途**: 常量
- **建议图标**: 常量图标、钻石图标
- **示例**: 💎 类似的常量图标
- **使用场景**: TRUE, FALSE, NULL等常量

## 图标准备方式

### 方式1: 使用SVG（推荐）
SVG图标可以通过CSS的`fill`或`stroke`属性动态改变颜色，适配亮暗主题。

**文件命名**:
```
table.svg
field.svg
tag.svg
keyword.svg
function.svg
type.svg
constant.svg
```

**CSS使用示例**:
```css
.cm-completionIcon-db-table {
  background-image: url('/src/assets/icons/completion/table.svg');
  filter: brightness(0) saturate(100%) invert(var(--icon-invert));
}
```

### 方式2: 使用PNG（需要两套）
如果使用PNG，需要准备亮色和暗色两套图标。

**文件命名**:
```
亮色主题:
table-light.png
field-light.png
tag-light.png
keyword-light.png
function-light.png
type-light.png
constant-light.png

暗色主题:
table-dark.png
field-dark.png
tag-dark.png
keyword-dark.png
function-dark.png
type-dark.png
constant-dark.png
```

## 图标来源建议

### 免费图标库
1. **Lucide Icons** (https://lucide.dev/)
   - 推荐图标: Table, FileText, Tag, Key, Function, Type, Diamond
   - 格式: SVG
   - 许可: ISC License

2. **Heroicons** (https://heroicons.com/)
   - 推荐图标: TableCells, DocumentText, Tag, Key
   - 格式: SVG
   - 许可: MIT License

3. **Tabler Icons** (https://tabler-icons.io/)
   - 推荐图标: Table, Column, Tag, Key, Function, Typography, Diamond
   - 格式: SVG
   - 许可: MIT License

4. **Material Symbols** (https://fonts.google.com/icons)
   - 推荐图标: Table, TextFields, Label, Key, Functions, DataObject, Diamond
   - 格式: SVG
   - 许可: Apache 2.0

### 推荐的具体图标映射

| 类型 | Lucide Icons | Heroicons | Tabler Icons |
|------|--------------|-----------|--------------|
| Table | `table-2` | `table-cells` | `table` |
| Field | `file-text` | `document-text` | `column` |
| Tag | `tag` | `tag` | `tag` |
| Keyword | `key` | `key` | `key` |
| Function | `function-square` | - | `function` |
| Type | `type` | - | `typography` |
| Constant | `diamond` | - | `diamond` |

## 当前占位符

在你下载真实图标之前，系统会使用emoji作为临时占位符：
- Table: 📊
- Field: 📝
- Tag: 🏷️
- Keyword: 🔑
- Function: ƒ
- Type: 📘
- Constant: 💎

## 替换步骤

1. 下载图标文件到 `src/assets/icons/completion/` 目录
2. 确保文件名与上述命名规范一致
3. 修改 `src/editor/cm6/theme.ts` 中的CSS，将emoji替换为图标路径
4. 如果使用SVG，可以通过CSS的`filter`属性适配主题
5. 如果使用PNG，需要在CSS中根据主题切换不同的图标文件

