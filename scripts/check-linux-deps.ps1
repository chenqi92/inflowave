#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Linux 依赖检查脚本 (PowerShell 版本)

.DESCRIPTION
    检查 Linux 系统上 Tauri 应用所需的依赖是否已安装

.PARAMETER ShowDetails
    显示详细的依赖信息

.EXAMPLE
    .\check-linux-deps.ps1
    .\check-linux-deps.ps1 -ShowDetails

.NOTES
    此脚本主要用于开发环境中的依赖检查
#>

param(
    [Parameter(Mandatory = $false)]
    [switch]$ShowDetails
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

# 检查是否在 Linux 环境中
function Test-LinuxEnvironment {
    if ($IsLinux) {
        return $true
    } elseif ($env:WSL_DISTRO_NAME) {
        Write-Info "检测到 WSL 环境: $env:WSL_DISTRO_NAME"
        return $true
    } else {
        Write-Warning "此脚本需要在 Linux 环境中运行"
        Write-Info "如果您在 Windows 上开发，请考虑使用 WSL 或 Docker"
        return $false
    }
}

# 检测 Linux 发行版
function Get-LinuxDistribution {
    if (Test-Path "/etc/os-release") {
        $osRelease = Get-Content "/etc/os-release" | ConvertFrom-StringData
        return @{
            ID = $osRelease.ID
            Version = $osRelease.VERSION_ID
            Name = $osRelease.PRETTY_NAME
        }
    } else {
        return @{
            ID = "unknown"
            Version = "unknown"
            Name = "Unknown Linux"
        }
    }
}

# 检查包是否安装 (Debian/Ubuntu)
function Test-DebianPackage {
    param([string]$PackageName)
    
    try {
        $result = dpkg -l $PackageName 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

# 检查包是否安装 (CentOS/RHEL/Fedora)
function Test-RpmPackage {
    param([string]$PackageName)
    
    try {
        rpm -q $PackageName 2>$null | Out-Null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

# 检查 pkg-config 包
function Test-PkgConfigPackage {
    param([string]$PackageName)
    
    try {
        pkg-config --exists $PackageName 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

# 获取包版本
function Get-PkgConfigVersion {
    param([string]$PackageName)
    
    try {
        $version = pkg-config --modversion $PackageName 2>$null
        if ($LASTEXITCODE -eq 0) {
            return $version.Trim()
        }
    } catch {
        return "未知"
    }
    return "未知"
}

# 检查核心依赖
function Test-CoreDependencies {
    Write-Info "检查核心依赖..."
    
    $dependencies = @(
        @{ Name = "GTK3"; PkgConfig = "gtk+-3.0"; Description = "GTK 3.0 图形工具包" },
        @{ Name = "WebKit2GTK"; PkgConfig = "webkit2gtk-4.1"; Description = "WebKit2GTK 4.1 Web 引擎" },
        @{ Name = "LibSoup"; PkgConfig = "libsoup-3.0"; Description = "HTTP 客户端库" },
        @{ Name = "JavaScriptCore"; PkgConfig = "javascriptcoregtk-4.1"; Description = "JavaScript 引擎" },
        @{ Name = "LibRSVG"; PkgConfig = "librsvg-2.0"; Description = "SVG 渲染库" }
    )
    
    $results = @()
    
    foreach ($dep in $dependencies) {
        $isAvailable = Test-PkgConfigPackage $dep.PkgConfig
        $version = if ($isAvailable) { Get-PkgConfigVersion $dep.PkgConfig } else { "未安装" }
        
        $result = @{
            Name = $dep.Name
            PkgConfig = $dep.PkgConfig
            Description = $dep.Description
            Available = $isAvailable
            Version = $version
        }
        
        $results += $result
        
        if ($isAvailable) {
            Write-Success "$($dep.Name): $version"
        } else {
            Write-Error "$($dep.Name): 未安装"
        }
    }
    
    return $results
}

# 检查构建工具
function Test-BuildTools {
    Write-Info "检查构建工具..."
    
    $tools = @(
        @{ Name = "GCC"; Command = "gcc"; Flag = "--version" },
        @{ Name = "G++"; Command = "g++"; Flag = "--version" },
        @{ Name = "Make"; Command = "make"; Flag = "--version" },
        @{ Name = "pkg-config"; Command = "pkg-config"; Flag = "--version" },
        @{ Name = "Patchelf"; Command = "patchelf"; Flag = "--version" }
    )
    
    $results = @()
    
    foreach ($tool in $tools) {
        try {
            $output = & $tool.Command $tool.Flag 2>$null
            $available = $LASTEXITCODE -eq 0
            $version = if ($available) { ($output | Select-Object -First 1).Split()[2] } else { "未安装" }
        } catch {
            $available = $false
            $version = "未安装"
        }
        
        $result = @{
            Name = $tool.Name
            Command = $tool.Command
            Available = $available
            Version = $version
        }
        
        $results += $result
        
        if ($available) {
            Write-Success "$($tool.Name): $version"
        } else {
            Write-Error "$($tool.Name): 未安装"
        }
    }
    
    return $results
}

# 生成安装建议
function Get-InstallationSuggestions {
    param([object]$DistroInfo, [array]$MissingDeps)
    
    if ($MissingDeps.Count -eq 0) {
        return @()
    }
    
    $suggestions = @()
    
    switch ($DistroInfo.ID) {
        { $_ -in @("ubuntu", "debian") } {
            $suggestions += "# Ubuntu/Debian 安装命令:"
            $suggestions += "sudo apt-get update"
            $suggestions += "sudo apt-get install -y \"
            $suggestions += "  libgtk-3-dev \"
            $suggestions += "  libwebkit2gtk-4.1-dev \"
            $suggestions += "  librsvg2-dev \"
            $suggestions += "  libsoup-3.0-dev \"
            $suggestions += "  libjavascriptcoregtk-4.1-dev \"
            $suggestions += "  build-essential \"
            $suggestions += "  pkg-config \"
            $suggestions += "  patchelf"
        }
        { $_ -in @("centos", "rhel", "fedora") } {
            $pkgMgr = if ($DistroInfo.ID -eq "fedora") { "dnf" } else { "yum" }
            $suggestions += "# CentOS/RHEL/Fedora 安装命令:"
            $suggestions += "sudo $pkgMgr install -y \"
            $suggestions += "  gtk3-devel \"
            $suggestions += "  webkit2gtk4.1-devel \"
            $suggestions += "  librsvg2-devel \"
            $suggestions += "  libsoup-devel \"
            $suggestions += "  gcc gcc-c++ \"
            $suggestions += "  make \"
            $suggestions += "  pkgconfig"
        }
        default {
            $suggestions += "# 请根据您的发行版安装相应的开发包"
            $suggestions += "# 需要的包: GTK3, WebKit2GTK, LibRSVG, LibSoup, 构建工具"
        }
    }
    
    return $suggestions
}

# 主检查函数
function Start-DependencyCheck {
    Write-ColorOutput @"

🔍 Linux 依赖检查
=================

"@ "Cyan"

    # 检查 Linux 环境
    if (-not (Test-LinuxEnvironment)) {
        return
    }
    
    # 获取发行版信息
    $distroInfo = Get-LinuxDistribution
    Write-Info "发行版: $($distroInfo.Name)"
    
    # 检查核心依赖
    $coreDeps = Test-CoreDependencies
    
    Write-ColorOutput "`n" "White"
    
    # 检查构建工具
    $buildTools = Test-BuildTools
    
    # 统计结果
    $missingCoreDeps = $coreDeps | Where-Object { -not $_.Available }
    $missingBuildTools = $buildTools | Where-Object { -not $_.Available }
    
    Write-ColorOutput "`n📊 检查结果:" "Yellow"
    Write-Info "核心依赖: $($coreDeps.Count - $missingCoreDeps.Count)/$($coreDeps.Count) 可用"
    Write-Info "构建工具: $($buildTools.Count - $missingBuildTools.Count)/$($buildTools.Count) 可用"
    
    # 显示详细信息
    if ($ShowDetails) {
        Write-ColorOutput "`n📋 详细信息:" "Cyan"
        
        Write-ColorOutput "`n核心依赖:" "Yellow"
        foreach ($dep in $coreDeps) {
            $status = if ($dep.Available) { "✅" } else { "❌" }
            Write-ColorOutput "  $status $($dep.Name) ($($dep.PkgConfig)): $($dep.Version)" "White"
            if ($ShowDetails -and $dep.Available) {
                Write-ColorOutput "    $($dep.Description)" "Gray"
            }
        }
        
        Write-ColorOutput "`n构建工具:" "Yellow"
        foreach ($tool in $buildTools) {
            $status = if ($tool.Available) { "✅" } else { "❌" }
            Write-ColorOutput "  $status $($tool.Name) ($($tool.Command)): $($tool.Version)" "White"
        }
    }
    
    # 生成安装建议
    $allMissing = $missingCoreDeps + $missingBuildTools
    if ($allMissing.Count -gt 0) {
        Write-ColorOutput "`n💡 安装建议:" "Green"
        $suggestions = Get-InstallationSuggestions -DistroInfo $distroInfo -MissingDeps $allMissing
        foreach ($suggestion in $suggestions) {
            Write-ColorOutput $suggestion "White"
        }
        
        Write-ColorOutput "`n或者使用我们的自动安装脚本:" "Green"
        Write-ColorOutput "./scripts/install-linux-deps.sh" "White"
    } else {
        Write-Success "`n🎉 所有依赖都已安装，可以开始构建！"
    }
}

# 执行主函数
try {
    Start-DependencyCheck
} catch {
    Write-Error "依赖检查过程中发生错误: $($_.Exception.Message)"
    exit 1
}
