#!/usr/bin/env pwsh
<#
.SYNOPSIS
    清理未使用的导入和变量

.DESCRIPTION
    批量清理 TypeScript 文件中的未使用导入和变量

.EXAMPLE
    .\clean-unused-imports.ps1
#>

# 颜色输出函数
function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Write-Step { param([string]$Message) Write-ColorOutput "🔧 $Message" "Cyan" }
function Write-Success { param([string]$Message) Write-ColorOutput "✅ $Message" "Green" }
function Write-Info { param([string]$Message) Write-ColorOutput "ℹ️  $Message" "Blue" }
function Write-Warning { param([string]$Message) Write-ColorOutput "⚠️  $Message" "Yellow" }
function Write-Error { param([string]$Message) Write-ColorOutput "❌ $Message" "Red" }

Write-ColorOutput "🧹 清理未使用的导入和变量" "Magenta"
Write-ColorOutput "================================" "Magenta"

$fixedCount = 0
$errorCount = 0

# 定义需要清理的文件和对应的未使用导入
$cleanupRules = @{
    "src/components/common/DataExportDialog.tsx" = @("Progress", "Text")
    "src/components/common/DataWriteDialog.tsx" = @("Progress", "UploadOutlined")
    "src/components/common/ExportDialog.tsx" = @("Option", "TextArea")
    "src/components/common/GlobalSearch.tsx" = @("HistoryOutlined", "StarOutlined", "safeTauriInvoke")
    "src/components/common/ImportDialog.tsx" = @("Divider", "FileTextOutlined", "TableOutlined", "ExclamationCircleOutlined", "Text", "TextArea")
    "src/components/common/RetentionPolicyDialog.tsx" = @("Title", "Text")
    "src/components/common/SimpleChart.tsx" = @("total")
    "src/components/ConnectionTest.tsx" = @("Spin")
    "src/components/dashboard/DashboardDesigner.tsx" = @("Tooltip", "Grid", "DashboardOutlined", "BarChartOutlined", "LineChartOutlined", "PieChartOutlined", "TableOutlined", "EyeOutlined", "activeConnectionId", "loading")
    "src/components/dashboard/DashboardManager.tsx" = @("SettingOutlined")
    "src/components/dashboard/PerformanceMonitor.tsx" = @("safeTauriInvoke", "Title", "activeConnectionId")
    "src/components/data/DataImportWizard.tsx" = @("useEffect", "DatabaseOutlined", "ImportOutlined", "connections")
    "src/components/database/DatabaseContextMenu.tsx" = @("DatabaseOutlined", "ImportOutlined", "SettingOutlined", "BarChartOutlined")
    "src/components/database/DatabaseManager.tsx" = @("ExclamationCircleOutlined", "TabPane")
    "src/components/database/TableContextMenu.tsx" = @("Menu", "DatabaseOutlined", "SettingOutlined")
    "src/components/extensions/ExtensionManager.tsx" = @("Alert", "Divider", "Row", "Col", "SettingOutlined", "PauseCircleOutlined", "ExperimentOutlined", "Title", "testModalVisible", "setTestModalVisible")
    "src/components/layout/AppHeader.tsx" = @("connectionUtils", "config")
    "src/components/layout/AppStatusBar.tsx" = @("DatabaseOutlined")
    "src/components/layout/AppToolbar.tsx" = @("TableOutlined", "PlayCircleOutlined", "StopOutlined", "AppstoreOutlined", "EditOutlined", "config")
    "src/components/layout/DataGripLayout.tsx" = @("MonitorOutlined", "Title", "info", "measurement", "query")
    "src/components/layout/DesktopPageWrapper.tsx" = @("Space", "index")
    "src/components/monitoring/RealTimeMonitor.tsx" = @("Progress", "Tooltip", "ReloadOutlined", "setMonitoringQueries")
    "src/components/performance/PerformanceMonitor.tsx" = @("SettingOutlined")
    "src/components/query/QueryEditor.tsx" = @("useEffect", "useRef", "Tooltip")
    "src/components/query/QueryHistory.tsx" = @("SearchOutlined", "DatabaseOutlined", "ExportOutlined", "editingQuery", "handleSaveEditedQuery")
    "src/components/query/QueryHistoryPanel.tsx" = @("DatabaseOutlined", "FileTextOutlined", "addHistoryItem")
    "src/components/query/QueryResultContextMenu.tsx" = @("DeleteOutlined")
    "src/components/query/QueryResults.tsx" = @("MoreOutlined")
    "src/components/query/SavedQueries.tsx" = @("SearchOutlined", "CloseOutlined")
    "src/pages/Connections/index.tsx" = @("storeConnections", "result")
    "src/pages/Dashboard/index.tsx" = @("currentDashboard")
    "src/pages/Database/index.tsx" = @("ColumnsType", "database", "record")
    "src/pages/DataWrite/index.tsx" = @("Upload")
    "src/pages/FeatureShowcase.tsx" = @("DashboardOutlined", "ApiOutlined", "ExportOutlined", "BellOutlined", "KeyboardOutlined")
    "src/pages/Performance/index.tsx" = @("Card")
    "src/pages/Query/index.tsx" = @("FolderOutlined", "info")
    "src/pages/Settings/index.tsx" = @("Input")
    "src/pages/Visualization/index.tsx" = @("Tabs", "index")
    "src/store/app.ts" = @("get")
    "src/utils/featureTest.ts" = @("result", "history", "savedQueries", "dashboards", "preview", "policies", "metrics", "slowQueries", "resources", "preferences", "plugins", "integrations", "rules")
}

foreach ($file in $cleanupRules.Keys) {
    if (-not (Test-Path $file)) {
        Write-Warning "文件不存在: $file"
        continue
    }
    
    Write-Step "清理文件: $file"
    
    try {
        $content = Get-Content $file -Raw -Encoding UTF8
        $originalContent = $content
        $hasChanges = $false
        
        foreach ($unusedImport in $cleanupRules[$file]) {
            # 移除未使用的导入
            if ($content -match "import.*$unusedImport.*from") {
                $content = $content -replace ",\s*$unusedImport", ""
                $content = $content -replace "$unusedImport\s*,", ""
                $content = $content -replace "{\s*$unusedImport\s*}", ""
                $hasChanges = $true
            }
            
            # 移除未使用的变量声明
            if ($content -match "const.*$unusedImport.*=") {
                $content = $content -replace "const\s+$unusedImport\s*=.*?;", ""
                $hasChanges = $true
            }
        }
        
        if ($hasChanges) {
            # 清理空的导入行
            $content = $content -replace "import\s*{\s*}\s*from.*?;", ""
            $content = $content -replace "\n\s*\n\s*\n", "`n`n"
            
            $content | Set-Content $file -Encoding UTF8 -NoNewline
            Write-Success "  已清理: $file"
            $fixedCount++
        } else {
            Write-Info "  无需清理: $file"
        }
        
    } catch {
        Write-Error "  清理失败: $file - $($_.Exception.Message)"
        $errorCount++
    }
}

Write-ColorOutput "`n📊 清理总结:" "Yellow"
Write-Success "成功清理: $fixedCount 个文件"
if ($errorCount -gt 0) {
    Write-Error "失败: $errorCount 个文件"
}

Write-ColorOutput "`n清理完成！建议运行 TypeScript 检查验证结果。" "Green"
