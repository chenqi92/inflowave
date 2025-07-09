#!/usr/bin/env pwsh
<#
.SYNOPSIS
    多架构构建脚本 - 为不同平台和架构构建 InfloWave 应用程序

.DESCRIPTION
    此脚本支持为多个平台和架构构建 Tauri 应用程序，包括：
    - Windows: x64, x86, ARM64
    - macOS: x64 (Intel), ARM64 (Apple Silicon)
    - Linux: x64, ARM64, x86

.PARAMETER Platform
    目标平台 (windows, macos, linux, all)

.PARAMETER Architecture
    目标架构 (x64, x86, arm64, all)

.PARAMETER BuildType
    构建类型 (debug, release)

.PARAMETER OutputDir
    输出目录路径

.EXAMPLE
    .\build-multiarch.ps1 -Platform windows -Architecture x64
    .\build-multiarch.ps1 -Platform all -Architecture all
    .\build-multiarch.ps1 -Platform linux -Architecture arm64 -BuildType release

.NOTES
    需要预先安装 Rust 工具链和相应的目标架构支持
#>

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet("windows", "macos", "linux", "all")]
    [string]$Platform = "all",
    
    [Parameter(Mandatory = $false)]
    [ValidateSet("x64", "x86", "arm64", "all")]
    [string]$Architecture = "all",
    
    [Parameter(Mandatory = $false)]
    [ValidateSet("debug", "release")]
    [string]$BuildType = "release",
    
    [Parameter(Mandatory = $false)]
    [string]$OutputDir = "target/multiarch-builds"
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

# 构建目标映射
$BuildTargets = @{
    "windows" = @{
        "x64" = "x86_64-pc-windows-msvc"
        "x86" = "i686-pc-windows-msvc"
        # "arm64" = "aarch64-pc-windows-msvc"  # 暂时禁用，等待 ring 库支持改善
    }
    "macos" = @{
        "x64" = "x86_64-apple-darwin"
        "arm64" = "aarch64-apple-darwin"
    }
    "linux" = @{
        "x64" = "x86_64-unknown-linux-gnu"
        "arm64" = "aarch64-unknown-linux-gnu"
        "x86" = "i686-unknown-linux-gnu"
    }
}

# 检查环境
function Test-BuildEnvironment {
    Write-Step "检查构建环境..."
    
    # 检查 Rust
    try {
        $rustVersion = rustc --version
        Write-Info "Rust: $rustVersion"
    } catch {
        Write-Error "Rust 未安装或不在 PATH 中"
        exit 1
    }
    
    # 检查 Tauri CLI
    try {
        $tauriVersion = cargo tauri --version 2>$null
        Write-Info "Tauri CLI: $tauriVersion"
    } catch {
        Write-Warning "Tauri CLI 未安装，正在安装..."
        cargo install tauri-cli --locked
    }
    
    # 检查 Node.js
    try {
        $nodeVersion = node --version
        Write-Info "Node.js: $nodeVersion"
    } catch {
        Write-Error "Node.js 未安装或不在 PATH 中"
        exit 1
    }
}

# 安装 Rust 目标架构
function Install-RustTargets {
    param([array]$Targets)
    
    Write-Step "安装 Rust 目标架构..."
    foreach ($target in $Targets) {
        Write-Info "安装目标: $target"
        rustup target add $target
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "无法安装目标 $target，可能已存在或不支持"
        }
    }
}

# 构建单个目标
function Build-Target {
    param(
        [string]$Target,
        [string]$PlatformName,
        [string]$ArchName,
        [string]$BuildType
    )

    Write-Step "构建目标: $Target ($PlatformName-$ArchName)"

    $buildArgs = @("tauri", "build", "--target", $Target)

    # 为 Windows ARM64 使用 native-tls 以避免 ring 库问题
    if ($Target -eq "aarch64-pc-windows-msvc") {
        $buildArgs += @("--features", "default-tls")
        $buildArgs += @("--no-default-features")
        Write-Info "Windows ARM64 目标使用 native-tls 后端"
    }

    if ($BuildType -eq "debug") {
        # Debug 构建不需要 --release 参数
    } else {
        # Release 构建（默认）
    }

    Write-Info "执行命令: cargo $($buildArgs -join ' ')"

    $env:RUST_BACKTRACE = "1"
    & cargo @buildArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "构建成功: $Target"
        
        # 复制构建产物到输出目录
        Copy-BuildArtifacts -Target $Target -PlatformName $PlatformName -ArchName $ArchName
    } else {
        Write-Error "构建失败: $Target"
        return $false
    }
    
    return $true
}

