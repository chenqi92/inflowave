# 版本更新脚本
# 用法: .\scripts\update-version.ps1 -Version "1.0.1"

param(
    [Parameter(Mandatory=$true)]
    [string]$Version
)

Write-Host "🔄 更新版本号到 $Version..." -ForegroundColor Cyan

# 验证版本号格式 (语义化版本)
if ($Version -notmatch '^\d+\.\d+\.\d+(-[a-zA-Z0-9\-\.]+)?(\+[a-zA-Z0-9\-\.]+)?$') {
    Write-Host "❌ 错误: 版本号格式无效。请使用语义化版本格式 (例如: 1.0.0, 1.0.0-beta.1)" -ForegroundColor Red
    exit 1
}

try {
    # 更新 VERSION 文件
    Write-Host "📝 更新 VERSION 文件..." -ForegroundColor Yellow
    Set-Content -Path "VERSION" -Value $Version -NoNewline
    
    # 更新 package.json
    Write-Host "📝 更新 package.json..." -ForegroundColor Yellow
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    $packageJson.version = $Version
    $packageJson | ConvertTo-Json -Depth 100 | Set-Content "package.json"
    
    # 更新 src-tauri/tauri.conf.json
    Write-Host "📝 更新 tauri.conf.json..." -ForegroundColor Yellow
    $tauriConfig = Get-Content "src-tauri/tauri.conf.json" -Raw | ConvertFrom-Json
    $tauriConfig.version = $Version
    $tauriConfig | ConvertTo-Json -Depth 100 | Set-Content "src-tauri/tauri.conf.json"
    
    Write-Host "✅ 版本号已成功更新到 $Version" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 下一步操作:" -ForegroundColor Cyan
    Write-Host "1. 检查更改: git diff" -ForegroundColor White
    Write-Host "2. 提交更改: git add . && git commit -m 'chore: bump version to $Version'" -ForegroundColor White
    Write-Host "3. 推送到远程: git push origin main" -ForegroundColor White
    Write-Host "4. GitHub Actions 将自动创建 release 和构建安装包" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 自动发布流程将在推送后启动!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ 更新版本号时发生错误: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
