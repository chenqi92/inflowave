#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Rust 构建目标管理脚本

.DESCRIPTION
    管理 Rust 构建目标的安装、卸载和查看，支持批量操作

.PARAMETER Action
    操作类型 (install, uninstall, list, check)

.PARAMETER Targets
    目标架构列表，支持预定义组合

.PARAMETER Platform
    平台过滤器 (windows, macos, linux, all)

.EXAMPLE
    .\manage-targets.ps1 -Action list
    .\manage-targets.ps1 -Action install -Targets "windows-all"
    .\manage-targets.ps1 -Action install -Platform windows
    .\manage-targets.ps1 -Action check -Targets "x86_64-pc-windows-msvc,aarch64-apple-darwin"

.NOTES
    支持预定义的目标组合，简化常用操作
#>

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("install", "uninstall", "list", "check")]
    [string]$Action,
    
    [Parameter(Mandatory = $false)]
    [string]$Targets = "",
    
    [Parameter(Mandatory = $false)]
    [ValidateSet("windows", "macos", "linux", "all")]
    [string]$Platform = "all"
)

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

# 预定义的目标组合
$TargetGroups = @{
    "windows-all" = @(
        "x86_64-pc-windows-msvc",
        "i686-pc-windows-msvc"
        # "aarch64-pc-windows-msvc"  # 暂时禁用，等待 ring 库支持改善
    )
    "macos-all" = @(
        "x86_64-apple-darwin",
        "aarch64-apple-darwin"
    )
    "linux-all" = @(
        "x86_64-unknown-linux-gnu",
        "aarch64-unknown-linux-gnu",
        "i686-unknown-linux-gnu"
    )
    "common" = @(
        "x86_64-pc-windows-msvc",
        "x86_64-apple-darwin",
        "aarch64-apple-darwin",
        "x86_64-unknown-linux-gnu"
    )
    "arm64-all" = @(
        # "aarch64-pc-windows-msvc",  # 暂时禁用
        "aarch64-apple-darwin",
        "aarch64-unknown-linux-gnu"
    )
    "x64-all" = @(
        "x86_64-pc-windows-msvc",
        "x86_64-apple-darwin",
        "x86_64-unknown-linux-gnu"
    )
}

# 目标信息映射
$TargetInfo = @{
    "x86_64-pc-windows-msvc" = @{
        Platform = "Windows"
        Architecture = "x64"
        Description = "Windows 64-bit (MSVC)"
        Tier = 1
    }
    "i686-pc-windows-msvc" = @{
        Platform = "Windows"
        Architecture = "x86"
        Description = "Windows 32-bit (MSVC)"
        Tier = 2
    }
    "aarch64-pc-windows-msvc" = @{
        Platform = "Windows"
        Architecture = "ARM64"
        Description = "Windows ARM64 (MSVC)"
        Tier = 2
    }
    "x86_64-apple-darwin" = @{
        Platform = "macOS"
        Architecture = "x64"
        Description = "macOS Intel 64-bit"
        Tier = 1
    }
    "aarch64-apple-darwin" = @{
        Platform = "macOS"
        Architecture = "ARM64"
        Description = "macOS Apple Silicon"
        Tier = 1
    }
    "x86_64-unknown-linux-gnu" = @{
        Platform = "Linux"
        Architecture = "x64"
        Description = "Linux 64-bit (GNU)"
        Tier = 1
    }
    "aarch64-unknown-linux-gnu" = @{
        Platform = "Linux"
        Architecture = "ARM64"
        Description = "Linux ARM64 (GNU)"
        Tier = 2
    }
    "i686-unknown-linux-gnu" = @{
        Platform = "Linux"
        Architecture = "x86"
        Description = "Linux 32-bit (GNU)"
        Tier = 2
    }
}

