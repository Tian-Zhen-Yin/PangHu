# C盘清理实施计划

> **对于执行者：** 这是分步执行C盘清理的系统化计划。每个步骤都有验证点，确保安全完成清理任务。

**目标：** 释放C盘10-20 GB空间，确保系统正常运行

**方案：** 使用Windows内置工具和常规清理，安全性最高的清理方案

**预期时间：** 15-30分钟

---

## 前置说明

- **执行环境：** Windows 11，管理员权限
- **执行方式：** 可以手动执行，也可以创建批处理脚本自动化执行
- **安全措施：** 每个步骤都包含验证，出现问题可以停止

---

## 任务列表

### Task 1: 预检查 - 记录当前状态

**目标：** 记录清理前的C盘状态，作为对比基准

- [ ] **Step 1: 检查C盘当前空间**

打开PowerShell（管理员），运行：

```powershell
Get-PSDrive C | Select-Object Used,Free,@{Name="UsedGB";Expression={[math]::Round($_.Used/1GB,2)}},@{Name="FreeGB";Expression={[math]::Round($_.Free/1GB,2)}}
```

**预期输出：** 显示已用空间和可用空间（GB）

**记录：** 记录当前的FreeGB数值（例如：1.45 GB）

- [ ] **Step 2: 检查是否有正在运行的更新**

打开Windows更新设置：

```
设置 -> Windows更新 -> 检查更新
```

**验证点：** 确认没有正在进行的更新或重启待处理

**如果正在更新：** 完成更新并重启后再继续

- [ ] **Step 3: 检查是否有正在运行的安装程序**

打开任务管理器（Ctrl+Shift+Esc），检查：
- 是否有安装程序在运行
- 是否有其他磁盘密集型操作

**验证点：** 确认没有干扰清理的程序运行

---

### Task 2: 清空回收站

**目标：** 释放回收站占用的空间

- [ ] **Step 1: 手动清空回收站**

在桌面上右键点击"回收站" -> "清空回收站"

或者在文件资源管理器中：
```
右键回收站 -> 属性 -> 选中C盘回收站 -> 勾选"不将文件移到回收站..." -> 确定
然后再次取消勾选
```

- [ ] **Step 2: 验证回收站已清空**

在文件资源管理器中打开回收站，确认为空

**预期结果：** 回收站为空

**记录：** 如果之前有很多文件，这里可能释放几百MB到几GB空间

---

### Task 3: 创建系统还原点（可选但推荐）

**目标：** 在清理前创建安全网

- [ ] **Step 1: 打开系统还原**

搜索"创建还原点"并打开

- [ ] **Step 2: 为C盘创建还原点**

```
点击"创建"按钮
输入描述："清理前的系统状态"
点击"创建"
```

**预期结果：** 显示"已成功创建还原点"

**注意：** 如果系统还原被关闭，Windows会提示。可以选择开启或跳过此步骤

**记录：** 记录还原点创建时间，以便需要时回滚

---

### Task 4: 运行Windows磁盘清理工具

**目标：** 使用Windows内置工具清理多种临时文件

- [ ] **Step 1: 启动磁盘清理工具**

方法1：按Win+R，输入`cleanmgr`，按Enter

方法2：在开始菜单搜索"磁盘清理"

- [ ] **Step 2: 选择C盘进行清理**

如果有多 个盘，选择C盘

- [ ] **Step 3: 点击"清理系统文件"**

这会以管理员权限重新扫描，显示更多清理选项

- [ ] **Step 4: 选择清理项目**

勾选以下选项：
- ✓ Windows更新清理
- ✓ Windows Defender
- ✓ 临时文件
- ✓ 缩略图
- ✓ 临时Windows安装文件
- ✓ 设备驱动程序包
- ✓ 语言资源文件（如果不需要多语言）

**不勾选：**
- ☐ 下载的Program文件（除非确定不需要）
- ☐ Windows ESD安装文件（用于重装系统）

- [ ] **Step 5: 查看预计释放的空间**

查看对话框底部显示的可以释放的总空间

**验证点：** 确认显示的空间量合理（通常几GB）

- [ ] **Step 6: 执行清理**

点击"确定" -> "删除文件"

**预期结果：** 进度条运行，完成后自动关闭对话框

**执行时间：** 5-15分钟（取决于文件数量）

---

### Task 5: 清理Windows更新临时文件

**目标：** 删除Windows更新过程中的临时文件

- [ ] **Step 1: 检查$WINDOWS.~BT文件夹**

在PowerShell（管理员）中运行：

```powershell
if (Test-Path "C:\$WINDOWS.~BT") {
    Get-ChildItem "C:\$WINDOWS.~BT" -Recurse | Measure-Object -Property Length -Sum
} else {
    Write-Host "文件夹不存在"
}
```

**预期输出：** 显示文件夹大小（如果存在）

