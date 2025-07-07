#!/bin/bash

# macOS/Linux 构建脚本
set -e

TARGET="all"
RELEASE=false

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --target)
            TARGET="$2"
            shift 2
            ;;
        --release)
            RELEASE=true
            shift
            ;;
        *)
            echo "未知参数: $1"
            exit 1
            ;;
    esac
done

echo "🚀 开始构建 InfluxDB GUI Manager"

# 检查环境
echo "📋 检查构建环境..."

# 检查 Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js: $NODE_VERSION"
else
    echo "❌ Node.js 未安装或不在 PATH 中"
    exit 1
fi

# 检查 Rust
if command -v rustc &> /dev/null; then
    RUST_VERSION=$(rustc --version)
    echo "✅ Rust: $RUST_VERSION"
else
    echo "❌ Rust 未安装或不在 PATH 中"
    exit 1
fi

# 检查 Tauri CLI
if command -v tauri &> /dev/null; then
    TAURI_VERSION=$(tauri --version)
    echo "✅ Tauri CLI: $TAURI_VERSION"
else
    echo "⚠️  Tauri CLI 未安装，正在安装..."
    npm install -g @tauri-apps/cli
fi

# 检查系统依赖 (Linux)
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 检查 Linux 系统依赖..."
    
    # 检查必要的系统库
    MISSING_DEPS=()
    
    if ! pkg-config --exists gtk+-3.0; then
        MISSING_DEPS+=("libgtk-3-dev")
    fi
    
    if ! pkg-config --exists webkit2gtk-4.0; then
        MISSING_DEPS+=("libwebkit2gtk-4.0-dev")
    fi
    
    if ! pkg-config --exists appindicator3-0.1; then
        MISSING_DEPS+=("libappindicator3-dev")
    fi
    
    if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
        echo "❌ 缺少系统依赖: ${MISSING_DEPS[*]}"
        echo "请运行以下命令安装依赖:"
        echo "sudo apt-get install ${MISSING_DEPS[*]}"
        exit 1
    fi
    
    echo "✅ Linux 系统依赖检查通过"
fi

# 安装依赖
echo "📦 安装前端依赖..."
npm ci

# 构建应用
echo "🔨 开始构建应用..."

BUILD_ARGS=""
if [ "$RELEASE" = true ]; then
    BUILD_ARGS="$BUILD_ARGS --release"
fi

if [ "$TARGET" != "all" ]; then
    BUILD_ARGS="$BUILD_ARGS --target $TARGET"
fi

BUILD_COMMAND="tauri build $BUILD_ARGS"
echo "执行命令: $BUILD_COMMAND"

eval $BUILD_COMMAND

echo "✅ 构建成功完成！"
echo "📁 构建产物位置: src-tauri/target/release/bundle/"

# 列出构建产物
BUNDLE_PATH="src-tauri/target/release/bundle"
if [ -d "$BUNDLE_PATH" ]; then
    echo "📦 构建产物:"
    find "$BUNDLE_PATH" -type f \( -name "*.msi" -o -name "*.exe" -o -name "*.dmg" -o -name "*.deb" -o -name "*.rpm" -o -name "*.AppImage" \) -exec ls -lh {} \; | awk '{print "  - " $9 " (" $5 ")"}'
fi
