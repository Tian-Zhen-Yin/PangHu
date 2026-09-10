# 指南详情页 UI/UX 重设计方案

**日期：** 2026-06-09
**设计师：** Claude + 用户协作
**状态：** 已批准，待实现

---

## 概述

**目标：** 将指南详情页重构为**干净、克制、结构化**的阅读体验

**范围：**
- 顶部导航栏优化
- 页面标题区重构
- 胖虎导读可折叠功能
- 目录树层级增强
- 卡片阴影统一
- 莫兰迪色系局部应用
- 留白与间距优化

**不包含：**
- Markdown 渲染引擎修改（保持现有）
- 后端 API 变更
- 其他页面（首页、列表页）修改

---

## 设计决策

### 1. 顶部导航栏

**当前问题：**
- 显示通用标题"猫咪健康指南详情"，与页面标题重复
- 头像在详情页造成视觉干扰

**解决方案：**

**布局结构：**
```
┌─────────────────────────────────────────┐
│ ←  首页 / 指南 / 新生幼猫    [条件: 头像] │
└─────────────────────────────────────────┘
     ↑56px高度
```

**变化：**
- 去除通用标题，改为面包屑导航
- 头像仅在首页/列表页显示，详情页隐藏
- 面包屑格式：`首页 / 指南 / {{category}}` 或 `{{parent}} / {{current}}`

**移动端适配：**
- 面包屑简化为：`← {{current}}`（仅返回 + 当前页标题）

---

### 2. 页面标题区

**当前问题：**
- 标题重复出现3次（顶部导航栏 + 页面主体 + Markdown H1）

**解决方案：**

**新布局：**
```
┌─────────────────────────────────────────┐
│  新生幼猫（0-4周）护理完全指南           │  ← 36-42px, semibold
│  📅 2024-06-08  ⏱ 5分钟  🏷️ 新生儿护理  │  ← 元数据
└─────────────────────────────────────────┘
     ↓ 24px spacing
```

**特性：**
- 页面标题仅出现1次（作为主视觉焦点）
- 添加元数据行：发布时间、阅读时长、标签
- Markdown 内容自动去除首个 H1（避免重复）

**字体规格：**
- 标题：36-42px，`font-weight: 600`
- 元数据：14px，`font-weight: 400`，`color: #666`

---

### 3. 胖虎导读（可折叠）

**当前问题：**
- 占据显著垂直空间
- 用户已读过时仍占位置

**解决方案：**

**默认状态（折叠）：**
- 显示前 2-3 行（约 80-120 字符）
- 底部淡出渐变效果
- "展开完整导读"链接

**展开状态：**
- 显示完整导读内容
- 支持多段落、列表格式
- "收起"链接

**交互特性：**
- 动画时长：200ms ease
- 展开/收起状态保存到 `localStorage`
- 默认折叠（首次访问）

**实现细节：**
```css
.guide-overview {
  position: relative;
  max-height: 80px;  /* 折叠状态 */
  overflow: hidden;
  mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
}

.guide-overview.expanded {
  max-height: none;
  mask-image: none;
}
```

---

### 4. 目录树

**当前问题：**
- 父子层级对比度不足
- 视觉层级不明显

**解决方案：**

**层级增强：**
| 层级 | 字体粗细 | 颜色 | 缩进 |
|------|----------|------|------|
| 父级 | 600 (semibold) | #333 | 0px |
| 子级 | 400 (regular) | #666 | 16px |

**视觉示例：**
```
┌─────────────────────────────────────────┐
│ 📑 目录                                 │
│                                        │
│ 第1章：新生儿准备  ← semibold, #333     │
│   ├─ 1.1 环境准备     ← regular, #666   │
│   └─ 1.2 物品清单                        │
│                                        │
│ 第2章：日常护理                          │
│   ├─ 2.1 喂养频率                        │
│   └─ 2.2 睡眠管理                        │
└─────────────────────────────────────────┘
```

**交互：**
- 点击目录项自动滚动到对应锚点
- 当前章节高亮（使用主色 `#FF8A4C`）

---

### 5. 卡片阴影

**当前问题：**
- 阴影不够柔和，边缘生硬

**解决方案：**

**统一阴影样式：**
```css
--shadow-soft: 0 4px 16px rgba(0, 0, 0, 0.08);
```

**应用范围：**
- 胖虎导读卡片
- 目录树卡片
- 反馈卡片
- 相关指南卡片

**对比：**
- 旧：`0 2px 8px rgba(0, 0, 0, 0.1)`
- 新：更大的模糊半径 + 更低的透明度 = 更柔和、更扩散

---

### 6. 莫兰迪色系（局部应用）

**范围：** 仅小元素（标签、图标、状态指示器），保持主色系统不变

**保持不变：**
- 主色：`#FF8A4C` (橙色)
- 背景：`#F9F8F6` (暖米白)
- 强调色：`#FFB366` (浅橙)

**新增莫兰迪色：**
```css
--morandi-blue: #A8B5C2;    /* 标签 */
--morandi-green: #B5C2A8;   /* 标签 */
--morandi-pink: #D4B5C2;    /* 标签 */
--morandi-purple: #C5B5D2; /* 标签 */
--morandi-gray: #B5B8BA;    /* 次要图标 */
```

**应用场景：**
- 分类标签：`background: var(--morandi-blue)`
- 状态图标：`color: var(--morandi-gray)`
- 元信息装饰：小圆点、分隔符

**不应用于：**
- 主按钮（保持橙色）
- CTA（Call to Action）
- 链接（保持橙色或深色）

---

### 7. 留白与间距优化

**策略：** 关键区域增加，次要区域适度（选项C）

**间距表：**

