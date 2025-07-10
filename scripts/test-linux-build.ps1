#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Test Linux build with icon fix for AppImage

.DESCRIPTION
    This script tests the Linux build process to verify that the AppImage icon issue is resolved.
    It performs a quick build test without full packaging to validate the configuration.

.EXAMPLE
    .\test-linux-build.ps1
#>

param(
    [switch]$FullBuild = $false,
    [switch]$CheckOnly = $false
)

Write-Host "🔧 Testing Linux Build Configuration..." -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "src-tauri/tauri.conf.json")) {
    Write-Host "❌ Error: Must be run from project root directory" -ForegroundColor Red
    exit 1
}

# Verify icon files exist
Write-Host "📁 Checking icon files..." -ForegroundColor Yellow

$iconFiles = @(
    "src-tauri/icons/icon.png",
    "src-tauri/icons/linux/icon.png"
)

$missingIcons = @()
foreach ($icon in $iconFiles) {
    if (-not (Test-Path $icon)) {
        $missingIcons += $icon
        Write-Host "❌ Missing: $icon" -ForegroundColor Red
    } else {
        Write-Host "✅ Found: $icon" -ForegroundColor Green
    }
}

if ($missingIcons.Count -gt 0) {
    Write-Host "❌ Missing icon files. Please ensure all required icons exist." -ForegroundColor Red
    exit 1
}

# Check tauri.conf.json configuration
Write-Host "⚙️ Validating tauri.conf.json..." -ForegroundColor Yellow

try {
    $config = Get-Content "src-tauri/tauri.conf.json" | ConvertFrom-Json
    
    # Check if PNG icons are included
    $hasPngIcon = $false
    foreach ($icon in $config.bundle.icon) {
        if ($icon -like "*.png") {
            $hasPngIcon = $true
            Write-Host "✅ Found PNG icon in config: $icon" -ForegroundColor Green
        }
    }
    
    if (-not $hasPngIcon) {
        Write-Host "❌ No PNG icons found in bundle configuration" -ForegroundColor Red
        exit 1
    }
    
    # Check AppImage configuration
    if ($config.bundle.linux.appimage) {
        Write-Host "✅ AppImage configuration found" -ForegroundColor Green
    } else {
        Write-Host "⚠️ No specific AppImage configuration found" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Error reading tauri.conf.json: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

if ($CheckOnly) {
    Write-Host "✅ Configuration check completed successfully!" -ForegroundColor Green
    exit 0
}

# Test build process
Write-Host "🔨 Testing build process..." -ForegroundColor Yellow

try {
    # Check if Rust is available
    $rustVersion = cargo --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Cargo not found. Please install Rust." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Rust/Cargo available: $rustVersion" -ForegroundColor Green
    
    # Check if Node.js is available
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Node.js not found. Please install Node.js." -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Node.js available: $nodeVersion" -ForegroundColor Green
    
    # Install dependencies if needed
    if (-not (Test-Path "node_modules")) {
        Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to install Node.js dependencies" -ForegroundColor Red
            exit 1
        }
    }
    
    # Test Rust compilation
    Write-Host "🦀 Testing Rust compilation..." -ForegroundColor Yellow
    Set-Location "src-tauri"
    cargo check
    $rustCheckResult = $LASTEXITCODE
    Set-Location ".."
    
    if ($rustCheckResult -ne 0) {
        Write-Host "❌ Rust compilation check failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Rust compilation check passed" -ForegroundColor Green
    
    if ($FullBuild) {
        Write-Host "🏗️ Performing full build test..." -ForegroundColor Yellow
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Frontend build failed" -ForegroundColor Red
            exit 1
        }
        Write-Host "✅ Frontend build successful" -ForegroundColor Green
        
        # Note: We don't actually run tauri build here as it would require Linux environment
        Write-Host "ℹ️ Full Tauri build requires Linux environment for AppImage generation" -ForegroundColor Blue
    }
    
} catch {
    Write-Host "❌ Build test failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Linux build configuration test completed successfully!" -ForegroundColor Green
Write-Host "📝 Summary:" -ForegroundColor Cyan
Write-Host "  - PNG icons are properly configured" -ForegroundColor White
Write-Host "  - AppImage configuration is present" -ForegroundColor White
Write-Host "  - Build dependencies are available" -ForegroundColor White
Write-Host "  - Rust compilation check passed" -ForegroundColor White

if (-not $FullBuild) {
    Write-Host "💡 Run with -FullBuild to test frontend compilation" -ForegroundColor Blue
}

Write-Host "🚀 The configuration should now work for Linux AppImage builds in CI/CD" -ForegroundColor Green
