#!/usr/bin/env pwsh
<#
.SYNOPSIS
    逐步移除 Ant Design 依赖

.DESCRIPTION
    这个脚本将帮助逐步移除项目中的 Ant Design 依赖，
    并替换为自定义的 Tailwind CSS 组件

.EXAMPLE
    .\remove-antd.ps1
#>

Write-Host "开始移除 Ant Design 依赖..." -ForegroundColor Cyan

# 第一步：备份重要文件
Write-Host "1. 备份重要文件..." -ForegroundColor Yellow
$backupDir = "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# 备份 package.json
Copy-Item "package.json" "$backupDir/package.json"
Write-Host "   已备份 package.json" -ForegroundColor Green

# 备份样式文件
Copy-Item "src/styles" "$backupDir/styles" -Recurse
Write-Host "   已备份样式文件" -ForegroundColor Green

# 第二步：更新 main.tsx 移除 Ant Design 配置
Write-Host "2. 更新 main.tsx..." -ForegroundColor Yellow

$mainTsxPath = "src/main.tsx"
if (Test-Path $mainTsxPath) {
    $content = Get-Content $mainTsxPath -Raw -Encoding UTF8
    
    # 移除 Ant Design 相关导入
    $content = $content -replace "import \{ ConfigProvider, theme, App as AntdApp \} from 'antd';", ""
    $content = $content -replace "import zhCN from 'antd/locale/zh_CN';", ""
    $content = $content -replace "import enUS from 'antd/locale/en_US';", ""
    
    # 移除 ConfigProvider 和 AntdApp 包装
    $content = $content -replace "<ConfigProvider theme=\{themeConfig\} locale=\{locale\}>", ""
    $content = $content -replace "</ConfigProvider>", ""
    $content = $content -replace "<AntdApp>", ""
    $content = $content -replace "</AntdApp>", ""
    
    # 移除主题配置相关代码
    $content = $content -replace "(?s)// 主题配置.*?const locale = config\.language.*?;", ""
    
    $content | Set-Content $mainTsxPath -Encoding UTF8 -NoNewline
    Write-Host "   已更新 main.tsx" -ForegroundColor Green
}

# 第三步：更新 App.tsx
Write-Host "3. 更新 App.tsx..." -ForegroundColor Yellow

$appTsxPath = "src/App.tsx"
if (Test-Path $appTsxPath) {
    $content = Get-Content $appTsxPath -Raw -Encoding UTF8
    
    # 替换 Ant Design 导入
    $content = $content -replace "import \{ Layout, Typography, Spin \} from 'antd';", "import { Layout, Typography, Spin } from '@/components/ui';"
    
    $content | Set-Content $appTsxPath -Encoding UTF8 -NoNewline
    Write-Host "   已更新 App.tsx" -ForegroundColor Green
}

# 第四步：清理样式文件
Write-Host "4. 清理样式文件..." -ForegroundColor Yellow

# 移除 Ant Design 样式导入
$indexCssPath = "src/styles/index.css"
if (Test-Path $indexCssPath) {
    $content = Get-Content $indexCssPath -Raw -Encoding UTF8
    
    # 移除 Ant Design 相关导入和样式
    $content = $content -replace "@import './antd-fixes.css';", ""
    $content = $content -replace "@import './antd-dev-fixes.css';", ""
    $content = $content -replace "(?s)/\* 全局 Ant Design 组件样式保护 \*/.*?\}", ""
    
    $content | Set-Content $indexCssPath -Encoding UTF8 -NoNewline
    Write-Host "   已清理 index.css" -ForegroundColor Green
}

# 删除 Ant Design 样式文件
$antdFiles = @(
    "src/styles/antd-fixes.css",
    "src/styles/antd-dev-fixes.css"
)

foreach ($file in $antdFiles) {
    if (Test-Path $file) {
        Remove-Item $file
        Write-Host "   已删除 $file" -ForegroundColor Green
    }
}

Write-Host "5. 准备移除 npm 依赖..." -ForegroundColor Yellow
Write-Host "   请手动运行以下命令来移除 Ant Design 依赖:" -ForegroundColor Cyan
Write-Host "   npm uninstall antd @ant-design/icons" -ForegroundColor White

Write-Host "移除 Ant Design 依赖完成!" -ForegroundColor Green
Write-Host "备份文件保存在: $backupDir" -ForegroundColor Yellow
Write-Host "请测试应用程序以确保一切正常工作。" -ForegroundColor Yellow
