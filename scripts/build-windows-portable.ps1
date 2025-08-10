# InfloWave Windows Portable Build Script
# Build portable NSIS packages for Windows

param(
    [string]$Target = "x86_64-pc-windows-msvc",
    [string]$Profile = "release",
    [switch]$Clean = $false,
    [switch]$Verbose = $false,
    [switch]$WhatIf = $false,
    [switch]$BuildBoth = $false
)

$ErrorActionPreference = "Stop"

Write-Host "InfloWave Windows Portable Build Script" -ForegroundColor Cyan
Write-Host "Target Platform: $Target" -ForegroundColor Green
Write-Host "Build Profile: $Profile" -ForegroundColor Green

if ($WhatIf) {
    Write-Host "DRY RUN MODE - No actual build will be performed" -ForegroundColor Yellow
}

if ($BuildBoth) {
    Write-Host "Building both x64 and x86 portable NSIS packages" -ForegroundColor Yellow
}

# Switch to src-tauri directory
Push-Location "src-tauri"

try {
    # Clean build cache
    if ($Clean) {
        Write-Host "Cleaning build cache..." -ForegroundColor Yellow
        cargo clean
        if (Test-Path "target\bundle") {
            Remove-Item "target\bundle" -Recurse -Force
        }
    }

    # Check if Tauri CLI is available (prefer npx tauri)
    $tauriCmd = "npx tauri"
    try {
        & npx tauri --version | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Found npx tauri CLI" -ForegroundColor Green
        } else {
            throw "npx tauri not available"
        }
    } catch {
        Write-Host "npx tauri not available, trying global tauri..." -ForegroundColor Yellow
        $tauriCmd = "tauri"
        try {
            & tauri --version | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Found global tauri CLI" -ForegroundColor Green
            } else {
                throw "Global tauri not available"
            }
        } catch {
            throw "Tauri CLI not found. Please install @tauri-apps/cli"
        }
    }

    Write-Host "Using Tauri CLI: $tauriCmd" -ForegroundColor Green

    # Determine which targets to build
    $targets = @()
    if ($BuildBoth) {
        $targets = @(
            @{ Target = "x86_64-pc-windows-msvc"; Config = "tauri.windows-portable-x64.conf.json"; Name = "x64" },
            @{ Target = "i686-pc-windows-msvc"; Config = "tauri.windows-portable-x86.conf.json"; Name = "x86" }
        )
    } else {
        if ($Target -eq "x86_64-pc-windows-msvc") {
            $targets = @(@{ Target = $Target; Config = "tauri.windows-portable-x64.conf.json"; Name = "x64" })
        } elseif ($Target -eq "i686-pc-windows-msvc") {
            $targets = @(@{ Target = $Target; Config = "tauri.windows-portable-x86.conf.json"; Name = "x86" })
        } else {
            throw "Unsupported target: $Target. Use x86_64-pc-windows-msvc or i686-pc-windows-msvc"
        }
    }

    foreach ($targetInfo in $targets) {
        Write-Host "`nBuilding portable NSIS for $($targetInfo.Name) ($($targetInfo.Target))..." -ForegroundColor Cyan
        
        $buildTarget = $targetInfo.Target
        $configFile = $targetInfo.Config
        $archName = $targetInfo.Name
        
        # Check and install Rust target if needed
        Write-Host "Checking Rust target: $buildTarget" -ForegroundColor Yellow
        $installedTargets = rustup target list --installed 2>$null
        if ($installedTargets -notcontains $buildTarget) {
            Write-Host "Installing Rust target: $buildTarget" -ForegroundColor Yellow
            rustup target add $buildTarget
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to install Rust target: $buildTarget"
            }
            Write-Host "Successfully installed Rust target: $buildTarget" -ForegroundColor Green
        } else {
            Write-Host "Rust target already installed: $buildTarget" -ForegroundColor Green
        }

        Write-Host "Executing: $tauriCmd build --target $buildTarget --config $configFile" -ForegroundColor Gray

        if ($WhatIf) {
            Write-Host "WOULD EXECUTE: $tauriCmd build --target $buildTarget --config $configFile" -ForegroundColor Yellow
        } else {
            # Use tauri CLI to build ZIP
            if ($tauriCmd -eq "npx tauri") {
                & npx tauri build --target $buildTarget --config $configFile
            } else {
                & tauri build --target $buildTarget --config $configFile
            }

            if ($LASTEXITCODE -ne 0) {
                throw "NSIS build failed for $archName with exit code: $LASTEXITCODE"
            }

            Write-Host "Build completed for $archName!" -ForegroundColor Green
        }
    }

    if (-not $WhatIf) {
        # Show build results
        Write-Host "`nBuild Results:" -ForegroundColor Cyan
        
        # Check multiple possible ZIP locations
        $zipPaths = @(
            "target\$Target\release\bundle\zip\*.zip",
            "target\release\bundle\zip\*.zip",
            "target\bundle\zip\*.zip"
        )
        
        $allZipFiles = @()
        foreach ($path in $zipPaths) {
            $files = Get-ChildItem $path -ErrorAction SilentlyContinue
            if ($files) {
                $allZipFiles += $files
            }
        }

        if ($allZipFiles) {
            Write-Host "Generated ZIP files:" -ForegroundColor Green
            foreach ($file in $allZipFiles) {
                $size = [math]::Round($file.Length / 1MB, 2)
                Write-Host "  $($file.Name) ($size MB)" -ForegroundColor White
                Write-Host "  Path: $($file.FullName)" -ForegroundColor Gray
            }
            
            # Verify these are actual ZIP files
            foreach ($file in $allZipFiles) {
                if ($file.Extension -eq ".zip") {
                    Write-Host "Verified portable ZIP: $($file.Name)" -ForegroundColor Green
                } else {
                    Write-Host "Warning: Found non-ZIP file: $($file.Name)" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "No ZIP files found in any expected location!" -ForegroundColor Red
            Write-Host "Searched in:" -ForegroundColor Yellow
            foreach ($path in $zipPaths) {
                Write-Host "  $path" -ForegroundColor Gray
            }
            
            # List what files were actually created
            Write-Host "Files in target directory:" -ForegroundColor Yellow
            Get-ChildItem "target" -Recurse -File | Where-Object { $_.Extension -in @(".zip", ".exe", ".msi") } | ForEach-Object {
                Write-Host "  $($_.FullName)" -ForegroundColor Gray
            }
            
            throw "ZIP build completed but no ZIP files were generated"
        }
    } else {
        Write-Host "`nDry run completed successfully" -ForegroundColor Green
    }

} catch {
    Write-Host "Build failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

Write-Host "`nWindows portable build script completed!" -ForegroundColor Green
