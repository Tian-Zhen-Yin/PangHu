# PWA 功能测试指南

## 测试环境

预览服务器已启动：`http://localhost:4173/`

## 一、基础功能测试

### 1. 访问应用
在浏览器中打开：http://localhost:4173/

### 2. 检查页面加载
- [ ] 页面正常显示
- [ ] 样式加载正确
- [ ] 路由功能正常
- [ ] 可以浏览各个页面

## 二、PWA 功能验证（Chrome DevTools）

### 打开 Chrome DevTools
1. 按 F12 或右键点击页面选择"检查"
2. 切换到 **Application** 标签

### 1. Manifest 检查
**位置：** Application → Manifest

**验证内容：**
```json
{
  "name": "哈吉咪养成计划",
  "short_name": "哈吉咪",
  "description": "智能猫咪健康管理应用",
  "theme_color": "#FF8A4C",
  "background_color": "#F9F8F6",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "icons": [...],
  "shortcuts": [...]
}
```

**检查点：**
- [ ] 名称显示为"哈吉咪养成计划"
- [ ] 主题色为 #FF8A4C（橙色）
- [ ] 显示模式为 standalone
- [ ] 图标列表包含 192px 和 512px 图标
- [ ] 快捷方式配置正确

### 2. Service Worker 检查
**位置：** Application → Service Workers

**检查点：**
- [ ] Service Worker 状态为 "activated"
- [ ] 显示文件路径：sw.js
- [ ] 显示 "激活" 和 "运行中" 状态
- [ ] Update on refresh 设置正确

### 3. Cache Storage 检查
**位置：** Application → Cache Storage

**应该看到以下缓存：**
- [ ] `workbox-precache-v2-http://localhost:4173/` - 预缓存
- [ ] `api-cache` - API 请求缓存
- [ ] `image-cache` - 图片缓存
- [ ] `google-fonts-cache` - 字体缓存

**检查预缓存内容：**
- [ ] 包含 HTML、CSS、JS 文件
- [ ] 包含图片资源
- [ ] 包含 manifest.webmanifest

### 4. 应用图标检查
**位置：** Application → Application Icons

**检查点：**
- [ ] 192x192 图标显示
- [ ] 512x512 图标显示
- [ ] 遮罩图标（maskable）显示

## 三、PWA 安装测试

### 1. 安装提示检查
**Chrome/Edge:**
- [ ] 地址栏右侧显示"安装"图标（⊕ 或 📥）
- [ ] 点击安装图标显示安装对话框
- [ ] 对话框显示应用名称"哈吉咪养成计划"
- [ ] 对话框显示应用图标

**注意：** 由于是开发环境（localhost），可能不会自动显示安装提示。

### 2. 手动触发安装
打开 Console（控制台），执行：
```javascript
// 检查 beforeinstallprompt 事件
// 确认 PWAInstallPrompt 组件是否正常工作
```

### 3. 安装横幅检查（自定义组件）
**检查点：**
- [ ] 页面顶部应该显示安装横幅（延迟2秒后）
- [ ] 横幅显示应用图标
- [ ] 横幅显示"安装哈吉咪养成计划"标题
- [ ] 横幅显示"立即安装"和"暂不"按钮
- [ ] 点击"暂不"按钮横幅消失
- [ ] 横幅消失后7天内不再显示

## 四、离线功能测试

### 1. 离线状态提示
**位置：** 页面底部

**测试步骤：**
1. 打开 DevTools → Network 标签
2. 勾选 "Offline" 模拟离线状态
3. 刷新页面

**检查点：**
- [ ] 页面底部显示"网络连接已断开"提示
- [ ] 提示框显示橙色警告图标
- [ ] 提示框显示"离线中"标签
- [ ] 页面内容仍然可见（来自缓存）

**恢复网络：**
1. 取消 "Offline" 勾选
2. 刷新页面

**检查点：**
- [ ] 页面底部提示消失
- [ ] 显示"网络连接已恢复"通知（右下角）

### 2. 离线浏览测试
**测试步骤：**
1. 在线状态下浏览几个页面（首页、体重记录、AI顾问等）
2. 切换到离线模式
3. 访问之前浏览过的页面

**检查点：**
- [ ] 页面从缓存中正常加载
- [ ] 图片正常显示（来自 image-cache）
- [ ] 样式正常加载
- [ ] JavaScript 功能正常

### 3. 离线API请求测试
**测试步骤：**
1. 在线状态下登录并获取数据
2. 切换到离线模式
3. 尝试访问需要API的页面

**预期行为：**
- [ ] Network First 策略：先尝试网络，10秒超时后返回缓存（如果有）
- [ ] 或者显示"网络连接已断开"提示
- [ ] 不会无限加载

## 五、更新机制测试

### 1. Service Worker 更新
**测试步骤：**
1. 记录当前 sw.js 的时间戳
2. 修改代码并重新构建
3. 刷新页面