| 场景 | 当前 | 新值 | 用途 |
|------|------|------|------|
| 标题与内容之间 | 24px | 32px | 关键区域，视觉分隔 |
| 模块间距（正文） | 24px | 32px | 关键区域，呼吸感 |
| 卡片内边距 | 16px | 20px | 内容与边缘 |
| 正文行间距 | 1.5 | 1.6 | 可读性 |
| 列表项间距 | 8px | 12px | 组内分隔 |

**垂直节奏示例：**
```
[页面标题]
  ↓ 24px
[元数据]
  ↓ 24px
[胖虎导读]
  ↓ 32px  ← 关键区域
[目录树]
  ↓ 32px  ← 关键区域
[Markdown正文]
```

---

### 8. 响应式设计

**移动端断点：** `< 768px`

**适配：**

| 元素 | 桌面端 | 移动端 |
|------|--------|--------|
| 面包屑 | `首页 / 指南 / 新生幼猫` | `← 新生幼猫` |
| 标题字号 | 36-42px | 28px |
| 元数据字号 | 14px | 12px |
| 关键区域间距 | 32px | 24px |
| 卡片内边距 | 20px | 16px |
| 目录树 | 内联显示 | 抽屉或折叠 |

**移动端目录树选项：**
- 方案A：移至独立抽屉（从右侧滑出）
- 方案B：顶部折叠，默认收起
- 推荐方案A（更干净）

---

## 实现文件清单

| 文件 | 修改内容 |
|------|----------|
| `frontend/src/views/Guides/Detail.vue` | 重构页面布局、添加折叠导读、优化目录树、添加元数据 |
| `frontend/src/layouts/components/AppTopBar.vue` | 添加面包屑导航、条件显示头像、返回按钮优化 |
| `frontend/src/styles/color.css` | 添加莫兰迪色变量（`--morandi-*`） |
| `frontend/src/styles/tokens.css` | 更新阴影变量（`--shadow-soft`）、间距变量 |
| `frontend/src/components/guides/GuideOverview.vue` | 新建：可折叠导读组件 |
| `frontend/src/utils/markdown.ts` | 修改：去除首个 H1 的工具函数 |

---

## 技术实现要点

### 胖虎导读折叠逻辑

```typescript
// 使用 localStorage 记住状态
const isExpanded = ref(
  localStorage.getItem(`guide-overview-${guideId}`) === 'expanded'
)

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
  localStorage.setItem(
    `guide-overview-${guideId}`,
    isExpanded.value ? 'expanded' : 'collapsed'
  )
}
```

### Markdown 首个 H1 去除

```typescript
// 解析 Markdown，检测首个 H1
export function removeFirstH1(markdown: string): string {
  const lines = markdown.split('\n')
  const firstHeadingIndex = lines.findIndex(line =>
    line.trim().startsWith('# ')
  )

  if (firstHeadingIndex === -1) return markdown

  lines.splice(firstHeadingIndex, 1)
  return lines.join('\n')
}
```

### 面包屑导航

```typescript
// 根据当前路径生成面包屑
const breadcrumbs = computed(() => {
  const path = route.path
  const segments = path.split('/').filter(Boolean)

  return segments.map((segment, index) => ({
    label: segment, // 或从路由元数据获取
    href: '/' + segments.slice(0, index + 1).join('/')
  }))
})
```

### 目录树高亮当前章节

```typescript
// 使用 IntersectionObserver 检测当前可见章节
const activeSection = ref('')

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          activeSection.value = entry.target.id
        }
      })
    },
    { threshold: 0.5 }
  )

  document.querySelectorAll('h2, h3').forEach(section => {
    observer.observe(section)
  })
})
```

---

## 成功标准

### 可观察的指标

1. **视觉层级清晰**
   - 页面标题仅出现1次
   - 目录树父子层级对比度明显
   - 胖虎导读不干扰主内容

2. **交互流畅**
   - 折叠/展开动画 < 200ms
   - 目录点击滚动到正确位置
   - 面包屑导航正确回退

3. **响应式正确**
   - 移动端面包屑简化
   - 移动端字号适配
   - 移动端目录树抽屉可用

4. **保持一致性**
   - 卡片阴影统一
   - 间距符合设计规范
   - 莫兰迪色仅用于小元素

### 测试方法

1. **视觉测试**
   - 对比重设计前后的截图
   - 验证层级清晰度
   - 检查留白舒适度

2. **功能测试**
   - 展开/收起胖虎导读
   - 点击目录项跳转
   - 点击面包屑导航

3. **响应式测试**
   - 桌面端（> 768px）
   - 平板（768px - 1024px）
   - 移动端（< 768px）

---

## 不包含的内容

**明确排除：**
- Markdown 渲染引擎更换（保持现有）
- 后端 API 修改（仅前端）
- 其他页面修改（仅指南详情页）
- 性能优化（非本次目标）
- SEO 优化（非本次目标）

---

## 后续扩展（可选）

**未来可考虑：**
- 阅读进度指示器（顶部进度条）
- 深色模式适配
- 字体大小调节器
- 打印样式优化
- 分享功能（社交媒体）
- 评论区集成

---

## 附录：设计原则

### 干净（Clean）
- 去除冗余元素（重复标题）
- 简化视觉噪音（隐藏详情页头像）
- 统一视觉语言（阴影、间距）

### 克制（Restrained）
- 莫兰迪色仅用于小元素
- 留白适度增加（不过度）
- 动画简洁（< 200ms）

### 结构化（Structured）
- 层级清晰（字体、颜色、缩进）
- 导航明确（面包屑、目录树）
- 节奏一致（间距系统）

---

**设计文档版本：** 1.0
**最后更新：** 2026-06-09
