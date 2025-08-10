# InfloWave Windows Build Script
# Build MSI installer using cargo-wix

param(
    [string]$Target = "x86_64-pc-windows-msvc",
    [string]$Profile = "release",
    [switch]$Chinese = $false,
    [switch]$Clean = $false,
    [switch]$Verbose = $false,
    [switch]$WhatIf = $false
)

$ErrorActionPreference = "Stop"

Write-Host "InfloWave Windows Build Script" -ForegroundColor Cyan
Write-Host "Target Platform: $Target" -ForegroundColor Green
Write-Host "Build Profile: $Profile" -ForegroundColor Green

if ($WhatIf) {
    Write-Host "DRY RUN MODE - No actual build will be performed" -ForegroundColor Yellow
}

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
    $wixExpectedPath = "target\release\InfloWave.exe"

    if (Test-Path $exePath) {
        Write-Host "Executable already exists at: $exePath" -ForegroundColor Green
        # Always copy to WiX expected location
        $targetDir = Split-Path $wixExpectedPath -Parent
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        Copy-Item $exePath $wixExpectedPath -Force
        Write-Host "Copied executable to WiX expected location: $wixExpectedPath" -ForegroundColor Green
    } elseif (Test-Path $altExePath) {
        Write-Host "Executable found at alternative path: $altExePath" -ForegroundColor Green
        Write-Host "Executable already at WiX expected location" -ForegroundColor Green
    } else {
        Write-Host "Building Rust application..." -ForegroundColor Yellow
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

        # Copy to WiX expected location after build
        if (Test-Path $exePath) {
            $targetDir = Split-Path $wixExpectedPath -Parent
            if (-not (Test-Path $targetDir)) {
                New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
            }
            Copy-Item $exePath $wixExpectedPath -Force
            Write-Host "Copied built executable to WiX expected location: $wixExpectedPath" -ForegroundColor Green
        }
    }

    # Verify WiX expected file exists
    if (-not (Test-Path $wixExpectedPath)) {
        throw "WiX expected executable not found at: $wixExpectedPath"
    } else {
        Write-Host "WiX executable verified at: $wixExpectedPath" -ForegroundColor Green
    }

    # Build MSI installer
    Write-Host "Building MSI installer..." -ForegroundColor Yellow

    # Set environment variables for MSI build
    $env:TAURI_BUNDLE_TARGETS = "msi"
    
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

    # Check and install Rust target if needed
    Write-Host "Checking Rust target: $Target" -ForegroundColor Yellow
    $installedTargets = rustup target list --installed 2>$null
    if ($installedTargets -notcontains $Target) {
        Write-Host "Installing Rust target: $Target" -ForegroundColor Yellow
        rustup target add $Target
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install Rust target: $Target"
        }
        Write-Host "Successfully installed Rust target: $Target" -ForegroundColor Green
    } else {
        Write-Host "Rust target already installed: $Target" -ForegroundColor Green
    }

    Write-Host "Executing: $tauriCmd build --target $Target --config tauri.windows-cargo-wix.conf.json" -ForegroundColor Gray

    # Use tauri CLI to build MSI
    if ($WhatIf) {
        Write-Host "WOULD EXECUTE: $tauriCmd build --target $Target --config tauri.windows-cargo-wix.conf.json" -ForegroundColor Yellow
        Write-Host "Dry run completed successfully" -ForegroundColor Green
        return
    } else {
        $maxRetries = 3
        $retryCount = 0
        $buildSuccess = $false

        # Try MSI build with retry mechanism
        while ($retryCount -lt $maxRetries -and -not $buildSuccess) {
            $retryCount++
            Write-Host "MSI build attempt $retryCount of $maxRetries..." -ForegroundColor Yellow

            try {
                if ($tauriCmd -eq "npx tauri") {
                    & npx tauri build --target $Target --config tauri.windows-cargo-wix.conf.json
                } else {
                    & tauri build --target $Target --config tauri.windows-cargo-wix.conf.json
                }

                if ($LASTEXITCODE -eq 0) {
                    $buildSuccess = $true
                    Write-Host "MSI build successful on attempt $retryCount" -ForegroundColor Green
                } else {
                    Write-Host "MSI build attempt $retryCount failed with exit code: $LASTEXITCODE" -ForegroundColor Yellow
                    if ($retryCount -lt $maxRetries) {
                        Write-Host "Waiting 30 seconds before retry..." -ForegroundColor Yellow
                        Start-Sleep -Seconds 30
                    }
                }
            } catch {
                Write-Host "MSI build attempt $retryCount failed with exception: $($_.Exception.Message)" -ForegroundColor Yellow
                if ($retryCount -lt $maxRetries) {
                    Write-Host "Waiting 30 seconds before retry..." -ForegroundColor Yellow
                    Start-Sleep -Seconds 30
                }
            }
        }

        # If MSI build failed, try NSIS fallback
        $usedNsisFallback = $false
        if (-not $buildSuccess) {
            Write-Host "MSI build failed after $maxRetries attempts, trying NSIS fallback..." -ForegroundColor Yellow

            try {
                if ($tauriCmd -eq "npx tauri") {
                    & npx tauri build --target $Target --bundles nsis
                } else {
                    & tauri build --target $Target --bundles nsis
                }

                if ($LASTEXITCODE -eq 0) {
                    Write-Host "NSIS fallback build completed successfully" -ForegroundColor Green
                    $buildSuccess = $true
                    $usedNsisFallback = $true
                } else {
                    throw "NSIS fallback build also failed with exit code: $LASTEXITCODE"
                }
            } catch {
                throw "Both MSI and NSIS builds failed: $($_.Exception.Message)"
            }
        }

        if (-not $buildSuccess) {
            throw "All build attempts failed"
        }
    }

    # Show build results
    Write-Host "Build completed!" -ForegroundColor Green

    if ($usedNsisFallback) {
        Write-Host "Used NSIS fallback - checking for NSIS files..." -ForegroundColor Yellow

        # Check for NSIS files
        $nsisExePaths = @(
            "target\$Target\release\bundle\nsis\*.exe",
            "target\release\bundle\nsis\*.exe",
            "target\bundle\nsis\*.exe"
        )

        $nsisFiles = @()
        foreach ($path in $nsisExePaths) {
            $files = Get-ChildItem $path -ErrorAction SilentlyContinue
            if ($files) {
                $nsisFiles += $files
                Write-Host "Found NSIS files in: $(Split-Path $path -Parent)" -ForegroundColor Green
                break
            }
        }

        if ($nsisFiles) {
            Write-Host "Generated NSIS installer files:" -ForegroundColor Cyan
            foreach ($file in $nsisFiles) {
                $size = [math]::Round($file.Length / 1MB, 2)
                Write-Host "  $($file.Name) ($size MB)" -ForegroundColor White
                Write-Host "  Path: $($file.FullName)" -ForegroundColor Gray
            }

            foreach ($file in $nsisFiles) {
                if ($file.Extension -eq ".exe" -and $file.Name -like "*setup*") {
                    Write-Host "Verified NSIS installer: $($file.Name)" -ForegroundColor Green
                } else {
                    Write-Host "Found NSIS file: $($file.Name)" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "No NSIS files found in any expected location!" -ForegroundColor Red
            Write-Host "Searched in:" -ForegroundColor Yellow
            foreach ($path in $nsisExePaths) {
                Write-Host "  $path" -ForegroundColor Gray
            }

            # List what files were actually created
            Write-Host "Files in target directory:" -ForegroundColor Yellow
            Get-ChildItem "target" -Recurse -File | Where-Object { $_.Extension -in @(".msi", ".exe") } | ForEach-Object {
                Write-Host "  $($_.FullName)" -ForegroundColor Gray
            }

            throw "NSIS build completed but no NSIS files were generated"
        }
    } else {
        Write-Host "Used MSI build - checking for MSI files..." -ForegroundColor Yellow

        # Check multiple possible MSI locations
        $msiPaths = @(
            "target\wix\InfloWave-*.msi",
            "target\$Target\release\bundle\msi\*.msi",
            "target\release\bundle\msi\*.msi"
        )

        $msiFiles = @()
        foreach ($path in $msiPaths) {
            $files = Get-ChildItem $path -ErrorAction SilentlyContinue
            if ($files) {
                $msiFiles += $files
                Write-Host "Found MSI files in: $(Split-Path $path -Parent)" -ForegroundColor Green
                break
            }
        }

        if ($msiFiles) {
            Write-Host "Generated MSI files:" -ForegroundColor Cyan
            foreach ($file in $msiFiles) {
                $size = [math]::Round($file.Length / 1MB, 2)
                Write-Host "  $($file.Name) ($size MB)" -ForegroundColor White
                Write-Host "  Path: $($file.FullName)" -ForegroundColor Gray
            }

            # Verify these are actual MSI files, not just executables
            foreach ($file in $msiFiles) {
                if ($file.Extension -eq ".msi") {
                    Write-Host "Verified MSI installer: $($file.Name)" -ForegroundColor Green
                } else {
                    Write-Host "Warning: Found non-MSI file: $($file.Name)" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "No MSI files found in any expected location!" -ForegroundColor Red
            Write-Host "Searched in:" -ForegroundColor Yellow
            foreach ($path in $msiPaths) {
                Write-Host "  $path" -ForegroundColor Gray
            }

            # List what files were actually created
            Write-Host "Files in target directory:" -ForegroundColor Yellow
            Get-ChildItem "target" -Recurse -File | Where-Object { $_.Extension -in @(".msi", ".exe") } | ForEach-Object {
                Write-Host "  $($_.FullName)" -ForegroundColor Gray
            }

            throw "MSI build completed but no MSI files were generated"
        }
    }

} catch {
    Write-Host "Build failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

Write-Host "Windows build script completed!" -ForegroundColor Green
