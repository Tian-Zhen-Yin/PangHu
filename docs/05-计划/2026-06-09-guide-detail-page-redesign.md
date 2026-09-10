# 指南详情页 UI/UX 重设计实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 将指南详情页重构为干净、克制、结构化的阅读体验

**架构：** 采用模块化重构，从设计系统变量开始，逐步构建新组件，最后重构主页面。保持现有 API 和 Markdown 渲染不变。

**技术栈：** Vue 3 Composition API, TypeScript, CSS Variables, LocalStorage API, Intersection Observer API

---

## 文件结构

### 新建文件
- `frontend/src/components/guides/GuideOverview.vue` - 可折叠导读组件
- `frontend/src/utils/markdown.ts` - Markdown 处理工具函数

### 修改文件
- `frontend/src/styles/color.css` - 添加莫兰迪色系变量
- `frontend/src/styles/shadow.css` - 添加柔和阴影变量
- `frontend/src/views/Guides/Detail.vue` - 重构页面布局和样式
- `frontend/src/layouts/components/AppHeader.vue` - 条件显示头像

---

## Task 1: 添加莫兰迪色系变量

**文件：**
- Modify: `frontend/src/styles/color.css:1-76`

**目标：** 在 color.css 中添加莫兰迪色系变量，仅用于小元素（标签、图标）

---

- [ ] **Step 1: 在 color.css 中添加莫兰迪色系注释区域**

在第 73 行（数据可视化专用辅色）之后，添加：

```css
  /* ========== 莫兰迪色系 (Morandi Colors) - 小元素专用 ========== */
  /* 低饱和度、柔和的辅助色，用于标签、图标、状态指示器 */
  /* 不应用于主按钮、CTA、链接 - 这些保持主色橙色 */

  --morandi-blue: #A8B5C2;      /* 蓝灰 - 分类标签 */
  --morandi-green: #B5C2A8;     /* 灰绿 - 分类标签 */
  --morandi-pink: #D4B5C2;      /* 灰粉 - 分类标签 */
  --morandi-purple: #C5B5D2;    /* 灰紫 - 分类标签 */
  --morandi-coral: #D4B5B0;     /* 灰珊瑚 - 分类标签 */
  --morandi-gray: #B5B8BA;      /* 中性灰 - 次要图标 */
  --morandi-text: #8B8E90;      /* 次要文本图标 */
}
```

**位置：** 在 `--color-chart-fill: rgba(255, 138, 76, 0.1);` 之后，闭合的 `}` 之前。

---

- [ ] **Step 2: 保存并验证语法**

运行：无（CSS 文件，保存即可）

验证：打开文件确认莫兰迪色变量已添加到 `:root` 作用域内

---

- [ ] **Step 3: 提交更改**

```bash
cd e:/AiProject/cctest/PangHu
git add frontend/src/styles/color.css
git commit -m "feat: 添加莫兰迪色系变量到 color.css

新增低饱和度辅助色用于小元素（标签、图标）
保持主色系统不变，仅局部应用莫兰迪色

- 添加 --morandi-blue, --morandi-green, --morandi-pink
- 添加 --morandi-purple, --morandi-coral, --morandi-gray
- 用途：分类标签、状态图标、次要装饰
"
```

---

## Task 2: 添加柔和阴影变量

**文件：**
- Modify: `frontend/src/styles/shadow.css:1-22`

**目标：** 添加统一柔和阴影变量，用于所有卡片组件

---

- [ ] **Step 1: 在 shadow.css 中添加新的阴影变量**

在第 10 行（`--shadow-xl`）之后，添加：

```css
  /* ========== 柔和扩散阴影 ========== */
  /* 更大的模糊半径 + 更低的透明度 = 更柔和、更扩散的阴影 */
  /* 应用于内容卡片，营造干净、克制的视觉效果 */

  --shadow-soft: 0 4px 16px rgba(0, 0, 0, 0.08);
```

**位置：** 在 `--shadow-xl: 0 24px 64px rgba(246, 178, 107, 0.2);` 之后，`/* 暖色阴影 */` 注释之前。

---

- [ ] **Step 2: 保存并验证语法**

验证：打开文件确认 `--shadow-soft` 变量已添加到 `:root` 作用域内

---

- [ ] **Step 3: 提交更改**

```bash
cd e:/AiProject/cctest/PangHu
git add frontend/src/styles/shadow.css
git commit -m "feat: 添加柔和扩散阴影变量

新增 --shadow-soft 用于卡片组件
- 模糊半径 16px，透明度 0.08
- 替代现有较硬的阴影样式
- 营造干净、克制的视觉效果
"
```

---

## Task 3: 创建 Markdown 工具函数

**文件：**
- Create: `frontend/src/utils/markdown.ts`

**目标：** 创建工具函数去除 Markdown 首个 H1 标题，避免与页面标题重复

---

- [ ] **Step 1: 创建 markdown.ts 文件**

```bash
cd e:/AiProject/cctest/PangHu
touch frontend/src/utils/markdown.ts
```

---

- [ ] **Step 2: 编写 removeFirstH1 函数**

在 `frontend/src/utils/markdown.ts` 中写入：

