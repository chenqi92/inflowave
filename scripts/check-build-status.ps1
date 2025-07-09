#!/usr/bin/env pwsh
<#
.SYNOPSIS
    构建状态检查脚本

.DESCRIPTION
    检查多架构构建的状态、产物和完整性

.PARAMETER OutputDir
    构建输出目录

.PARAMETER Platform
    要检查的平台 (windows, macos, linux, all)

.PARAMETER ShowDetails
    显示详细信息

.EXAMPLE
    .\check-build-status.ps1
    .\check-build-status.ps1 -Platform windows -ShowDetails
    .\check-build-status.ps1 -OutputDir "target/multiarch-builds"

.NOTES
    检查构建产物的完整性和大小信息
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$OutputDir = "target/multiarch-builds",
    
    [Parameter(Mandatory = $false)]
    [ValidateSet("windows", "macos", "linux", "all")]
    [string]$Platform = "all",
    
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
function Write-Step { param([string]$Message) Write-ColorOutput "🔄 $Message" "Magenta" }

# 预期的构建产物
$ExpectedArtifacts = @{
    "windows-x64" = @("msi", "nsis")
    "windows-x86" = @("msi", "nsis")
    "windows-arm64" = @("msi", "nsis")
    "macos-x64" = @("dmg", "app")
    "macos-arm64" = @("dmg", "app")
    "linux-x64" = @("deb", "rpm", "appimage")
    "linux-arm64" = @("deb", "rpm", "appimage")
    "linux-x86" = @("deb", "rpm", "appimage")
}

# 文件扩展名映射
$ExtensionMap = @{
    "msi" = "*.msi"
    "nsis" = "*.exe"
    "dmg" = "*.dmg"
    "app" = "*.app"
    "deb" = "*.deb"
    "rpm" = "*.rpm"
    "appimage" = "*.AppImage"
}

# 格式化文件大小
function Format-FileSize {
    param([long]$Size)
    
    if ($Size -gt 1GB) {
        return "{0:N2} GB" -f ($Size / 1GB)
    } elseif ($Size -gt 1MB) {
        return "{0:N2} MB" -f ($Size / 1MB)
    } elseif ($Size -gt 1KB) {
        return "{0:N2} KB" -f ($Size / 1KB)
    } else {
        return "$Size bytes"
    }
}

# 检查单个平台架构的构建产物
function Check-PlatformBuild {
    param(
        [string]$PlatformArch,
        [string]$BuildPath
    )
    
    $result = @{
        Platform = $PlatformArch
        Path = $BuildPath
        Exists = $false
        Artifacts = @()
        TotalSize = 0
        Status = "Unknown"
    }
    
    if (-not (Test-Path $BuildPath)) {
        $result.Status = "Missing"
        return $result
    }
    
    $result.Exists = $true
    $expectedTypes = $ExpectedArtifacts[$PlatformArch]
    
    if (-not $expectedTypes) {
        $result.Status = "Unsupported"
        return $result
    }
    
    $foundArtifacts = @()
    $totalSize = 0
    
    foreach ($type in $expectedTypes) {
        $pattern = $ExtensionMap[$type]
        $files = Get-ChildItem -Path $BuildPath -Filter $pattern -Recurse -File
        
        foreach ($file in $files) {
            $artifact = @{
                Type = $type
                Name = $file.Name
                Path = $file.FullName
                Size = $file.Length
                SizeFormatted = Format-FileSize $file.Length
                LastModified = $file.LastWriteTime
            }
            $foundArtifacts += $artifact
            $totalSize += $file.Length
        }
    }
    
    $result.Artifacts = $foundArtifacts
    $result.TotalSize = $totalSize
    
    # 判断状态
    if ($foundArtifacts.Count -eq 0) {
        $result.Status = "Empty"
    } elseif ($foundArtifacts.Count -lt $expectedTypes.Count) {
        $result.Status = "Incomplete"
    } else {
        $result.Status = "Complete"
    }
    
    return $result
}

# 显示构建状态摘要
function Show-BuildSummary {
    param([array]$Results)
    
    Write-ColorOutput "`n📊 构建状态摘要" "Cyan"
    Write-ColorOutput "=" * 50 "Cyan"
    
    $statusCounts = @{}
    $totalSize = 0
    $totalArtifacts = 0
    
    foreach ($result in $Results) {
        $status = $result.Status
        if ($statusCounts.ContainsKey($status)) {
            $statusCounts[$status]++
        } else {
            $statusCounts[$status] = 1
        }
        
        $totalSize += $result.TotalSize
        $totalArtifacts += $result.Artifacts.Count
    }
    
    # 显示状态统计
    foreach ($status in $statusCounts.Keys | Sort-Object) {
        $count = $statusCounts[$status]
        $color = switch ($status) {
            "Complete" { "Green" }
            "Incomplete" { "Yellow" }
            "Empty" { "Red" }
            "Missing" { "Red" }
            "Unsupported" { "Gray" }
            default { "White" }
        }
        Write-ColorOutput "  $status`: $count" $color
    }
    
    Write-Info "总构建产物: $totalArtifacts"
    Write-Info "总大小: $(Format-FileSize $totalSize)"
}

