# InfluxDB GUI Manager - 快速编译脚本
# 专门用于解决当前编译问题和快速构建

param(
    [string]$Mode = "check",  # check, build, dev, full
    [switch]$Clean = $false,
    [switch]$Offline = $false,
    [switch]$Verbose = $false,
    [switch]$FixNetwork = $false
)

# 颜色输出函数
function Write-Success { param([string]$Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Warning { param([string]$Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param([string]$Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Info { param([string]$Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Step { param([string]$Message) Write-Host "🔧 $Message" -ForegroundColor Blue }

function Show-Help {
    Write-Host @"
InfluxDB GUI Manager - 快速编译脚本

用法:
    .\scripts\quick-build.ps1 [选项]

模式:
    check    - 仅检查代码 (默认)
    build    - 构建 debug 版本
    dev      - 启动开发模式
    full     - 完整构建 (包括前端)

选项:
    -Clean       清理构建文件
    -Offline     离线模式 (不更新依赖)
    -Verbose     显示详细输出
    -FixNetwork  修复网络问题

示例:
    .\scripts\quick-build.ps1                    # 快速检查
    .\scripts\quick-build.ps1 -Mode build       # 构建项目
    .\scripts\quick-build.ps1 -Mode dev         # 开发模式
    .\scripts\quick-build.ps1 -Clean -FixNetwork # 清理并修复网络问题

"@ -ForegroundColor White
}

function Test-Prerequisites {
    Write-Step "检查构建环境..."
    
    $tools = @{
        "rustc" = "Rust 编译器"
        "cargo" = "Cargo 包管理器"
        "node" = "Node.js"
        "npm" = "npm 包管理器"
    }
    
    $allGood = $true
    foreach ($tool in $tools.Keys) {
        try {
            $version = & $tool --version 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "$($tools[$tool]): $($version.Split("`n")[0])"
            } else {
                Write-Error "$($tools[$tool]) 不可用"
                $allGood = $false
            }
        } catch {
            Write-Error "$($tools[$tool]) 未安装"
            $allGood = $false
        }
    }
    
    if (-not $allGood) {
        Write-Error "请先安装必要的工具，或运行 .\scripts\setup-dev.ps1"
        exit 1
    }
}

function Fix-NetworkIssues {
    Write-Step "修复网络问题..."
    
    # 设置 Cargo 配置
    $cargoDir = "$env:USERPROFILE\.cargo"
    if (-not (Test-Path $cargoDir)) {
        New-Item -ItemType Directory -Path $cargoDir -Force | Out-Null
    }
    
    $cargoConfig = @"
[source.crates-io]
replace-with = 'ustc'

[source.ustc]
registry = "https://mirrors.ustc.edu.cn/crates.io-index"

[net]
git-fetch-with-cli = true
retry = 3

[http]
check-revoke = false
timeout = 60
low-speed-limit = 10
low-speed-timeout = 60

[build]
jobs = 2
"@
    
    $cargoConfigPath = "$cargoDir\config.toml"
    $cargoConfig | Out-File -FilePath $cargoConfigPath -Encoding UTF8 -Force
    Write-Success "Cargo 网络配置已优化"
    
    # 设置环境变量
    $env:CARGO_NET_RETRY = "3"
    $env:CARGO_NET_GIT_FETCH_WITH_CLI = "true"
    $env:CARGO_HTTP_TIMEOUT = "60"
    
    Write-Success "网络问题修复完成"
}

function Clear-BuildFiles {
    Write-Step "清理构建文件..."
    
    $cleanPaths = @(
        "src-tauri\target\debug",
        "src-tauri\target\release", 
        "node_modules",
        "dist"
    )
    
    foreach ($path in $cleanPaths) {
        if (Test-Path $path) {
            Write-Info "清理 $path"
            Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    
    # 清理 Cargo 缓存
    Write-Info "清理 Cargo 缓存..."
    Push-Location "src-tauri"
    try {
        cargo clean 2>$null
    } catch {
        Write-Warning "Cargo clean 失败，继续执行..."
    }
    Pop-Location
    
    Write-Success "构建文件清理完成"
}

function Install-Dependencies {
    Write-Step "安装/更新依赖..."
    
    # 前端依赖
    if (-not $Offline -and (Test-Path "package.json")) {
        Write-Info "安装前端依赖..."
        if (Test-Path "node_modules") {
            Write-Info "前端依赖已存在，跳过安装"
        } else {
            npm install --prefer-offline --no-audit
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "前端依赖安装失败，尝试使用缓存..."
                npm install --offline --no-audit
            }
        }
    }
    
    # 后端依赖检查
    Write-Info "检查后端依赖..."
    Push-Location "src-tauri"
    try {
        if (-not $Offline) {
            Write-Info "更新 Cargo 索引..."
            cargo update --dry-run 2>$null
        }
        Write-Success "后端依赖检查完成"
    } catch {
        Write-Warning "后端依赖检查失败，继续执行..."
    }
    Pop-Location
}

function Build-Backend {
    param([string]$BuildMode = "check")
    
    Write-Step "构建后端 ($BuildMode)..."
    
    Push-Location "src-tauri"
    try {
        # 设置构建环境
        $env:RUST_LOG = "info"
        if ($Verbose) {
            $env:RUST_BACKTRACE = "1"
        }
        
        switch ($BuildMode) {
            "check" {
                Write-Info "检查代码语法和类型..."
                cargo check --color always
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "代码检查通过"
                } else {
                    Write-Error "代码检查失败"
                    exit 1
                }
            }
            "build" {
                Write-Info "构建 debug 版本..."
                cargo build --color always
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "后端构建完成"
                } else {
                    Write-Error "后端构建失败"
                    exit 1
                }
            }
            "release" {
                Write-Info "构建 release 版本..."
                cargo build --release --color always
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "后端发布版本构建完成"
                } else {
                    Write-Error "后端发布版本构建失败"
                    exit 1
                }
            }
        }
    } finally {
        Pop-Location
    }
}

function Build-Frontend {
    Write-Step "构建前端..."
    
    if (-not (Test-Path "package.json")) {
        Write-Warning "未找到 package.json，跳过前端构建"
        return
    }
    
    Write-Info "构建前端资源..."
    npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Success "前端构建完成"
    } else {
        Write-Error "前端构建失败"
        exit 1
    }
}

function Start-DevMode {
    Write-Step "启动开发模式..."
    
    # 检查前端开发服务器
    Write-Info "启动前端开发服务器..."
    Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow
    
    # 等待前端服务器启动
    Write-Info "等待前端服务器启动..."
    Start-Sleep -Seconds 5
    
    # 启动 Tauri 开发模式
    Write-Info "启动 Tauri 开发模式..."
    Push-Location "src-tauri"
    try {
        cargo tauri dev
    } finally {
        Pop-Location
    }
}

function Show-BuildInfo {
    Write-Step "构建信息"
    Write-Info "模式: $Mode"
    Write-Info "清理: $Clean"
    Write-Info "离线模式: $Offline"
    Write-Info "详细输出: $Verbose"
    Write-Info "修复网络: $FixNetwork"
    Write-Host "=" * 40 -ForegroundColor Gray
}

function Main {
    Write-Host @"
⚡ InfluxDB GUI Manager - 快速编译工具
===================================
"@ -ForegroundColor Magenta
    
    Show-BuildInfo
    
    # 检查环境
    Test-Prerequisites
    
    # 修复网络问题
    if ($FixNetwork) {
        Fix-NetworkIssues
    }
    
    # 清理文件
    if ($Clean) {
        Clear-BuildFiles
    }
    
    # 安装依赖
    Install-Dependencies
    
    # 根据模式执行构建
    switch ($Mode) {
        "check" {
            Build-Backend -BuildMode "check"
            Write-Success "代码检查完成！"
        }
        "build" {
            Build-Backend -BuildMode "build"
            Write-Success "构建完成！"
        }
        "dev" {
            Build-Backend -BuildMode "check"
            Start-DevMode
        }
        "full" {
            Build-Frontend
            Build-Backend -BuildMode "build"
            Write-Success "完整构建完成！"
        }
        default {
            Write-Error "未知模式: $Mode"
            Show-Help
            exit 1
        }
    }
}

# 错误处理
trap {
    Write-Error "构建过程中发生错误: $_"
    exit 1
}

# 检查帮助参数
if ($args -contains "-h" -or $args -contains "--help") {
    Show-Help
    exit 0
}

# 执行主函数
Main