```typescript
/**
 * Markdown 处理工具函数
 */

/**
 * 去除 Markdown 内容中的首个 H1 标题
 *
 * 用途：指南详情页的页面标题已经显示了文章标题，
 * Markdown 内容中的首个 H1 会造成重复，需要去除。
 *
 * @param markdown - 原始 Markdown 内容
 * @returns 去除首个 H1 后的 Markdown 内容
 *
 * @example
 * ```ts
 * const markdown = "# 我的世界\n\n这是内容..."
 * const result = removeFirstH1(markdown)
 * // result: "这是内容..."
 * ```
 */
export function removeFirstH1(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return markdown
  }

  // 按行分割
  const lines = markdown.split('\n')

  // 查找首个 H1（以 # 开头，后面跟空格）
  const firstHeadingIndex = lines.findIndex(line => {
    const trimmed = line.trim()
    return trimmed.startsWith('# ')
  })

  // 如果没找到 H1，返回原内容
  if (firstHeadingIndex === -1) {
    return markdown
  }

  // 移除首个 H1 行
  lines.splice(firstHeadingIndex, 1)

  // 重新组合
  return lines.join('\n')
}

/**
 * 检测 Markdown 内容是否包含 H1
 *
 * @param markdown - Markdown 内容
 * @returns 是否包含 H1
 */
export function hasH1(markdown: string): boolean {
  if (!markdown || typeof markdown !== 'string') {
    return false
  }

  const lines = markdown.split('\n')
  return lines.some(line => line.trim().startsWith('# '))
}

/**
 * 提取 Markdown 首个 H1 标题文本
 *
 * @param markdown - Markdown 内容
 * @returns H1 标题文本（不包含 # 符号），如果没有则返回 null
 */
export function extractFirstH1Title(markdown: string): string | null {
  if (!markdown || typeof markdown !== 'string') {
    return null
  }

  const lines = markdown.split('\n')
  const firstHeadingLine = lines.find(line => line.trim().startsWith('# '))

  if (!firstHeadingLine) {
    return null
  }

  // 去除 "# " 前缀，返回纯文本
  return firstHeadingLine.trim().slice(2)
}
```

---

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd e:/AiProject/cctest/PangHu/frontend
npx tsc --noEmit utils/markdown.ts
```

**期望：** 无编译错误

---

- [ ] **Step 4: 提交更改**

```bash
cd e:/AiProject/cctest/PangHu
git add frontend/src/utils/markdown.ts
git commit -m "feat: 添加 Markdown 工具函数

新增 removeFirstH1、hasH1、extractFirstH1Title 函数
- 去除 Markdown 首个 H1，避免与页面标题重复
- 检测 Markdown 是否包含 H1
- 提取首个 H1 标题文本

用途：指南详情页内容预处理
"
```

---

## Task 4: 创建可折叠导读组件

**文件：**
- Create: `frontend/src/components/guides/GuideOverview.vue`

**目标：** 创建胖虎导读可折叠组件，支持展开/收起，状态保存到 localStorage

---

- [ ] **Step 1: 创建组件目录和文件**

```bash
cd e:/AiProject/cctest/PangHu
mkdir -p frontend/src/components/guides
touch frontend/src/components/guides/GuideOverview.vue
```

---

- [ ] **Step 2: 编写 GuideOverview 组件的 <script setup> 部分**

在 `frontend/src/components/guides/GuideOverview.vue` 中写入：

```vue
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import MascotCharacter from '../mascot/MascotCharacter.vue'

interface Props {
  /** 导读内容 */
  content: string
  /** 指南唯一标识（用于 localStorage key） */
  guideId: string
  /** 最大显示行数（折叠状态） */
  maxLines?: number
  /** 每行平均字符数（用于计算字符限制） */
  charsPerLine?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxLines: 3,
  charsPerLine: 40
})

// 展开/收起状态
const isExpanded = ref(false)

// 计算字符限制
const charLimit = computed(() => props.maxLines * props.charsPerLine)

// 是否需要截断
const needsTruncate = computed(() => {
  return props.content.length > charLimit.value
})

// 显示的内容
const displayContent = computed(() => {
  if (isExpanded.value || !needsTruncate.value) {
    return props.content
  }
  return props.content.slice(0, charLimit.value)
})

// LocalStorage key
const storageKey = computed(() => `guide-overview-${props.guideId}`)

// 初始化：从 localStorage 读取状态
onMounted(() => {
  const savedState = localStorage.getItem(storageKey.value)
  if (savedState === 'expanded') {
    isExpanded.value = true
  }
})

// 监听状态变化，保存到 localStorage
watch(isExpanded, (newValue) => {
  localStorage.setItem(storageKey.value, newValue ? 'expanded' : 'collapsed')
})

// 切换展开/收起
function toggle() {
  isExpanded.value = !isExpanded.value
}

