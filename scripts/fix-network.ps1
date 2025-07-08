# InfluxDB GUI Manager - 网络问题修复脚本
# 解决 Git 连接、Cargo 下载等网络问题

param(
    [switch]$SetMirrors = $false,
    [switch]$ResetMirrors = $false,
    [switch]$TestConnections = $false,
    [switch]$FixGit = $false,
    [switch]$All = $false
)

# 颜色输出函数
function Write-Success { param([string]$Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Warning { param([string]$Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param([string]$Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Info { param([string]$Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Step { param([string]$Message) Write-Host "🔧 $Message" -ForegroundColor Blue }

function Show-Help {
    Write-Host @"
InfluxDB GUI Manager - 网络问题修复脚本

用法:
    .\scripts\fix-network.ps1 [选项]

选项:
    -SetMirrors      设置国内镜像源
    -ResetMirrors    重置为官方源
    -TestConnections 测试网络连接
    -FixGit          修复 Git 连接问题
    -All             执行所有修复操作

示例:
    .\scripts\fix-network.ps1 -All
    .\scripts\fix-network.ps1 -SetMirrors
    .\scripts\fix-network.ps1 -FixGit

"@ -ForegroundColor White
}

function Test-NetworkConnections {
    Write-Step "测试网络连接..."
    
    $testUrls = @{
        "GitHub" = "https://github.com"
        "Crates.io" = "https://crates.io"
        "npm Registry" = "https://registry.npmjs.org"
        "Rust Forge" = "https://forge.rust-lang.org"
    }
    
    foreach ($name in $testUrls.Keys) {
        $url = $testUrls[$name]
        try {
            $response = Invoke-WebRequest -Uri $url -Method Head -TimeoutSec 10 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Success "$name 连接正常"
            } else {
                Write-Warning "$name 连接异常 (状态码: $($response.StatusCode))"
            }
        } catch {
            Write-Error "$name 连接失败: $($_.Exception.Message)"
        }
    }
}

function Set-ChinaMirrors {
    Write-Step "设置国内镜像源..."
    
    # 设置 Cargo 镜像
    Write-Info "配置 Cargo 镜像..."
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

[http]
check-revoke = false
"@
    
    $cargoConfigPath = "$cargoDir\config.toml"
    $cargoConfig | Out-File -FilePath $cargoConfigPath -Encoding UTF8 -Force
    Write-Success "Cargo 镜像配置完成"
    
    # 设置 npm 镜像
    Write-Info "配置 npm 镜像..."
    try {
        npm config set registry https://registry.npmmirror.com
        npm config set disturl https://npmmirror.com/dist
        npm config set electron_mirror https://npmmirror.com/mirrors/electron/
        npm config set sass_binary_site https://npmmirror.com/mirrors/node-sass/
        Write-Success "npm 镜像配置完成"
    } catch {
        Write-Warning "npm 镜像配置失败: $_"
    }
    
    # 设置 Git 镜像
    Write-Info "配置 Git 镜像..."
    try {
        git config --global url."https://gitclone.com/github.com/".insteadOf "https://github.com/"
        git config --global http.sslVerify false
        git config --global http.postBuffer 524288000
        Write-Success "Git 镜像配置完成"
    } catch {
        Write-Warning "Git 镜像配置失败: $_"
    }
}

function Reset-OfficialSources {
    Write-Step "重置为官方源..."
    
    # 重置 Cargo 配置
    Write-Info "重置 Cargo 配置..."
    $cargoConfigPath = "$env:USERPROFILE\.cargo\config.toml"
    if (Test-Path $cargoConfigPath) {
        Remove-Item $cargoConfigPath -Force
        Write-Success "Cargo 配置已重置"
    }
    
    # 重置 npm 配置
    Write-Info "重置 npm 配置..."
    try {
        npm config set registry https://registry.npmjs.org
        npm config delete disturl
        npm config delete electron_mirror
        npm config delete sass_binary_site
        Write-Success "npm 配置已重置"
    } catch {
        Write-Warning "npm 配置重置失败: $_"
    }
    
    # 重置 Git 配置
    Write-Info "重置 Git 配置..."
    try {
        git config --global --unset url."https://gitclone.com/github.com/".insteadOf
        git config --global http.sslVerify true
        Write-Success "Git 配置已重置"
    } catch {
        Write-Warning "Git 配置重置失败: $_"
    }
}

function Fix-GitIssues {
    Write-Step "修复 Git 连接问题..."
    
    # 设置 Git 代理 (如果需要)
    Write-Info "检查 Git 配置..."
    
    # 增加缓冲区大小
    git config --global http.postBuffer 524288000
    git config --global http.maxRequestBuffer 100M
    git config --global core.compression 0
    
    # 设置超时时间
    git config --global http.lowSpeedLimit 0
    git config --global http.lowSpeedTime 999999
    
    # 禁用 SSL 验证 (仅在必要时)
    $disableSSL = Read-Host "是否禁用 Git SSL 验证? (仅在连接问题时使用) (y/N)"
    if ($disableSSL -eq "y" -or $disableSSL -eq "Y") {
        git config --global http.sslVerify false
        Write-Warning "已禁用 Git SSL 验证，请在问题解决后重新启用"
    }
    
    Write-Success "Git 配置优化完成"
}

function Clear-Caches {
    Write-Step "清理缓存..."
    
    # 清理 Cargo 缓存
    Write-Info "清理 Cargo 缓存..."
    if (Test-Path "$env:USERPROFILE\.cargo\registry") {
        Remove-Item "$env:USERPROFILE\.cargo\registry" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Success "Cargo 注册表缓存已清理"
    }
    
    if (Test-Path "$env:USERPROFILE\.cargo\git") {
        Remove-Item "$env:USERPROFILE\.cargo\git" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Success "Cargo Git 缓存已清理"
    }
    
    # 清理 npm 缓存
    Write-Info "清理 npm 缓存..."
    try {
        npm cache clean --force
        Write-Success "npm 缓存已清理"
    } catch {
        Write-Warning "npm 缓存清理失败: $_"
    }
    
    # 清理项目构建缓存
    Write-Info "清理项目构建缓存..."
    $cachePaths = @(
        "node_modules",
        "src-tauri\target",
        "dist"
    )
    
    foreach ($path in $cachePaths) {
        if (Test-Path $path) {
            Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
            Write-Success "已清理: $path"
        }
    }
}

function Show-CurrentConfig {
    Write-Step "显示当前配置..."
    
    Write-Info "Cargo 配置:"
    $cargoConfigPath = "$env:USERPROFILE\.cargo\config.toml"
    if (Test-Path $cargoConfigPath) {
        Get-Content $cargoConfigPath | Write-Host
    } else {
        Write-Info "未找到 Cargo 配置文件"
    }
    
    Write-Info "`nnpm 配置:"
    try {
        npm config get registry
        npm config get disturl
    } catch {
        Write-Warning "无法获取 npm 配置"
    }
    
    Write-Info "`nGit 配置:"
    try {
        git config --global --get url."https://gitclone.com/github.com/".insteadOf
        git config --global --get http.sslVerify
        git config --global --get http.postBuffer
    } catch {
        Write-Warning "无法获取 Git 配置"
    }
}

function Main {
    Write-Host @"
🌐 InfluxDB GUI Manager - 网络问题修复工具
==========================================
"@ -ForegroundColor Magenta
    
    if ($All) {
        Test-NetworkConnections
        Set-ChinaMirrors
        Fix-GitIssues
        Clear-Caches
        Write-Success "所有网络修复操作完成！"
        return
    }
    
    if ($TestConnections) {
        Test-NetworkConnections
    }
    
    if ($SetMirrors) {
        Set-ChinaMirrors
    }
    
    if ($ResetMirrors) {
        Reset-OfficialSources
    }
    
    if ($FixGit) {
        Fix-GitIssues
    }
    
    if (-not ($TestConnections -or $SetMirrors -or $ResetMirrors -or $FixGit)) {
        Show-Help
        Write-Info "`n当前配置:"
        Show-CurrentConfig
    }
}

# 检查参数
if ($args -contains "-h" -or $args -contains "--help") {
    Show-Help
    exit 0
}

Main
