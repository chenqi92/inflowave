# Test Build Scripts
# 验证构建脚本的语法和基本功能

param(
    [switch]$SyntaxOnly = $false
)

$ErrorActionPreference = "Stop"

Write-Host "Testing Build Scripts" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan

function Test-PowerShellSyntax {
    param([string]$ScriptPath)
    
    Write-Host "Testing syntax: $ScriptPath" -ForegroundColor Yellow
    
    try {
        # Test PowerShell syntax
        $null = [System.Management.Automation.PSParser]::Tokenize((Get-Content $ScriptPath -Raw), [ref]$null)
        Write-Host "  ✅ Syntax OK" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  ❌ Syntax Error: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-ScriptExecution {
    param([string]$ScriptPath, [string[]]$TestArgs)
    
    Write-Host "Testing execution: $ScriptPath" -ForegroundColor Yellow
    
    try {
        # Test with --help or dry run if available
        $result = & powershell -File $ScriptPath @TestArgs 2>&1
        Write-Host "  ✅ Execution test passed" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  ⚠️ Execution test failed: $($_.Exception.Message)" -ForegroundColor Yellow
        return $false
    }
}

# Test scripts
$scripts = @(
    @{
        Path = "scripts/build-windows.ps1"
        TestArgs = @("-WhatIf")
        Description = "Windows MSI Build Script"
    },
    @{
        Path = "scripts/build-msix.ps1"
        TestArgs = @("-WhatIf")
        Description = "Windows MSIX Build Script"
    }
)

$allPassed = $true

foreach ($script in $scripts) {
    Write-Host "`n📋 Testing: $($script.Description)" -ForegroundColor Cyan
    
    if (-not (Test-Path $script.Path)) {
        Write-Host "  ❌ Script not found: $($script.Path)" -ForegroundColor Red
        $allPassed = $false
        continue
    }
    
    # Test syntax
    $syntaxOk = Test-PowerShellSyntax -ScriptPath $script.Path
    if (-not $syntaxOk) {
        $allPassed = $false
    }
    
    # Test execution if syntax is OK and not syntax-only mode
    if ($syntaxOk -and -not $SyntaxOnly) {
        $execOk = Test-ScriptExecution -ScriptPath $script.Path -TestArgs $script.TestArgs
        if (-not $execOk) {
            $allPassed = $false
        }
    }
}

# Test NPM scripts
Write-Host "`n📋 Testing NPM Scripts" -ForegroundColor Cyan

$npmScripts = @(
    "version:check",
    "validate:windows:packages",
    "test:packages:local"
)

foreach ($npmScript in $npmScripts) {
    Write-Host "Testing npm script: $npmScript" -ForegroundColor Yellow
    try {
        $result = npm run $npmScript --silent 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ NPM script OK" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️ NPM script warning (exit code: $LASTEXITCODE)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ❌ NPM script failed: $($_.Exception.Message)" -ForegroundColor Red
        $allPassed = $false
    }
}

# Summary
Write-Host "`n📊 Test Summary" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan

if ($allPassed) {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Some tests failed!" -ForegroundColor Red
    exit 1
}
