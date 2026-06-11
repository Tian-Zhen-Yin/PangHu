# C Drive Cleanup Automation Script
# Run as Administrator

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   C Drive Cleanup Script" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check admin privileges
Write-Host "[1/7] Checking admin privileges..." -ForegroundColor Yellow
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script requires administrator privileges" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Admin privileges confirmed" -ForegroundColor Green
Write-Host ""

# Record current state
Write-Host "[2/7] Recording current C drive state..." -ForegroundColor Yellow
$cDrive = Get-PSDrive C
$beforeFreeGB = [math]::Round($cDrive.Free / 1GB, 2)
Write-Host "Free space before cleanup: $beforeFreeGB GB" -ForegroundColor White
Write-Host ""

Write-Host "About to start C drive cleanup, expected to free 10-20 GB" -ForegroundColor Yellow
Write-Host "Recommended: Empty Recycle Bin and run cleanmgr first" -ForegroundColor Yellow
Write-Host ""

$continue = Read-Host "Continue with automated cleanup? (Y/N)"
if ($continue -ne "Y") {
    Write-Host "Cleanup cancelled" -ForegroundColor Yellow
    exit 0
}
Write-Host ""

# Cleanup Windows update temp files
Write-Host "[3/7] Cleaning Windows update temp files..." -ForegroundColor Yellow

$windowsBtPath = "C:\$WINDOWS.~BT"
if (Test-Path $windowsBtPath) {
    try {
        Remove-Item $windowsBtPath -Recurse -Force
        Write-Host "Deleted $WINDOWS.~BT" -ForegroundColor Green
    } catch {
        Write-Host "Failed to delete $WINDOWS.~BT" -ForegroundColor Red
    }
} else {
    Write-Host "$WINDOWS.~BT does not exist" -ForegroundColor Gray
}

# Skip Windows update download cache (better handled by cleanmgr tool)
Write-Host "Skipping Windows update cache (use cleanmgr tool instead)" -ForegroundColor Gray
Write-Host "Run: cleanmgr and select 'Windows Update Cleanup'" -ForegroundColor Gray
Write-Host ""

# Cleanup system temp files
Write-Host "[4/7] Cleaning system temp files..." -ForegroundColor Yellow

$windowsTempPath = "$env:SystemRoot\Temp"
if (Test-Path $windowsTempPath) {
    try {
        Remove-Item "$windowsTempPath\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Cleaned Windows Temp" -ForegroundColor Green
    } catch {
        Write-Host "Failed to clean Windows Temp" -ForegroundColor Yellow
    }
}

if (Test-Path "C:\temp") {
    try {
        Remove-Item "C:\temp\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Cleaned C:\temp" -ForegroundColor Green
    } catch {
        Write-Host "Failed to clean C:\temp" -ForegroundColor Yellow
    }
}

if (Test-Path "C:\tmp") {
    try {
        Remove-Item "C:\tmp\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Cleaned C:\tmp" -ForegroundColor Green
    } catch {
        Write-Host "Failed to clean C:\tmp" -ForegroundColor Yellow
    }
}
Write-Host ""

# Cleanup user temp files
Write-Host "[5/7] Cleaning user temp files..." -ForegroundColor Yellow

$userTempPath = $env:TEMP
if (Test-Path $userTempPath) {
    try {
        Remove-Item "$userTempPath\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Cleaned user Temp folder" -ForegroundColor Green
    } catch {
        Write-Host "Failed to clean user Temp" -ForegroundColor Yellow
    }
}

$localTempPath = "$env:LOCALAPPDATA\Temp"
if (Test-Path $localTempPath) {
    try {
        Remove-Item "$localTempPath\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Cleaned LocalAppData Temp" -ForegroundColor Green
    } catch {
        Write-Host "Failed to clean LocalAppData Temp" -ForegroundColor Yellow
    }
}
Write-Host ""

# Cleanup Windows error reports
Write-Host "[6/7] Cleaning Windows error reports..." -ForegroundColor Yellow

$werPath = "C:\ProgramData\Microsoft\Windows\WER"
if (Test-Path $werPath) {
    try {
        Remove-Item "$werPath\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Cleaned Windows error reports" -ForegroundColor Green
    } catch {
        Write-Host "Failed to clean error reports" -ForegroundColor Yellow
    }
} else {
    Write-Host "Error reports folder does not exist" -ForegroundColor Gray
}
Write-Host ""

# Check Windows.old
Write-Host "[7/7] Checking Windows.old folder..." -ForegroundColor Yellow

$windowsOldPath = "C:\Windows.old"
if (Test-Path $windowsOldPath) {
    try {
        $size = (Get-ChildItem $windowsOldPath -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1GB
        Write-Host "Found Windows.old, size: $([math]::Round($size, 2)) GB" -ForegroundColor Yellow
        Write-Host "Recommend running cleanmgr to delete it" -ForegroundColor Cyan
    } catch {
        Write-Host "Failed to check Windows.old" -ForegroundColor Red
    }
} else {
    Write-Host "Windows.old not found" -ForegroundColor Gray
}
Write-Host ""

# Display results
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "       Cleanup Results" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$cDriveAfter = Get-PSDrive C
$afterFreeGB = [math]::Round($cDriveAfter.Free / 1GB, 2)
$releasedGB = [math]::Round($afterFreeGB - $beforeFreeGB, 2)

Write-Host "Free space before: $beforeFreeGB GB" -ForegroundColor White
Write-Host "Free space after: $afterFreeGB GB" -ForegroundColor White
Write-Host "Space freed: $releasedGB GB" -ForegroundColor Green
Write-Host ""

if ($releasedGB -ge 10) {
    Write-Host "Cleanup successful! Target achieved (10-20 GB)" -ForegroundColor Green
} elseif ($releasedGB -ge 5) {
    Write-Host "Partial cleanup, freed $releasedGB GB" -ForegroundColor Yellow
    Write-Host "Recommend running cleanmgr for more space" -ForegroundColor Yellow
} else {
    Write-Host "Cleanup effect minimal, only freed $releasedGB GB" -ForegroundColor Red
    Write-Host "Recommend running cleanmgr for more space" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart computer" -ForegroundColor White
Write-Host "2. Check if programs run normally" -ForegroundColor White
Write-Host "3. Check Windows Update function" -ForegroundColor White
Write-Host ""

if (Test-Path $windowsOldPath) {
    Write-Host "4. Use cleanmgr to delete Windows.old" -ForegroundColor Yellow
}

Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"
