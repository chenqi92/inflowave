# Windows 问题诊断脚本
param(
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Continue"

Write-Host "InfloWave Windows 问题诊断工具" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# 1. 系统信息
Write-Host "`n1. 系统信息检查" -ForegroundColor Yellow
Write-Host "操作系统: $((Get-WmiObject Win32_OperatingSystem).Caption)"
Write-Host "架构: $env:PROCESSOR_ARCHITECTURE"
Write-Host "版本: $((Get-WmiObject Win32_OperatingSystem).Version)"
Write-Host ".NET Framework: $((Get-ItemProperty 'HKLM:SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full\' -Name Release -ErrorAction SilentlyContinue).Release)"

# 2. WebView2 检查
Write-Host "`n2. WebView2 运行时检查" -ForegroundColor Yellow
$webview2Paths = @(
    "${env:ProgramFiles(x86)}\Microsoft\EdgeWebView\Application",
    "$env:ProgramFiles\Microsoft\EdgeWebView\Application",
    "$env:LOCALAPPDATA\Microsoft\EdgeWebView\Application"
)

$webview2Found = $false
foreach ($path in $webview2Paths) {
    if (Test-Path $path) {
        $versions = Get-ChildItem $path -Directory | Where-Object { $_.Name -match '^\d+\.\d+\.\d+\.\d+$' }
        if ($versions) {
            Write-Host "✅ WebView2 找到: $path" -ForegroundColor Green
            $latestVersion = $versions | Sort-Object { [Version]$_.Name } | Select-Object -Last 1
            Write-Host "   最新版本: $($latestVersion.Name)" -ForegroundColor Green
            $webview2Found = $true
        }
    }
}

if (-not $webview2Found) {
    Write-Host "❌ WebView2 运行时未找到" -ForegroundColor Red
    Write-Host "   请从以下地址下载安装: https://developer.microsoft.com/en-us/microsoft-edge/webview2/" -ForegroundColor Yellow
}

# 3. InfloWave 安装检查
Write-Host "`n3. InfloWave 安装检查" -ForegroundColor Yellow
$installPaths = @(
    "${env:ProgramFiles}\InfloWave",
    "${env:ProgramFiles(x86)}\InfloWave",
    "$env:LOCALAPPDATA\Programs\InfloWave"
)

$infloWaveFound = $false
foreach ($path in $installPaths) {
    if (Test-Path "$path\InfloWave.exe") {
        Write-Host "✅ InfloWave 找到: $path" -ForegroundColor Green
        $version = (Get-ItemProperty "$path\InfloWave.exe").VersionInfo.FileVersion
        Write-Host "   版本: $version" -ForegroundColor Green
        $infloWaveFound = $true
        
        # 检查文件完整性
        $fileSize = (Get-Item "$path\InfloWave.exe").Length
        Write-Host "   文件大小: $([math]::Round($fileSize / 1MB, 2)) MB" -ForegroundColor Green
        
        # 检查依赖文件
        $requiredFiles = @("InfloWave.exe")
        foreach ($file in $requiredFiles) {
            if (Test-Path "$path\$file") {
                Write-Host "   ✅ $file 存在" -ForegroundColor Green
            } else {
                Write-Host "   ❌ $file 缺失" -ForegroundColor Red
            }
        }
    }
}

if (-not $infloWaveFound) {
    Write-Host "❌ InfloWave 未找到" -ForegroundColor Red
}

# 4. 事件日志检查
Write-Host "`n4. 系统事件日志检查" -ForegroundColor Yellow
try {
    $events = Get-WinEvent -FilterHashtable @{LogName='Application'; ID=1000,1001; StartTime=(Get-Date).AddDays(-7)} -ErrorAction SilentlyContinue | 
              Where-Object { $_.Message -like "*InfloWave*" } | 
              Select-Object -First 5

    if ($events) {
        Write-Host "最近的 InfloWave 相关错误:" -ForegroundColor Red
        foreach ($event in $events) {
            Write-Host "  时间: $($event.TimeCreated)" -ForegroundColor Yellow
            Write-Host "  ID: $($event.Id)" -ForegroundColor Yellow
            Write-Host "  消息: $($event.Message.Split("`n")[0])" -ForegroundColor Red
            Write-Host ""
        }
    } else {
        Write-Host "✅ 未找到最近的 InfloWave 错误事件" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ 无法读取事件日志: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 5. 崩溃日志检查
Write-Host "`n5. 崩溃日志检查" -ForegroundColor Yellow
$crashLogPath = "$env:USERPROFILE\.inflowave_crash.log"
if (Test-Path $crashLogPath) {
    Write-Host "✅ 找到崩溃日志: $crashLogPath" -ForegroundColor Green
    $crashContent = Get-Content $crashLogPath -Tail 20
    Write-Host "最近的崩溃记录:" -ForegroundColor Yellow
    $crashContent | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
} else {
    Write-Host "✅ 未找到崩溃日志文件" -ForegroundColor Green
}

# 6. 网络连接检查
Write-Host "`n6. 网络连接检查" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://github.com/chenqi92/inflowave" -TimeoutSec 5 -UseBasicParsing
    Write-Host "✅ GitHub 连接正常" -ForegroundColor Green
} catch {
    Write-Host "❌ GitHub 连接失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. 建议和解决方案
Write-Host "`n7. 建议和解决方案" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Cyan

if (-not $webview2Found) {
    Write-Host "🔧 安装 WebView2 运行时:" -ForegroundColor Yellow
    Write-Host "   1. 访问: https://developer.microsoft.com/en-us/microsoft-edge/webview2/" -ForegroundColor White
    Write-Host "   2. 下载 'Evergreen Standalone Installer'" -ForegroundColor White
    Write-Host "   3. 运行安装程序" -ForegroundColor White
}

if ($infloWaveFound) {
    Write-Host "🔧 如果应用仍然崩溃，请尝试:" -ForegroundColor Yellow
    Write-Host "   1. 以管理员身份运行 InfloWave" -ForegroundColor White
    Write-Host "   2. 检查防病毒软件是否阻止了应用" -ForegroundColor White
    Write-Host "   3. 重新安装 InfloWave" -ForegroundColor White
    Write-Host "   4. 更新 Windows 系统" -ForegroundColor White
}

Write-Host "`n🐛 如果问题仍然存在，请访问:" -ForegroundColor Yellow
Write-Host "   https://github.com/chenqi92/inflowave/issues" -ForegroundColor White
Write-Host "   并提供此诊断报告的输出" -ForegroundColor White

Write-Host "`n诊断完成!" -ForegroundColor Green
