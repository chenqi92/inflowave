# Manual Icon Conversion Script for Tauri
# This script helps convert the root icon.png to required formats

param(
    [string]$SourceIcon = "icon.png",
    [string]$OutputDir = "src-tauri\icons"
)

Write-Host "🎨 Tauri Icon Conversion Helper" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check if source icon exists
$SourcePath = Join-Path $PWD $SourceIcon
if (-not (Test-Path $SourcePath)) {
    Write-Host "❌ Source icon not found: $SourcePath" -ForegroundColor Red
    Write-Host "Please place your icon.png file in the root directory" -ForegroundColor Yellow
    exit 1
}

# Get source icon info
$SourceInfo = Get-Item $SourcePath
Write-Host "✅ Found source icon: $($SourceInfo.Name) ($([math]::Round($SourceInfo.Length / 1KB))KB)" -ForegroundColor Green

# Ensure output directory exists
$OutputPath = Join-Path $PWD $OutputDir
if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
    Write-Host "📁 Created directory: $OutputPath" -ForegroundColor Blue
}

# Copy source icon
$DestPath = Join-Path $OutputPath "icon.png"
Copy-Item $SourcePath $DestPath -Force
Write-Host "📋 Copied source icon to: $DestPath" -ForegroundColor Green

Write-Host ""
Write-Host "🔧 MANUAL CONVERSION STEPS" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow
Write-Host ""

Write-Host "Since ImageMagick is not available, please use online tools:" -ForegroundColor White
Write-Host ""

Write-Host "1. PNG Resizing (use https://www.iloveimg.com/resize-image):" -ForegroundColor Cyan
Write-Host "   Upload your icon.png and create these sizes:" -ForegroundColor White
Write-Host "   - 32x32.png (32x32 pixels)" -ForegroundColor Gray
Write-Host "   - 64x64.png (64x64 pixels)" -ForegroundColor Gray
Write-Host "   - 128x128.png (128x128 pixels)" -ForegroundColor Gray
Write-Host "   - 128x128@2x.png (256x256 pixels)" -ForegroundColor Gray
Write-Host ""

Write-Host "2. Windows ICO (use https://www.icoconverter.com/):" -ForegroundColor Cyan
Write-Host "   Upload your icon.png and download as icon.ico" -ForegroundColor White
Write-Host "   Make sure it includes sizes: 16, 32, 48, 64, 128, 256px" -ForegroundColor Gray
Write-Host ""

Write-Host "3. macOS ICNS (use https://iconverticons.com/online/):" -ForegroundColor Cyan
Write-Host "   Upload your icon.png and download as icon.icns" -ForegroundColor White
Write-Host "   Make sure it includes sizes: 16, 32, 64, 128, 256, 512, 1024px" -ForegroundColor Gray
Write-Host ""

Write-Host "4. Windows Store Logos (use https://www.iloveimg.com/resize-image):" -ForegroundColor Cyan
Write-Host "   Create these additional sizes:" -ForegroundColor White
Write-Host "   - Square30x30Logo.png (30x30)" -ForegroundColor Gray
Write-Host "   - Square44x44Logo.png (44x44)" -ForegroundColor Gray
Write-Host "   - Square71x71Logo.png (71x71)" -ForegroundColor Gray
Write-Host "   - Square89x89Logo.png (89x89)" -ForegroundColor Gray
Write-Host "   - Square107x107Logo.png (107x107)" -ForegroundColor Gray
Write-Host "   - Square142x142Logo.png (142x142)" -ForegroundColor Gray
Write-Host "   - Square150x150Logo.png (150x150)" -ForegroundColor Gray
Write-Host "   - Square284x284Logo.png (284x284)" -ForegroundColor Gray
Write-Host "   - Square310x310Logo.png (310x310)" -ForegroundColor Gray
Write-Host "   - StoreLogo.png (50x50)" -ForegroundColor Gray
Write-Host ""

Write-Host "5. Place all converted files in: $OutputPath" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 QUICK CHECKLIST:" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow
$RequiredFiles = @(
    "icon.png",
    "32x32.png", 
    "64x64.png",
    "128x128.png",
    "128x128@2x.png",
    "icon.ico",
    "icon.icns",
    "Square30x30Logo.png",
    "Square44x44Logo.png", 
    "Square71x71Logo.png",
    "Square89x89Logo.png",
    "Square107x107Logo.png",
    "Square142x142Logo.png",
    "Square150x150Logo.png",
    "Square284x284Logo.png",
    "Square310x310Logo.png",
    "StoreLogo.png"
)

foreach ($file in $RequiredFiles) {
    $filePath = Join-Path $OutputPath $file
    if (Test-Path $filePath) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🚀 After conversion, run 'npm run tauri:build' to test the icons!" -ForegroundColor Cyan

# Optional: Open the icons directory
Write-Host ""
$openDir = Read-Host "Open icons directory? (y/N)"
if ($openDir -eq 'y' -or $openDir -eq 'Y') {
    Start-Process explorer.exe $OutputPath
}
