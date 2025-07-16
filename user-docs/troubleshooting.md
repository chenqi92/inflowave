# 🔧 故障排除

本指南提供了 InfloWave 常见问题的诊断方法和解决方案，帮助您快速定位和解决问题。

## 🚨 问题诊断流程

### 基本诊断步骤

1. **确认问题现象** - 详细记录问题表现
2. **检查系统状态** - 验证基础环境
3. **查看错误信息** - 收集错误日志和提示
4. **尝试基本解决方案** - 执行常见修复步骤
5. **深入分析** - 使用高级诊断工具
6. **寻求帮助** - 联系技术支持

### 信息收集清单

在报告问题前，请收集以下信息：

- **系统信息**: 操作系统版本、硬件配置
- **软件版本**: InfloWave 版本、InfluxDB 版本
- **错误信息**: 完整的错误消息和堆栈跟踪
- **操作步骤**: 重现问题的详细步骤
- **环境配置**: 网络设置、防火墙配置
- **日志文件**: 相关的日志文件内容

## 🔗 连接问题诊断

### 连接超时问题

**症状**: 连接测试时提示超时或长时间无响应

**诊断步骤**:

1. **网络连通性测试**

   ```bash
   # 测试网络连接
   ping influxdb-server-ip

   # 测试端口连通性
   telnet influxdb-server-ip 8086
   # 或使用 nc 命令
   nc -zv influxdb-server-ip 8086
   ```

2. **防火墙检查**

   ```bash
   # Linux 检查防火墙状态
   sudo ufw status
   sudo iptables -L

   # Windows 检查防火墙
   netsh advfirewall show allprofiles
   ```

3. **服务状态检查**

   ```bash
   # 检查 InfluxDB 服务状态
   systemctl status influxdb

   # 检查进程
   ps aux | grep influxd

   # 检查端口监听
   netstat -tlnp | grep 8086
   ```

**解决方案**:

- 调整连接超时设置（增加到 30-60 秒）
- 检查并配置防火墙规则
- 确认 InfluxDB 服务正常运行
- 验证网络路由配置

### 认证失败问题

**症状**: 提示用户名或密码错误

**诊断步骤**:

1. **验证凭据**

   ```bash
   # 使用 curl 测试认证
   curl -i -XPOST http://localhost:8086/query \
     --data-urlencode "q=SHOW DATABASES" \
     -u username:password
   ```

2. **检查用户权限**

   ```sql
   -- 在 InfluxDB 中检查用户
   SHOW USERS
   SHOW GRANTS FOR "username"
   ```

3. **检查认证配置**
   ```bash
   # 检查 InfluxDB 配置文件
   cat /etc/influxdb/influxdb.conf | grep -A 5 "\[http\]"
   ```

**解决方案**:

- 确认用户名和密码正确
- 检查用户是否存在且有相应权限
- 确认 InfluxDB 启用了认证
- 重置用户密码（如有权限）

### SSL/TLS 连接问题

**症状**: HTTPS 连接失败或证书错误

**诊断步骤**:

1. **证书验证**

   ```bash
   # 检查 SSL 证书
   openssl s_client -connect influxdb-server:8086 -servername influxdb-server
   ```

2. **TLS 版本检查**
   ```bash
   # 测试不同 TLS 版本
   curl -v --tlsv1.2 https://influxdb-server:8086/ping
   ```

**解决方案**:

- 更新 SSL 证书
- 配置正确的 TLS 版本
- 添加证书到信任列表
- 临时禁用 SSL 验证（仅测试用）

## 🗄️ 数据库操作问题

### 数据库创建失败

**症状**: 创建数据库时报错或无响应

**诊断步骤**:

1. **权限检查**

   ```sql
   -- 检查当前用户权限
   SHOW GRANTS FOR "current_user"
   ```

2. **存储空间检查**

   ```bash
   # 检查磁盘空间
   df -h

   # 检查 InfluxDB 数据目录
   du -sh /var/lib/influxdb/
   ```

3. **命名规范检查**
   - 数据库名称只能包含字母、数字、下划线
   - 不能使用 InfluxDB 保留关键字
   - 长度限制检查