# 解析目标列表
function Resolve-Targets {
    param([string]$TargetString, [string]$PlatformFilter)
    
    $resolvedTargets = @()
    
    if ([string]::IsNullOrEmpty($TargetString)) {
        # 如果没有指定目标，根据平台过滤器返回默认目标
        switch ($PlatformFilter) {
            "windows" { $resolvedTargets = $TargetGroups["windows-all"] }
            "macos" { $resolvedTargets = $TargetGroups["macos-all"] }
            "linux" { $resolvedTargets = $TargetGroups["linux-all"] }
            "all" { $resolvedTargets = $TargetInfo.Keys }
        }
    } else {
        # 解析指定的目标
        $targetList = $TargetString -split ","
        foreach ($target in $targetList) {
            $target = $target.Trim()
            if ($TargetGroups.ContainsKey($target)) {
                # 预定义组合
                $resolvedTargets += $TargetGroups[$target]
            } elseif ($TargetInfo.ContainsKey($target)) {
                # 单个目标
                $resolvedTargets += $target
            } else {
                Write-Warning "未知目标: $target"
            }
        }
    }
    
    # 应用平台过滤器
    if ($PlatformFilter -ne "all") {
        $resolvedTargets = $resolvedTargets | Where-Object {
            $TargetInfo[$_].Platform.ToLower() -eq $PlatformFilter
        }
    }
    
    return $resolvedTargets | Sort-Object | Get-Unique
}

# 获取已安装的目标
function Get-InstalledTargets {
    try {
        $output = rustup target list --installed 2>$null
        if ($LASTEXITCODE -eq 0) {
            return $output -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
        }
    } catch {
        Write-Warning "无法获取已安装的目标列表"
    }
    return @()
}

# 获取所有可用目标
function Get-AvailableTargets {
    try {
        $output = rustup target list 2>$null
        if ($LASTEXITCODE -eq 0) {
            $targets = @()
            foreach ($line in ($output -split "`n")) {
                $line = $line.Trim()
                if ($line -match "^([^\s]+)") {
                    $targets += $matches[1]
                }
            }
            return $targets
        }
    } catch {
        Write-Warning "无法获取可用目标列表"
    }
    return @()
}

# 安装目标
function Install-Targets {
    param([array]$TargetList)
    
    Write-Step "安装 Rust 构建目标..."
    $installedTargets = Get-InstalledTargets
    $successCount = 0
    $skipCount = 0
    $failCount = 0
    
    foreach ($target in $TargetList) {
        if ($installedTargets -contains $target) {
            Write-Info "目标已安装: $target"
            $skipCount++
            continue
        }
        
        Write-Info "安装目标: $target"
        rustup target add $target
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "安装成功: $target"
            $successCount++
        } else {
            Write-Error "安装失败: $target"
            $failCount++
        }
    }
    
    Write-ColorOutput "`n📊 安装总结:" "Yellow"
    Write-Success "成功: $successCount"
    Write-Info "跳过: $skipCount"
    if ($failCount -gt 0) {
        Write-Error "失败: $failCount"
    }
}

# 卸载目标
function Uninstall-Targets {
    param([array]$TargetList)
    
    Write-Step "卸载 Rust 构建目标..."
    $installedTargets = Get-InstalledTargets
    $successCount = 0
    $skipCount = 0
    $failCount = 0
    
    foreach ($target in $TargetList) {
        if ($installedTargets -notcontains $target) {
            Write-Info "目标未安装: $target"
            $skipCount++
            continue
        }
        
        Write-Info "卸载目标: $target"
        rustup target remove $target
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "卸载成功: $target"
            $successCount++
        } else {
            Write-Error "卸载失败: $target"
            $failCount++
        }
    }
    
    Write-ColorOutput "`n📊 卸载总结:" "Yellow"
    Write-Success "成功: $successCount"
    Write-Info "跳过: $skipCount"
    if ($failCount -gt 0) {
        Write-Error "失败: $failCount"
    }
}

