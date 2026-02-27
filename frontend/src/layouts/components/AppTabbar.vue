<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { computed } from 'vue'

const authStore = useAuthStore()
const route = useRoute()

const tabItems = computed(() => [
  { name: '首页', path: '/', icon: '🏠' },
  { name: '记录', path: '/timeline', icon: '📖' },
  { name: '指南', path: '/guides', icon: '📚' },
  { name: '我的', path: '/my-cats', icon: '🐱' }
])

function isActive(path: string): boolean {
  return route.path === path
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

    <!-- 中间的大加号按钮 -->
    <RouterLink to="/timeline/new" class="tab-add">
      <span class="add-icon">+</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 430px;
  height: 64px;
  background: #ffffff;
  border-top: 1px solid var(--color-divider, #F2F2F2);
  display: flex;
  align-items: center;
  z-index: 100;
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
}

.tab-label {
  font-size: 11px;
}

.tab-add {
  width: 56px;
  height: 56px;
  background: var(--color-primary, #FFB86C);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 8px;
  position: relative;
  top: -20px;
  box-shadow: 0 6px 16px rgba(255, 184, 108, 0.4);
  text-decoration: none;
  flex: none;
}

.add-icon {
  font-size: 28px;
  color: white;
  font-weight: 300;
}
</style>
