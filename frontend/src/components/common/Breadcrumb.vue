<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
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
const isMobile = ref(false)

const updateMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  updateMobile()
  window.addEventListener('resize', updateMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateMobile)
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