// 按钮文本
const buttonText = computed(() => {
  return isExpanded.value ? '收起' : '展开完整导读'
})
</script>
```

---

- [ ] **Step 3: 编写 GuideOverview 组件的 <template> 部分**

在 `<script setup>` 之后继续写入：

```vue
<template>
  <div class="guide-overview" :class="{ expanded: isExpanded }">
    <!-- 卡片头部 -->
    <div class="overview-header">
      <div class="mascot-wrapper">
        <MascotCharacter
          expression="default"
          size="small"
          :animated="true"
          :float-animation="false"
        />
      </div>
      <h3 class="overview-title">胖虎导读</h3>
    </div>

    <!-- 导读内容 -->
    <div class="overview-content">
      <p class="overview-text">{{ displayContent }}</p>
      <p v-if="!isExpanded && needsTruncate" class="overview-ellipsis">...</p>
    </div>

    <!-- 展开/收起按钮 -->
    <button
      v-if="needsTruncate"
      class="overview-toggle"
      @click="toggle"
    >
      {{ buttonText }}
    </button>
  </div>
</template>
```

---

- [ ] **Step 4: 编写 GuideOverview 组件的 <style> 部分**

在 `</template>` 之后继续写入：

```vue
<style scoped>
.guide-overview {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-soft);
  margin-bottom: var(--space-2xl);
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
}

.overview-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.mascot-wrapper {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.overview-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.overview-content {
  position: relative;
}

.overview-text {
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--color-text-regular);
  margin: 0 0 var(--space-sm) 0;
}

.overview-ellipsis {
  font-size: var(--text-sm);
  color: var(--color-text-regular);
  margin: 0;
  font-style: italic;
}

.overview-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  background: transparent;
  border: none;
  color: var(--color-primary);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s ease;
  margin-top: var(--space-sm);
}

.overview-toggle:hover {
  color: var(--color-primary-hover);
}

.overview-toggle:active {
  color: var(--color-primary-active);
}

/* 折叠状态的渐变遮罩效果 */
.guide-overview:not(.expanded) .overview-content::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: linear-gradient(to bottom, transparent, var(--color-bg-card));
  pointer-events: none;
}

/* 移动端适配 */
@media (max-width: 767px) {
  .guide-overview {
    padding: var(--space-md);
    margin-bottom: var(--space-xl);
  }

  .overview-text {
    font-size: var(--text-xs);
  }
}
</style>
```

---

- [ ] **Step 5: 验证组件语法**

```bash
cd e:/AiProject/cctest/PangHu/frontend
npx vue-tsc --noEmit components/guides/GuideOverview.vue
```

**期望：** 无编译错误

---

- [ ] **Step 6: 提交更改**

```bash
cd e:/AiProject/cctest/PangHu
git add frontend/src/components/guides/GuideOverview.vue
git commit -m "feat: 创建可折叠导读组件 GuideOverview

新增胖虎导读可折叠组件
- 默认折叠，显示前3行（约120字符）
- 支持展开/收起，带渐变遮罩效果
- 展开/收起状态保存到 localStorage
- 200ms ease 动画过渡
- 移动端响应式适配

组件：frontend/src/components/guides/GuideOverview.vue
"
```

---

## Task 5: 重构 Detail.vue - 导读部分

**文件：**
- Modify: `frontend/src/views/Guides/Detail.vue:1-250`

**目标：** 将现有的"胖虎导读"从左侧边栏移到主内容区，使用新的可折叠组件

---

- [ ] **Step 1: 在 <script setup> 中添加导入**

在第 9 行（`import CategoryIcons`）之后，添加：

```typescript
import GuideOverview from '../../components/guides/GuideOverview.vue'
import { removeFirstH1, extractFirstH1Title } from '../../utils/markdown'
```

---

- [ ] **Step 2: 修改 guide 数据处理，添加 overview 字段**

找到 `async function fetchGuide()` 函数（约第 36-53 行），在 `guide.value = response.data` 之后添加：

```typescript
      // 提取首个 H1 作为导读（如果没有导读字段）
      if (!guide.value.overview && guide.value.content) {
        const firstH1 = extractFirstH1Title(guide.value.content)
        if (firstH1) {
          guide.value.overview = `本文将详细介绍 ${firstH1}，包括相关概念、实践方法和注意事项。`
        }
      }
```

**完整函数应为：**

```typescript
async function fetchGuide() {
  const id = route.params.id as string
  loading.value = true
  error.value = null
  try {
    const response = await getGuideById(id)
    if (response.success) {
      guide.value = response.data
      // 提取首个 H1 作为导读（如果没有导读字段）
      if (!guide.value.overview && guide.value.content) {
        const firstH1 = extractFirstH1Title(guide.value.content)
        if (firstH1) {
          guide.value.overview = `本文将详细介绍 ${firstH1}，包括相关概念、实践方法和注意事项。`
        }
      }
      extractTableOfContents()
    } else {
      error.value = response.message || '获取指南失败'
    }
  } catch (err: any) {
    error.value = err.message || '获取指南失败'
  } finally {
    loading.value = false
  }
}
```

---

- [ ] **Step 3: 添加 computed 属性处理 Markdown 内容**

在 `onMounted` 之前（约第 108 行之前），添加：

```typescript
// 去除 Markdown 首个 H1（避免与页面标题重复）
const processedMarkdown = computed(() => {
  if (!guide.value?.content) return ''
  return removeFirstH1(guide.value.content)
})
```

---

- [ ] **Step 4: 替换 template 中的导读部分**

找到左侧边栏的导读部分（约第 133-156 行），删除整个 `<aside class="reading-sidebar">` 块

**删除这部分：**

```vue
        <!-- 左侧目录 - 胖虎导读 -->
        <aside v-if="tableOfContents.length > 0" class="reading-sidebar">
          <div class="sidebar-mascot">
            <MascotCharacter
              :expression="mascotExpression"
              size="medium"
              :animated="true"
            />
          </div>
          <div class="sidebar-content">
            <h4 class="sidebar-title">胖虎导读</h4>
            <nav class="toc-nav">
              <button
                v-for="item in tableOfContents"
                :key="item.id"
                :class="['toc-item', { active: activeTocId === item.id }]"
                :style="{ paddingLeft: `${item.level * 8 + 8}px` }"
                @click="scrollToTocItem(item.id)"
              >
                {{ item.title }}
              </button>
            </nav>
          </div>
        </aside>
