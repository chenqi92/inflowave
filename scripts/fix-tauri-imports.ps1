#!/usr/bin/env pwsh
<#
.SYNOPSIS
    批量修复 Tauri API 导入的脚本

.DESCRIPTION
    将项目中所有直接使用 @tauri-apps/api/core 的文件替换为安全的包装器

.EXAMPLE
    .\fix-tauri-imports.ps1

.NOTES
    自动化修复浏览器兼容性问题
#>

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

Write-ColorOutput @"

🔧 Tauri API 导入修复工具
========================

"@ "Cyan"

# 需要修复的文件列表
$filesToFix = @(
    "src/components/common/ContextMenu.tsx",
    "src/components/common/DataExportDialog.tsx", 
    "src/components/common/DataWriteDialog.tsx",
    "src/components/common/GlobalSearch.tsx",
    "src/components/common/ImportDialog.tsx",
    "src/components/common/RetentionPolicyDialog.tsx",
    "src/components/ConnectionTest.tsx",
    "src/components/dashboard/DashboardManager.tsx",
    "src/components/dashboard/PerformanceMonitor.tsx",
    "src/components/layout/DataGripLayout.tsx",
    "src/components/query/QueryEditor.tsx",
    "src/components/query/QueryHistoryPanel.tsx",
    "src/components/settings/UserPreferences.tsx",
    "src/pages/Connections/index.tsx",
    "src/pages/Database/index.tsx",
    "src/pages/DataWrite/index.tsx",
    "src/pages/Query/index.tsx",
    "src/pages/Settings/index.tsx",
    "src/pages/Visualization/index.tsx",
    "src/services/queryOperations.ts"
)

$fixedCount = 0
$skippedCount = 0
$errorCount = 0

Write-Info "找到 $($filesToFix.Count) 个需要修复的文件"

foreach ($file in $filesToFix) {
    if (-not (Test-Path $file)) {
        Write-Warning "文件不存在: $file"
        $skippedCount++
        continue
    }
    
    Write-Step "修复文件: $file"
    
    try {
        # 读取文件内容
        $content = Get-Content $file -Raw -Encoding UTF8
        
        # 检查是否需要修复
        if ($content -notmatch "import.*invoke.*@tauri-apps/api/core") {
            Write-Info "  跳过 (已修复或无需修复): $file"
            $skippedCount++
            continue
        }
        
        # 执行替换
        $newContent = $content -replace "import \{ invoke \} from '@tauri-apps/api/core';", "import { safeTauriInvoke } from '@/utils/tauri';"
        $newContent = $newContent -replace "invoke\(", "safeTauriInvoke("
        
        # 写回文件
        $newContent | Set-Content $file -Encoding UTF8 -NoNewline
        
        Write-Success "  修复完成: $file"
        $fixedCount++

    } catch {
        Write-Error "  修复失败: $file - $($_.Exception.Message)"
        $errorCount++
    }
}

Write-ColorOutput "`n📊 修复总结:" "Yellow"
Write-Success "成功修复: $fixedCount 个文件"
Write-Info "跳过: $skippedCount 个文件"
if ($errorCount -gt 0) {
    Write-Error "失败: $errorCount 个文件"
}

if ($fixedCount -gt 0) {
    Write-ColorOutput "`n修复完成！现在所有组件都应该能在浏览器模式下正常工作。" "Green"
    Write-Info "建议运行测试验证修复效果:"
    Write-Info "  npm run dev"
} else {
    Write-Info "没有文件需要修复。"
}