**注意：** 这个文件夹是Windows升级期间的临时备份

- [ ] **Step 2: 删除$WINDOWS.~BT文件夹（如果存在）**

在PowerShell（管理员）中运行：

```powershell
if (Test-Path "C:\$WINDOWS.~BT") {
    Remove-Item "C:\$WINDOWS.~BT" -Recurse -Force
    Write-Host "已删除 $WINDOWS.~BT"
}
```

**验证点：** 命令执行无错误

**预期结果：** 提示"已删除 $WINDOWS.~BT"或"文件夹不存在"

- [ ] **Step 3: 清理Windows更新下载缓存**

在PowerShell（管理员）中运行：

```powershell
# 停止Windows更新服务
Stop-Service -Name wuauserv -Force

# 删除下载缓存
$downloadPath = "$env:SystemRoot\SoftwareDistribution\Download"
if (Test-Path $downloadPath) {
    Remove-Item "$downloadPath\*" -Recurse -Force
    Write-Host "已清理更新下载缓存"
}

# 重启Windows更新服务
Start-Service -Name wuauserv
```

**验证点：** 命令执行无错误

**预期结果：** 提示"已清理更新下载缓存"

**注意：** 下次检查更新时会重新下载必要文件

---

### Task 6: 清理系统临时文件

**目标：** 清理Windows临时文件夹中的临时文件

- [ ] **Step 1: 清理Windows Temp文件夹**

在PowerShell（管理员）中运行：

```powershell
$tempPath = "$env:SystemRoot\Temp"
Write-Host "清理 $tempPath"

Get-ChildItem $tempPath -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "完成清理 Windows Temp"
```

**预期结果：** 某些文件可能正在使用，这是正常的

**验证点：** 命令完成，可能有少量错误提示（可忽略）

- [ ] **Step 2: 清理根目录临时文件夹**

在PowerShell（管理员）中运行：

```powershell
# 清理 C:\temp
if (Test-Path "C:\temp") {
    Get-ChildItem "C:\temp" -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "已清理 C:\temp"
}

# 清理 C:\tmp
if (Test-Path "C:\tmp") {
    Get-ChildItem "C:\tmp" -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "已清理 C:\tmp"
}
```

**验证点：** 命令完成，无严重错误

---

### Task 7: 清理用户临时文件

**目标：** 清理当前用户的临时文件夹

- [ ] **Step 1: 清理用户TEMP文件夹**

在PowerShell中运行：

```powershell
$userTemp = $env:TEMP
Write-Host "清理用户临时文件夹: $userTemp"

# 获取当前大小（仅用于信息）
$beforeSize = (Get-ChildItem $userTemp -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "清理前大小: $($beforeSize.ToString('0.00')) MB"

# 删除文件
Get-ChildItem $userTemp -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "已清理用户临时文件夹"
```

**预期结果：** 清理大量临时文件

- [ ] **Step 2: 清理LocalAppData Temp文件夹**

在PowerShell中运行：

```powershell
$localTemp = "$env:LOCALAPPDATA\Temp"
Write-Host "清理本地应用数据临时文件夹: $localTemp"

if (Test-Path $localTemp) {
    Get-ChildItem $localTemp -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "已清理 LocalAppData Temp"
}
```

**验证点：** 命令完成

---

### Task 8: 清理Windows错误报告

**目标：** 删除Windows错误报告和诊断数据

- [ ] **Step 1: 检查错误报告文件夹大小**

在PowerShell（管理员）中运行：

```powershell
$werPath = "C:\ProgramData\Microsoft\Windows\WER"
if (Test-Path $werPath) {
    $size = (Get-ChildItem $werPath -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "错误报告文件夹大小: $($size.ToString('0.00')) MB"
}
```

- [ ] **Step 2: 清理错误报告文件夹**

在PowerShell（管理员）中运行：

```powershell
$werPath = "C:\ProgramData\Microsoft\Windows\WER"
if (Test-Path $werPath) {
    Get-ChildItem $werPath -Recurse -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "已清理Windows错误报告"
}
```

**验证点：** 命令完成

**预期结果：** 删除错误报告和崩溃转储文件

---

### Task 9: 检查并清理Windows.old文件夹（如果存在）

**目标：** 删除Windows升级后的旧系统文件备份

- [ ] **Step 1: 检查Windows.old是否存在**

在PowerShell（管理员）中运行：

```powershell
if (Test-Path "C:\Windows.old") {
    $size = (Get-ChildItem "C:\Windows.old" -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1GB
    Write-Host "发现 Windows.old 文件夹，大小: $($size.ToString('0.00')) GB"
    Write-Host "警告：删除后无法回退到旧版本Windows"
} else {
    Write-Host "未发现 Windows.old 文件夹，跳过此任务"
}
```