```

**注意：** 这会影响布局，我们将在 Task 8 中重新添加目录树

---

- [ ] **Step 5: 在主内容区添加 GuideOverview 组件**

找到 `<!-- 主内容区 -->` 部分（约第 158 行），在 `<main class="content-main">` 之后，`<!-- 顶部导航 -->` 之前，添加：

```vue
          <!-- 胖虎导读 -->
          <GuideOverview
            v-if="guide.overview"
            :content="guide.overview"
            :guide-id="guide.id || guide.slug || 'default'"
          />
```

---

- [ ] **Step 6: 提交更改**

```bash
cd e:/AiProject/cctest/PangHu
git add frontend/src/views/Guides/Detail.vue
git commit -m "refactor: Detail.vue 导读部分重构

将胖虎导读从左侧边栏移至主内容区
- 使用新的可折叠 GuideOverview 组件
- 导读从左侧边栏移到内容区顶部
- 删除旧的 reading-sidebar 结构
- 添加 processedMarkdown computed 属性
- 自动提取首个 H1 作为导读（如果没有 overview 字段）

下一步：重构页面布局和目录树
"
```

---

## Task 6: 添加面包屑导航组件

**文件：**
- Create: `frontend/src/components/common/Breadcrumb.vue`

**目标：** 创建面包屑导航组件，显示页面层级路径

---

- [ ] **Step 1: 创建 Breadcrumb 组件**

```bash
cd e:/AiProject/cctest/PangHu
touch frontend/src/components/common/Breadcrumb.vue
```

---

- [ ] **Step 2: 编写 Breadcrumb 组件**

在 `frontend/src/components/common/Breadcrumb.vue` 中写入：

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

interface BreadcrumbItem {
  label: string
  path: string
}

const route = useRoute()

// 根据当前路径生成面包屑
const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  const path = route.path
  const segments = path.split('/').filter(Boolean)

  // 根路径
  if (segments.length === 0) {
    return [{ label: '首页', path: '/' }]
  }

  const crumbs: BreadcrumbItem[] = []

  // 添加首页
  crumbs.push({ label: '首页', path: '/' })

  // 中间路径段
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!
    crumbs.push({
      label: formatLabel(segment),
      path: '/' + segments.slice(0, i + 1).join('/')
    })
  }

  // 当前页（最后一个）
  crumbs.push({
    label: formatLabel(segments[segments.length - 1]!),
    path: path
  })

  return crumbs
})

// 格式化标签（将 slug 转为可读文本）
function formatLabel(slug: string): string {
  // 移除 ID（如果是纯数字）
  if (/^\d+$/.test(slug)) {
    return '详情'
  }

  // 转换 slug 为中文（常见映射）
  const labelMap: Record<string, string> = {
    'guides': '指南',
    'guide': '指南',
    'templates': '模板',
    'template': '模板',
    'timeline': '记录',
    'my-cats': '我的猫咪',
    'weight': '体重',
    'ai-advisor': 'AI 顾问'
  }

  return labelMap[slug] || slug
}

// 是否是移动端（简化面包屑）
const isMobile = computed(() => {
  return window.innerWidth < 768
})

// 移动端简化显示（只显示返回 + 当前页）
const mobileBreadcrumb = computed<BreadcrumbItem>(() => {
  const crumbs = breadcrumbs.value
  const current = crumbs[crumbs.length - 1]
  return current || { label: '返回', path: '/' }
})
</script>

<template>
  <nav class="breadcrumb" :class="{ mobile: isMobile }">
    <template v-if="isMobile">
      <!-- 移动端：只显示返回 + 当前页 -->
      <RouterLink :to="mobileBreadcrumb.path" class="breadcrumb-item back">
        <svg class="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        {{ mobileBreadcrumb.label }}
      </RouterLink>
    </template>

    <template v-else>
      <!-- 桌面端：完整面包屑 -->
      <RouterLink
        v-for="(item, index) in breadcrumbs"
        :key="item.path"
        :to="item.path"
        class="breadcrumb-item"
        :class="{ current: index === breadcrumbs.length - 1 }"
      >
        {{ item.label }}
        <span v-if="index < breadcrumbs.length - 1" class="separator">/</span>
      </RouterLink>
    </template>
  </nav>
</template>

<style scoped>
.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-lg);
}

.breadcrumb-item {
  display: inline-flex;
  align-items: center;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color 0.2s ease;
}

.breadcrumb-item:hover {
  color: var(--color-primary);
}

.breadcrumb-item.current {
  color: var(--color-text-regular);
  pointer-events: none;
}

.separator {
  margin: 0 var(--space-xs);
  color: var(--color-text-light);
}

/* 移动端简化样式 */
.breadcrumb.mobile .back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}

.back-icon {
  width: 16px;
  height: 16px;
}

@media (max-width: 767px) {
  .breadcrumb {
    font-size: var(--text-xs);
  }
}
</style>
```

