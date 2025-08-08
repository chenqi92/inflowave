# InfloWave Windows Build Script
# Build MSI installer using cargo-wix

param(
    [string]$Target = "x86_64-pc-windows-msvc",
    [string]$Profile = "release",
    [switch]$Chinese = $false,
    [switch]$Clean = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"

Write-Host "InfloWave Windows Build Script" -ForegroundColor Cyan
Write-Host "Target Platform: $Target" -ForegroundColor Green
Write-Host "Build Profile: $Profile" -ForegroundColor Green

# Set up WiX environment
$wixPath = Join-Path $env:LOCALAPPDATA "WiX Toolset v3.14"
$wixBinPath = Join-Path $wixPath "bin"
$env:PATH = "$env:PATH;$wixBinPath"
$env:WIX = $wixPath

Write-Host "WiX Toolset Path: $wixPath" -ForegroundColor Green

# Switch to src-tauri directory
Push-Location "src-tauri"

try {
    # Clean build cache
    if ($Clean) {
        Write-Host "Cleaning build cache..." -ForegroundColor Yellow
        cargo clean
        if (Test-Path "target\wix") {
            Remove-Item "target\wix" -Recurse -Force
        }
    }

    # Check if cargo-wix is installed
    Write-Host "Checking cargo-wix..." -ForegroundColor Yellow
    try {
        $wixVersion = cargo wix --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "cargo-wix installed: $wixVersion" -ForegroundColor Green
        } else {
            throw "cargo-wix command failed"
        }
    } catch {
        Write-Host "cargo-wix not installed, installing..." -ForegroundColor Red

        # Try to install cargo-wix
        Write-Host "Installing cargo-wix..." -ForegroundColor Yellow
        cargo install cargo-wix --force --locked

        if ($LASTEXITCODE -ne 0) {
            Write-Host "Standard install failed, trying from source..." -ForegroundColor Yellow
            cargo install --git https://github.com/volks73/cargo-wix --force

            if ($LASTEXITCODE -ne 0) {
                throw "cargo-wix installation failed"
            }
        }

        # Verify installation
        $wixVersion = cargo wix --version
        if ($LASTEXITCODE -eq 0) {
            Write-Host "cargo-wix installed successfully: $wixVersion" -ForegroundColor Green
        } else {
            throw "cargo-wix installation verification failed"
        }
    }

    # Initialize WiX configuration if needed
    Write-Host "Checking WiX configuration..." -ForegroundColor Yellow
    if (-not (Test-Path "wix\main.wxs")) {
        Write-Host "Initializing WiX configuration..." -ForegroundColor Yellow
        cargo wix init --force
        if ($LASTEXITCODE -ne 0) {
            throw "WiX initialization failed"
        }
    } else {
        Write-Host "WiX configuration exists" -ForegroundColor Green
    }

    # Check if application is already built
    $exePath = "target\$Target\release\InfloWave.exe"
    $altExePath = "target\release\InfloWave.exe"

    if (Test-Path $exePath) {
        Write-Host "✅ Executable already exists at: $exePath" -ForegroundColor Green
    } elseif (Test-Path $altExePath) {
        Write-Host "✅ Executable found at alternative path: $altExePath" -ForegroundColor Green
        # Copy to expected location for WiX
        $targetDir = Split-Path $exePath -Parent
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        Copy-Item $altExePath $exePath -Force
        Write-Host "📋 Copied executable to expected WiX location" -ForegroundColor Green
    } else {
        Write-Host "🔨 Building Rust application..." -ForegroundColor Yellow
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
    }

    # Build MSI installer
    Write-Host "Building MSI installer..." -ForegroundColor Yellow

    $wixArgs = @("wix", "--target", $Target)
    if ($Profile -eq "release") {
        $wixArgs += "--profile", "release"
    }
    if ($Verbose) {
        $wixArgs += "--verbose"
    }

    # Add multi-language support
    if ($Chinese) {
        Write-Host "Enabling Chinese localization..." -ForegroundColor Green
        $wixArgs += "--locale", "wix\WixUI_zh-cn.wxl"
        $wixArgs += "--culture", "zh-cn"
    }

    & cargo @wixArgs
    if ($LASTEXITCODE -ne 0) {
        throw "WiX build failed"
    }

    # Show build results
    Write-Host "Build completed!" -ForegroundColor Green
    
    $msiPath = "target\wix\InfloWave-*.msi"
    $msiFiles = Get-ChildItem $msiPath -ErrorAction SilentlyContinue

    if ($msiFiles) {
        Write-Host "Generated MSI files:" -ForegroundColor Cyan
        foreach ($file in $msiFiles) {
            $size = [math]::Round($file.Length / 1MB, 2)
            Write-Host "  $($file.Name) ($size MB)" -ForegroundColor White
            Write-Host "  Path: $($file.FullName)" -ForegroundColor Gray
        }
    } else {
        Write-Host "No MSI files found" -ForegroundColor Yellow
    }

} catch {
    Write-Host "Build failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

Write-Host "Windows build script completed!" -ForegroundColor Green
