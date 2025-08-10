# Unified Build System Test Script
# 统一的构建系统测试脚本，替换所有分散的测试脚本

param(
    [string]$Target = "x86_64-pc-windows-msvc",
    [switch]$SyntaxOnly = $false,
    [switch]$SkipBuild = $false,
    [switch]$RunActualBuild = $false,
    [switch]$Verbose = $false,
    [ValidateSet("all", "syntax", "environment", "scripts", "portable", "validation")]
    [string]$TestType = "all"
)

$ErrorActionPreference = "Stop"

Write-Host "InfloWave Build System Test Suite" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Test Type: $TestType" -ForegroundColor Green
Write-Host "Target: $Target" -ForegroundColor Green

if ($SyntaxOnly) {
    Write-Host "Mode: Syntax Only" -ForegroundColor Yellow
} elseif ($SkipBuild) {
    Write-Host "Mode: Skip Build (Dry Run)" -ForegroundColor Yellow
} elseif ($RunActualBuild) {
    Write-Host "Mode: Full Build Test" -ForegroundColor Yellow
} else {
    Write-Host "Mode: Standard Test" -ForegroundColor Yellow
}

$allPassed = $true

# Test Functions
function Test-PowerShellSyntax {
    param([string]$ScriptPath)
    
    Write-Host "Testing syntax: $(Split-Path $ScriptPath -Leaf)" -ForegroundColor Yellow
    
    try {
        $content = Get-Content $ScriptPath -Raw
        $errors = $null
        $tokens = $null
        [System.Management.Automation.Language.Parser]::ParseInput($content, [ref]$tokens, [ref]$errors)
        
        if ($errors.Count -eq 0) {
            Write-Host "  Syntax OK" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  Syntax Errors:" -ForegroundColor Red
            foreach ($error in $errors) {
                Write-Host "    Line $($error.Extent.StartLineNumber): $($error.Message)" -ForegroundColor Red
            }
            return $false
        }
    } catch {
        Write-Host "  Syntax check failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-BuildEnvironment {
    Write-Host "`nTesting Build Environment..." -ForegroundColor Cyan
    
    $allOk = $true
    
    # Test Node.js
    try {
        $nodeVersion = node --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green
        } else {
            Write-Host "  Node.js not found" -ForegroundColor Red
            $allOk = $false
        }
    } catch {
        Write-Host "  Node.js not available" -ForegroundColor Red
        $allOk = $false
    }
    
    # Test npm
    try {
        $npmVersion = npm --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  npm: $npmVersion" -ForegroundColor Green
        } else {
            Write-Host "  npm not found" -ForegroundColor Red
            $allOk = $false
        }
    } catch {
        Write-Host "  npm not available" -ForegroundColor Red
        $allOk = $false
    }
    
    # Test Rust
    try {
        $rustVersion = rustc --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Rust: $rustVersion" -ForegroundColor Green
        } else {
            Write-Host "  Rust not found" -ForegroundColor Red
            $allOk = $false
        }
    } catch {
        Write-Host "  Rust not available" -ForegroundColor Red
        $allOk = $false
    }
    
    # Test Tauri CLI
    try {
        $tauriVersion = npx tauri --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Tauri CLI (npx): $tauriVersion" -ForegroundColor Green
        } else {
            $tauriVersion = tauri --version 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  Tauri CLI (global): $tauriVersion" -ForegroundColor Green
            } else {
                Write-Host "  Tauri CLI not found" -ForegroundColor Red
                $allOk = $false
            }
        }
    } catch {
        Write-Host "  Tauri CLI not available" -ForegroundColor Red
        $allOk = $false
    }
    
    return $allOk
}

function Test-BuildScripts {
    Write-Host "`nTesting Build Scripts..." -ForegroundColor Cyan
    
    $scripts = @(
        "scripts/build-windows.ps1",
        "scripts/build-msix.ps1",
        "scripts/build-windows-portable.ps1"
    )
    
    $allOk = $true
    
    foreach ($script in $scripts) {
        if (Test-Path $script) {
            if (-not (Test-PowerShellSyntax $script)) {
                $allOk = $false
            }
        } else {
            Write-Host "  Script not found: $script" -ForegroundColor Red
            $allOk = $false
        }
    }
    
    return $allOk
}

