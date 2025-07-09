#!/usr/bin/env pwsh
<#
.SYNOPSIS
    浏览器模式测试脚本

.DESCRIPTION
    启动开发服务器并在浏览器中测试应用

.EXAMPLE
    .\test-browser-mode.ps1

.NOTES
    用于测试浏览器兼容性修复
#>

# 颜色输出函数
function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success { param([string]$Message) Write-ColorOutput "✅ $Message" "Green" }
function Write-Info { param([string]$Message) Write-ColorOutput "ℹ️  $Message" "Cyan" }
function Write-Warning { param([string]$Message) Write-ColorOutput "⚠️  $Message" "Yellow" }
function Write-Error { param([string]$Message) Write-ColorOutput "❌ $Message" "Red" }
function Write-Step { param([string]$Message) Write-ColorOutput "🔄 $Message" "Magenta" }

Write-ColorOutput @"

🌐 浏览器模式测试
=================

"@ "Cyan"

# 检查环境
Write-Step "检查开发环境..."

if (-not (Test-Path "package.json")) {
    Write-Error "未找到 package.json，请在项目根目录运行此脚本"
    exit 1
}

if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
    Write-Error "未找到 npm，请先安装 Node.js"
    exit 1
}

Write-Success "开发环境检查通过"

# 安装依赖
Write-Step "检查并安装依赖..."
if (-not (Test-Path "node_modules")) {
    Write-Info "安装前端依赖..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "依赖安装失败"
        exit 1
    }
} else {
    Write-Info "依赖已存在，跳过安装"
}

Write-Success "依赖检查完成"

# 启动开发服务器
Write-Step "启动开发服务器..."
Write-Info "正在启动 Vite 开发服务器..."
Write-Info "服务器启动后将自动在浏览器中打开应用"

Write-ColorOutput @"

📋 测试检查清单:
================
□ 页面是否正常加载（无白屏）
□ 是否显示浏览器模式提示
□ React Router 错误是否消失
□ 控制台是否无严重错误
□ 菜单导航是否正常工作
□ 模拟数据是否正确显示

"@ "Yellow"

Write-Info "按 Ctrl+C 停止服务器"
Write-Info "启动中..."

# 启动开发服务器
try {
    npm run dev
} catch {
    Write-Error "开发服务器启动失败: $($_.Exception.Message)"
    exit 1
}
