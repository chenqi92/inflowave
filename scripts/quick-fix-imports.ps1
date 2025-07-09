#!/usr/bin/env pwsh
<#
.SYNOPSIS
    快速修复关键组件的 Tauri API 导入

.DESCRIPTION
    修复最常用的几个组件，确保浏览器模式正常工作

.EXAMPLE
    .\quick-fix-imports.ps1
#>

Write-Host "Quick fix Tauri API imports..." -ForegroundColor Cyan

# 关键文件列表
$keyFiles = @(
    "src/components/common/GlobalSearch.tsx",
    "src/components/query/QueryEditor.tsx", 
    "src/pages/Database/index.tsx",
    "src/pages/Query/index.tsx",
    "src/services/queryOperations.ts"
)

$fixedCount = 0

foreach ($file in $keyFiles) {
    if (Test-Path $file) {
        Write-Host "Fixing: $file" -ForegroundColor Yellow
        
        # 读取并替换内容
        $content = Get-Content $file -Raw -Encoding UTF8
        
        if ($content -match "import.*invoke.*@tauri-apps/api/core") {
            $content = $content -replace "import \{ invoke \} from '@tauri-apps/api/core';", "import { safeTauriInvoke } from '@/utils/tauri';"
            $content = $content -replace "\binvoke\(", "safeTauriInvoke("
            
            # 写回文件
            $content | Set-Content $file -Encoding UTF8 -NoNewline
            
            Write-Host "  Done" -ForegroundColor Green
            $fixedCount++
        } else {
            Write-Host "  Skip (no need)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  File not found: $file" -ForegroundColor Red
    }
}

Write-Host "`nFixed: $fixedCount files" -ForegroundColor Green
Write-Host "Test browser mode: npm run dev" -ForegroundColor Cyan