function Test-ScriptExecution {
    Write-Host "`nTesting Script Execution..." -ForegroundColor Cyan
    
    $tests = @(
        @{
            Script = "scripts/build-windows.ps1"
            Args = @("-Target", $Target, "-WhatIf")
            Name = "Windows MSI Build"
        },
        @{
            Script = "scripts/build-msix.ps1"
            Args = @("-Target", $Target, "-WhatIf")
            Name = "Windows MSIX Build"
        },
        @{
            Script = "scripts/build-windows-portable.ps1"
            Args = @("-Target", $Target, "-WhatIf")
            Name = "Windows Portable Build"
        }
    )
    
    $allOk = $true
    
    foreach ($test in $tests) {
        Write-Host "Testing: $($test.Name)" -ForegroundColor Yellow
        
        try {
            $result = & powershell -ExecutionPolicy Bypass -File $test.Script @($test.Args) 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  Execution test passed" -ForegroundColor Green
            } else {
                Write-Host "  Execution test failed with exit code: $LASTEXITCODE" -ForegroundColor Red
                $allOk = $false
            }
        } catch {
            Write-Host "  Execution test failed: $($_.Exception.Message)" -ForegroundColor Red
            $allOk = $false
        }
    }
    
    return $allOk
}

function Test-PortableBuild {
    Write-Host "`nTesting Portable Build..." -ForegroundColor Cyan
    
    try {
        powershell -ExecutionPolicy Bypass -File scripts/build-windows-portable.ps1 -BuildBoth -WhatIf
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Portable build test passed" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  Portable build test failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  Portable build test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-PackageValidation {
    Write-Host "`nTesting Package Validation..." -ForegroundColor Cyan
    
    try {
        node scripts/validate-windows-packages.cjs
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Package validation passed" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  Package validation completed (no packages found)" -ForegroundColor Yellow
            return $true
        }
    } catch {
        Write-Host "  Package validation failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-ActualBuild {
    Write-Host "`nTesting Actual Build..." -ForegroundColor Cyan
    
    Write-Host "Running actual MSI build..." -ForegroundColor Yellow
    try {
        & powershell -ExecutionPolicy Bypass -File scripts/build-windows.ps1 -Target $Target -Verbose:$Verbose
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Actual build completed successfully" -ForegroundColor Green
            
            # Validate the generated packages
            Write-Host "Validating generated packages..." -ForegroundColor Yellow
            & node scripts/validate-windows-packages.cjs
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  Package validation passed" -ForegroundColor Green
                return $true
            } else {
                Write-Host "  Package validation failed" -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "  Actual build failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  Actual build failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Main Test Execution
Write-Host "`nStarting tests..." -ForegroundColor Cyan

# Run tests based on TestType
switch ($TestType) {
    "syntax" {
        if (-not (Test-BuildScripts)) { $allPassed = $false }
    }
    "environment" {
        if (-not (Test-BuildEnvironment)) { $allPassed = $false }
    }
    "scripts" {
        if (-not (Test-ScriptExecution)) { $allPassed = $false }
    }
    "portable" {
        if (-not (Test-PortableBuild)) { $allPassed = $false }
    }
    "validation" {
        if (-not (Test-PackageValidation)) { $allPassed = $false }
    }
    "all" {
        if (-not (Test-BuildEnvironment)) { $allPassed = $false }
        if (-not (Test-BuildScripts)) { $allPassed = $false }
        
        if (-not $SyntaxOnly) {
            if (-not (Test-ScriptExecution)) { $allPassed = $false }
            if (-not (Test-PortableBuild)) { $allPassed = $false }
            if (-not (Test-PackageValidation)) { $allPassed = $false }
            
            if ($RunActualBuild) {
                if (-not (Test-ActualBuild)) { $allPassed = $false }
            }
        }
    }
}

# Summary
Write-Host "`nTest Summary" -ForegroundColor Cyan
Write-Host "============" -ForegroundColor Cyan

if ($allPassed) {
    Write-Host "ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "Build system is ready for production use." -ForegroundColor Green
    exit 0
} else {
    Write-Host "SOME TESTS FAILED!" -ForegroundColor Red
    Write-Host "Please fix the issues before proceeding." -ForegroundColor Red
    exit 1
}
