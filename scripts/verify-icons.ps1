# Icon Verification Script for Tauri
# Verifies that all required icon files exist and have been updated

param(
    [string]$IconsDir = "src-tauri\icons"
)

Write-Host "🔍 Tauri Icon Verification" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

$IconsPath = Join-Path $PWD $IconsDir
if (-not (Test-Path $IconsPath)) {
    Write-Host "❌ Icons directory not found: $IconsPath" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Checking icons in: $IconsPath" -ForegroundColor Blue
Write-Host ""

# Define required files
$RequiredFiles = @{
    # Basic PNG icons
    "icon.png" = "Main icon (512x512)"
    "32x32.png" = "Small icon (32x32)"
    "64x64.png" = "Medium icon (64x64)"
    "128x128.png" = "Large icon (128x128)"
    "128x128@2x.png" = "High-res icon (256x256)"
    
    # Windows platform
    "icon.ico" = "Windows ICO format"
    "Square30x30Logo.png" = "Windows Store 30x30"
    "Square44x44Logo.png" = "Windows Store 44x44"
    "Square71x71Logo.png" = "Windows Store 71x71"
    "Square89x89Logo.png" = "Windows Store 89x89"
    "Square107x107Logo.png" = "Windows Store 107x107"
    "Square142x142Logo.png" = "Windows Store 142x142"
    "Square150x150Logo.png" = "Windows Store 150x150"
    "Square284x284Logo.png" = "Windows Store 284x284"
    "Square310x310Logo.png" = "Windows Store 310x310"
    "StoreLogo.png" = "Windows Store Logo (50x50)"
    
    # macOS platform
    "icon.icns" = "macOS ICNS format"
}

$SubdirectoryFiles = @{
    # Windows subdirectory
    "windows\64x64.ico" = "Windows 64x64 ICO"
    
    # Android subdirectories
    "android\mipmap-mdpi\ic_launcher.png" = "Android MDPI (48x48)"
    "android\mipmap-hdpi\ic_launcher.png" = "Android HDPI (72x72)"
    "android\mipmap-xhdpi\ic_launcher.png" = "Android XHDPI (96x96)"
    "android\mipmap-xxhdpi\ic_launcher.png" = "Android XXHDPI (144x144)"
    "android\mipmap-xxxhdpi\ic_launcher.png" = "Android XXXHDPI (192x192)"
    
    # iOS subdirectory
    "ios\AppIcon-20x20@1x.png" = "iOS 20x20@1x"
    "ios\AppIcon-20x20@2x.png" = "iOS 20x20@2x"
    "ios\AppIcon-20x20@2x-1.png" = "iOS 20x20@2x-1"
    "ios\AppIcon-20x20@3x.png" = "iOS 20x20@3x"
    "ios\AppIcon-29x29@1x.png" = "iOS 29x29@1x"
    "ios\AppIcon-29x29@2x.png" = "iOS 29x29@2x"
    "ios\AppIcon-29x29@2x-1.png" = "iOS 29x29@2x-1"
    "ios\AppIcon-29x29@3x.png" = "iOS 29x29@3x"
    "ios\AppIcon-40x40@1x.png" = "iOS 40x40@1x"
    "ios\AppIcon-40x40@2x.png" = "iOS 40x40@2x"
    "ios\AppIcon-40x40@2x-1.png" = "iOS 40x40@2x-1"
    "ios\AppIcon-40x40@3x.png" = "iOS 40x40@3x"
    "ios\AppIcon-60x60@2x.png" = "iOS 60x60@2x"
    "ios\AppIcon-60x60@3x.png" = "iOS 60x60@3x"
    "ios\AppIcon-76x76@1x.png" = "iOS 76x76@1x"
    "ios\AppIcon-76x76@2x.png" = "iOS 76x76@2x"
    "ios\AppIcon-83.5x83.5@2x.png" = "iOS 83.5x83.5@2x"
    "ios\AppIcon-512@2x.png" = "iOS 512@2x"
}

$TotalFiles = 0
$ExistingFiles = 0
$MissingFiles = @()

Write-Host "📋 Basic Icons:" -ForegroundColor Yellow
foreach ($file in $RequiredFiles.GetEnumerator()) {
    $filePath = Join-Path $IconsPath $file.Key
    $TotalFiles++
    
    if (Test-Path $filePath) {
        $fileInfo = Get-Item $filePath
        $sizeKB = [math]::Round($fileInfo.Length / 1KB, 1)
        Write-Host "  ✅ $($file.Key) - $($file.Value) (${sizeKB}KB)" -ForegroundColor Green
        $ExistingFiles++
    } else {
        Write-Host "  ❌ $($file.Key) - $($file.Value)" -ForegroundColor Red
        $MissingFiles += $file.Key
    }
}

Write-Host ""
Write-Host "📋 Platform-Specific Icons:" -ForegroundColor Yellow
foreach ($file in $SubdirectoryFiles.GetEnumerator()) {
    $filePath = Join-Path $IconsPath $file.Key
    $TotalFiles++
    
    if (Test-Path $filePath) {
        $fileInfo = Get-Item $filePath
        $sizeKB = [math]::Round($fileInfo.Length / 1KB, 1)
        Write-Host "  ✅ $($file.Key) - $($file.Value) (${sizeKB}KB)" -ForegroundColor Green
        $ExistingFiles++
    } else {
        Write-Host "  ❌ $($file.Key) - $($file.Value)" -ForegroundColor Red
        $MissingFiles += $file.Key
    }
}

Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "==========" -ForegroundColor Cyan
Write-Host "Total files required: $TotalFiles" -ForegroundColor White
Write-Host "Files found: $ExistingFiles" -ForegroundColor Green
Write-Host "Files missing: $($TotalFiles - $ExistingFiles)" -ForegroundColor Red

if ($MissingFiles.Count -eq 0) {
    Write-Host ""
    Write-Host "🎉 All icon files are present!" -ForegroundColor Green
    Write-Host "✅ Ready for Tauri build" -ForegroundColor Green
    
    # Check if main icon was recently updated
    $mainIconPath = Join-Path $IconsPath "icon.png"
    if (Test-Path $mainIconPath) {
        $mainIcon = Get-Item $mainIconPath
        $timeDiff = (Get-Date) - $mainIcon.LastWriteTime
        if ($timeDiff.TotalMinutes -lt 10) {
            Write-Host "🔄 Main icon was recently updated ($($mainIcon.LastWriteTime))" -ForegroundColor Cyan
        }
    }
} else {
    Write-Host ""
    Write-Host "⚠️  Missing files need to be created:" -ForegroundColor Yellow
    foreach ($missing in $MissingFiles) {
        Write-Host "   - $missing" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "💡 Run the icon conversion script to generate missing files:" -ForegroundColor Blue
    Write-Host "   node scripts/convert-icon.js" -ForegroundColor Gray
    Write-Host "   or" -ForegroundColor Gray
    Write-Host "   powershell -ExecutionPolicy Bypass -File scripts/convert-icon-manual.ps1" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "1. Test the icons: npm run tauri:build" -ForegroundColor White
Write-Host "2. Check the built application for correct icon display" -ForegroundColor White
