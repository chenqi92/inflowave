# InfloWave Windows Portable ZIP Build Script
# Build portable ZIP packages for Windows (extract and run)

param(
    [string]$Target = "x86_64-pc-windows-msvc",
    [string]$Profile = "release",
    [switch]$Clean = $false,
    [switch]$Verbose = $false,
    [switch]$SkipBuild = $false
)

$ErrorActionPreference = "Stop"

Write-Host "InfloWave Windows Portable ZIP Build Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Target Platform: $Target" -ForegroundColor Green
Write-Host "Build Profile: $Profile" -ForegroundColor Green

# Get project root directory
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $projectRoot) {
    $projectRoot = (Get-Location).Path
}

# Read version from package.json
$packageJsonPath = Join-Path $projectRoot "package.json"
if (Test-Path $packageJsonPath) {
    $packageJson = Get-Content $packageJsonPath | ConvertFrom-Json
    $version = $packageJson.version
} else {
    # Fallback: read from tauri.conf.json
    $tauriConfPath = Join-Path $projectRoot "src-tauri\tauri.conf.json"
    if (Test-Path $tauriConfPath) {
        $tauriConf = Get-Content $tauriConfPath | ConvertFrom-Json
        $version = $tauriConf.version
    } else {
        $version = "0.0.0"
    }
}

Write-Host "Version: $version" -ForegroundColor Green

# Determine architecture name
$archName = switch ($Target) {
    "x86_64-pc-windows-msvc" { "x64" }
    "i686-pc-windows-msvc" { "x86" }
    default { "unknown" }
}

Write-Host "Architecture: $archName" -ForegroundColor Green

# Switch to src-tauri directory
$srcTauriPath = Join-Path $projectRoot "src-tauri"
Push-Location $srcTauriPath

try {
    # Clean build cache if requested
    if ($Clean) {
        Write-Host "Cleaning build cache..." -ForegroundColor Yellow
        cargo clean
    }

    # Build the application if not skipping
    if (-not $SkipBuild) {
        Write-Host "`nBuilding application..." -ForegroundColor Cyan

        # Check and install Rust target if needed
        Write-Host "Checking Rust target: $Target" -ForegroundColor Yellow
        $installedTargets = rustup target list --installed 2>$null
        if ($installedTargets -notcontains $Target) {
            Write-Host "Installing Rust target: $Target" -ForegroundColor Yellow
            rustup target add $Target
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to install Rust target: $Target"
            }
        }

        # Build frontend first
        Write-Host "Building frontend..." -ForegroundColor Yellow
        Push-Location $projectRoot
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "Frontend build failed"
        }
        Pop-Location

        # Build Rust application
        Write-Host "Building Rust application for $Target..." -ForegroundColor Yellow
        cargo build --release --target $Target
        if ($LASTEXITCODE -ne 0) {
            throw "Rust build failed"
        }
    }

    # Locate the built executable
    $exePath = Join-Path $srcTauriPath "target\$Target\release\InfloWave.exe"
    if (-not (Test-Path $exePath)) {
        # Try alternative path
        $exePath = Join-Path $srcTauriPath "target\release\InfloWave.exe"
    }

    if (-not (Test-Path $exePath)) {
        throw "Could not find built executable. Expected at: target\$Target\release\InfloWave.exe"
    }

    Write-Host "Found executable: $exePath" -ForegroundColor Green

    # Create output directory for portable ZIP
    $outputDir = Join-Path $srcTauriPath "target\$Target\release\bundle\zip"
    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }

    # Create temporary directory for packaging
    $tempDir = Join-Path $env:TEMP "InfloWave-portable-$archName-$(Get-Random)"
    $appDir = Join-Path $tempDir "InfloWave"
    New-Item -ItemType Directory -Path $appDir -Force | Out-Null

    Write-Host "`nPreparing portable package..." -ForegroundColor Cyan

    # Copy main executable
    Write-Host "  Copying executable..." -ForegroundColor Gray
    Copy-Item $exePath -Destination $appDir

    # Copy resources if they exist
    $resourcesPath = Join-Path $projectRoot "docs\release-notes"
    if (Test-Path $resourcesPath) {
        Write-Host "  Copying release notes..." -ForegroundColor Gray
        $destResourcesPath = Join-Path $appDir "resources\release-notes"
        New-Item -ItemType Directory -Path $destResourcesPath -Force | Out-Null
        Copy-Item "$resourcesPath\*" -Destination $destResourcesPath -Recurse -ErrorAction SilentlyContinue
    }

    # Copy WebView2 loader if exists (for offline WebView2 support)
    $webview2LoaderPath = Join-Path $srcTauriPath "target\$Target\release\WebView2Loader.dll"
    if (Test-Path $webview2LoaderPath) {
        Write-Host "  Copying WebView2Loader.dll..." -ForegroundColor Gray
        Copy-Item $webview2LoaderPath -Destination $appDir
    }

    # Create a README for the portable version
    $readmeContent = @"
InfloWave v$version - Portable Edition ($archName)
================================================

This is the portable version of InfloWave. No installation required.

Usage:
------
1. Extract this ZIP to any folder
2. Double-click InfloWave.exe to run

Requirements:
-------------
- Windows 10/11
- Microsoft Edge WebView2 Runtime (usually pre-installed on Windows 10/11)
  If not installed, download from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/

Notes:
------
- Settings are stored in: %APPDATA%\inflowave
- This portable version works the same as the installed version

For more information, visit: https://github.com/chenqi92/inflowave
"@
    $readmePath = Join-Path $appDir "README.txt"
    Set-Content -Path $readmePath -Value $readmeContent -Encoding UTF8

    # Create the ZIP file
    $zipFileName = "InfloWave_${version}_${archName}_portable.zip"
    $zipPath = Join-Path $outputDir $zipFileName

    Write-Host "`nCreating ZIP archive: $zipFileName" -ForegroundColor Cyan

    # Remove existing ZIP if present
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }

    # Create ZIP archive
    Compress-Archive -Path "$appDir\*" -DestinationPath $zipPath -CompressionLevel Optimal

    if (Test-Path $zipPath) {
        $zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
        Write-Host "`nPortable ZIP created successfully!" -ForegroundColor Green
        Write-Host "  File: $zipFileName" -ForegroundColor White
        Write-Host "  Size: $zipSize MB" -ForegroundColor White
        Write-Host "  Path: $zipPath" -ForegroundColor Gray
    } else {
        throw "Failed to create ZIP archive"
    }

    # Cleanup temp directory
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue

    # Output the path for GitHub Actions
    Write-Host "`n::set-output name=zip_path::$zipPath"
    Write-Host "ZIP_PATH=$zipPath" | Out-File -FilePath $env:GITHUB_OUTPUT -Append -Encoding UTF8 -ErrorAction SilentlyContinue

} catch {
    Write-Host "Build failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

Write-Host "`nWindows portable ZIP build completed!" -ForegroundColor Green