**解决方案**:

- 确保用户有 CREATE DATABASE 权限
- 清理磁盘空间
- 使用符合规范的数据库名称
- 检查 InfluxDB 配置限制

### 查询性能问题

**症状**: 查询执行缓慢或超时

**诊断步骤**:

1. **查询分析**

   ```sql
   -- 使用 EXPLAIN 分析查询计划
   EXPLAIN SELECT * FROM "measurement" WHERE time > now() - 1h
   ```

2. **系统资源监控**

   ```bash
   # 监控系统资源
   top
   htop
   iotop

   # 检查 InfluxDB 进程资源使用
   ps aux | grep influxd
   ```

3. **数据库统计**
   ```sql
   -- 检查数据库大小和统计信息
   SHOW STATS
   SHOW DIAGNOSTICS
   ```

**解决方案**:

- 添加时间范围限制
- 使用标签过滤优化查询
- 增加系统内存
- 优化数据结构设计
- 调整 InfluxDB 配置参数

## 📊 可视化问题诊断

### 图表显示异常

**症状**: 图表无法显示、显示错误或样式异常

**诊断步骤**:

1. **数据验证**

   ```sql
   -- 验证查询返回的数据格式
   SELECT * FROM "measurement" LIMIT 5
   ```

2. **浏览器控制台检查**
   - 打开浏览器开发者工具 (F12)
   - 查看 Console 标签的错误信息
   - 检查 Network 标签的网络请求

3. **图表配置检查**
   - 验证 X 轴和 Y 轴字段映射
   - 检查数据类型匹配
   - 确认时间字段格式

**解决方案**:

- 修正查询语句返回正确格式数据
- 调整图表配置参数
- 清除浏览器缓存
- 更新浏览器到最新版本
- 尝试不同的图表类型

### 实时刷新问题

**症状**: 图表不能自动刷新或刷新异常

**诊断步骤**:

1. **网络连接检查**

   ```bash
   # 测试网络延迟
   ping -c 10 influxdb-server
   ```

2. **查询性能检查**
   - 测试查询执行时间
   - 检查查询复杂度
   - 验证数据量大小

3. **浏览器资源检查**
   - 检查内存使用情况
   - 查看 CPU 使用率
   - 确认没有内存泄漏

**解决方案**:

- 优化查询语句性能
- 调整刷新间隔
- 减少同时刷新的图表数量
- 使用增量更新策略

## 📥 数据写入问题

### 写入失败诊断

**症状**: 数据写入时报错或写入不成功

**诊断步骤**:

1. **格式验证**

   ```bash
   # 验证 Line Protocol 格式
   echo "measurement,tag1=value1 field1=1.0 $(date +%s)000000000" | \
   curl -i -XPOST 'http://localhost:8086/write?db=mydb' --data-binary @-
   ```

2. **权限检查**

   ```sql
   -- 检查写入权限
   SHOW GRANTS FOR "username"
   ```

3. **数据库存在性检查**
   ```sql
   -- 确认目标数据库存在
   SHOW DATABASES
   ```

**解决方案**:

- 修正数据格式错误
- 确保用户有写入权限
- 创建目标数据库
- 检查字段数据类型一致性

### 批量导入问题

**症状**: CSV 或 JSON 文件导入失败

**诊断步骤**:

1. **文件格式检查**

   ```bash
   # 检查文件编码
   file -i data.csv

   # 查看文件前几行
   head -n 5 data.csv
   ```

2. **数据质量检查**
   - 检查是否有空值
   - 验证时间戳格式
   - 确认数据类型一致性

3. **内存使用监控**
   ```bash
   # 监控内存使用
   free -h
   watch -n 1 'ps aux | grep inflowave'
   ```

**解决方案**:

- 转换文件编码为 UTF-8
- 清理数据中的异常值
- 分批导入大文件
- 增加系统内存或调整批量大小

## 🔧 系统级问题

### 应用启动失败

**症状**: InfloWave 无法启动或启动后立即崩溃

**诊断步骤**:

