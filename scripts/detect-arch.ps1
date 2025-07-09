#!/usr/bin/env pwsh
<#
.SYNOPSIS
    架构检测和优化脚本

.DESCRIPTION
    检测当前系统架构并提供相应的构建优化建议和配置

.EXAMPLE
    .\detect-arch.ps1
    .\detect-arch.ps1 -Verbose

.NOTES
    支持 Windows、macOS 和 Linux 系统的架构检测
#>

param(
    [Parameter(Mandatory = $false)]
    [switch]$Verbose
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

# 检测操作系统
function Get-OperatingSystem {
    if ($IsWindows -or $env:OS -eq "Windows_NT") {
        return "Windows"
    } elseif ($IsMacOS -or (uname -s) -eq "Darwin") {
        return "macOS"
    } elseif ($IsLinux -or (uname -s) -eq "Linux") {
        return "Linux"
    } else {
        return "Unknown"
    }
}

# 检测 CPU 架构
function Get-CpuArchitecture {
    $os = Get-OperatingSystem
    
    switch ($os) {
        "Windows" {
            $arch = $env:PROCESSOR_ARCHITECTURE
            $wow64Arch = $env:PROCESSOR_ARCHITEW6432
            
            if ($wow64Arch) {
                $arch = $wow64Arch
            }
            
            switch ($arch) {
                "AMD64" { return "x64" }
                "x86" { return "x86" }
                "ARM64" { return "arm64" }
                "ARM" { return "arm" }
                default { return "unknown" }
            }
        }
        "macOS" {
            $arch = uname -m
            switch ($arch) {
                "x86_64" { return "x64" }
                "arm64" { return "arm64" }
                default { return "unknown" }
            }
        }
        "Linux" {
            $arch = uname -m
            switch ($arch) {
                "x86_64" { return "x64" }
                "aarch64" { return "arm64" }
                "armv7l" { return "arm" }
                "i386" { return "x86" }
                "i686" { return "x86" }
                default { return "unknown" }
            }
        }
        default {
            return "unknown"
        }
    }
}

# 获取 Rust 目标三元组
function Get-RustTarget {
    param(
        [string]$OS,
        [string]$Arch
    )
    
    $targetMap = @{
        "Windows" = @{
            "x64" = "x86_64-pc-windows-msvc"
            "x86" = "i686-pc-windows-msvc"
            "arm64" = "aarch64-pc-windows-msvc"
        }
        "macOS" = @{
            "x64" = "x86_64-apple-darwin"
            "arm64" = "aarch64-apple-darwin"
        }
        "Linux" = @{
            "x64" = "x86_64-unknown-linux-gnu"
            "arm64" = "aarch64-unknown-linux-gnu"
            "x86" = "i686-unknown-linux-gnu"
        }
    }
    
    if ($targetMap.ContainsKey($OS) -and $targetMap[$OS].ContainsKey($Arch)) {
        return $targetMap[$OS][$Arch]
    } else {
        return "unknown"
    }
}

# 检测可用的 Rust 目标
function Get-InstalledRustTargets {
    try {
        $targets = rustup target list --installed 2>$null
        if ($LASTEXITCODE -eq 0) {
            return $targets -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
        }
    } catch {
        Write-Warning "无法获取已安装的 Rust 目标"
    }
    return @()
}

# 获取系统性能信息
function Get-SystemPerformance {
    $os = Get-OperatingSystem
    $info = @{}
    
    try {
        switch ($os) {
            "Windows" {
                $cpu = Get-WmiObject -Class Win32_Processor | Select-Object -First 1
                $memory = Get-WmiObject -Class Win32_ComputerSystem
                
                $info.CpuCores = $cpu.NumberOfCores
                $info.CpuThreads = $cpu.NumberOfLogicalProcessors
                $info.CpuName = $cpu.Name.Trim()
                $info.MemoryGB = [math]::Round($memory.TotalPhysicalMemory / 1GB, 2)
            }
            "macOS" {
                $info.CpuCores = sysctl -n hw.physicalcpu
                $info.CpuThreads = sysctl -n hw.logicalcpu
                $info.CpuName = sysctl -n machdep.cpu.brand_string
                $info.MemoryGB = [math]::Round((sysctl -n hw.memsize) / 1GB, 2)
            }
            "Linux" {
                $cpuInfo = Get-Content /proc/cpuinfo
                $memInfo = Get-Content /proc/meminfo
                
                $info.CpuCores = ($cpuInfo | Where-Object { $_ -match "^processor" }).Count
                $info.CpuName = ($cpuInfo | Where-Object { $_ -match "^model name" } | Select-Object -First 1) -replace "model name\s*:\s*", ""
                $memTotal = ($memInfo | Where-Object { $_ -match "^MemTotal" }) -replace "MemTotal:\s*(\d+)\s*kB", '$1'
                $info.MemoryGB = [math]::Round([int]$memTotal / 1024 / 1024, 2)
            }
        }
    } catch {
        Write-Warning "无法获取完整的系统性能信息"
    }
    
    return $info
}

# 生成构建建议
function Get-BuildRecommendations {
    param(
        [string]$OS,
        [string]$Arch,
        [hashtable]$SystemInfo
    )
    
    $recommendations = @()
    
    # 基于架构的建议
    switch ($Arch) {
        "arm64" {
            $recommendations += "🚀 检测到 ARM64 架构，建议启用原生构建以获得最佳性能"
            $recommendations += "💡 如果需要兼容性，可以同时构建 x64 版本"
        }
        "x64" {
            $recommendations += "✅ x64 架构具有最佳的工具链支持和兼容性"
            $recommendations += "🔧 可以考虑交叉编译其他架构版本"
        }
        "x86" {
            $recommendations += "⚠️  x86 架构支持有限，建议优先使用 x64"
            $recommendations += "📦 仅在需要兼容旧系统时构建 x86 版本"
        }
    }
    
    # 基于系统性能的建议
    if ($SystemInfo.CpuCores) {
        if ($SystemInfo.CpuCores -ge 8) {
            $recommendations += "⚡ 多核 CPU 检测到，建议启用并行构建: CARGO_BUILD_JOBS=$($SystemInfo.CpuCores)"
        } elseif ($SystemInfo.CpuCores -le 2) {
            $recommendations += "🐌 CPU 核心较少，建议限制并行构建以避免系统过载"
        }
    }
    
    if ($SystemInfo.MemoryGB) {
        if ($SystemInfo.MemoryGB -lt 4) {
            $recommendations += "💾 内存较少，建议启用增量构建和缓存优化"
        } elseif ($SystemInfo.MemoryGB -ge 16) {
            $recommendations += "🚀 内存充足，可以启用更激进的编译优化"
        }
    }
    
    # 基于操作系统的建议
    switch ($OS) {
        "Windows" {
            $recommendations += "🪟 Windows 平台建议使用 MSVC 工具链以获得最佳性能"
            $recommendations += "🔧 可以考虑启用 LTO (Link Time Optimization)"
        }
        "macOS" {
            $recommendations += "🍎 macOS 平台建议同时构建 Intel 和 Apple Silicon 版本"
            $recommendations += "📦 使用 universal binary 可以提供最佳用户体验"
        }
        "Linux" {
            $recommendations += "🐧 Linux 平台具有最佳的交叉编译支持"
            $recommendations += "📦 建议构建多种包格式 (deb, rpm, AppImage)"
        }
    }
    
    return $recommendations
}

# 主函数
function Show-ArchitectureInfo {
    Write-ColorOutput @"

🔍 系统架构检测
================

"@ "Cyan"

    # 检测基本信息
    $os = Get-OperatingSystem
    $arch = Get-CpuArchitecture
    $rustTarget = Get-RustTarget -OS $os -Arch $arch
    $systemInfo = Get-SystemPerformance
    
    # 显示基本信息
    Write-Info "操作系统: $os"
    Write-Info "CPU 架构: $arch"
    Write-Info "Rust 目标: $rustTarget"
    
    if ($systemInfo.CpuName) {
        Write-Info "CPU 型号: $($systemInfo.CpuName)"
    }
    if ($systemInfo.CpuCores) {
        Write-Info "CPU 核心: $($systemInfo.CpuCores) 核心 / $($systemInfo.CpuThreads) 线程"
    }
    if ($systemInfo.MemoryGB) {
        Write-Info "系统内存: $($systemInfo.MemoryGB) GB"
    }
    
    # 检测已安装的 Rust 目标
    if ($Verbose) {
        Write-ColorOutput "`n📦 已安装的 Rust 目标:" "Yellow"
        $installedTargets = Get-InstalledRustTargets
        if ($installedTargets.Count -gt 0) {
            foreach ($target in $installedTargets) {
                Write-Info "  - $target"
            }
        } else {
            Write-Warning "无法获取已安装的 Rust 目标信息"
        }
    }
    
    # 显示构建建议
    Write-ColorOutput "`n💡 构建建议:" "Green"
    $recommendations = Get-BuildRecommendations -OS $os -Arch $arch -SystemInfo $systemInfo
    foreach ($rec in $recommendations) {
        Write-ColorOutput "  $rec" "White"
    }
    
    # 显示推荐的构建命令
    Write-ColorOutput "`n🚀 推荐构建命令:" "Magenta"
    Write-Info "  当前架构: npm run tauri:build -- --target $rustTarget"
    Write-Info "  多架构构建: .\scripts\build-multiarch.ps1 -Platform $($os.ToLower()) -Architecture all"
    Write-Info "  全平台构建: .\scripts\build-multiarch.ps1 -Platform all -Architecture all"
    
    Write-ColorOutput "`n✨ 检测完成！" "Green"
}

# 执行主函数
try {
    Show-ArchitectureInfo
} catch {
    Write-Error "架构检测过程中发生错误: $($_.Exception.Message)"
    exit 1
}
