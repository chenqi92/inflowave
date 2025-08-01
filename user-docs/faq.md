# ❓ 常见问题

本文档收集了 InfloWave 使用过程中的常见问题和解决方案。

## 🔗 连接相关问题

### Q: 无法连接到 InfluxDB 服务器

**A: 请按以下步骤排查**：

1. **检查服务器状态**

   ```bash
   # 检查 InfluxDB 服务是否运行
   systemctl status influxdb  # Linux
   # 或检查进程
   ps aux | grep influxd
   ```

2. **验证网络连通性**

   ```bash
   # 测试网络连接
   ping your-influxdb-server
   telnet your-influxdb-server 8086
   ```

3. **检查防火墙设置**
   - 确保 8086 端口（默认）未被防火墙阻止
   - 检查服务器和客户端的防火墙配置

4. **验证连接配置**
   - 确认服务器地址、端口、用户名、密码正确
   - 检查是否启用了 SSL/TLS

### Q: 连接经常断开

**A: 可能的解决方案**：

1. **调整连接超时设置**
   - 在连接配置中增加连接超时时间
   - 设置合适的查询超时时间

2. **检查网络稳定性**
   - 测试网络延迟和稳定性
   - 考虑使用有线连接替代 WiFi

3. **服务器资源检查**
   - 检查 InfluxDB 服务器的 CPU 和内存使用情况
   - 确认服务器没有过载

### Q: 提示认证失败

**A: 认证问题解决步骤**：

1. **确认用户凭据**
   - 验证用户名和密码是否正确
   - 检查是否有特殊字符需要转义

2. **检查用户权限**

   ```sql
   -- 在 InfluxDB 中检查用户权限
   SHOW USERS
   SHOW GRANTS FOR "username"
   ```

3. **确认认证设置**
   - 检查 InfluxDB 是否启用了认证
   - 确认认证配置是否正确

## 🗄️ 数据库操作问题

### Q: 无法创建数据库

**A: 检查以下几点**：

1. **用户权限**
   - 确认用户有创建数据库的权限
   - 检查是否为管理员用户

2. **数据库名称**
   - 避免使用保留关键字
   - 使用符合规范的命名（小写字母、数字、下划线）

3. **存储空间**
   - 检查服务器磁盘空间是否充足
   - 确认没有达到数据库数量限制

### Q: 数据库删除失败

**A: 可能的原因和解决方案**：

1. **权限不足**
   - 确认有删除数据库的权限
   - 检查是否为数据库所有者

2. **数据库正在使用**
   - 确认没有其他连接正在使用该数据库
   - 等待正在执行的查询完成

3. **系统保护**
   - 某些系统数据库可能受到保护
   - 检查是否为系统默认数据库

### Q: 保留策略设置不生效

**A: 排查步骤**：

1. **策略配置检查**
   - 确认保留时间格式正确（如 7d, 24h）
   - 检查是否设置为默认策略

2. **等待生效时间**
   - 保留策略可能需要一些时间才能生效
   - 通常在下一个分片组创建时生效

3. **服务器重启**
   - 某些情况下可能需要重启 InfluxDB 服务
   - 检查服务器日志是否有相关错误

## 🔍 查询相关问题

### Q: 查询执行很慢

**A: 性能优化建议**：

1. **添加时间范围限制**

   ```sql
   -- 推荐：指定时间范围
   SELECT * FROM "measurement"
   WHERE time > now() - 1h AND time < now()

   -- 避免：无时间限制
   SELECT * FROM "measurement"
   ```

2. **使用标签过滤**

   ```sql
   -- 利用标签索引加速查询
   SELECT * FROM "measurement"
   WHERE "host" = 'server1' AND time > now() - 1h
   ```

3. **限制返回结果**
   ```sql
   -- 使用 LIMIT 限制结果数量
   SELECT * FROM "measurement"
   WHERE time > now() - 1h
   LIMIT 1000
   ```

### Q: 查询结果为空

**A: 检查以下方面**：

1. **时间范围**
   - 确认查询的时间范围内有数据
   - 检查时区设置是否正确

2. **字段和标签名称**
   - 确认字段名和标签名拼写正确
   - 注意大小写敏感性

3. **数据存在性**

   ```sql
   -- 检查测量是否存在
   SHOW MEASUREMENTS

   -- 检查字段是否存在
   SHOW FIELD KEYS FROM "measurement"
   ```

### Q: 语法错误提示

**A: 常见语法问题**：

1. **引号使用**

   ```sql
   -- 正确：标识符使用双引号
   SELECT "field_name" FROM "measurement"

   -- 正确：字符串值使用单引号
   WHERE "tag_name" = 'value'
   ```

