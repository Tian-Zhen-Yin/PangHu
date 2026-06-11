# C盘清理自动化脚本
# 执行前请先阅读注释中的注意事项
# 需要管理员权限运行

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "      C盘清理自动化脚本" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# ==================== 前置检查 ====================

Write-Host "[1/7] 检查管理员权限..." -ForegroundColor Yellow
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "错误：此脚本需要管理员权限运行" -ForegroundColor Red
    Write-Host "请右键点击PowerShell，选择'以管理员身份运行'，然后执行此脚本" -ForegroundColor Red
    Read-Host "按Enter键退出"
    exit 1
}
Write-Host "管理员权限确认" -ForegroundColor Green
Write-Host ""

# ==================== 任务1: 记录当前状态 ====================

Write-Host "[2/7] 记录清理前的C盘状态..." -ForegroundColor Yellow
$cDrive = Get-PSDrive C
$beforeFreeGB = [math]::Round($cDrive.Free / 1GB, 2)
$beforeUsedGB = [math]::Round($cDrive.Used / 1GB, 2)

Write-Host "清理前状态:" -ForegroundColor Cyan
Write-Host "  已用空间: $beforeUsedGB GB" -ForegroundColor White
Write-Host "  可用空间: $beforeFreeGB GB" -ForegroundColor White
Write-Host ""

# 询问是否继续
Write-Host "即将开始清理C盘，预计释放 10-20 GB 空间" -ForegroundColor Yellow
Write-Host "建议在执行前先执行以下手动操作:" -ForegroundColor Yellow
Write-Host "  1. 清空回收站" -ForegroundColor White
Write-Host "  2. 运行磁盘清理工具 (cleanmgr)" -ForegroundColor White
Write-Host "  3. (可选) 创建系统还原点" -ForegroundColor White
Write-Host ""

$continue = Read-Host "是否继续执行自动化清理? (Y/N)"
if ($continue -ne "Y" -and $continue -ne "y") {
    Write-Host "已取消清理" -ForegroundColor Yellow
    Read-Host "按Enter键退出"
    exit 0
}
Write-Host ""

# ==================== 任务2: 清理Windows更新临时文件 ====================

Write-Host "[3/7] 清理Windows更新临时文件..." -ForegroundColor Yellow

