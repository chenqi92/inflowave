# Windows MSI Build Script using cargo-wix
# This script builds Windows MSI packages using cargo-wix

param(
    [string]$Target = "x86_64-pc-windows-msvc",
    [string]$Language = "zh-CN",
    [switch]$Verbose,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    
    $colorMap = @{
        "Red" = "Red"
        "Green" = "Green"
        "Yellow" = "Yellow"
        "Blue" = "Blue"
        "Cyan" = "Cyan"
        "Magenta" = "Magenta"
        "White" = "White"
    }
    
    Write-Host $Message -ForegroundColor $colorMap[$Color]
}

Write-ColorOutput "Building Windows MSI using cargo-wix..." "Green"
Write-ColorOutput "Target: $Target" "Cyan"
Write-ColorOutput "Language: $Language" "Cyan"

try {
    # 1. Check if cargo-wix is installed
    Write-ColorOutput "`nChecking cargo-wix installation..." "Cyan"
    
    try {
        $wixVersion = cargo wix --version
        Write-ColorOutput "cargo-wix found: $wixVersion" "Green"
    } catch {
        Write-ColorOutput "cargo-wix not found, installing..." "Yellow"
        cargo install cargo-wix
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install cargo-wix"
        }
        Write-ColorOutput "cargo-wix installed successfully" "Green"
    }
    
    # 2. Clean if requested
    if ($Clean) {
        Write-ColorOutput "`nCleaning previous builds..." "Yellow"
        if (Test-Path "src-tauri\target") {
            Remove-Item "src-tauri\target" -Recurse -Force
            Write-ColorOutput "Cleaned target directory" "Green"
        }
    }
    
    # 3. Set environment variables
    Write-ColorOutput "`nSetting environment variables..." "Cyan"
    $env:ENABLE_EMBEDDED_SERVER = "false"
    $env:DISABLE_CONSOLE_LOGS = "true"
    $env:WIX_LANGUAGE = $Language
    
    if ($Verbose) {
        $env:RUST_LOG = "debug"
        Write-ColorOutput "Enabled verbose logging" "Yellow"
    }
    
    # 4. Build the application first
    Write-ColorOutput "`nBuilding Rust application..." "Cyan"
    Set-Location "src-tauri"
    
    rustup target add $Target
    cargo build --release --target $Target
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to build Rust application"
    }
    
    Write-ColorOutput "Rust application built successfully" "Green"
    
    # 5. Initialize WiX template if not exists
    Write-ColorOutput "`nChecking WiX template..." "Cyan"
    if (-not (Test-Path "wix\main.wxs")) {
        Write-ColorOutput "Initializing WiX template..." "Yellow"
        cargo wix init --force
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to initialize WiX template"
        }
        Write-ColorOutput "WiX template initialized" "Green"
    } else {
        Write-ColorOutput "WiX template already exists" "Green"
    }
    
    # 6. Build MSI package
    Write-ColorOutput "`nBuilding MSI package..." "Cyan"
    
    $wixArgs = @(
        "--target", $Target,
        "--locale", $Language
    )
    
    if ($Verbose) {
        $wixArgs += "--verbose"
    }
    
    cargo wix @wixArgs
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to build MSI package"
    }
    
    Write-ColorOutput "MSI package built successfully" "Green"
    
    # 7. Check output
    Write-ColorOutput "`nChecking build output..." "Cyan"
    
    $msiPath = "target\wix\*.msi"
    $msiFiles = Get-ChildItem $msiPath -ErrorAction SilentlyContinue
    
    if ($msiFiles) {
        foreach ($msi in $msiFiles) {
            $size = [math]::Round($msi.Length / 1MB, 2)
            Write-ColorOutput "Generated MSI: $($msi.Name) ($size MB)" "Green"
            Write-ColorOutput "Location: $($msi.FullName)" "White"
        }
    } else {
        Write-ColorOutput "Warning: No MSI files found in target\wix\" "Yellow"
    }
    
    Write-ColorOutput "`nWindows MSI build completed successfully!" "Green"

} catch {
    Write-ColorOutput "`nBuild failed: $($_.Exception.Message)" "Red"
    exit 1
} finally {
    # Return to original directory
    Set-Location ".."
}