# 列出目标
function Show-Targets {
    param([array]$TargetList)
    
    Write-ColorOutput "`n📋 构建目标信息:" "Cyan"
    $installedTargets = Get-InstalledTargets
    
    # 按平台分组显示
    $groupedTargets = $TargetList | Group-Object { $TargetInfo[$_].Platform }
    
    foreach ($group in $groupedTargets) {
        Write-ColorOutput "`n🔹 $($group.Name):" "Yellow"
        
        foreach ($target in $group.Group) {
            $info = $TargetInfo[$target]
            $isInstalled = $installedTargets -contains $target
            $status = if ($isInstalled) { "✅ 已安装" } else { "❌ 未安装" }
            $tier = "Tier $($info.Tier)"
            
            Write-ColorOutput "  $target" "White"
            Write-ColorOutput "    架构: $($info.Architecture) | 描述: $($info.Description)" "Gray"
            Write-ColorOutput "    状态: $status | 支持等级: $tier" "Gray"
        }
    }
}

# 检查目标状态
function Check-Targets {
    param([array]$TargetList)
    
    Write-Step "检查构建目标状态..."
    $installedTargets = Get-InstalledTargets
    $installedCount = 0
    $missingCount = 0
    
    foreach ($target in $TargetList) {
        if ($installedTargets -contains $target) {
            Write-Success "已安装: $target"
            $installedCount++
        } else {
            Write-Warning "未安装: $target"
            $missingCount++
        }
    }
    
    Write-ColorOutput "`n📊 检查结果:" "Yellow"
    Write-Success "已安装: $installedCount"
    Write-Warning "未安装: $missingCount"
    
    if ($missingCount -gt 0) {
        Write-Info "要安装缺失的目标，请运行:"
        Write-Info "  .\manage-targets.ps1 -Action install -Targets `"$($TargetList -join ',')`""
    }
}

# 显示帮助信息
function Show-Help {
    Write-ColorOutput @"

🎯 Rust 构建目标管理工具
========================

预定义目标组合:
  windows-all  - 所有 Windows 目标
  macos-all    - 所有 macOS 目标  
  linux-all    - 所有 Linux 目标
  common       - 常用目标 (x64 + macOS)
  arm64-all    - 所有 ARM64 目标
  x64-all      - 所有 x64 目标

使用示例:
  .\manage-targets.ps1 -Action list
  .\manage-targets.ps1 -Action install -Targets "common"
  .\manage-targets.ps1 -Action install -Platform windows
  .\manage-targets.ps1 -Action check -Targets "x86_64-pc-windows-msvc"

"@ "Cyan"
}

# 主函数
function Start-TargetManagement {
    Write-ColorOutput @"

🎯 Rust 构建目标管理
===================
操作: $Action
平台: $Platform
目标: $Targets

"@ "Cyan"

    # 检查 rustup
    try {
        rustup --version | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "rustup not available"
        }
    } catch {
        Write-Error "rustup 未安装或不在 PATH 中"
        exit 1
    }
    
    # 解析目标列表
    $targetList = Resolve-Targets -TargetString $Targets -PlatformFilter $Platform
    
    if ($targetList.Count -eq 0 -and $Action -ne "list") {
        Write-Warning "没有找到匹配的目标"
        Show-Help
        exit 1
    }
    
    # 执行操作
    switch ($Action) {
        "install" {
            Install-Targets -TargetList $targetList
        }
        "uninstall" {
            Uninstall-Targets -TargetList $targetList
        }
        "list" {
            if ($targetList.Count -eq 0) {
                $targetList = $TargetInfo.Keys
            }
            Show-Targets -TargetList $targetList
        }
        "check" {
            Check-Targets -TargetList $targetList
        }
    }
    
    Write-Success "操作完成！"
}

# 执行主函数
try {
    Start-TargetManagement
} catch {
    Write-Error "目标管理过程中发生错误: $($_.Exception.Message)"
    exit 1
}
