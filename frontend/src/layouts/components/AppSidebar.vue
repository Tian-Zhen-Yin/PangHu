<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth.js'
import iconHome from '../../assets/icon/首页.png'
import iconTimeline from '../../assets/icon/成长记录.png'
import iconGuide from '../../assets/icon/养猫指南.png'
import iconAdvisor from '../../assets/icon/喵星顾问.png'
import iconMascot from '../../assets/mascot/sleepy.png'

const authStore = useAuthStore()
const route = useRoute()

const navItems = computed(() => [
  { name: '首页', path: '/', icon: iconHome, isImage: true },
  { name: '成长记录', path: '/timeline', icon: iconTimeline, isImage: true },
  { name: '养猫指南', path: '/guides', icon: iconGuide, isImage: true },
  { name: '喵喵医生', path: '/ai-chat', icon: iconAdvisor, isImage: true, requiresAuth: true },
  { name: '我的猫咪', path: '/my-cats', icon: iconMascot, isImage: true, requiresAuth: true }
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
        <img v-if="item.isImage" :src="item.icon" class="nav-icon nav-icon--image" />
        <component v-else :is="item.icon" class="nav-icon" />
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
  overflow: hidden;
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
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon--image {
  width: 26px;
  height: 26px;
  object-fit: contain;
  border-radius: 4px;
}

/* 激活时图标微放大 */
.nav-item--active .nav-icon {
  transform: scale(1.1);
}

.nav-text {
  font-size: var(--text-sm);
}
</style>