**检查点：**
- [ ] Console 显示 "[PWA] New content available, refresh required"
- [ ] 显示更新提示（如果实现了更新UI）
- [ ] 新版本在下次刷新生效

### 2. 自动更新检测
**Console 日志检查：**
```
[PWA] Service Worker registration initiated
[PWA] Service Worker registered successfully
[PWA] Checking for updates... (每5分钟)
```

**检查点：**
- [ ] Service Worker 成功注册
- [ ] 定期更新检查日志存在

## 六、性能测试

### 1. Lighthouse PWA 审计
**位置：** DevTools → Lighthouse

**测试步骤：**
1. 点击 Lighthouse 标签
2. 选择 "Progressive Web App" 类别
3. 点击 "Analyze page load"

**目标评分：**
- [ ] PWA Optimized: 100
- [ ] Installable: 100
- [ ] Works Offline: 100
- [ ] Fast & Reliable: 90+

### 2. 缓存性能
**测试步骤：**
1. DevTools → Network 标签
2. 勾选 "Disable cache"
3. 刷新页面

**检查点：**
- [ ] 静态资源从 Service Worker 返回 (size 显示为 (from ServiceWorker))
- [ ] 响应时间 < 100ms
- [ ] 状态码为 200

## 七、移动端测试

### 1. iOS Safari 测试
**测试步骤：**
1. 在 iPhone 上打开 Safari
2. 访问应用（需要通过局域网IP或HTTPS域名）
3. 点击"分享"按钮
4. 选择"添加到主屏幕"

**检查点：**
- [ ] 显示应用图标
- [ ] 显示应用名称"哈吉咪"
- [ ] 添加后独立窗口打开（无浏览器UI）
- [ ] 状态栏样式正确
- [ ] 启动画面显示

### 2. Android Chrome 测试
**测试步骤：**
1. 在 Android 手机上打开 Chrome
2. 访问应用
3. 等待安装提示或点击菜单

**检查点：**
- [ ] 显示"添加到主屏幕"横幅
- [ ] 安装后桌面显示应用图标
- [ ] 点击图标打开全屏应用
- [ ] 返回键正常工作
- [ ] 通知权限请求（如果实现）

## 八、图标文件检查

### 检查图标加载
打开各个图标 URL：
- [ ] http://localhost:4173/icons/favicon-16x16.png
- [ ] http://localhost:4173/icons/favicon-32x32.png
- [ ] http://localhost:4173/icons/apple-touch-icon.png
- [ ] http://localhost:4173/icons/icon-192.png
- [ ] http://localhost:4173/icons/icon-512.png
- [ ] http://localhost:4173/icons/icon-maskable.png

**注意：** 当前使用占位符图标，需要替换为真实的胖虎吉祥物图片。

## 九、常见问题排查

### 1. Service Worker 未注册
**可能原因：**
- 代码中 `import.meta.env.PROD` 条件
- 开发环境下默认禁用

**解决方法：**
- 检查 Console 是否有 "[PWA] Service Worker registration initiated" 日志
- 确认是否在生产环境构建

### 2. 图标显示错误
**可能原因：**
- 图标文件路径错误
- 图标文件损坏
- 图标格式不支持

**解决方法：**
- 检查 `public/icons/` 目录
- 使用 mask.io 重新生成图标

### 3. 离线功能不工作
**可能原因：**
- Service Worker 未激活
- 缓存策略配置错误
- 文件未被预缓存

**解决方法：**
- Application → Service Workers → Update on refresh
- Application → Storage → Clear site data
- 重新构建并刷新

### 4. 安装提示不显示
**可能原因：**
- 不满足 PWA 安装条件
- 需要用户交互才能安装
- localhost 域名限制

**解决方法：**
- 使用 HTTPS 域名测试
- 检查 Manifest 配置
- 等待页面完全加载

## 十、下一步优化建议

### 短期（可选）
- [ ] 替换占位符图标为真实胖虎图标
- [ ] 添加更新提示UI组件
- [ ] 优化缓存策略
- [ ] 添加推送通知功能

### 长期（高级）
- [ ] 后台同步
- [ ] 离线数据队列
- [ ] Periodic Background Sync
- [ ] 定期提醒功能

## 测试清单总结

### 必须通过（关键功能）
- [ ] Manifest 配置正确且可访问
- [ ] Service Worker 成功注册并激活
- [ ] 预缓存包含所有必要资源
- [ ] 离线状态下页面可访问
- [ ] 离线状态提示正常显示
- [ ] 安装横幅组件正常工作

### 建议通过（优化功能）
- [ ] Lighthouse PWA 评分 ≥ 90
- [ ] 缓存命中率 > 80%
- [ ] 离线响应时间 < 100ms
- [ ] 更新检测正常工作

### 可选（增强功能）
- [ ] 真机测试通过
- [ ] 推送通知工作
- [ ] 后台同步功能
- [ ] 定期提醒功能

---

_测试完成后，请记录发现的问题并优先修复关键功能问题。_