# 检查并删除 $WINDOWS.~BT
$windowsBtPath = "C:\$WINDOWS.~BT"
if (Test-Path $windowsBtPath) {
    try {
        $size = (Get-ChildItem $windowsBtPath -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Host "  发现 $WINDOWS.~BT 文件夹，大小: $([math]::Round($size, 2)) MB" -ForegroundColor White

        Remove-Item $windowsBtPath -Recurse -Force -ErrorAction Stop
        Write-Host "  已删除 $WINDOWS.~BT" -ForegroundColor Green
    } catch {
        Write-Host "  删除 $WINDOWS.~BT 失败: $_" -ForegroundColor Red
    }
} else {
    Write-Host "  $WINDOWS.~BT 不存在，跳过" -ForegroundColor Gray
}

# 清理 Windows 更新下载缓存
Write-Host "  清理 Windows 更新下载缓存..." -ForegroundColor White
try {
    # 停止 Windows 更新服务
    Stop-Service -Name wuauserv -Force -ErrorAction SilentlyContinue

    # 删除下载缓存
    $downloadPath = "$env:SystemRoot\SoftwareDistribution\Download"
    if (Test-Path $downloadPath) {
        Get-ChildItem $downloadPath -Force | Remove-Item -Recurse -Force -ErrorAction Stop
        Write-Host "  已清理更新下载缓存" -ForegroundColor Green
    } else {
        Write-Host "  更新下载缓存不存在，跳过" -ForegroundColor Gray
    }

    # 重启 Windows 更新服务
    Start-Service -Name wuauserv -ErrorAction SilentlyContinue
} catch {
    Write-Host "  清理更新下载缓存失败: $_" -ForegroundColor Red

    # 确保服务重启
    Start-Service -Name wuauserv -ErrorAction SilentlyContinue
}
Write-Host ""

# ==================== 任务3: 清理系统临时文件 ====================

Write-Host "[4/7] 清理系统临时文件..." -ForegroundColor Yellow

# 清理 Windows Temp
$windowsTempPath = "$env:SystemRoot\Temp"
Write-Host "  清理 $windowsTempPath..." -ForegroundColor White
try {
    $items = Get-ChildItem $windowsTempPath -Force -ErrorAction SilentlyContinue
    $count = ($items | Measure-Object).Count
    if ($count -gt 0) {
        $items | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  已清理 $count 个项目" -ForegroundColor Green
    } else {
        Write-Host "  文件夹为空，跳过" -ForegroundColor Gray
    }
} catch {
    Write-Host "  清理失败（部分文件可能正在使用）: $_" -ForegroundColor Yellow
}

# 清理 C:\temp
$cTempPath = "C:\temp"
if (Test-Path $cTempPath) {
    Write-Host "  清理 $cTempPath..." -ForegroundColor White
    try {
        $items = Get-ChildItem $cTempPath -Force -ErrorAction SilentlyContinue
        $count = ($items | Measure-Object).Count
        if ($count -gt 0) {
            $items | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "  已清理 $count 个项目" -ForegroundColor Green
        } else {
            Write-Host "  文件夹为空，跳过" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  清理失败: $_" -ForegroundColor Yellow
    }
}

# 清理 C:\tmp
$cTmpPath = "C:\tmp"
if (Test-Path $cTmpPath) {
    Write-Host "  清理 $cTmpPath..." -ForegroundColor White
    try {
        $items = Get-ChildItem $cTmpPath -Force -ErrorAction SilentlyContinue
        $count = ($items | Measure-Object).Count
        if ($count -gt 0) {
            $items | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "  已清理 $count 个项目" -ForegroundColor Green
        } else {
            Write-Host "  文件夹为空，跳过" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  清理失败: $_" -ForegroundColor Yellow
    }
}
Write-Host ""

# ==================== 任务4: 清理用户临时文件 ====================

Write-Host "[5/7] 清理用户临时文件..." -ForegroundColor Yellow

# 清理用户 TEMP
$userTempPath = $env:TEMP
Write-Host "  清理 $userTempPath..." -ForegroundColor White
try {
    $beforeSize = (Get-ChildItem $userTempPath -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  清理前大小: $([math]::Round($beforeSize, 2)) MB" -ForegroundColor Gray

    $items = Get-ChildItem $userTempPath -Force -ErrorAction SilentlyContinue
    $count = ($items | Measure-Object).Count
    if ($count -gt 0) {
        $items | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  已清理 $count 个项目" -ForegroundColor Green
    } else {
        Write-Host "  文件夹为空，跳过" -ForegroundColor Gray
    }
} catch {
    Write-Host "  清理失败（部分文件可能正在使用）: $_" -ForegroundColor Yellow
}

# 清理 LocalAppData Temp
$localTempPath = "$env:LOCALAPPDATA\Temp"
if (Test-Path $localTempPath) {
    Write-Host "  清理 $localTempPath..." -ForegroundColor White
    try {
        $items = Get-ChildItem $localTempPath -Force -ErrorAction SilentlyContinue
        $count = ($items | Measure-Object).Count
        if ($count -gt 0) {
            $items | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "  已清理 $count 个项目" -ForegroundColor Green
        } else {
            Write-Host "  文件夹为空，跳过" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  清理失败: $_" -ForegroundColor Yellow
    }
}
Write-Host ""

# ==================== 任务5: 清理Windows错误报告 ====================

Write-Host "[6/7] 清理Windows错误报告..." -ForegroundColor Yellow

$werPath = "C:\ProgramData\Microsoft\Windows\WER"
if (Test-Path $werPath) {
    try {
        $beforeSize = (Get-ChildItem $werPath -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Host "  错误报告文件夹大小: $([math]::Round($beforeSize, 2)) MB" -ForegroundColor Gray

        $items = Get-ChildItem $werPath -Recurse -Force -ErrorAction SilentlyContinue
        $count = ($items | Measure-Object).Count
        if ($count -gt 0) {
            $items | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "  已清理 $count 个项目" -ForegroundColor Green
        } else {
            Write-Host "  文件夹为空，跳过" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  清理失败: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "  错误报告文件夹不存在，跳过" -ForegroundColor Gray
}
Write-Host ""

# ==================== 任务6: 检查Windows.old ====================

Write-Host "[7/7] 检查Windows.old文件夹..." -ForegroundColor Yellow

$windowsOldPath = "C:\Windows.old"
if (Test-Path $windowsOldPath) {
    try {
        $size = (Get-ChildItem $windowsOldPath -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1GB
        Write-Host "  发现 Windows.old 文件夹" -ForegroundColor Yellow
        Write-Host "  大小: $([math]::Round($size, 2)) GB" -ForegroundColor White
        Write-Host ""
        Write-Host "  Windows.old 是Windows升级后的旧系统文件备份" -ForegroundColor Yellow
        Write-Host "  删除后无法回退到旧版本Windows" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  建议使用磁盘清理工具删除:" -ForegroundColor Cyan
        Write-Host "  1. 运行 cleanmgr" -ForegroundColor White
        Write-Host "  2. 点击'清理系统文件'" -ForegroundColor White
        Write-Host "  3. 勾选'以前的Windows安装'" -ForegroundColor White
        Write-Host "  4. 点击确定删除" -ForegroundColor White
    } catch {
        Write-Host "  检查 Windows.old 失败: $_" -ForegroundColor Red
    }
} else {
    Write-Host "  未发现 Windows.old 文件夹" -ForegroundColor Gray
}
Write-Host ""

# ==================== 任务7: 验证清理结果 ====================

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "         清理结果" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# 重新检查C盘空间
$cDriveAfter = Get-PSDrive C
$afterFreeGB = [math]::Round($cDriveAfter.Free / 1GB, 2)
$afterUsedGB = [math]::Round($cDriveAfter.Used / 1GB, 2)
$releasedGB = [math]::Round($afterFreeGB - $beforeFreeGB, 2)

Write-Host "清理前后对比:" -ForegroundColor Cyan
Write-Host "  清理前可用空间: $beforeFreeGB GB" -ForegroundColor White
Write-Host "  清理后可用空间: $afterFreeGB GB" -ForegroundColor White
Write-Host "  释放空间: $releasedGB GB" -ForegroundColor Green
Write-Host ""

# 结果评估
if ($releasedGB -ge 10) {
    Write-Host "清理成功！已达到预期目标 (10-20 GB)" -ForegroundColor Green
} elseif ($releasedGB -ge 5) {
    Write-Host "清理部分完成，释放了 $releasedGB GB" -ForegroundColor Yellow
    Write-Host "  建议：运行磁盘清理工具 (cleanmgr) 获取更多空间" -ForegroundColor Yellow
} else {
    Write-Host "清理效果不明显，仅释放了 $releasedGB GB" -ForegroundColor Red
    Write-Host "  建议：运行磁盘清理工具 (cleanmgr) 获取更多空间" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "后续步骤:" -ForegroundColor Cyan
Write-Host "  1. 重启电脑以确保清理完全生效" -ForegroundColor White
Write-Host "  2. 检查常用程序是否正常运行" -ForegroundColor White
Write-Host "  3. 检查Windows更新功能是否正常" -ForegroundColor White
Write-Host ""

# 如果有 Windows.old
if (Test-Path $windowsOldPath) {
    Write-Host "  4. 使用磁盘清理工具删除 Windows.old（可额外释放几GB）" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "按Enter键退出"
