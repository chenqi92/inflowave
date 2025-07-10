# PowerShell script: Clean cache and rebuild project
# Used to solve build timeout and dependency issues

Write-Host "Cleaning project cache..." -ForegroundColor Green

# Clean npm cache
Write-Host "Cleaning npm cache..." -ForegroundColor Yellow
if (Get-Command npm -ErrorAction SilentlyContinue) {
    npm cache clean --force
    Write-Host "npm cache cleaned" -ForegroundColor Green
} else {
    Write-Host "npm not found, skipping npm cache clean" -ForegroundColor Yellow
}

# Clean node_modules
Write-Host "Removing node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules"
    Write-Host "node_modules removed" -ForegroundColor Green
} else {
    Write-Host "node_modules does not exist" -ForegroundColor Blue
}

# Clean package-lock.json
Write-Host "Removing package-lock.json..." -ForegroundColor Yellow
if (Test-Path "package-lock.json") {
    Remove-Item -Force "package-lock.json"
    Write-Host "package-lock.json removed" -ForegroundColor Green
}

# Clean Cargo cache
Write-Host "Cleaning Cargo cache..." -ForegroundColor Yellow
if (Get-Command cargo -ErrorAction SilentlyContinue) {
    Set-Location "src-tauri"
    cargo clean
    Set-Location ".."
    Write-Host "Cargo cache cleaned" -ForegroundColor Green
} else {
    Write-Host "cargo not found, skipping Cargo cache clean" -ForegroundColor Yellow
}

# Clean dist directory
Write-Host "Removing dist directory..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "dist directory removed" -ForegroundColor Green
}

# Clean Vite cache
Write-Host "Removing Vite cache..." -ForegroundColor Yellow
if (Test-Path "node_modules/.vite") {
    Remove-Item -Recurse -Force "node_modules/.vite"
}

# Reinstall dependencies
Write-Host "Reinstalling npm dependencies..." -ForegroundColor Green
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "npm dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "npm dependencies installation failed" -ForegroundColor Red
    exit 1
}

# Check Rust toolchain
Write-Host "Checking Rust toolchain..." -ForegroundColor Green
if (Get-Command cargo -ErrorAction SilentlyContinue) {
    cargo --version
    rustc --version
    Write-Host "Rust toolchain is working" -ForegroundColor Green
} else {
    Write-Host "Rust toolchain not found, please install Rust first" -ForegroundColor Red
    exit 1
}

Write-Host "Cleanup completed! You can now try to rebuild the project." -ForegroundColor Green
Write-Host "Suggested build commands:" -ForegroundColor Cyan
Write-Host "  Development mode: npm run tauri:dev" -ForegroundColor White
Write-Host "  Build mode: npm run tauri:build" -ForegroundColor White
