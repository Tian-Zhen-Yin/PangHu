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
        :class="{ active: isActive(item.path) }"
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
  gap: var(--space-xs);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  color: var(--color-text-sub);
  text-decoration: none;
  transition: all var(--transition-base);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
}

.nav-item:hover {
  background: rgba(246, 178, 107, 0.12);
  color: var(--color-text-main);
}

.nav-item.active {
  background: rgba(246, 178, 107, 0.2);
  color: var(--color-primary);
  font-weight: var(--font-medium);
}

.nav-icon {
  font-size: 18px;
}

.nav-text {
  font-size: var(--text-sm);
}
</style>
