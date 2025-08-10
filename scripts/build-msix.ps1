# InfloWave MSIX Build Script
# Note: Tauri 2.0 doesn't have native MSIX support yet
# This script builds standard Windows packages and provides guidance for MSIX conversion

param(
    [string]$Target = "x86_64-pc-windows-msvc",
    [string]$Profile = "release",
    [switch]$Clean = $false,
    [switch]$Verbose = $false,
    [switch]$WhatIf = $false
)

$ErrorActionPreference = "Stop"

Write-Host "InfloWave MSIX Build Script" -ForegroundColor Cyan
Write-Host "Target Platform: $Target" -ForegroundColor Green
Write-Host "Build Profile: $Profile" -ForegroundColor Green

if ($WhatIf) {
    Write-Host "DRY RUN MODE - No actual build will be performed" -ForegroundColor Yellow
}

# Switch to src-tauri directory
Push-Location "src-tauri"

try {
    # Clean build cache if requested
    if ($Clean) {
        Write-Host "Cleaning build cache..." -ForegroundColor Yellow
        cargo clean
    }

    # Check if executable exists
    $exePath = "target\$Target\release\InfloWave.exe"
    $altExePath = "target\release\InfloWave.exe"
    
    if ((-not (Test-Path $exePath)) -and (-not (Test-Path $altExePath))) {
        Write-Host "Building Rust application first..." -ForegroundColor Yellow
        $buildArgs = @("build", "--target", $Target)
        if ($Profile -eq "release") {
            $buildArgs += "--release"
        }
        if ($Verbose) {
            $buildArgs += "--verbose"
        }
        
        & cargo @buildArgs
        if ($LASTEXITCODE -ne 0) {
            throw "Rust build failed"
        }
    } else {
        Write-Host "Executable already exists" -ForegroundColor Green
    }

    # Build standard Windows package
    Write-Host "Building Windows package (NSIS installer)..." -ForegroundColor Yellow

    if ($WhatIf) {
        Write-Host "WOULD EXECUTE: tauri build --target $Target" -ForegroundColor Yellow
        Write-Host "Dry run completed successfully" -ForegroundColor Green
        return
    } else {
        Write-Host "Executing: tauri build --target $Target" -ForegroundColor Gray

        # Use tauri CLI directly
        & tauri build --target $Target
        if ($LASTEXITCODE -ne 0) {
            throw "Windows build failed"
        }
    }

    # Show build results
    Write-Host "Windows build completed!" -ForegroundColor Green
    
    # Look for generated files
    $nsisPath = "target\$Target\release\bundle\nsis\*.exe"
    $nsisFiles = Get-ChildItem $nsisPath -ErrorAction SilentlyContinue
    
    if (-not $nsisFiles) {
        # Try alternative path
        $nsisPath = "target\release\bundle\nsis\*.exe"
        $nsisFiles = Get-ChildItem $nsisPath -ErrorAction SilentlyContinue
    }

    if ($nsisFiles) {
        Write-Host "Generated Windows installer files:" -ForegroundColor Cyan
        foreach ($file in $nsisFiles) {
            $sizeMB = [math]::Round($file.Length / 1MB, 2)
            Write-Host "  $($file.Name) ($sizeMB MB)" -ForegroundColor White
            Write-Host "  Path: $($file.FullName)" -ForegroundColor Gray
        }
    } else {
        Write-Host "No installer files found" -ForegroundColor Yellow
    }

    # MSIX conversion guidance
    Write-Host "`n📱 MSIX Packaging Guidance:" -ForegroundColor Cyan
    Write-Host "Tauri 2.0 doesn't have native MSIX support yet." -ForegroundColor Yellow
    Write-Host "To create MSIX packages for Microsoft Store:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Use MSIX Packaging Tool" -ForegroundColor Green
    Write-Host "  1. Install MSIX Packaging Tool from Microsoft Store" -ForegroundColor Gray
    Write-Host "  2. Use 'Create package from installer' option" -ForegroundColor Gray
    Write-Host "  3. Select the generated .exe installer" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option 2: Use Visual Studio" -ForegroundColor Green
    Write-Host "  1. Create a Windows Application Packaging Project" -ForegroundColor Gray
    Write-Host "  2. Add the executable as a reference" -ForegroundColor Gray
    Write-Host "  3. Configure Package.appxmanifest" -ForegroundColor Gray
    Write-Host "  4. Build the project to generate .msix" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option 3: Use MakeAppx.exe (Advanced)" -ForegroundColor Green
    Write-Host "  1. Create package manifest manually" -ForegroundColor Gray
    Write-Host "  2. Use MakeAppx.exe pack command" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Generated installer can be found at:" -ForegroundColor Cyan
    if ($nsisFiles) {
        Write-Host "  $($nsisFiles[0].FullName)" -ForegroundColor White
    }

} catch {
    Write-Host "Build failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

Write-Host "`nMSIX build script completed!" -ForegroundColor Green
Write-Host "Use the guidance above to convert the installer to MSIX format." -ForegroundColor Yellow