2. **时间格式**

   ```sql
   -- 正确的时间格式
   WHERE time > '2024-01-15T10:00:00Z'
   WHERE time > now() - 1h
   ```

3. **聚合函数**
   ```sql
   -- 使用聚合函数时需要 GROUP BY
   SELECT MEAN("value") FROM "measurement"
   WHERE time > now() - 1h
   GROUP BY time(5m)
   ```

## 📊 可视化问题

### Q: 图表无法显示数据

**A: 排查步骤**：

1. **查询验证**
   - 先在查询页面验证查询是否返回数据
   - 检查查询语句是否正确

2. **字段映射**
   - 确认 X 轴和 Y 轴字段映射正确
   - 检查数据类型是否匹配图表类型

3. **时间字段**
   - 确认时间字段格式正确
   - 检查时间范围是否合理

### Q: 图表显示异常

**A: 可能的解决方案**：

1. **数据类型问题**
   - 确认数值字段为数字类型
   - 检查是否有 null 值或异常值

2. **图表类型选择**
   - 确认图表类型适合数据特征
   - 尝试更换其他图表类型

3. **浏览器兼容性**
   - 尝试刷新页面或清除缓存
   - 使用现代浏览器（Chrome、Firefox、Safari）

### Q: 实时刷新不工作

**A: 检查配置**：

1. **刷新设置**
   - 确认已启用自动刷新
   - 检查刷新间隔设置

2. **查询优化**
   - 确保查询能够快速执行
   - 避免复杂的聚合查询

3. **网络连接**
   - 检查网络连接稳定性
   - 确认服务器响应正常

## 📥 数据写入问题

### Q: 数据写入失败

**A: 常见原因和解决方案**：

1. **格式错误**
   - 检查 Line Protocol 格式是否正确
   - 确认时间戳格式符合要求

2. **权限问题**
   - 确认用户有写入权限
   - 检查目标数据库是否存在

3. **数据类型**
   - 确认字段数据类型一致
   - 避免在同一字段中混用不同类型

### Q: CSV 导入失败

**A: 导入问题排查**：

1. **文件格式**
   - 确认 CSV 文件格式正确
   - 检查字符编码（推荐 UTF-8）

2. **字段映射**
   - 确认时间字段映射正确
   - 检查数据类型设置

3. **数据质量**
   - 检查是否有空值或异常值
   - 确认时间戳格式一致

## 🔧 系统相关问题

### Q: 应用启动失败

**A: 启动问题解决**：

1. **系统要求**
   - 确认系统满足最低要求
   - 检查是否有必要的运行库

2. **权限问题**
   - 以管理员权限运行（Windows）
   - 检查文件权限设置（Linux/macOS）

3. **端口冲突**
   - 检查是否有端口冲突
   - 尝试更改应用端口设置

### Q: 应用运行缓慢

**A: 性能优化**：

1. **系统资源**
   - 检查 CPU 和内存使用情况
   - 关闭不必要的后台程序

2. **数据量控制**
   - 限制查询返回的数据量
   - 使用合适的时间范围

3. **缓存清理**
   - 清理应用缓存
   - 重启应用程序

### Q: 配置丢失

**A: 配置恢复**：

1. **配置文件位置**
   - Windows: `%APPDATA%\com.inflowave.app`
   - macOS: `~/Library/Application Support/com.inflowave.app`
   - Linux: `~/.local/share/com.inflowave.app`

2. **备份恢复**
   - 从备份文件恢复配置
   - 重新创建连接配置

3. **重置设置**
   - 删除配置文件夹重置所有设置
   - 重新配置应用程序

## 🆘 获取帮助

### 日志文件位置

**应用日志**：

- Windows: `%APPDATA%\com.inflowave.app\logs`
- macOS: `~/Library/Logs/com.inflowave.app`
- Linux: `~/.local/share/com.inflowave.app/logs`

### 问题报告

如果以上解决方案都无法解决您的问题，请：

1. **收集信息**
   - 操作系统版本
   - InfloWave 版本
   - InfluxDB 版本
   - 错误信息截图
   - 相关日志文件

2. **提交问题**
   - 访问 [GitHub Issues](https://github.com/chenqi92/inflowave/issues)
   - 详细描述问题和重现步骤
   - 附上收集的信息

3. **社区支持**
   - 查看 [GitHub Discussions](https://github.com/chenqi92/inflowave/discussions)
   - 搜索类似问题的解决方案

### 联系方式

- **GitHub Issues**: [问题报告](https://github.com/chenqi92/inflowave/issues)
- **GitHub Discussions**: [社区讨论](https://github.com/chenqi92/inflowave/discussions)
- **项目主页**: [InfloWave](https://github.com/chenqi92/inflowave)

---

**如果您的问题没有在此列出，请不要犹豫，通过 GitHub Issues 联系我们！** 🤝