# 显示详细信息
function Show-DetailedResults {
    param([array]$Results)
    
    Write-ColorOutput "`n📋 详细构建信息" "Cyan"
    Write-ColorOutput "=" * 50 "Cyan"
    
    foreach ($result in $Results) {
        $statusColor = switch ($result.Status) {
            "Complete" { "Green" }
            "Incomplete" { "Yellow" }
            "Empty" { "Red" }
            "Missing" { "Red" }
            "Unsupported" { "Gray" }
            default { "White" }
        }
        
        Write-ColorOutput "`n🔹 $($result.Platform)" "Yellow"
        Write-ColorOutput "  状态: $($result.Status)" $statusColor
        Write-ColorOutput "  路径: $($result.Path)" "Gray"
        
        if ($result.Exists) {
            Write-ColorOutput "  总大小: $(Format-FileSize $result.TotalSize)" "White"
            Write-ColorOutput "  产物数量: $($result.Artifacts.Count)" "White"
            
            if ($result.Artifacts.Count -gt 0) {
                Write-ColorOutput "  构建产物:" "White"
                foreach ($artifact in $result.Artifacts) {
                    Write-ColorOutput "    📦 $($artifact.Name)" "White"
                    Write-ColorOutput "       类型: $($artifact.Type) | 大小: $($artifact.SizeFormatted)" "Gray"
                    Write-ColorOutput "       修改时间: $($artifact.LastModified)" "Gray"
                }
            }
        }
    }
}

# 生成构建报告
function Generate-BuildReport {
    param([array]$Results, [string]$OutputPath)
    
    $report = @{
        GeneratedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        TotalBuilds = $Results.Count
        Results = $Results
        Summary = @{}
    }
    
    # 生成摘要
    $statusCounts = @{}
    $totalSize = 0
    $totalArtifacts = 0
    
    foreach ($result in $Results) {
        $status = $result.Status
        if ($statusCounts.ContainsKey($status)) {
            $statusCounts[$status]++
        } else {
            $statusCounts[$status] = 1
        }
        
        $totalSize += $result.TotalSize
        $totalArtifacts += $result.Artifacts.Count
    }
    
    $report.Summary = @{
        StatusCounts = $statusCounts
        TotalSize = $totalSize
        TotalArtifacts = $totalArtifacts
    }
    
    # 保存报告
    $reportJson = $report | ConvertTo-Json -Depth 10
    $reportPath = Join-Path $OutputPath "build-report.json"
    $reportJson | Out-File -FilePath $reportPath -Encoding UTF8
    
    Write-Success "构建报告已保存到: $reportPath"
}

# 主函数
function Check-BuildStatus {
    Write-ColorOutput @"

🔍 构建状态检查
================
输出目录: $OutputDir
平台过滤: $Platform

"@ "Cyan"

    # 检查输出目录是否存在
    if (-not (Test-Path $OutputDir)) {
        Write-Error "构建输出目录不存在: $OutputDir"
        Write-Info "请先运行构建脚本生成构建产物"
        exit 1
    }
    
    # 获取要检查的平台架构列表
    $platformsToCheck = @()
    
    if ($Platform -eq "all") {
        $platformsToCheck = $ExpectedArtifacts.Keys
    } else {
        $platformsToCheck = $ExpectedArtifacts.Keys | Where-Object { $_ -like "$Platform-*" }
    }
    
    if ($platformsToCheck.Count -eq 0) {
        Write-Error "没有找到要检查的平台"
        exit 1
    }
    
    Write-Step "检查 $($platformsToCheck.Count) 个平台架构的构建状态..."
    
    # 检查每个平台架构
    $results = @()
    foreach ($platformArch in $platformsToCheck) {
        $buildPath = Join-Path $OutputDir $platformArch
        $result = Check-PlatformBuild -PlatformArch $platformArch -BuildPath $buildPath
        $results += $result
        
        # 显示简要状态
        $statusIcon = switch ($result.Status) {
            "Complete" { "✅" }
            "Incomplete" { "⚠️" }
            "Empty" { "❌" }
            "Missing" { "❌" }
            "Unsupported" { "❓" }
            default { "❓" }
        }
        Write-Info "$statusIcon $platformArch`: $($result.Status) ($($result.Artifacts.Count) 个产物)"
    }
    
    # 显示摘要
    Show-BuildSummary -Results $results
    
    # 显示详细信息
    if ($ShowDetails) {
        Show-DetailedResults -Results $results
    }
    
    # 生成报告
    Generate-BuildReport -Results $results -OutputPath $OutputDir
    
    # 检查是否有失败的构建
    $failedBuilds = $results | Where-Object { $_.Status -in @("Empty", "Missing", "Incomplete") }
    if ($failedBuilds.Count -gt 0) {
        Write-Warning "发现 $($failedBuilds.Count) 个问题构建，建议重新构建"
        Write-Info "要重新构建，请运行: .\scripts\build-multiarch.ps1"
        exit 1
    } else {
        Write-Success "所有构建均正常！"
    }
}

# 执行主函数
try {
    Check-BuildStatus
} catch {
    Write-Error "检查构建状态时发生错误: $($_.Exception.Message)"
    exit 1
}
