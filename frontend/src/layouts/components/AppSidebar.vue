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
  width: 200px;
  background: #ffffff;
  border-right: 1px solid var(--color-divider, #F2F2F2);
  padding: 1rem 0;
  position: sticky;
  top: 56px;
  height: calc(100vh - 56px);
  overflow-y: auto;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: var(--color-text-sub, #888888);
  text-decoration: none;
  transition: all 0.2s ease;
  border-radius: 0;
  margin: 0 0.5rem;
}

.nav-item:hover {
  background: var(--color-bg, #FFF8F3);
  color: var(--color-text-main, #333333);
}

.nav-item.active {
  background: var(--color-primary, #FFB86C);
  color: white;
  font-weight: 500;
}

.nav-icon {
  font-size: 1.25rem;
}

.nav-text {
  font-size: 14px;
}
</style>
