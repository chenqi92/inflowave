# Full Build Test Script
# 完整的构建测试脚本，模拟 GitHub Actions 的构建流程

param(
    [string]$Target = "x86_64-pc-windows-msvc",
    [switch]$SkipBuild = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 InfloWave Full Build Test" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host "Target: $Target" -ForegroundColor Green

if ($SkipBuild) {
    Write-Host "⏭️ Skipping actual build (dry run mode)" -ForegroundColor Yellow
}

function Test-Prerequisites {
    Write-Host "`n🔧 Testing Prerequisites..." -ForegroundColor Cyan
    
    $allOk = $true
    
    # Test Node.js
    try {
        $nodeVersion = node --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Node.js: $nodeVersion" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Node.js not found" -ForegroundColor Red
            $allOk = $false
        }
    } catch {
        Write-Host "  ❌ Node.js not available" -ForegroundColor Red
        $allOk = $false
    }
    
    # Test npm
    try {
        $npmVersion = npm --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ npm: $npmVersion" -ForegroundColor Green
        } else {
            Write-Host "  ❌ npm not found" -ForegroundColor Red
            $allOk = $false
        }
    } catch {
        Write-Host "  ❌ npm not available" -ForegroundColor Red
        $allOk = $false
    }
    
    # Test Rust
    try {
        $rustVersion = rustc --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Rust: $rustVersion" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Rust not found" -ForegroundColor Red
            $allOk = $false
        }
    } catch {
        Write-Host "  ❌ Rust not available" -ForegroundColor Red
        $allOk = $false
    }
    
    # Test Tauri CLI
    try {
        $tauriVersion = npx tauri --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Tauri CLI: $tauriVersion" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Tauri CLI not found" -ForegroundColor Red
            $allOk = $false
        }
    } catch {
        Write-Host "  ❌ Tauri CLI not available" -ForegroundColor Red
        $allOk = $false
    }
    
    return $allOk
}

function Test-ConfigFiles {
    Write-Host "`n📋 Testing Configuration Files..." -ForegroundColor Cyan
    
    $configFiles = @(
        "package.json",
        "src-tauri/tauri.conf.json",
        "src-tauri/tauri.windows-cargo-wix.conf.json",
        "src-tauri/Cargo.toml"
    )
    
    $allOk = $true
    
    foreach ($file in $configFiles) {
        if (Test-Path $file) {
            Write-Host "  ✅ $file exists" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $file missing" -ForegroundColor Red
            $allOk = $false
        }
    }
    
    return $allOk
}

function Test-Dependencies {
    Write-Host "`n📦 Testing Dependencies..." -ForegroundColor Cyan
    
    try {
        Write-Host "  Installing npm dependencies..." -ForegroundColor Yellow
        npm ci --silent
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ npm dependencies installed" -ForegroundColor Green
        } else {
            Write-Host "  ❌ npm dependencies installation failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  ❌ npm dependencies installation failed" -ForegroundColor Red
        return $false
    }
    
    return $true
}

function Test-BuildScripts {
    Write-Host "`n🔍 Testing Build Scripts..." -ForegroundColor Cyan
    
    try {
        powershell -ExecutionPolicy Bypass -File scripts/test-build-scripts.ps1 -SyntaxOnly
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Build scripts syntax OK" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Build scripts syntax failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  ❌ Build scripts test failed" -ForegroundColor Red
        return $false
    }
    
    return $true
}

function Test-ActualBuild {
    Write-Host "`n🔨 Testing Actual Build..." -ForegroundColor Cyan
    
    if ($SkipBuild) {
        Write-Host "  ⏭️ Skipping actual build (dry run)" -ForegroundColor Yellow
        
        # Test dry run
        try {
            powershell -ExecutionPolicy Bypass -File scripts/build-windows.ps1 -Target $Target -WhatIf
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ Build script dry run successful" -ForegroundColor Green
                return $true
            } else {
                Write-Host "  ❌ Build script dry run failed" -ForegroundColor Red
                return $false
            }
        } catch {
            Write-Host "  ❌ Build script dry run failed" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "  🔨 Running actual build..." -ForegroundColor Yellow
        
        try {
            powershell -ExecutionPolicy Bypass -File scripts/build-windows.ps1 -Target $Target -Verbose:$Verbose
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ Build completed successfully" -ForegroundColor Green
                return $true
            } else {
                Write-Host "  ❌ Build failed" -ForegroundColor Red
                return $false
            }
        } catch {
            Write-Host "  ❌ Build failed with exception" -ForegroundColor Red
            return $false
        }
    }
}

function Test-PackageValidation {
    Write-Host "`n📦 Testing Package Validation..." -ForegroundColor Cyan
    
    if ($SkipBuild) {
        Write-Host "  ⏭️ Skipping package validation (no build performed)" -ForegroundColor Yellow
        return $true
    }
    
    try {
        node scripts/validate-windows-packages.cjs
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Package validation passed" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  ❌ Package validation failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  ❌ Package validation failed with exception" -ForegroundColor Red
        return $false
    }
}

# Main execution
try {
    $allTests = @(
        @{ Name = "Prerequisites"; Function = { Test-Prerequisites } },
        @{ Name = "Configuration Files"; Function = { Test-ConfigFiles } },
        @{ Name = "Dependencies"; Function = { Test-Dependencies } },
        @{ Name = "Build Scripts"; Function = { Test-BuildScripts } },
        @{ Name = "Actual Build"; Function = { Test-ActualBuild } },
        @{ Name = "Package Validation"; Function = { Test-PackageValidation } }
    )
    
    $results = @()
    
    foreach ($test in $allTests) {
        $result = & $test.Function
        $results += @{
            Name = $test.Name
            Passed = $result
        }
        
        if (-not $result) {
            Write-Host "`n❌ Test failed: $($test.Name)" -ForegroundColor Red
        }
    }
    
    # Summary
    Write-Host "`n📊 Test Summary" -ForegroundColor Cyan
    Write-Host "===============" -ForegroundColor Cyan
    
    $passedCount = ($results | Where-Object { $_.Passed }).Count
    $totalCount = $results.Count
    
    foreach ($result in $results) {
        $status = if ($result.Passed) { "[PASS]" } else { "[FAIL]" }
        $color = if ($result.Passed) { "Green" } else { "Red" }
        Write-Host "  $status $($result.Name)" -ForegroundColor $color
    }
    
    Write-Host "`nPassed: $passedCount/$totalCount" -ForegroundColor $(if ($passedCount -eq $totalCount) { "Green" } else { "Yellow" })
    
    if ($passedCount -eq $totalCount) {
        Write-Host "`n[SUCCESS] All tests passed! Build system is ready." -ForegroundColor Green
        exit 0
    } else {
        Write-Host "`n[ERROR] Some tests failed. Please fix the issues before proceeding." -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "`n[ERROR] Test execution failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
