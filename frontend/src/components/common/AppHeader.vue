<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()

const navigation = [
  { name: '首页', path: '/' },
  { name: '养成时间线', path: '/timeline' },
  { name: '知识指南', path: '/guides' },
  { name: 'AI医师', path: '/ai-chat', requiresAuth: true },
  { name: '计划模板', path: '/templates' },
  { name: '关于', path: '/about' }
]
</script>

<template>
  <header class="header">
    <div class="header-container">
      <RouterLink to="/" class="logo">
        <span class="logo-icon">🐱</span>
        <span class="logo-text">哈吉咪养成计划</span>
      </RouterLink>

      <!-- 桌面端导航 -->
      <nav class="nav desktop-nav">
        <RouterLink
          v-for="item in navigation"
          :key="item.path"
          :to="item.path"
          class="nav-link"
          active-class="nav-link-active"
          v-show="!item.requiresAuth || authStore.isAuthenticated"
        >
          {{ item.name }}
        </RouterLink>
        <!-- 未登录状态 -->
        <template v-if="!authStore.isAuthenticated">
          <RouterLink to="/login" class="nav-link nav-link-auth">登录</RouterLink>
          <RouterLink to="/register" class="nav-link nav-link-auth">注册</RouterLink>
        </template>
        <!-- 已登录状态 -->
        <template v-else>
          <RouterLink to="/profile" class="nav-link nav-link-user">
            {{ authStore.username }}
          </RouterLink>
          <a @click.prevent="authStore.logoutAction()" class="nav-link nav-link-logout">退出</a>
        </template>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: white;
  text-decoration: none;
  font-size: 1.25rem;
  font-weight: 600;
}

.logo-icon {
  font-size: 1.75rem;
}

.nav {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.nav-link {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
  cursor: pointer;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-link-active {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-weight: 500;
}

.nav-link-auth {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.nav-link-auth:hover {
  background: rgba(255, 255, 255, 0.2);
}

.nav-link-user {
  background: rgba(255, 255, 255, 0.15);
  font-weight: 500;
}

.nav-link-logout {
  opacity: 0.8;
}

@media (max-width: 768px) {
  .header-container {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .nav {
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .nav-link {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
  }
}
</style>