**决策点：**
- 如果不存在，跳过此任务，直接到Task 10
- 如果存在，决定是否删除（建议删除，除非需要回退旧版本）

- [ ] **Step 2: 使用磁盘清理工具删除Windows.old（推荐方法）**

重新运行磁盘清理工具（cleanmgr），选择"清理系统文件"

勾选：**"以前的Windows安装"**

点击确定删除

**注意：** 这是最安全的删除方法，Windows会正确处理权限

- [ ] **Step 3: 验证Windows.old已删除**

在PowerShell中运行：

```powershell
Test-Path "C:\Windows.old"
```

**预期结果：** 返回`False`（表示已删除）

---

### Task 10: 验证清理结果

**目标：** 确认清理效果，达到目标空间

- [ ] **Step 1: 再次检查C盘空间**

在PowerShell中运行：

```powershell
Get-PSDrive C | Select-Object Used,Free,@{Name="UsedGB";Expression={[math]::Round($_.Used/1GB,2)}},@{Name="FreeGB";Expression={[math]::Round($_.Free/1GB,2)}}
```

**对比：** 与Task 1中记录的FreeGB进行对比

**验证点：** 释放的空间应该在10-20 GB范围内

- [ ] **Step 2: 计算释放的空间**

从Task 1的记录中减去当前的FreeGB

**预期结果：** 释放了10-20 GB空间

**如果未达到目标：** 可能需要考虑方案B中的激进清理选项

---

### Task 11: 系统功能验证

**目标：** 确保清理后系统正常运行

- [ ] **Step 1: 重启电脑**

```
开始菜单 -> 电源 -> 重启
```

**注意：** 重启可以确保清理的临时文件不会影响系统

- [ ] **Step 2: 重启后检查系统启动**

**验证点：**
- 系统正常启动
- 登录到桌面
- 没有错误提示

- [ ] **Step 3: 检查常用功能**

测试以下功能：
- 打开文件资源管理器
- 打开浏览器
- 打开常用应用程序

**验证点：** 所有功能正常

- [ ] **Step 4: 检查Windows更新**

打开Windows更新设置，检查是否有更新

```
设置 -> Windows更新 -> 检查更新
```

**验证点：** 更新功能正常

---

### Task 12: 记录结果并完成

**目标：** 记录清理结果，完成清理任务

- [ ] **Step 1: 记录最终空间状态**

在PowerShell中运行：

```powershell
Get-PSDrive C | Select-Object Used,Free,@{Name="UsedGB";Expression={[math]::Round($_.Used/1GB,2)}},@{Name="FreeGB";Expression={[math]::Round($_.Free/1GB,2)}}
```

**记录：**
- 清理前空间：___ GB
- 清理后空间：___ GB
- 释放空间：___ GB

- [ ] **Step 2: 确认任务完成**

**验证清单：**
- [ ] 达到10-20 GB释放目标
- [ ] 系统启动正常
- [ ] 常用功能正常
- [ ] Windows更新功能正常

**如果所有项目都通过：** 清理任务成功完成

**如果出现问题：** 使用Task 3创建的还原点进行恢复

---

## 后续建议

### 定期维护（每月）

1. 运行Windows磁盘清理工具
2. 清空回收站
3. 清理浏览器缓存

### 长期优化（可选）

如果未来再次空间不足，可以考虑：

1. **移动虚拟内存到其他盘**
   ```
   系统 -> 高级系统设置 -> 高级 -> 性能设置 -> 高级 -> 虚拟内存
   将C盘的页面文件设置改为无，在其他盘创建页面文件
   ```

2. **更改程序默认安装路径**
   安装新软件时，选择安装到其他盘

3. **关闭休眠功能**（如果不用）
   ```
   以管理员运行PowerShell: powercfg -h off
   可以释放几GB空间（hiberfil.sys文件）
   ```

---

## 故障排除

### 问题：清理后系统异常

**解决方案：** 使用系统还原点恢复

1. 搜索"创建还原点"
2. 点击"系统还原"
3. 选择清理前创建的还原点
4. 按照向导完成还原

### 问题：某些清理选项不可见

**解决方案：** 确保以管理员权限运行磁盘清理

1. 右键点击"磁盘清理"
2. 选择"以管理员身份运行"

### 问题：Windows.old删除失败

**解决方案：** 使用磁盘清理工具，而不是手动删除

手动删除可能因权限问题失败，磁盘清理工具会正确处理

---

## 执行方式选择

这个计划可以按以下方式执行：

**方式1：手动逐步执行**
- 按照Task顺序，手动执行每个步骤
- 适合想要完全控制清理过程的用户

**方式2：创建自动化脚本**
- 将PowerShell命令组合成脚本
- 一次性运行（需要手动执行无法自动化的步骤）

**推荐：** 首次清理建议使用方式1，了解清理过程；后续可以创建脚本自动化。
