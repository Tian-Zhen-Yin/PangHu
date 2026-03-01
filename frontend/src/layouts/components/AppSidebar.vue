<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { computed } from 'vue'

const authStore = useAuthStore()
const route = useRoute()

const navItems = computed(() => [
  { name: '首页', path: '/', icon: '🏠' },
  { name: '成长记录', path: '/timeline', icon: '📖' },
  { name: '养猫指南', path: '/guides', icon: '📚' },
  { name: '喵星小顾问', path: '/ai-chat', icon: '🤖', requiresAuth: true },
  { name: '我的猫咪', path: '/my-cats', icon: '🐱', requiresAuth: true }
].filter(item => !item.requiresAuth || authStore.isAuthenticated))

function isActive(path: string): boolean {
  return route.path === path
}
</script>

<template>
  <aside class="sidebar">
    <nav class="sidebar-nav">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ 'nav-item--active': isActive(item.path) }"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-text">{{ item.name }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 160px;
  background: transparent;
  padding: var(--space-xl) var(--space-lg);
  position: sticky;
  top: 56px;
  height: calc(100vh - 56px);
  overflow-y: auto;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 12px 20px;
  border-radius: 100px;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: all 0.3s ease;
  font-size: var(--text-sm);
}

/* 悬停态微反馈 */
.nav-item:hover:not(.nav-item--active) {
  background-color: rgba(0, 0, 0, 0.02);
  color: var(--color-text-main);
}

/* 激活态：胶囊背景 + 品牌色 */
.nav-item--active {
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
}

/* 统一图标大小和过渡 */
.nav-icon {
  font-size: 18px;
  width: 20px;
  height: 20px;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 激活时图标微放大 */
.nav-item--active .nav-icon {
  transform: scale(1.1);
}

.nav-text {
  font-size: var(--text-sm);
}
</style>