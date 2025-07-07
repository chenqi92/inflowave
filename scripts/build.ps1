# Windows 构建脚本
param(
    [string]$Target = "all",
    [switch]$Release = $false
)

Write-Host "🚀 开始构建 InfluxDB GUI Manager" -ForegroundColor Green

# 检查环境
Write-Host "📋 检查构建环境..." -ForegroundColor Yellow

# 检查 Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js 未安装或不在 PATH 中" -ForegroundColor Red
    exit 1
}

# 检查 Rust
try {
    $rustVersion = rustc --version
    Write-Host "✅ Rust: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Rust 未安装或不在 PATH 中" -ForegroundColor Red
    exit 1
}

# 检查 Tauri CLI
try {
    $tauriVersion = tauri --version
    Write-Host "✅ Tauri CLI: $tauriVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Tauri CLI 未安装，正在安装..." -ForegroundColor Yellow
    npm install -g @tauri-apps/cli
}

# 安装依赖
Write-Host "📦 安装前端依赖..." -ForegroundColor Yellow
npm ci

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 前端依赖安装失败" -ForegroundColor Red
    exit 1
}

# 构建应用
Write-Host "🔨 开始构建应用..." -ForegroundColor Yellow

$buildArgs = @()
if ($Release) {
    $buildArgs += "--release"
}

if ($Target -ne "all") {
    $buildArgs += "--target", $Target
}

$buildCommand = "tauri build " + ($buildArgs -join " ")
Write-Host "执行命令: $buildCommand" -ForegroundColor Cyan

Invoke-Expression $buildCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 构建成功完成！" -ForegroundColor Green
    Write-Host "📁 构建产物位置: src-tauri/target/release/bundle/" -ForegroundColor Cyan
    
    # 列出构建产物
    $bundlePath = "src-tauri/target/release/bundle"
    if (Test-Path $bundlePath) {
        Write-Host "📦 构建产物:" -ForegroundColor Yellow
        Get-ChildItem $bundlePath -Recurse -File | Where-Object { 
            $_.Extension -in @('.msi', '.exe', '.dmg', '.deb', '.rpm', '.AppImage') 
        } | ForEach-Object {
            $size = [math]::Round($_.Length / 1MB, 2)
            Write-Host "  - $($_.Name) ($size MB)" -ForegroundColor White
        }
    }
} else {
    Write-Host "❌ 构建失败" -ForegroundColor Red
    exit 1
}
