<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()

const tabItems = computed(() => [
  { name: '首页', path: '/', icon: '🏠' },
  { name: '记录', path: '/timeline', icon: '📖' },
  { name: '指南', path: '/guides', icon: '📚' },
  { name: '我的', path: '/my-cats', icon: '👤' }
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
      <span class="tab-icon">{{ item.icon }}</span>
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
  display: block;
  font-size: 22px;
  margin-bottom: 2px;
  transition: filter 0.2s ease;
}

/* inactive 状态的图标变灰，统一风格 */
.tab-item:not(.active) .tab-icon {
  filter: grayscale(100%) opacity(0.6);
}

/* active 状态的图标保持原色 */
.tab-item.active .tab-icon {
  filter: none;
}

.tab-label {
  font-size: 11px;
}
</style>
