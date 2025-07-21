# 统一版本管理系统

一个强大的版本管理工具，可以一次性更新项目中所有文件的版本号。

## 🎯 功能特性

- **一次性更新**: 单个命令更新所有相关文件
- **智能检测**: 自动检测版本不一致问题
- **安全替换**: 使用精确的正则表达式避免误替换
- **Git集成**: 支持自动创建版本标签
- **详细日志**: 清晰的操作反馈和错误提示

## 📁 管理的文件

✅ **配置文件**
- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

✅ **文档文件**
- `README.md` (中文)
- `README-en.md` (英文)

## 🚀 快速使用

### 基本命令

```bash
# 检查版本一致性
npm run version:check

# 同步版本（使用package.json中的版本）
npm run version:sync

# 升级版本
npm run version:bump        # patch: 0.1.5 → 0.1.6
npm run version:bump:minor  # minor: 0.1.5 → 0.2.0  
npm run version:bump:major  # major: 0.1.5 → 1.0.0
```

### 高级用法

```bash
# 直接同步到指定版本
node scripts/sync-version.cjs sync 1.2.3

# 升级版本并创建Git标签
node scripts/sync-version.cjs bump patch --tag

# 为当前版本创建Git标签
node scripts/sync-version.cjs tag
```

## 📋 工作流程

### 1. 检查当前状态
```bash
npm run version:check
```

输出示例：
```
📋 版本检查结果:
  package.json:    0.1.5
  tauri.conf.json: 0.1.5
  Cargo.toml:      0.1.5
  状态: ✅ 统一
```

### 2. 升级版本
```bash
npm run version:bump:patch
```

输出示例：
```
📈 版本升级: 0.1.5 → 0.1.6 (patch)

🔄 同步版本到: 0.1.6

📦 更新配置文件...
✅ 更新 package.json 版本为: 0.1.6
✅ 更新 tauri.conf.json 版本为: 0.1.6
✅ 更新 Cargo.toml 版本为: 0.1.6

📝 更新README文件中的版本号...
✅ 更新 README.md 版本号: 26 处替换
✅ 更新 README-en.md 版本号: 26 处替换
✅ 所有README文件更新完成

🎉 版本同步完成: 0.1.6
```

## 🔧 配置说明

### 版本号格式
支持标准的语义化版本号格式：
- `major.minor.patch` (如 1.2.3)
- `major.minor.patch-prerelease` (如 1.2.3-beta.1)

### README更新规则
自动更新以下内容：
- 下载链接: `https://github.com/chenqi92/inflowave/releases/download/v{VERSION}/`
- 文件名: `InfloWave_{VERSION}_*.msi`, `InfloWave_{VERSION}_*.dmg` 等

## ⚠️ 注意事项

1. **备份**: 建议在大版本升级前备份重要文件
2. **检查**: 升级后请检查所有文件是否正确更新
3. **提交**: 记得将更改提交到版本控制系统
4. **测试**: 在生产环境使用前进行充分测试

## 🛠️ 故障排除

### 常见问题

**Q: 版本检查显示不统一**
```bash
# 解决方案：同步版本
npm run version:sync
```

**Q: README更新失败**
```bash
# 检查文件格式和权限
ls -la README*.md
# 手动运行更新
node scripts/sync-version.cjs sync
```

**Q: Git标签创建失败**
```bash
# 检查Git状态
git status
# 确保有写权限
git remote -v
```

## 📜 更新历史

- **v2.0**: 统一版本管理，集成README更新
- **v1.0**: 基础版本同步功能

## 🤝 开发建议

### 发布流程
1. 开发完成后运行 `npm run version:bump:patch`
2. 检查所有文件更新是否正确
3. 提交更改: `git add . && git commit -m "chore: bump version to v0.1.6"`
4. 推送更改: `git push`
5. 创建标签: `git push --tags` (如果使用了 --tag 选项)