1. **系统要求检查**

   ```bash
   # 检查系统版本
   uname -a
   lsb_release -a  # Linux

   # 检查可用内存
   free -h

   # 检查磁盘空间
   df -h
   ```

2. **依赖库检查**

   ```bash
   # Linux 检查依赖库
   ldd /path/to/inflowave

   # 检查缺失的库
   ldconfig -p | grep webkit
   ```

3. **权限检查**

   ```bash
   # 检查文件权限
   ls -la /path/to/inflowave

   # 检查配置目录权限
   ls -la ~/.local/share/com.inflowave.app/
   ```

**解决方案**:

- 升级系统到支持的版本
- 安装缺失的依赖库
- 修正文件权限
- 以管理员权限运行
- 重新安装应用程序

### 性能问题诊断

**症状**: 应用运行缓慢或响应迟钝

**诊断步骤**:

1. **资源使用监控**

   ```bash
   # 实时监控资源使用
   top -p $(pgrep inflowave)

   # 内存使用详情
   cat /proc/$(pgrep inflowave)/status
   ```

2. **网络延迟测试**

   ```bash
   # 测试到 InfluxDB 的延迟
   ping -c 100 influxdb-server | tail -1
   ```

3. **磁盘 I/O 检查**
   ```bash
   # 监控磁盘 I/O
   iotop -p $(pgrep inflowave)
   ```

**解决方案**:

- 关闭不必要的后台程序
- 增加系统内存
- 使用 SSD 硬盘
- 优化网络配置
- 调整应用配置参数

## 📋 日志分析

### 日志文件位置

**应用日志**:

- Windows: `%APPDATA%\com.inflowave.app\logs\`
- macOS: `~/Library/Logs/com.inflowave.app/`
- Linux: `~/.local/share/com.inflowave.app/logs/`

**InfluxDB 日志**:

- Linux: `/var/log/influxdb/influxd.log`
- Docker: `docker logs influxdb-container`

### 日志分析技巧

1. **错误级别过滤**

   ```bash
   # 查看错误级别日志
   grep -i "error\|fatal\|panic" app.log

   # 查看最近的错误
   tail -f app.log | grep -i error
   ```

2. **时间范围过滤**

   ```bash
   # 查看特定时间范围的日志
   sed -n '/2024-01-15 10:00/,/2024-01-15 11:00/p' app.log
   ```

3. **关键字搜索**

   ```bash
   # 搜索连接相关问题
   grep -i "connection\|timeout\|refused" app.log

   # 搜索查询相关问题
   grep -i "query\|sql\|syntax" app.log
   ```

## 🆘 获取技术支持

### 准备支持信息

在联系技术支持前，请准备：

1. **系统信息**

   ```bash
   # 收集系统信息
   uname -a > system_info.txt
   cat /etc/os-release >> system_info.txt  # Linux
   ```

2. **应用版本信息**
   - InfloWave 版本号
   - 安装方式（安装包/源码编译）
   - 更新历史

3. **错误重现步骤**
   - 详细的操作步骤
   - 预期结果和实际结果
   - 错误截图或录屏

4. **相关日志文件**
   - 应用日志
   - 系统日志
   - InfluxDB 日志

### 联系方式

- **GitHub Issues**: [问题报告](https://github.com/chenqi92/inflowave/issues)
- **GitHub Discussions**: [社区讨论](https://github.com/chenqi92/inflowave/discussions)

### 问题报告模板

```markdown
## 问题描述

[简要描述遇到的问题]

## 系统环境

- 操作系统: [Windows 10/macOS 12/Ubuntu 20.04]
- InfloWave 版本: [1.0.5]
- InfluxDB 版本: [1.8.10]

## 重现步骤

1. [第一步]
2. [第二步]
3. [第三步]

## 预期结果

[描述预期的正常行为]

## 实际结果

[描述实际发生的异常行为]

## 错误信息

[粘贴完整的错误消息]

## 附加信息

[其他可能有用的信息]
```

---

**通过系统化的故障排除方法，大多数问题都能得到快速解决。** 🔧

如果问题仍然存在，请不要犹豫联系我们的技术支持团队！
