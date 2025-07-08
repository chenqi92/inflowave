#!/bin/bash
# 版本更新脚本
# 用法: ./scripts/update-version.sh 1.0.1

set -e

if [ $# -eq 0 ]; then
    echo "❌ 错误: 请提供版本号"
    echo "用法: $0 <version>"
    echo "示例: $0 1.0.1"
    exit 1
fi

VERSION=$1

echo "🔄 更新版本号到 $VERSION..."

# 验证版本号格式 (语义化版本)
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9\-\.]+)?(\+[a-zA-Z0-9\-\.]+)?$ ]]; then
    echo "❌ 错误: 版本号格式无效。请使用语义化版本格式 (例如: 1.0.0, 1.0.0-beta.1)"
    exit 1
fi

# 更新 VERSION 文件
echo "📝 更新 VERSION 文件..."
echo -n "$VERSION" > VERSION

# 更新 package.json
echo "📝 更新 package.json..."
if command -v jq >/dev/null 2>&1; then
    # 使用 jq 更新 JSON
    jq ".version = \"$VERSION\"" package.json > package.json.tmp && mv package.json.tmp package.json
else
    # 使用 sed 更新 JSON (备用方案)
    sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json
    rm -f package.json.bak
fi

# 更新 src-tauri/tauri.conf.json
echo "📝 更新 tauri.conf.json..."
if command -v jq >/dev/null 2>&1; then
    # 使用 jq 更新 JSON
    jq ".version = \"$VERSION\"" src-tauri/tauri.conf.json > src-tauri/tauri.conf.json.tmp && mv src-tauri/tauri.conf.json.tmp src-tauri/tauri.conf.json
else
    # 使用 sed 更新 JSON (备用方案)
    sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" src-tauri/tauri.conf.json
    rm -f src-tauri/tauri.conf.json.bak
fi

echo "✅ 版本号已成功更新到 $VERSION"
echo ""
echo "📋 下一步操作:"
echo "1. 检查更改: git diff"
echo "2. 提交更改: git add . && git commit -m 'chore: bump version to $VERSION'"
echo "3. 推送到远程: git push origin main"
echo "4. GitHub Actions 将自动创建 release 和构建安装包"
echo ""
echo "🚀 自动发布流程将在推送后启动!"
