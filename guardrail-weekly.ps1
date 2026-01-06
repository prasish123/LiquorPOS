#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Guardrail Weekly Maintenance Script (PowerShell)

.DESCRIPTION
    Single command to run complete weekly maintenance routine on Windows.

.PARAMETER Repo
    Repository path (default: current directory)

.PARAMETER DryRun
    Show what would be done without making changes

.PARAMETER SkipFixes
    Skip automatic fixes (only audit and report)

.EXAMPLE
    .\guardrail-weekly.ps1

.EXAMPLE
    .\guardrail-weekly.ps1 -Repo "E:\ML Projects\POS-Omni\liquor-pos"

.EXAMPLE
    .\guardrail-weekly.ps1 -DryRun
#>

param(
    [string]$Repo = ".",
    [switch]$DryRun,
    [switch]$SkipFixes
)

$ErrorActionPreference = "Stop"

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 59) -ForegroundColor Cyan
Write-Host "Guardrail Weekly Maintenance Routine" -ForegroundColor Cyan
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 59) -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Weekly maintenance would perform:"
    Write-Host "  1. Update baseline understanding"
    Write-Host "  2. Run full maintainability audit"
    Write-Host "  3. Update trend tracking"
    Write-Host "  4. Apply critical fixes (if not skipped)"
    Write-Host "  5. Update documentation"
    Write-Host "  6. Generate weekly report"
    Write-Host ""
    Write-Host "Run without -DryRun to execute" -ForegroundColor Yellow
    exit 0
}

try {
    # Check if Python is available
    $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pythonCmd) {
        Write-Host "❌ Python not found. Please install Python 3.8+." -ForegroundColor Red
        exit 1
    }

    # Check Python version
    $pythonVersion = python --version 2>&1
    Write-Host "Using: $pythonVersion" -ForegroundColor Gray
    Write-Host ""

    # Run weekly maintenance
    if ($SkipFixes) {
        Write-Host "Running weekly maintenance (skipping fixes)..." -ForegroundColor Yellow
        Write-Host ""

        Write-Host "[Step 1/5] Updating baseline..." -ForegroundColor Cyan
        python -m guardrail baseline --repo $Repo --update-memory
        if ($LASTEXITCODE -ne 0) { throw "Baseline update failed" }

        Write-Host ""
        Write-Host "[Step 2/5] Running maintainability audit..." -ForegroundColor Cyan
        python -m guardrail audit --repo $Repo --full
        if ($LASTEXITCODE -ne 0) { throw "Audit failed" }

        Write-Host ""
        Write-Host "[Step 3/5] Updating trend tracking..." -ForegroundColor Cyan
        python -m guardrail trend --repo $Repo --update
        if ($LASTEXITCODE -ne 0) { throw "Trend update failed" }

        Write-Host ""
        Write-Host "[Step 4/5] Updating documentation..." -ForegroundColor Cyan
        python -m guardrail docs --repo $Repo --update
        if ($LASTEXITCODE -ne 0) { throw "Documentation update failed" }

        Write-Host ""
        Write-Host "[Step 5/5] Generating weekly report..." -ForegroundColor Cyan
        python -m guardrail report --repo $Repo --weekly
        if ($LASTEXITCODE -ne 0) { throw "Report generation failed" }

        Write-Host ""
        Write-Host "✅ Weekly maintenance complete (fixes skipped)" -ForegroundColor Green
    }
    else {
        # Run complete maintenance
        python guardrail-weekly.py --repo $Repo

        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "=" -NoNewline -ForegroundColor Green
            Write-Host ("=" * 59) -ForegroundColor Green
            Write-Host "✅ WEEKLY MAINTENANCE COMPLETE" -ForegroundColor Green
            Write-Host "=" -NoNewline -ForegroundColor Green
            Write-Host ("=" * 59) -ForegroundColor Green
            Write-Host ""
            Write-Host "Report saved: GUARDRAIL_REPORT_WEEK_*.md" -ForegroundColor Cyan
            Write-Host "Review the report for detailed results and next actions" -ForegroundColor Cyan
        }
        else {
            throw "Weekly maintenance failed"
        }
    }

    exit 0
}
catch {
    Write-Host ""
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}

