# IoTDB 功能改进编译测试脚本

Write-Host "🚀 开始编译测试 IoTDB 功能改进..." -ForegroundColor Green

# 设置工作目录
Set-Location "D:\workspace\influx-gui\src-tauri"

Write-Host "📁 当前工作目录: $(Get-Location)" -ForegroundColor Blue

# 清理之前的构建
Write-Host "🧹 清理之前的构建..." -ForegroundColor Yellow
cargo clean

# 检查语法错误
Write-Host "🔍 检查语法错误..." -ForegroundColor Yellow
$checkResult = cargo check 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 语法检查通过!" -ForegroundColor Green
} else {
    Write-Host "❌ 语法检查失败:" -ForegroundColor Red
    Write-Host $checkResult -ForegroundColor Red
    exit 1
}

# 尝试编译
Write-Host "🔨 开始编译..." -ForegroundColor Yellow
$buildResult = cargo build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 编译成功!" -ForegroundColor Green
    Write-Host "🎉 IoTDB 功能改进已成功集成!" -ForegroundColor Green
} else {
    Write-Host "❌ 编译失败:" -ForegroundColor Red
    Write-Host $buildResult -ForegroundColor Red
    
    Write-Host "🔧 尝试修复常见问题..." -ForegroundColor Yellow
    
    # 检查是否是依赖问题
    if ($buildResult -match "could not find") {
        Write-Host "📦 更新依赖..." -ForegroundColor Yellow
        cargo update
        
        Write-Host "🔨 重新编译..." -ForegroundColor Yellow
        $retryResult = cargo build 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ 修复后编译成功!" -ForegroundColor Green
        } else {
            Write-Host "❌ 修复后仍然失败:" -ForegroundColor Red
            Write-Host $retryResult -ForegroundColor Red
        }
    }
}

Write-Host "📋 编译测试完成!" -ForegroundColor Blue