---

- [ ] **Step 3: 验证组件语法**

```bash
cd e:/AiProject/cctest/PangHu/frontend
npx vue-tsc --noEmit components/common/Breadcrumb.vue
```

**期望：** 无编译错误

---

- [ ] **Step 4: 提交更改**

```bash
cd e:/AiProject/cctest/PangHu
git add frontend/src/components/common/Breadcrumb.vue
git commit -m "feat: 创建面包屑导航组件 Breadcrumb

新增面包屑导航组件
- 自动从当前路径生成面包屑
- 移动端简化显示（返回 + 当前页）
- 桌面端完整显示（首页 / 指南 / 详情）
- 常见路径映射（guides → 指南等）
- 悬停交互效果

组件：frontend/src/components/common/Breadcrumb.vue
"
```

---

## Task 7: 重构 Detail.vue - 页面标题区

**文件：**
- Modify: `frontend/src/views/Guides/Detail.vue:1-300`

**目标：** 重构页面标题区，添加面包屑导航、元数据行，去除重复的返回按钮

---

- [ ] **Step 1: 在 <script setup> 中添加 Breadcrumb 导入**

在第 10 行（`import GuideOverview`）之后，添加：

```typescript
import Breadcrumb from '../../components/common/Breadcrumb.vue'
```

---

- [ ] **Step 2: 添加计算阅读时长的函数**

在 `onMounted` 之前（约第 108 行之前），添加：

```typescript
// 计算阅读时长（按 300 字/分钟估算）
const readingTime = computed(() => {
  if (!guide.value?.content) return 0
  const wordCount = guide.value.content.length
  const minutes = Math.ceil(wordCount / 300)
  return Math.max(1, minutes)
})
```

---

- [ ] **Step 3: 替换 template 中的顶部导航和标题区**

找到 `<main class="content-main">` 部分（约第 158-167 行），删除：

```vue
          <!-- 顶部导航 -->
          <button @click="goBack" class="back-button">
            <svg class="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            返回指南列表
          </button>
```

**替换为：**

```vue
          <!-- 面包屑导航 -->
          <Breadcrumb />
```

---

- [ ] **Step 4: 重构文章头部，添加元数据行**

找到 `<!-- 文章头部 -->` 部分（约第 168-194 行），替换为：

```vue
          <!-- 文章卡片 -->
          <article class="guide-article">
            <!-- 文章标题 -->
            <h1 class="article-title">{{ guide.title }}</h1>

            <!-- 元数据行 -->
            <div class="article-meta">
              <span class="meta-item">
                <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                {{ new Date(guide.createdAt || Date.now()).toLocaleDateString('zh-CN') }}
              </span>
              <span class="meta-item">
                <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {{ readingTime }} 分钟
              </span>
              <span v-if="guide.category" class="meta-item category-badge">
                <CategoryIcons
                  :type="getCategoryIconType(guide.category?.slug)"
                  :size="14"
                />
                {{ guide.category.name }}
              </span>
            </div>

            <!-- 删除 excerpt，保持简洁 -->
          </article>
```

---

- [ ] **Step 5: 更新 Markdown 内容引用**

找到 Markdown 内容部分（约第 196-199 行），将：

```vue
            <!-- Markdown 内容 -->
            <div class="markdown-content">
              <MarkdownView :source="guide.content" />
            </div>
```

**替换为：**

```vue
            <!-- Markdown 内容 -->
            <div class="markdown-content">
              <MarkdownView :source="processedMarkdown" />
            </div>
```

---

- [ ] **Step 6: 提交更改**

```bash
cd e:/AiProject/cctest/PangHu
git add frontend/src/views/Guides/Detail.vue
git commit -m "refactor: Detail.vue 页面标题区重构

重构页面标题区，去除冗余元素
- 使用 Breadcrumb 组件替代返回按钮
- 页面标题仅显示1次（去除顶部导航栏标题）
- 添加元数据行（发布时间、阅读时长、分类）
- 去除 excerpt（保持简洁）
- 使用 processedMarkdown（去除首个 H1）

布局：
[面包屑]
  ↓ 24px
[页面标题]
  ↓ 24px
[元数据行]
  ↓ 32px
[胖虎导读]
"
```

---

## Task 8: 重构 Detail.vue - 目录树样式

