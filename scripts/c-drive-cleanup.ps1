# C盘清理自动化脚本
# 需要管理员权限运行

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "      C盘清理自动化脚本" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# 检查管理员权限
Write-Host "[1/7] 检查管理员权限..." -ForegroundColor Yellow
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "错误：此脚本需要管理员权限运行" -ForegroundColor Red
    Write-Host "请右键点击PowerShell，选择'以管理员身份运行'" -ForegroundColor Red
    Read-Host "按Enter键退出"
    exit 1
}
Write-Host "管理员权限确认" -ForegroundColor Green
Write-Host ""

# 记录当前状态
Write-Host "[2/7] 记录清理前的C盘状态..." -ForegroundColor Yellow
$cDrive = Get-PSDrive C
$beforeFreeGB = [math]::Round($cDrive.Free / 1GB, 2)
Write-Host "清理前可用空间: $beforeFreeGB GB" -ForegroundColor White
Write-Host ""

Write-Host "即将开始清理C盘，预计释放 10-20 GB 空间" -ForegroundColor Yellow
Write-Host "建议先执行：清空回收站、运行cleanmgr" -ForegroundColor Yellow
Write-Host ""

$continue = Read-Host "是否继续执行自动化清理? (Y/N)"
if ($continue -ne "Y") {
    Write-Host "已取消清理" -ForegroundColor Yellow
    exit 0
}
Write-Host ""

# 清理Windows更新临时文件
Write-Host "[3/7] 清理Windows更新临时文件..." -ForegroundColor Yellow

$windowsBtPath = "C:\$WINDOWS.~BT"
if (Test-Path $windowsBtPath) {
    try {
        Remove-Item $windowsBtPath -Recurse -Force
        Write-Host "已删除 $WINDOWS.~BT" -ForegroundColor Green
    } catch {
        Write-Host "删除 $WINDOWS.~BT 失败" -ForegroundColor Red
    }
} else {
    Write-Host "$WINDOWS.~BT 不存在" -ForegroundColor Gray
}

# 清理Windows更新下载缓存
Write-Host "清理Windows更新下载缓存..." -ForegroundColor White
try {
    Stop-Service -Name wuauserv -Force -ErrorAction SilentlyContinue
    $downloadPath = "$env:SystemRoot\SoftwareDistribution\Download"
    if (Test-Path $downloadPath) {
        Remove-Item "$downloadPath\*" -Recurse -Force
        Write-Host "已清理更新下载缓存" -ForegroundColor Green
    }
    Start-Service -Name wuauserv -ErrorAction SilentlyContinue
} catch {
    Write-Host "清理更新下载缓存失败" -ForegroundColor Red
}
Write-Host ""

# 清理系统临时文件
Write-Host "[4/7] 清理系统临时文件..." -ForegroundColor Yellow

$windowsTempPath = "$env:SystemRoot\Temp"
if (Test-Path $windowsTempPath) {
    try {
        Remove-Item "$windowsTempPath\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "已清理 Windows Temp" -ForegroundColor Green
    } catch {
        Write-Host "清理 Windows Temp 失败" -ForegroundColor Yellow
    }
}

if (Test-Path "C:\temp") {
    try {
        Remove-Item "C:\temp\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "已清理 C:\temp" -ForegroundColor Green
    } catch {
        Write-Host "清理 C:\temp 失败" -ForegroundColor Yellow
    }
}

if (Test-Path "C:\tmp") {
    try {
        Remove-Item "C:\tmp\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "已清理 C:\tmp" -ForegroundColor Green
    } catch {
        Write-Host "清理 C:\tmp 失败" -ForegroundColor Yellow
    }
}
Write-Host ""

# 清理用户临时文件
Write-Host "[5/7] 清理用户临时文件..." -ForegroundColor Yellow

$userTempPath = $env:TEMP
if (Test-Path $userTempPath) {
    try {
        Remove-Item "$userTempPath\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "已清理用户Temp文件夹" -ForegroundColor Green
    } catch {
        Write-Host "清理用户Temp失败" -ForegroundColor Yellow
    }
}

$localTempPath = "$env:LOCALAPPDATA\Temp"
if (Test-Path $localTempPath) {
    try {
        Remove-Item "$localTempPath\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "已清理 LocalAppData Temp" -ForegroundColor Green
    } catch {
        Write-Host "清理 LocalAppData Temp 失败" -ForegroundColor Yellow
    }
}
Write-Host ""

# 清理Windows错误报告
Write-Host "[6/7] 清理Windows错误报告..." -ForegroundColor Yellow

$werPath = "C:\ProgramData\Microsoft\Windows\WER"
if (Test-Path $werPath) {
    try {
        Remove-Item "$werPath\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "已清理Windows错误报告" -ForegroundColor Green
    } catch {
        Write-Host "清理错误报告失败" -ForegroundColor Yellow
    }
} else {
    Write-Host "错误报告文件夹不存在" -ForegroundColor Gray
}
Write-Host ""

# 检查Windows.old
Write-Host "[7/7] 检查Windows.old文件夹..." -ForegroundColor Yellow

$windowsOldPath = "C:\Windows.old"
if (Test-Path $windowsOldPath) {
    try {
        $size = (Get-ChildItem $windowsOldPath -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1GB
        Write-Host "发现 Windows.old，大小: $([math]::Round($size, 2)) GB" -ForegroundColor Yellow
        Write-Host "建议运行 cleanmgr 删除" -ForegroundColor Cyan
    } catch {
        Write-Host "检查 Windows.old 失败" -ForegroundColor Red
    }
} else {
    Write-Host "未发现 Windows.old" -ForegroundColor Gray
}
Write-Host ""

# 显示结果
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "         清理结果" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$cDriveAfter = Get-PSDrive C
$afterFreeGB = [math]::Round($cDriveAfter.Free / 1GB, 2)
$releasedGB = [math]::Round($afterFreeGB - $beforeFreeGB, 2)

Write-Host "清理前可用空间: $beforeFreeGB GB" -ForegroundColor White
Write-Host "清理后可用空间: $afterFreeGB GB" -ForegroundColor White
Write-Host "释放空间: $releasedGB GB" -ForegroundColor Green
Write-Host ""

if ($releasedGB -ge 10) {
    Write-Host "清理成功！已达到预期目标" -ForegroundColor Green
} elseif ($releasedGB -ge 5) {
    Write-Host "清理部分完成，建议运行 cleanmgr 获取更多空间" -ForegroundColor Yellow
} else {
    Write-Host "清理效果不明显，建议运行 cleanmgr" -ForegroundColor Red
}

Write-Host ""
Write-Host "后续步骤：" -ForegroundColor Cyan
Write-Host "1. 重启电脑" -ForegroundColor White
Write-Host "2. 检查程序是否正常运行" -ForegroundColor White
Write-Host "3. 检查Windows更新功能" -ForegroundColor White
Write-Host ""

if (Test-Path $windowsOldPath) {
    Write-Host "4. 使用 cleanmgr 删除 Windows.old" -ForegroundColor Yellow
}

Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "按Enter键退出"
