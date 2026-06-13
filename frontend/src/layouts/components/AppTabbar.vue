<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()

// 底部导航：4 个猫咪主题 SVG 图标
const tabItems = computed(() => [
  { name: '首页', path: '/', key: 'home' },
  { name: '记录', path: '/timeline', key: 'record' },
  { name: '指南', path: '/guides', key: 'guide' },
  { name: '我的', path: '/my-cats', key: 'me' }
])

function isActive(path: string): boolean {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}
</script>

<template>
  <nav class="tabbar">
    <RouterLink
      v-for="item in tabItems"
      :key="item.path"
      :to="item.path"
      class="tab-item"
      :class="{ active: isActive(item.path) }"
    >
      <span class="tab-icon">
        <!-- 首页：猫爪印 -->
        <svg v-if="item.key === 'home'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <ellipse cx="12" cy="15" rx="4" ry="3.2" />
          <ellipse cx="5.5" cy="10.5" rx="1.6" ry="2" />
          <ellipse cx="9.5" cy="6.5" rx="1.6" ry="2" />
          <ellipse cx="14.5" cy="6.5" rx="1.6" ry="2" />
          <ellipse cx="18.5" cy="10.5" rx="1.6" ry="2" />
        </svg>
        <!-- 记录：笔记本 + 猫耳 -->
        <svg v-else-if="item.key === 'record'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 7 L6.5 3 L8.5 6" />
          <path d="M19 7 L17.5 3 L15.5 6" />
          <rect x="4" y="7" width="16" height="13" rx="2" />
          <line x1="9" y1="7" x2="9" y2="20" />
          <line x1="12" y1="11" x2="17" y2="11" />
          <line x1="12" y1="14" x2="17" y2="14" />
          <line x1="12" y1="17" x2="15" y2="17" />
        </svg>
        <!-- 指南：翻开的书 -->
        <svg v-else-if="item.key === 'guide'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 5 L12 19" />
          <path d="M12 5 C 10 4, 7 4, 4 5 L 4 19 C 7 18, 10 18, 12 19" />
          <path d="M12 5 C 14 4, 17 4, 20 5 L 20 19 C 17 18, 14 18, 12 19" />
          <path d="M7 10 L10 9.5" />
          <path d="M7 13 L10 12.5" />
          <path d="M14 9.5 L17 10" />
          <path d="M14 12.5 L17 13" />
        </svg>
        <!-- 我的：猫脸剪影 -->
        <svg v-else-if="item.key === 'me'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 10 L7 4 L10 8" />
          <path d="M19 10 L17 4 L14 8" />
          <path d="M5 10 C 5 16, 8.5 20, 12 20 C 15.5 20, 19 16, 19 10" />
          <circle cx="9.5" cy="13" r="0.6" fill="currentColor" />
          <circle cx="14.5" cy="13" r="0.6" fill="currentColor" />
          <path d="M11.5 15 L12 15.5 L12.5 15 Z" fill="currentColor" />
          <path d="M12 15.5 L12 16.5" />
          <path d="M12 16.5 C 11 17, 10 16.5, 9.5 16" />
          <path d="M12 16.5 C 13 17, 14 16.5, 14.5 16" />
        </svg>
      </span>
      <span class="tab-label">{{ item.name }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: #ffffff;
  border-top: 1px solid var(--color-divider, #F2F2F2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

@media (min-width: 480px) {
  .tabbar {
    left: 50%;
    transform: translateX(-50%);
    width: 430px;
    max-width: calc(100vw - 32px);
    right: auto;
  }
}

.tab-item {
  flex: 1;
  text-align: center;
  text-decoration: none;
  color: #999999;
  padding: 8px 0;
  transition: color 0.2s ease;
}

.tab-item.active {
  color: var(--color-primary, #FFB86C);
}

.tab-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin: 0 auto 2px;
}

/* SVG 用 currentColor，会自动跟随 .tab-item 的 color 变化 */
.tab-icon svg {
  width: 24px;
  height: 24px;
}

.tab-label {
  font-size: 11px;
}
</style>