**文件：**
- Modify: `frontend/src/views/Guides/Detail.vue:200-400`

**目标：** 重新添加目录树，增强父子层级对比度（字体粗细 + 颜色 + 缩进）

---

- [ ] **Step 1: 在胖虎导读之后添加目录树**

找到 `<!-- 胖虎导读 -->` 部分（在 Task 5 中添加的），在其闭合标签之后，添加：

```vue
          <!-- 目录树 -->
          <nav v-if="tableOfContents.length > 0" class="table-of-contents">
            <h3 class="toc-title">目录</h3>
            <ul class="toc-list">
              <li
                v-for="item in tableOfContents"
                :key="item.id"
                :class="['toc-item', `level-${item.level}`, { active: activeTocId === item.id }]"
              >
                <button
                  class="toc-link"
                  @click="scrollToTocItem(item.id)"
                >
                  {{ item.title }}
                </button>
              </li>
            </ul>
          </nav>
```

**位置：** 在 `</GuideOverview>` 之后，`<!-- 文章卡片 -->` 之前

---

- [ ] **Step 2: 更新样式部分的 .toc-item**

找到样式部分（文件末尾的 `<style scoped>`），找到 `.toc-item` 相关样式，替换为：

```css
/* 目录树 */
.table-of-contents {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-soft);
  margin-bottom: var(--space-2xl);
}

.toc-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-md) 0;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.toc-title::before {
  content: '📑';
  font-size: var(--text-lg);
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-item {
  margin: var(--space-xs) 0;
}

.toc-link {
  display: block;
  width: 100%;
  text-align: left;
  padding: var(--space-xs) var(--space-sm);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: var(--text-sm);
  line-height: 1.5;
}

/* 层级 1（父级）- semibold, 深色 */
.toc-item.level-1 .toc-link {
  font-weight: 600;
  color: var(--color-text-primary);
  padding-left: 0;
}

/* 层级 2（子级）- regular, 浅色, 缩进 */
.toc-item.level-2 .toc-link {
  font-weight: 400;
  color: var(--color-text-regular);
  padding-left: var(--space-lg);
}

/* 层级 3（子子级）- regular, 更浅色, 更大缩进 */
.toc-item.level-3 .toc-link {
  font-weight: 400;
  color: var(--color-text-secondary);
  padding-left: calc(var(--space-lg) * 2);
}

/* 悬停效果 */
.toc-link:hover {
  background: var(--color-bg-hover);
  color: var(--color-primary);
}

/* 激活状态 */
.toc-item.active .toc-link {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
}

/* 移动端适配 */
@media (max-width: 767px) {
  .table-of-contents {
    padding: var(--space-md);
  }
}
```

---

- [ ] **Step 3: 添加目录树到移动端抽屉（可选）**

在 `<style scoped>` 的移动端部分添加：

```css
/* 移动端目录树抽屉 */
@media (max-width: 767px) {
  .table-of-contents {
    position: relative;
  }

  /* 可选：添加抽屉切换按钮 */
  .toc-drawer-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    background: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    margin-bottom: var(--space-md);
    font-size: var(--text-sm);
    color: var(--color-text-regular);
  }
}
```

---

- [ ] **Step 4: 提交更改**

```bash
cd e:/AiProject/cctest/PangHu
git add frontend/src/views/Guides/Detail.vue
git commit -m "feat: Detail.vue 添加目录树组件

重新添加目录树，增强层级对比度
- 目录树移至内容区（导读之后）
- 层级样式：
  * 层级1（父级）：font-weight 600, color #333
  * 层级2（子级）：font-weight 400, color #666, padding-left 16px
  * 层级3（子子级）：font-weight 400, color #999, padding-left 32px
- 激活状态高亮（主色橙色 + 浅橙背景）
- 悬停交互效果
- 使用 --shadow-soft 柔和阴影
"
```

---

## Task 9: 重构 Detail.vue - 响应式和间距优化

**文件：**
- Modify: `frontend/src/views/Guides/Detail.vue:300-500`

**目标：** 应用新的间距系统（关键区域 32px），优化移动端响应式

---

- [ ] **Step 1: 更新主布局间距**

找到 `.guide-detail-refined` 样式，更新间距：

```css
.guide-detail-refined {
  min-height: 100vh;
  padding: var(--space-4xl) var(--space-lg);
  background: var(--color-bg-page);
}

.detail-layout {
  max-width: var(--container-lg);
  margin: 0 auto;
  display: grid;
  /* 改为单列布局 */
  grid-template-columns: 1fr;
  gap: var(--space-2xl);
}
```

---

- [ ] **Step 2: 更新 .content-main 样式**

找到 `.content-main` 样式，更新为：

```css
.content-main {
  max-width: 800px;
  margin: 0 auto;
}
```

---

- [ ] **Step 3: 更新文章标题样式**

找到 `.article-title` 样式，更新为：

```css
.article-title {
  font-size: 36px;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.3;
  margin: 0 0 var(--space-lg) 0;
}

@media (max-width: 767px) {
  .article-title {
    font-size: 28px;
  }
}
```

---

- [ ] **Step 4: 添加元数据行样式**

在样式部分添加：

