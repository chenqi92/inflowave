# 数据源树图标需求清单

## 目录结构
```
src/assets/icons/database/
├── brands/                      # 数据库品牌图标
├── light/                       # 亮色主题图标
├── dark/                        # 暗色主题图标
└── states/                      # 状态图标
```

## 完整图标清单 (每个都需要 light/dark 两个版本)

### 1. 连接状态图标 (4个)
- `connection-active.svg` - 已连接 (绿色指示器)
- `connection-inactive.svg` - 未连接 (灰色指示器)
- `connection-error.svg` - 连接错误 (红色指示器)  
- `connection-loading.svg` - 连接中 (旋转动画)

### 2. 数据库品牌图标 (5个)
- `influxdb-1x.svg` - InfluxDB 1.x 官方 logo
- `influxdb-2x.svg` - InfluxDB 2.x 官方 logo  
- `influxdb-3x.svg` - InfluxDB 3.x 官方 logo
- `iotdb.svg` - Apache IoTDB 官方 logo
- `database-generic.svg` - 通用数据库图标

### 3. 基础数据库节点 (4个)
- `database.svg` - 普通数据库 (圆柱形数据库图标)
- `database-system.svg` - 系统数据库 (带齿轮的数据库)
- `database3x.svg` - InfluxDB 3.x 数据库 (现代化数据库图标)
- `storage-group.svg` - IoTDB 存储组 (文件夹+数据库)

### 4. InfluxDB 1.x 节点 (8个)
- `retention-policy.svg` - 保留策略 (日历+时钟)
- `series.svg` - 序列 (波浪线图)
- `continuous-query.svg` - 连续查询 (循环箭头+查询符号)
- `shard.svg` - 分片 (六边形拼图块)
- `shard-group.svg` - 分片组 (多个六边形)
- `measurement.svg` - 测量 (表格图标)
- `user1x.svg` - 1.x用户 (用户头像)
- `privilege.svg` - 权限 (盾牌+钥匙)

### 5. InfluxDB 2.x 节点 (14个)
- `organization.svg` - 组织 (建筑物)
- `bucket.svg` - 存储桶 (桶形容器)
- `system-bucket.svg` - 系统存储桶 (桶+齿轮)
- `task.svg` - 任务 (播放按钮+齿轮)
- `dashboard.svg` - 仪表板 (图表组合)
- `cell.svg` - 单元格 (单个图表)
- `variable.svg` - 变量 (X符号/代数符号)
- `check.svg` - 监控检查 (对勾+放大镜)
- `notification-rule.svg` - 通知规则 (铃铛+设置)
- `notification-endpoint.svg` - 通知端点 (铃铛+箭头)
- `scraper.svg` - 数据抓取器 (蜘蛛/爬虫图标)
- `telegraf.svg` - Telegraf (信号塔)
- `authorization.svg` - 授权令牌 (钥匙+代码)
- `label.svg` - 标签 (标签贴纸)

### 6. InfluxDB 3.x 节点 (11个)
- `schema.svg` - 模式 (架构图)
- `table.svg` - 表 (表格)
- `column.svg` - 列 (表格列)
- `index.svg` - 索引 (放大镜+列表)
- `partition.svg` - 分区 (分割的矩形)
- `view.svg` - 视图 (眼睛)
- `materialized-view.svg` - 物化视图 (眼睛+钻石)
- `function3x.svg` - 函数 (fx符号)
- `procedure.svg` - 存储过程 (齿轮+代码块)
- `trigger3x.svg` - 触发器 (闪电+齿轮)
- `namespace.svg` - 命名空间 (文件夹+标签)

### 7. IoTDB 节点 (16个)
- `device.svg` - 设备 (芯片/设备图标)
- `timeseries.svg` - 时间序列 (时间线图)
- `aligned-timeseries.svg` - 对齐时间序列 (对齐的时间线)
- `template.svg` - 设备模板 (模板/布局图标)
- `function.svg` - UDF函数 (函数符号)
- `trigger.svg` - 触发器 (闪电)
- `system-info.svg` - 系统信息 (信息图标+齿轮)
- `version-info.svg` - 版本信息 (版本号)
- `storage-engine-info.svg` - 存储引擎 (引擎图标)
- `cluster-info.svg` - 集群信息 (网络节点)
- `schema-template.svg` - 模式模板 (模板+架构)
- `data-type.svg` - 数据类型 (类型符号)
- `encoding.svg` - 编码方式 (编码符号)
- `compression.svg` - 压缩方式 (压缩图标)
- `attribute-group.svg` - 属性分组 (属性列表)
- `user2x.svg` - 2.x用户 (现代用户头像)

### 8. 通用测量节点 (5个)
- `field-group.svg` - 字段分组 (字段容器)
- `tag-group.svg` - 标签分组 (标签容器) 
- `field.svg` - 字段 (数据字段)
- `tag.svg` - 标签 (标签)
- `measurement.svg` - 测量 (已包含在上面)

### 9. 状态指示图标 (6个)
- `loading.svg` - 加载中 (旋转器)
- `error.svg` - 错误状态 (错误图标)
- `empty.svg` - 空状态 (空文件夹)
- `system.svg` - 系统节点 (齿轮)
- `expandable.svg` - 可展开 (右箭头)
- `expanded.svg` - 已展开 (下箭头)

## 图标设计规范

### 尺寸要求
- **主尺寸**: 16x16px (树形控件标准)
- **备用尺寸**: 24x24px (高分辨率显示)
- **格式**: SVG (矢量格式，支持缩放)

### 设计原则
1. **简洁明了**: 16px 下依然清晰可辨
2. **风格统一**: 使用一致的线条粗细和圆角
3. **语义化**: 图标含义与节点类型直观对应
4. **主题适配**: 亮色/暗色主题都清晰可见

### 颜色规范
**亮色主题:**
- 主色调: #374151 (深灰)
- 强调色: #059669 (绿色 - 连接状态)
- 警告色: #DC2626 (红色 - 错误状态)
- 系统色: #6B7280 (中灰 - 系统节点)

**暗色主题:**
- 主色调: #D1D5DB (浅灰)  
- 强调色: #10B981 (亮绿色)
- 警告色: #EF4444 (亮红色)
- 系统色: #9CA3AF (亮中灰)

## 推荐图标资源

1. **Heroicons**: 基础图标 (数据库、表格、用户等)
2. **Lucide**: 现代图标集 (齿轮、设置、网络等)  
3. **Tabler Icons**: 技术类图标 (服务器、API、监控等)
4. **Feather Icons**: 简洁风格图标
5. **官方品牌**: InfluxDB、Apache IoTDB 官方 SVG

## 实现优先级

### 第一优先级 (核心功能)
- 连接状态图标 (4个)
- 数据库品牌图标 (5个)
- 基础数据库节点 (4个)

### 第二优先级 (常用节点)  
- InfluxDB 1.x/2.x 基础节点 (10个)
- 通用测量节点 (5个)

### 第三优先级 (高级功能)
- InfluxDB 3.x 节点 (11个)
- IoTDB 节点 (16个)
- 状态指示图标 (6个)

**总计: 约 80+ 个图标 (light/dark 各一套)**