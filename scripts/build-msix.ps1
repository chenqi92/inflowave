# InfloWave MSIX Build Script
# Build Microsoft Store package using Tauri

param(
    [string]$Target = "x86_64-pc-windows-msvc",
    [string]$Profile = "release",
    [switch]$Clean = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"

Write-Host "InfloWave MSIX Build Script" -ForegroundColor Cyan
Write-Host "Target Platform: $Target" -ForegroundColor Green
Write-Host "Build Profile: $Profile" -ForegroundColor Green

# Switch to src-tauri directory
Push-Location "src-tauri"

try {
    # Clean build cache if requested
    if ($Clean) {
        Write-Host "Cleaning build cache..." -ForegroundColor Yellow
        cargo clean
        if (Test-Path "target\msix") {
            Remove-Item "target\msix" -Recurse -Force
        }
    }

    # Check if executable exists
    $exePath = "target\$Target\release\InfloWave.exe"
    $altExePath = "target\release\InfloWave.exe"
    
    if (-not (Test-Path $exePath) -and -not (Test-Path $altExePath)) {
        Write-Host "🔨 Building Rust application first..." -ForegroundColor Yellow
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
        Write-Host "✅ Executable already exists" -ForegroundColor Green
    }

    # Check if MSIX config exists
    $msixConfig = "tauri.windows-msix.conf.json"
    if (-not (Test-Path $msixConfig)) {
        Write-Host "⚠️ MSIX config not found, creating from template..." -ForegroundColor Yellow
        
        # Create MSIX configuration based on main config
        $mainConfig = Get-Content "tauri.conf.json" | ConvertFrom-Json
        $msixConfig = $mainConfig.PSObject.Copy()
        
        # Modify for MSIX
        $msixConfig.bundle.targets = @("msix")
        $msixConfig.bundle.windows.webviewInstallMode = @{
            type = "embedBootstrapper"
            silent = $true
        }
        
        # Add Microsoft Store specific settings
        $msixConfig.bundle.windows.msix = @{
            publisher = "CN=Kkape Team"
            publisherDisplayName = "Kkape Team"
            capabilities = @("internetClient", "privateNetworkClientServer")
            languages = @("zh-CN", "en-US")
        }
        
        $msixConfig | ConvertTo-Json -Depth 10 | Set-Content "tauri.windows-msix.conf.json"
        Write-Host "✅ Created MSIX configuration" -ForegroundColor Green
    }

    # Build MSIX package using Tauri
    Write-Host "Building MSIX package..." -ForegroundColor Yellow
    
    $tauriArgs = @("build", "--target", $Target, "--config", "tauri.windows-msix.conf.json")
    if ($Verbose) {
        $tauriArgs += "--verbose"
    }
    
    # Set environment variables for MSIX build
    $env:TAURI_BUNDLE_TARGETS = "msix"
    
    & npm run tauri @tauriArgs
    if ($LASTEXITCODE -ne 0) {
        throw "MSIX build failed"
    }

    # Show build results
    Write-Host "MSIX build completed!" -ForegroundColor Green
    
    $msixPath = "target\$Target\release\bundle\msix\*.msix"
    $msixFiles = Get-ChildItem $msixPath -ErrorAction SilentlyContinue
    
    if (-not $msixFiles) {
        # Try alternative path
        $msixPath = "target\release\bundle\msix\*.msix"
        $msixFiles = Get-ChildItem $msixPath -ErrorAction SilentlyContinue
    }

    if ($msixFiles) {
        Write-Host "Generated MSIX files:" -ForegroundColor Cyan
        foreach ($file in $msixFiles) {
            $size = [math]::Round($file.Length / 1MB, 2)
            Write-Host "  $($file.Name) ($size MB)" -ForegroundColor White
            Write-Host "  Path: $($file.FullName)" -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠️ No MSIX files found" -ForegroundColor Yellow
        Write-Host "Searching for MSIX files in target directory..." -ForegroundColor Yellow
        Get-ChildItem "target" -Recurse -Name "*.msix" | ForEach-Object { 
            Write-Host "Found: $_" -ForegroundColor Gray 
        }
    }

} catch {
    Write-Host "MSIX build failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

Write-Host "MSIX build script completed!" -ForegroundColor Green