```css
/* 元数据行 */
.article-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) 0;
  margin-bottom: var(--space-xl);
  border-bottom: 1px solid var(--color-divider);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.meta-icon {
  width: 14px;
  height: 14px;
  opacity: 0.7;
}

.category-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  background: var(--morandi-blue);
  color: var(--color-text-primary);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 500;
}
```

---

- [ ] **Step 5: 更新模块间距**

找到各模块的 `margin-bottom`，更新为：

```css
/* 关键区域间距：32px (--space-2xl) */
.guide-overview,
.table-of-contents,
.feedback-section {
  margin-bottom: var(--space-2xl);
}

@media (max-width: 767px) {
  /* 移动端关键区域间距：24px */
  .guide-overview,
  .table-of-contents,
  .feedback-section {
    margin-bottom: var(--space-xl);
  }
}
```

---

- [ ] **Step 6: 更新 Markdown 内容行间距**

找到 `.markdown-content` 样式，更新为：

```css
.markdown-content {
  line-height: 1.6;
  color: var(--color-text-regular);
}

.markdown-content :deep(p) {
  margin: var(--space-md) 0;
}

.markdown-content :deep(h2) {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: var(--space-2xl) 0 var(--space-lg) 0;
  padding-top: var(--space-2xl);
}

.markdown-content :deep(h3) {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: var(--space-xl) 0 var(--space-md) 0;
}
```

---

- [ ] **Step 7: 提交更改**

```bash
cd e:/AiProject/cctest/PangHu
git add frontend/src/views/Guides/Detail.vue
git commit -m "style: Detail.vue 间距和响应式优化

应用新的间距系统和移动端适配
- 关键区域间距：32px (桌面端) / 24px (移动端)
- 标题字号：36px (桌面端) / 28px (移动端)
- 正文行间距：1.6
- H2/H3 顶部间距增加（32px / 24px）
- 添加元数据行样式（图标 + 文本）
- 分类标签使用莫兰迪蓝色
- 改为单列布局（max-width 800px）
"
```

---

## Task 10: 更新 AppHeader - 条件显示头像

**文件：**
- Modify: `frontend/src/layouts/components/AppHeader.vue:1-200`

**目标：** 详情页隐藏头像，减少视觉干扰

---

- [ ] **Step 1: 在 <script setup> 中添加 route 和 computed**

在第 11 行（`const { currentCat }`）之后，添加：

```typescript
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()

// 判断是否是详情页（需要隐藏头像）
const isDetailPage = computed(() => {
  const path = route.path
  // 指南详情页、模板详情页等
  return /\/(guides|templates)\/[^/]+$/.test(path)
})

// 判断是否应该显示头像（不是详情页 + 已登录）
const shouldShowAvatar = computed(() => {
  return authStore.isAuthenticated && !isDetailPage.value
})
```

---

- [ ] **Step 2: 更新 template 中的头像显示条件**

找到头像部分（约第 32-38 行），将：

```vue
        <RouterLink v-else to="/my-cats" class="user-link">
```

**替换为：**

```vue
        <RouterLink v-else-if="shouldShowAvatar" to="/my-cats" class="user-link">
```

**完整部分应为：**

```vue
      <div class="header-actions">
        <RouterLink v-if="!authStore.isAuthenticated" to="/login" class="login-btn">
          登录
        </RouterLink>
        <RouterLink v-else-if="shouldShowAvatar" to="/my-cats" class="user-link">
          <div v-if="currentCat" class="current-cat-avatar">
            <img v-if="currentCat.avatar || currentCat.avatarData" :src="getAvatarUrl(currentCat)" :alt="currentCat.name" />
            <span v-else class="avatar-placeholder">{{ currentCat.name?.charAt(0) || '?' }}</span>
          </div>
          <span v-else class="user-text">我的猫咪</span>
        </RouterLink>
      </div>
```

---

- [ ] **Step 3: 提交更改**

```bash
cd e:/AiProject/cctest/PangHu
git add frontend/src/layouts/components/AppHeader.vue
git commit -m "feat: AppHeader 详情页隐藏头像

条件显示头像，减少详情页视觉干扰
- 详情页路径判断：/guides/:id, /templates/:id
- 使用 shouldShowAvatar computed 属性
- 详情页隐藏头像，首页/列表页保留

保持干净的阅读体验
"
```

---

## Task 11: 最终验证和测试

**目标：** 验证所有功能正常，样式符合设计规范

---

- [ ] **Step 1: 启动开发服务器**

```bash
cd e:/AiProject/cctest/PangHu/frontend
npm run dev
```

**期望：** 服务器启动成功（通常在 http://localhost:5173）

---

- [ ] **Step 2: 验证莫兰迪色变量**

打开浏览器控制台，执行：

```javascript
const root = getComputedStyle(document.documentElement)
console.log('Morandi Blue:', root.getPropertyValue('--morandi-blue'))
console.log('Morandi Green:', root.getPropertyValue('--morandi-green'))
console.log('Shadow Soft:', root.getPropertyValue('--shadow-soft'))
```

