# InfluxDB GUI Manager 开发环境自动化设置脚本
# 适用于 Windows + PowerShell + Scoop 环境

param(
    [switch]$SkipScoop = $false,
    [switch]$SkipRust = $false,
    [switch]$SkipNode = $false,
    [switch]$Force = $false
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 颜色输出函数
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success { param([string]$Message) Write-ColorOutput "✅ $Message" "Green" }
function Write-Warning { param([string]$Message) Write-ColorOutput "⚠️  $Message" "Yellow" }
function Write-Error { param([string]$Message) Write-ColorOutput "❌ $Message" "Red" }
function Write-Info { param([string]$Message) Write-ColorOutput "ℹ️  $Message" "Cyan" }
function Write-Step { param([string]$Message) Write-ColorOutput "🔧 $Message" "Blue" }

# 检查管理员权限
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# 检查命令是否存在
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# 主函数
function Main {
    Write-ColorOutput @"
🚀 InfluxDB GUI Manager 开发环境设置
=====================================
"@ "Magenta"

    # 检查 PowerShell 版本
    Write-Step "检查 PowerShell 版本..."
    $psVersion = $PSVersionTable.PSVersion
    Write-Info "PowerShell 版本: $psVersion"
    
    if ($psVersion.Major -lt 5) {
        Write-Error "需要 PowerShell 5.0 或更高版本"
        exit 1
    }

    # 设置执行策略
    Write-Step "检查执行策略..."
    $executionPolicy = Get-ExecutionPolicy -Scope CurrentUser
    if ($executionPolicy -eq "Restricted") {
        Write-Warning "当前执行策略为 Restricted，正在设置为 RemoteSigned..."
        Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
        Write-Success "执行策略已更新"
    } else {
        Write-Success "执行策略: $executionPolicy"
    }

    # 安装 Scoop
    if (-not $SkipScoop) {
        Install-Scoop
    }

    # 安装 Rust 工具链
    if (-not $SkipRust) {
        Install-Rust
    }

    # 安装 Node.js
    if (-not $SkipNode) {
        Install-NodeJS
    }

    # 安装开发工具
    Install-DevTools

    # 安装项目依赖
    Install-ProjectDependencies

    # 验证环境
    Verify-Environment

    # 创建开发配置
    Create-DevConfig

    Write-Success "🎉 开发环境设置完成！"
    Write-Info "运行 'npm run tauri:dev' 启动开发服务器"
}

function Install-Scoop {
    Write-Step "检查 Scoop 包管理器..."
    
    if (Test-Command "scoop") {
        Write-Success "Scoop 已安装"
        
        # 更新 Scoop
        Write-Step "更新 Scoop..."
        scoop update
        
        # 添加必要的 bucket
        Write-Step "添加 Scoop buckets..."
        $buckets = @("main", "extras", "versions")
        foreach ($bucket in $buckets) {
            try {
                scoop bucket add $bucket 2>$null
                Write-Success "已添加 bucket: $bucket"
            } catch {
                Write-Info "Bucket $bucket 已存在"
            }
        }
    } else {
        Write-Step "安装 Scoop..."
        try {
            Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
            Write-Success "Scoop 安装成功"
            
            # 添加 buckets
            scoop bucket add main
            scoop bucket add extras
            scoop bucket add versions
        } catch {
            Write-Error "Scoop 安装失败: $_"
            exit 1
        }
    }
}

function Install-Rust {
    Write-Step "检查 Rust 工具链..."
    
    if (Test-Command "rustc") {
        $rustVersion = rustc --version
        Write-Success "Rust 已安装: $rustVersion"
        
        if ($Force) {
            Write-Step "强制更新 Rust..."
            rustup update
        }
    } else {
        Write-Step "通过 Scoop 安装 Rust..."
        try {
            scoop install rust
            Write-Success "Rust 安装成功"
        } catch {
            Write-Error "Rust 安装失败: $_"
            exit 1
        }
    }
    
    # 配置 Rust 工具链
    Write-Step "配置 Rust 工具链..."
    rustup default stable
    rustup update
    
    # 安装必要组件
    Write-Step "安装 Rust 组件..."
    $components = @("rustfmt", "clippy", "rust-analyzer")
    foreach ($component in $components) {
        try {
            rustup component add $component
            Write-Success "已安装组件: $component"
        } catch {
            Write-Warning "组件 $component 安装失败，可能已存在"
        }
    }
    
    # 配置 Cargo 镜像 (可选)
    Write-Step "配置 Cargo 镜像..."
    $cargoDir = "$env:USERPROFILE\.cargo"
    if (-not (Test-Path $cargoDir)) {
        New-Item -ItemType Directory -Path $cargoDir -Force | Out-Null
    }
    
    $configContent = @"
[source.crates-io]
replace-with = 'ustc'

[source.ustc]
registry = "https://mirrors.ustc.edu.cn/crates.io-index"
"@
    
    $configPath = "$cargoDir\config.toml"
    if (-not (Test-Path $configPath) -or $Force) {
        $configContent | Out-File -FilePath $configPath -Encoding UTF8
        Write-Success "Cargo 镜像配置完成"
    }
}

function Install-NodeJS {
    Write-Step "检查 Node.js..."
    
    if (Test-Command "node") {
        $nodeVersion = node --version
        Write-Success "Node.js 已安装: $nodeVersion"
        
        # 检查版本是否满足要求 (18+)
        $version = [Version]($nodeVersion -replace 'v', '')
        if ($version.Major -lt 18) {
            Write-Warning "Node.js 版本过低，建议升级到 18.0 或更高版本"
            if ($Force) {
                Write-Step "升级 Node.js..."
                scoop install nodejs
            }
        }
    } else {
        Write-Step "通过 Scoop 安装 Node.js..."
        try {
            scoop install nodejs
            Write-Success "Node.js 安装成功"
        } catch {
            Write-Error "Node.js 安装失败: $_"
            exit 1
        }
    }
    
    # 配置 npm 镜像 (可选)
    Write-Step "配置 npm 镜像..."
    try {
        npm config set registry https://registry.npmmirror.com
        Write-Success "npm 镜像配置完成"
    } catch {
        Write-Warning "npm 镜像配置失败"
    }
}

function Install-DevTools {
    Write-Step "安装开发工具..."
    
    $tools = @{
        "git" = "Git 版本控制"
        "windows-terminal" = "Windows Terminal"
        "vscode" = "Visual Studio Code"
        "webview2" = "WebView2 运行时"
    }
    
    foreach ($tool in $tools.Keys) {
        if (-not (Test-Command $tool)) {
            Write-Step "安装 $($tools[$tool])..."
            try {
                scoop install $tool
                Write-Success "$($tools[$tool]) 安装成功"
            } catch {
                Write-Warning "$($tools[$tool]) 安装失败，请手动安装"
            }
        } else {
            Write-Success "$($tools[$tool]) 已安装"
        }
    }
    
    # 安装 Tauri CLI
    Write-Step "安装 Tauri CLI..."
    if (-not (Test-Command "tauri")) {
        try {
            cargo install tauri-cli
            Write-Success "Tauri CLI 安装成功"
        } catch {
            Write-Warning "Tauri CLI 安装失败，尝试使用 npm 安装..."
            try {
                npm install -g @tauri-apps/cli
                Write-Success "Tauri CLI (npm) 安装成功"
            } catch {
                Write-Error "Tauri CLI 安装失败"
            }
        }
    } else {
        Write-Success "Tauri CLI 已安装"
    }
}

function Install-ProjectDependencies {
    Write-Step "安装项目依赖..."
    
    # 检查是否在项目根目录
    if (-not (Test-Path "package.json")) {
        Write-Warning "未找到 package.json，请确保在项目根目录运行此脚本"
        return
    }
    
    # 安装前端依赖
    Write-Step "安装前端依赖..."
    try {
        npm ci
        Write-Success "前端依赖安装成功"
    } catch {
        Write-Warning "前端依赖安装失败，尝试使用 npm install..."
        npm install
    }
    
    # 构建后端依赖
    Write-Step "构建后端依赖..."
    try {
        Set-Location "src-tauri"
        cargo build
        Set-Location ".."
        Write-Success "后端依赖构建成功"
    } catch {
        Write-Warning "后端依赖构建失败: $_"
    }
}

function Verify-Environment {
    Write-Step "验证开发环境..."
    
    $checks = @{
        "PowerShell" = { $PSVersionTable.PSVersion.ToString() }
        "Scoop" = { scoop --version }
        "Rust" = { rustc --version }
        "Cargo" = { cargo --version }
        "Node.js" = { node --version }
        "npm" = { npm --version }
        "Git" = { git --version }
        "Tauri CLI" = { tauri --version }
    }
    
    Write-Info "环境检查结果:"
    foreach ($check in $checks.Keys) {
        try {
            $version = & $checks[$check]
            Write-Success "$check`: $version"
        } catch {
            Write-Error "$check`: 未安装或不可用"
        }
    }
}

function Create-DevConfig {
    Write-Step "创建开发配置..."
    
    # 创建 PowerShell 配置文件内容
    $profileContent = @"
# InfluxDB GUI Manager 开发环境配置

# 设置别名
Set-Alias -Name ll -Value Get-ChildItem
Set-Alias -Name grep -Value Select-String

# 设置环境变量
`$env:RUST_LOG = "info"
`$env:RUST_BACKTRACE = "1"

# 项目快捷函数
function Start-InfluxGUI {
    Set-Location "$PWD"
    npm run tauri:dev
}

function Build-InfluxGUI {
    Set-Location "$PWD"
    .\scripts\build.ps1
}

function Test-InfluxGUI {
    Set-Location "$PWD"
    npm test
    Set-Location "src-tauri"
    cargo test
    Set-Location ".."
}

# 显示欢迎信息
Write-Host "🦀 InfluxDB GUI 开发环境已加载" -ForegroundColor Green
Write-Host "💡 使用 Start-InfluxGUI 启动开发服务器" -ForegroundColor Cyan
"@
    
    # 询问是否更新 PowerShell 配置文件
    $updateProfile = Read-Host "是否更新 PowerShell 配置文件? (y/N)"
    if ($updateProfile -eq "y" -or $updateProfile -eq "Y") {
        try {
            $profileContent | Out-File -FilePath $PROFILE -Encoding UTF8 -Append
            Write-Success "PowerShell 配置文件已更新"
            Write-Info "重新启动 PowerShell 或运行 '. `$PROFILE' 加载配置"
        } catch {
            Write-Warning "PowerShell 配置文件更新失败: $_"
        }
    }
    
    # 创建 VS Code 工作区配置
    if (Test-Path ".vscode" -PathType Container) {
        Write-Info "VS Code 配置目录已存在"
    } else {
        Write-Step "创建 VS Code 工作区配置..."
        New-Item -ItemType Directory -Path ".vscode" -Force | Out-Null
        
        $vscodeSettings = @{
            "rust-analyzer.cargo.features" = "all"
            "rust-analyzer.checkOnSave.command" = "clippy"
            "files.associations" = @{
                "*.rs" = "rust"
            }
            "terminal.integrated.defaultProfile.windows" = "PowerShell"
            "editor.formatOnSave" = $true
            "editor.codeActionsOnSave" = @{
                "source.fixAll.eslint" = $true
            }
        }
        
        $vscodeSettings | ConvertTo-Json -Depth 3 | Out-File -FilePath ".vscode\settings.json" -Encoding UTF8
        Write-Success "VS Code 工作区配置已创建"
    }
}

# 错误处理
trap {
    Write-Error "脚本执行失败: $_"
    exit 1
}

# 执行主函数
Main
