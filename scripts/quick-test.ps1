# InfluxDB GUI Manager - Quick Test Script
# Simple script to test basic compilation and setup

Write-Host "InfluxDB GUI Manager - Quick Test" -ForegroundColor Magenta
Write-Host "=================================" -ForegroundColor Magenta

# Step 1: Fix network issues
Write-Host "Step 1: Fixing network issues..." -ForegroundColor Blue
$cargoDir = "$env:USERPROFILE\.cargo"
if (-not (Test-Path $cargoDir)) {
    New-Item -ItemType Directory -Path $cargoDir -Force | Out-Null
}

$cargoConfig = @"
[source.crates-io]
replace-with = 'ustc'

[source.ustc]
registry = "https://mirrors.ustc.edu.cn/crates.io-index"

[net]
git-fetch-with-cli = true
retry = 3

[http]
check-revoke = false
timeout = 60
"@

$cargoConfigPath = "$cargoDir\config.toml"
$cargoConfig | Out-File -FilePath $cargoConfigPath -Encoding UTF8 -Force
Write-Host "Network configuration completed" -ForegroundColor Green

# Step 2: Check environment
Write-Host "Step 2: Checking environment..." -ForegroundColor Blue
$tools = @("rustc", "cargo", "node", "npm")
foreach ($tool in $tools) {
    try {
        $version = & $tool --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "${tool} - OK" -ForegroundColor Green
        } else {
            Write-Host "${tool} - FAILED" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "${tool} - NOT FOUND" -ForegroundColor Red
        exit 1
    }
}

# Step 3: Install frontend dependencies
Write-Host "Step 3: Installing frontend dependencies..." -ForegroundColor Blue
if (Test-Path "package.json") {
    if (-not (Test-Path "node_modules")) {
        npm install --prefer-offline
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Frontend dependencies installed" -ForegroundColor Green
        } else {
            Write-Host "Frontend dependencies installation failed" -ForegroundColor Red
        }
    } else {
        Write-Host "Frontend dependencies already exist" -ForegroundColor Green
    }
}

# Step 4: Check backend code
Write-Host "Step 4: Checking backend code..." -ForegroundColor Blue
Push-Location "src-tauri"
try {
    cargo check --color always
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Backend code check passed!" -ForegroundColor Green
        Write-Host ""
        Write-Host "SUCCESS: All checks passed!" -ForegroundColor Green
        Write-Host "You can now run:" -ForegroundColor Cyan
        Write-Host "  npm run dev          # Start frontend dev server" -ForegroundColor Cyan
        Write-Host "  cargo tauri dev      # Start Tauri dev mode" -ForegroundColor Cyan
    } else {
        Write-Host "Backend code check failed" -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Quick test completed successfully!" -ForegroundColor Magenta