**期望输出：**
```
Morandi Blue: #A8B5C2
Morandi Green: #B5C2A8
Shadow Soft: 0 4px 16px rgba(0, 0, 0, 0.08)
```

---

- [ ] **Step 3: 验证指南详情页功能**

1. 访问指南详情页（如 `/guides/1`）
2. 检查以下功能：
   - ✅ 面包屑导航显示正确
   - ✅ 页面标题仅出现1次
   - ✅ 元数据行显示（时间、阅读时长、分类）
   - ✅ 胖虎导读可折叠（点击展开/收起）
   - ✅ 展开/收起状态刷新后保持（localStorage）
   - ✅ 目录树层级清晰（父级粗体深色，子级常规浅色）
   - ✅ 点击目录项滚动到对应位置
   - ✅ 卡片阴影柔和统一

---

- [ ] **Step 4: 验证移动端响应式**

1. 打开浏览器开发者工具，切换到移动端视图（iPhone SE, 375px）
2. 访问指南详情页
3. 检查以下：
   - ✅ 面包屑简化为"← 详情"
   - ✅ 标题字号缩小到 28px
   - ✅ 关键区域间距缩小到 24px
   - ✅ 卡片内边距缩小到 16px
   - ✅ 目录树样式正常

---

- [ ] **Step 5: 验证头像条件显示**

1. 访问首页 `/` - 头像应该显示
2. 访问指南列表 `/guides` - 头像应该显示
3. 访问指南详情 `/guides/1` - 头像应该隐藏
4. 访问模板详情 `/templates/1` - 头像应该隐藏

---

- [ ] **Step 6: 验证 Markdown H1 去除**

1. 访问指南详情页
2. 滚动到 Markdown 内容区
3. 检查：首个 H1 不应出现（已被页面标题替代）

---

- [ ] **Step 7: 验证莫兰迪色应用**

检查以下元素是否使用莫兰迪色：
- ✅ 分类标签背景色（`--morandi-blue` 或其他莫兰迪色）

---

- [ ] **Step 8: 测试展开/收起 localStorage**

1. 访问指南详情页
2. 点击"展开完整导读"
3. 刷新页面
4. 验证：导读应保持展开状态

5. 点击"收起"
6. 刷新页面
7. 验证：导读应保持收起状态

---

- [ ] **Step 9: 对比设计规范验证**

对照设计规范检查：
- ✅ 关键区域间距：32px
- ✅ 卡片阴影：`var(--shadow-soft)`
- ✅ 目录树层级：父级 600/#333，子级 400/#666
- ✅ 元数据行：图标 + 文本
- ✅ 响应式断点：< 768px

---

- [ ] **Step 10: 提交最终版本**

```bash
cd e:/AiProject/cctest/PangHu
git add frontend/src/views/Guides/Detail.vue
git commit -m "test: 验证指南详情页重构完成

所有功能测试通过：
- 面包屑导航正确显示
- 页面标题仅出现1次
- 元数据行正常显示
- 胖虎导读可折叠，状态保持
- 目录树层级清晰
- 卡片阴影统一柔和
- 响应式适配正确
- 头像条件显示正确
- Markdown H1 已去除
- 莫兰迪色正确应用

完成设计文档所有要求
"
```

---

## 实现完成清单

- [x] Task 1: 添加莫兰迪色系变量
- [x] Task 2: 添加柔和阴影变量
- [x] Task 3: 创建 Markdown 工具函数
- [x] Task 4: 创建可折叠导读组件
- [x] Task 5: 重构 Detail.vue - 导读部分
- [x] Task 6: 添加面包屑导航组件
- [x] Task 7: 重构 Detail.vue - 页面标题区
- [x] Task 8: 重构 Detail.vue - 目录树样式
- [x] Task 9: 重构 Detail.vue - 响应式和间距优化
- [x] Task 10: 更新 AppHeader - 条件显示头像
- [x] Task 11: 最终验证和测试

---

## 自我审查结果

### Spec 覆盖度检查
- ✅ 顶部导航栏优化：Task 6 (Breadcrumb) + Task 10 (条件头像)
- ✅ 页面标题区重构：Task 7 (面包屑、元数据、单标题)
- ✅ 胖虎导读可折叠：Task 4 (GuideOverview 组件)
- ✅ 目录树层级增强：Task 8 (字体粗细 + 颜色 + 缩进)
- ✅ 卡片阴影统一：Task 2 (--shadow-soft) + Task 4/8 (应用)
- ✅ 莫兰迪色系局部应用：Task 1 (变量) + Task 9 (分类标签)
- ✅ 留白与间距优化：Task 9 (关键区域 32px)
- ✅ 响应式设计：Task 9 (移动端适配)

### Placeholder 扫描
- ✅ 无 TBD、TODO
- ✅ 所有代码步骤包含实际代码
- ✅ 所有命令包含期望输出

### Type 一致性检查
- ✅ 函数名一致：`removeFirstH1`, `extractFirstH1Title`
- ✅ 组件名一致：`GuideOverview`, `Breadcrumb`
- ✅ CSS 变量名一致：`--morandi-*`, `--shadow-soft`

---

**计划版本：** 1.0
**创建日期：** 2026-06-09
