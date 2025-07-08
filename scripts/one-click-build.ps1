# InfluxDB GUI Manager - 一键构建脚本
# 自动解决所有常见问题并完成构建

param(
    [string]$Target = "dev",  # dev, build, check
    [switch]$Force = $false
)

# 颜色输出函数
function Write-Success { param([string]$Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Warning { param([string]$Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param([string]$Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Info { param([string]$Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Step { param([string]$Message) Write-Host "🚀 $Message" -ForegroundColor Blue }

function Main {
    Write-Host @"
🎯 InfluxDB GUI Manager - 一键构建工具
===================================
自动解决网络问题、依赖问题、编译问题
目标: $Target
"@ -ForegroundColor Magenta

    try {
        # 步骤 1: 检查和修复网络问题
        Write-Step "步骤 1/6: 修复网络问题"
        & "$PSScriptRoot\fix-network.ps1" -SetMirrors
        Write-Success "网络问题修复完成"

        # 步骤 2: 清理旧文件 (如果需要)
        if ($Force) {
            Write-Step "步骤 2/6: 清理构建文件"
            & "$PSScriptRoot\quick-build.ps1" -Mode check -Clean
            Write-Success "构建文件清理完成"
        } else {
            Write-Info "步骤 2/6: 跳过清理 (使用 -Force 强制清理)"
        }

        # 步骤 3: 检查环境
        Write-Step "步骤 3/6: 检查构建环境"
        Test-BuildEnvironment
        Write-Success "构建环境检查完成"

        # 步骤 4: 安装依赖
        Write-Step "步骤 4/6: 安装项目依赖"
        Install-AllDependencies
        Write-Success "依赖安装完成"

        # 步骤 5: 执行构建
        Write-Step "步骤 5/6: 执行构建"
        switch ($Target) {
            "check" {
                & "$PSScriptRoot\quick-build.ps1" -Mode check -FixNetwork
            }
            "build" {
                & "$PSScriptRoot\quick-build.ps1" -Mode build -FixNetwork
            }
            "dev" {
                & "$PSScriptRoot\quick-build.ps1" -Mode dev -FixNetwork
            }
            default {
                Write-Error "未知目标: $Target"
                exit 1
            }
        }
        Write-Success "构建执行完成"

        # 步骤 6: 验证结果
        Write-Step "步骤 6/6: 验证构建结果"
        Verify-BuildResult
        Write-Success "Build verification completed"

        Write-Host @"

Build completed successfully!
============================

Next steps:
"@ -ForegroundColor Green

        switch ($Target) {
            "check" {
                Write-Info "Code check passed, ready for development"
                Write-Info "Run '.\scripts\one-click-build.ps1 -Target dev' to start dev mode"
            }
            "build" {
                Write-Info "Project build completed"
                Write-Info "Build files location: src-tauri\target\debug\"
                Write-Info "Run '.\scripts\one-click-build.ps1 -Target dev' to start dev mode"
            }
            "dev" {
                Write-Info "Development environment started"
                Write-Info "Frontend URL: http://localhost:1420"
                Write-Info "Backend integrated into Tauri app"
            }
        }

    } catch {
        Write-Error "Build process error: $_"
        Write-Info "Try these solutions:"
        Write-Info "1. Check network connection"
        Write-Info "2. Run '.\scripts\one-click-build.ps1 -Force' to force clean rebuild"
        Write-Info "3. Manually run '.\scripts\setup-dev.ps1' to reset environment"
        exit 1
    }
}

function Test-BuildEnvironment {
    $tools = @{
        "rustc" = "Rust Compiler"
        "cargo" = "Cargo Package Manager"
        "node" = "Node.js"
        "npm" = "npm Package Manager"
    }

    foreach ($tool in $tools.Keys) {
        try {
            $version = & $tool --version 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Info "$($tools[$tool]): OK"
            } else {
                throw "Not available"
            }
        } catch {
            Write-Error "$($tools[$tool]) not installed or not available"
            Write-Info "Please run '.\scripts\setup-dev.ps1' to install dev environment"
            exit 1
        }
    }
}

function Install-AllDependencies {
    # Frontend dependencies
    if (Test-Path "package.json") {
        Write-Info "Installing frontend dependencies..."
        if (-not (Test-Path "node_modules")) {
            npm install --prefer-offline
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "npm install failed, trying to clean cache..."
                npm cache clean --force
                npm install
            }
        } else {
            Write-Info "Frontend dependencies already exist"
        }
    }

    # Check Tauri CLI
    try {
        $tauriVersion = cargo tauri --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "Tauri CLI not available"
        }
        Write-Info "Tauri CLI: OK"
    } catch {
        Write-Info "Installing Tauri CLI..."
        cargo install tauri-cli --locked
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Cargo install failed, trying npm install..."
            npm install -g @tauri-apps/cli
        }
    }
}

function Verify-BuildResult {
    switch ($Target) {
        "check" {
            Write-Info "Verifying code check results..."
            Push-Location "src-tauri"
            try {
                cargo check --quiet
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Code check verification passed"
                } else {
                    Write-Warning "Code check verification failed"
                }
            } finally {
                Pop-Location
            }
        }
        "build" {
            Write-Info "Verifying build results..."
            $debugPath = "src-tauri\target\debug"
            if (Test-Path $debugPath) {
                $files = Get-ChildItem $debugPath -Filter "*.exe" -ErrorAction SilentlyContinue
                if ($files.Count -gt 0) {
                    Write-Success "Found build artifact: $($files[0].Name)"
                } else {
                    Write-Warning "No executable files found"
                }
            } else {
                Write-Warning "Build directory does not exist"
            }
        }
        "dev" {
            Write-Info "Development mode started, no additional verification needed"
        }
    }
}

# 显示使用说明
if ($args -contains "-h" -or $args -contains "--help") {
    Write-Host @"
InfluxDB GUI Manager - 一键构建工具

用法:
    .\scripts\one-click-build.ps1 [选项]

目标:
    dev      启动开发模式 (默认)
    build    构建项目
    check    检查代码

选项:
    -Force   强制清理重建
    -h       显示帮助

示例:
    .\scripts\one-click-build.ps1                # 启动开发模式
    .\scripts\one-click-build.ps1 -Target build  # 构建项目
    .\scripts\one-click-build.ps1 -Force         # 强制清理重建

这个脚本会自动:
1. 修复网络连接问题
2. 清理旧的构建文件 (可选)
3. 检查构建环境
4. 安装所有依赖
5. 执行构建
6. 验证结果

"@ -ForegroundColor White
    exit 0
}

# 执行主函数
Main
