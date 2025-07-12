#!/bin/bash

echo "🚀 启动 Tauri 开发环境测试..."
echo "======================================="

# 检查并停止现有进程
echo "🔍 检查现有进程..."
pkill -f "tauri dev" || echo "没有发现运行中的 tauri dev 进程"
pkill -f "vite" || echo "没有发现运行中的 vite 进程"

echo ""
echo "🔧 重新构建项目..."
npm run build

echo ""
echo "🚀 启动 Tauri 开发环境..."
echo "✨ 修复内容："
echo "  - 移除了模拟数据提示"
echo "  - 修复了查询执行按钮无响应问题"
echo "  - 添加了数据库选择器"
echo "  - 修复了查询结果显示"
echo ""

# 启动 tauri dev
npm run tauri dev