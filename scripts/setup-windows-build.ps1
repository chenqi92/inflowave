# Setup Windows build environment for InfloWave
# This script installs WiX Toolset for Tauri 2.0 MSI builds

param(
    [switch]$Force = $false,
    [switch]$SkipWix = $false
)

$ErrorActionPreference = "Stop"

Write-Host "Setting up Windows build environment for InfloWave..." -ForegroundColor Cyan

try {
    # Install WiX Toolset
    if (-not $SkipWix) {
        Write-Host "Installing WiX Toolset..." -ForegroundColor Yellow
        
        $wixPath = Join-Path $env:LOCALAPPDATA "WiX Toolset v3.14"
        $wixBinPath = Join-Path $wixPath "bin"
        
        # Check if WiX is already installed
        if ((Test-Path $wixBinPath) -and (Test-Path "$wixBinPath\candle.exe") -and (-not $Force)) {
            Write-Host "WiX Toolset is already installed" -ForegroundColor Green
        } else {
            # Create temp directory
            $tempDir = Join-Path $env:TEMP "wix-install"
            if (Test-Path $tempDir) {
                Remove-Item $tempDir -Recurse -Force
            }
            New-Item -ItemType Directory -Path $tempDir | Out-Null

            # Download WiX Toolset
            Write-Host "Downloading WiX Toolset..." -ForegroundColor Yellow
            $wixUrl = "https://github.com/wixtoolset/wix3/releases/download/wix3141rtm/wix314-binaries.zip"
            $wixZip = Join-Path $tempDir "wix-binaries.zip"
            
            Invoke-WebRequest -Uri $wixUrl -OutFile $wixZip -TimeoutSec 300
            Write-Host "Downloaded WiX Toolset" -ForegroundColor Green

            # Extract WiX Toolset
            Write-Host "Extracting WiX Toolset..." -ForegroundColor Yellow
            $wixExtractPath = Join-Path $tempDir "wix"
            Expand-Archive -Path $wixZip -DestinationPath $wixExtractPath -Force

            # Install to user directory
            if (Test-Path $wixPath) {
                Remove-Item $wixPath -Recurse -Force
            }
            New-Item -ItemType Directory -Path $wixPath -Force | Out-Null
            Copy-Item -Path "$wixExtractPath\*" -Destination $wixPath -Recurse -Force

            # Create bin directory and move executables
            New-Item -ItemType Directory -Path $wixBinPath -Force | Out-Null
            Move-Item "$wixPath\*.exe" $wixBinPath -Force
            Move-Item "$wixPath\*.dll" $wixBinPath -Force
            Move-Item "$wixPath\*.cub" $wixBinPath -Force

            # Add to user PATH
            $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
            if (-not $currentPath) {
                $currentPath = ""
            }
            
            if ($currentPath -notlike "*$wixBinPath*") {
                if ($currentPath) {
                    $newPath = "$currentPath;$wixBinPath"
                } else {
                    $newPath = $wixBinPath
                }
                [Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
                Write-Host "Added WiX to user PATH" -ForegroundColor Green
            }

            # Set WIX environment variable
            [Environment]::SetEnvironmentVariable("WIX", $wixPath, "User")
            Write-Host "Set WIX environment variable" -ForegroundColor Green

            # Cleanup
            Remove-Item $tempDir -Recurse -Force
        }

        # Set environment for current session
        $env:PATH = "$env:PATH;$wixBinPath"
        $env:WIX = $wixPath

        # Verify WiX installation
        Write-Host "Verifying WiX installation..." -ForegroundColor Yellow
        candle.exe -? | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "WiX Toolset installed successfully" -ForegroundColor Green
        } else {
            throw "WiX installation verification failed"
        }
    }

    Write-Host "Windows build environment setup completed!" -ForegroundColor Green
    Write-Host "" -ForegroundColor White
    Write-Host "You can now build Windows packages using:" -ForegroundColor Cyan
    Write-Host "  npm run build:windows-x64" -ForegroundColor White
    Write-Host "  npm run build:windows-x86" -ForegroundColor White
    Write-Host "  npm run build:windows" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "Tauri 2.0 will automatically use WiX Toolset to generate MSI packages." -ForegroundColor Yellow

} catch {
    Write-Host "Setup failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "Setup completed successfully!" -ForegroundColor Green