# 复制构建产物
function Copy-BuildArtifacts {
    param(
        [string]$Target,
        [string]$PlatformName,
        [string]$ArchName
    )
    
    $sourceDir = "src-tauri/target/$Target/release/bundle"
    $destDir = "$OutputDir/$PlatformName-$ArchName"
    
    if (Test-Path $sourceDir) {
        Write-Info "复制构建产物到: $destDir"
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        Copy-Item -Path "$sourceDir/*" -Destination $destDir -Recurse -Force
    } else {
        Write-Warning "构建产物目录不存在: $sourceDir"
    }
}

# 主构建函数
function Start-MultiBuild {
    Write-ColorOutput @"

🚀 多架构构建工具
==================
平台: $Platform
架构: $Architecture  
构建类型: $BuildType
输出目录: $OutputDir

"@ "Cyan"

    # 检查环境
    Test-BuildEnvironment
    
    # 确定要构建的目标
    $targetsToBuild = @()
    
    if ($Platform -eq "all") {
        $platformsToProcess = @("windows", "macos", "linux")
    } else {
        $platformsToProcess = @($Platform)
    }
    
    foreach ($plat in $platformsToProcess) {
        if ($Architecture -eq "all") {
            $archsToProcess = $BuildTargets[$plat].Keys
        } else {
            if ($BuildTargets[$plat].ContainsKey($Architecture)) {
                $archsToProcess = @($Architecture)
            } else {
                Write-Warning "平台 $plat 不支持架构 $Architecture，跳过"
                continue
            }
        }
        
        foreach ($arch in $archsToProcess) {
            $target = $BuildTargets[$plat][$arch]
            $targetsToBuild += @{
                Target = $target
                Platform = $plat
                Architecture = $arch
            }
        }
    }
    
    if ($targetsToBuild.Count -eq 0) {
        Write-Error "没有找到要构建的目标"
        exit 1
    }
    
    Write-Info "将构建 $($targetsToBuild.Count) 个目标:"
    foreach ($target in $targetsToBuild) {
        Write-Info "  - $($target.Target) ($($target.Platform)-$($target.Architecture))"
    }
    
    # 安装所需的 Rust 目标
    $rustTargets = $targetsToBuild | ForEach-Object { $_.Target }
    Install-RustTargets -Targets $rustTargets
    
    # 创建输出目录
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    
    # 安装前端依赖
    Write-Step "安装前端依赖..."
    npm ci
    if ($LASTEXITCODE -ne 0) {
        Write-Error "前端依赖安装失败"
        exit 1
    }
    
    # 执行构建
    $successCount = 0
    $failCount = 0
    
    foreach ($target in $targetsToBuild) {
        if (Build-Target -Target $target.Target -PlatformName $target.Platform -ArchName $target.Architecture -BuildType $BuildType) {
            $successCount++
        } else {
            $failCount++
        }
    }
    
    # 构建总结
    Write-ColorOutput @"

📊 构建总结
============
✅ 成功: $successCount
❌ 失败: $failCount
📁 输出目录: $OutputDir

"@ "Green"
    
    if ($failCount -gt 0) {
        Write-Warning "部分构建失败，请检查上面的错误信息"
        exit 1
    } else {
        Write-Success "所有构建均已成功完成！"
    }
}

# 主入口
try {
    Start-MultiBuild
} catch {
    Write-Error "构建过程中发生错误: $($_.Exception.Message)"
    Write-Error $_.ScriptStackTrace
    exit 1
}
