# C盘清理设计文档

**日期：** 2026-06-11
**目标：** 释放10-20 GB磁盘空间
**方案：** 方案A - Windows内置工具 + 常规清理

## 当前状态

- C盘总容量：约200 GB
- 可用空间：约1.45 GB（不到1%）
- 问题：系统盘空间严重不足，影响系统正常运行
- 环境：Windows 11，开发工具和项目文件都在其他盘

## 设计概述

本设计通过使用Windows内置工具和清理常见临时文件来释放C盘空间。方案选择的是最安全的清理方式，不会影响系统稳定性和用户数据。

## 第1部分：预检查和安全措施

### 1.1 确认当前状态
- 记录清理前的C盘可用空间
- 确认没有正在运行的安装程序或Windows更新

### 1.2 创建系统还原点（可选）
- 在开始清理前创建还原点
- 如果清理后出现问题可以回滚

### 1.3 清空回收站
- 手动清空回收站
- 确认没有需要恢复的重要文件

## 第2部分：具体清理步骤

### 2.1 Windows磁盘清理工具
使用Windows内置的磁盘清理工具：

```batch
# 方法1：命令行
cleanmgr /sageset:1  # 配置清理选项
cleanmgr /sagerun:1  # 执行清理

# 方法2：GUI
# 右键C盘 -> 属性 -> 磁盘清理
# 或在开始菜单搜索"磁盘清理"
```

**清理项目：**
- Windows更新临时文件
- Windows Defender
- 临时文件
- 缩略图
- 回收站
- 临时Windows文件
- 设备驱动程序包

### 2.2 清理Windows更新临时文件

```batch
# 删除Windows更新备份临时文件夹
rmdir /s /q C:\$WINDOWS.~BT

# 清理Windows更新下载缓存
del /f /s /q C:\Windows\SoftwareDistribution\Download\*
```

**注意：** 如果最近有未完成的Windows更新，建议先完成更新再执行此步骤。

### 2.3 清理系统临时文件

```batch
# 清理Windows临时文件夹
del /f /s /q C:\Windows\Temp\*

# 清理根目录临时文件夹
del /f /s /q C:\temp\*
del /f /s /q C:\tmp\*
```

**注意：** 某些文件可能正在使用，系统会跳过这些文件，这是正常的。

### 2.4 清理用户临时文件

使用PowerShell清理用户临时文件夹：

```powershell
# 清理当前用户临时文件夹
Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue

# 清理本地应用数据临时文件夹
Remove-Item -Path "$env:LOCALAPPDATA\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
```

### 2.5 清理Windows错误报告

```batch
# 清理Windows错误报告文件夹
rmdir /s /q "C:\ProgramData\Microsoft\Windows\WER\*"
```

### 2.6 删除Windows.old文件夹（如果存在）

如果存在`C:\Windows.old`文件夹（这是Windows升级后的旧系统文件备份）：

```batch
# 方法1：通过磁盘清理工具
# 磁盘清理 -> 清理系统文件 -> 勾选"以前的Windows安装"

# 方法2：命令行（需要管理员权限）
takeown /f C:\Windows.old\* /r /d y
icacls C:\Windows.old\* /grant administrators:F /t
rmdir /s /q C:\Windows.old
```

**注意：** Windows.old可能占用10-20GB空间，但删除后无法回退到旧版本Windows。

## 第3部分：验证和后续措施

### 3.1 验证步骤

1. **检查磁盘空间**
   ```batch
   wmic logicaldisk where "DeviceID='C:'" get Size,FreeSpace
   ```
   - 对比清理前后的可用空间
   - 确认达到10-20 GB目标

2. **系统功能测试**
   - 重启电脑，确保系统正常启动
   - 检查常用程序是否正常运行
   - 确认Windows更新功能正常

### 3.2 后续建议

**定期维护：**
- 每月运行一次Windows磁盘清理
- 定期清空回收站
- 定期清理浏览器缓存

**长期优化：**
- 考虑将虚拟内存页面文件移到其他盘
- 将新程序安装路径改到其他盘
- 定期清理下载文件夹

### 3.3 风险评估

| 风险等级 | 项目 | 说明 |
|---------|------|------|
| 低 | 临时文件、缓存、缩略图 | 可以安全删除，系统会自动重建 |
| 中 | Windows更新临时文件 | 如果正在更新中可能有问题 |
| 中 | Windows.old | 删除后无法回退旧版本 |
| 低 | 回收站 | 确认无重要文件后删除 |

**恢复方案：**
如果清理后系统出现异常，可以使用之前创建的系统还原点进行恢复。

## 执行顺序

1. 预检查（记录空间、清空回收站）
2. 创建系统还原点
3. 运行磁盘清理工具
4. 清理Windows更新临时文件
5. 清理系统临时文件
6. 清理用户临时文件
7. 清理Windows错误报告
8. 删除Windows.old（如存在）
9. 验证磁盘空间
10. 重启验证

## 预期结果

- 释放空间：10-20 GB
- 系统稳定性：不受影响
- 风险：极低
- 执行时间：约15-30分钟
