<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <header class="app-header">
    <div class="header-content">
      <RouterLink to="/" class="logo">
        <span class="logo-icon">🐱</span>
        <span class="logo-text">哈吉咪</span>
      </RouterLink>

      <div class="header-actions">
        <RouterLink v-if="!authStore.isAuthenticated" to="/login" class="login-btn">
          登录
        </RouterLink>
        <RouterLink v-else to="/my-cats" class="user-link">
          我的猫咪
        </RouterLink>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: 56px;
  background: #ffffff;
  border-bottom: 1px solid var(--color-divider, #F2F2F2);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  max-width: 1200px;
  margin: 0 auto;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}

.logo-icon {
  font-size: 1.5rem;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-main, #333333);
}

.login-btn {
  padding: 0.5rem 1rem;
  background: var(--color-primary, #FFB86C);
  color: white;
  text-decoration: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.user-link {
  padding: 0.5rem 1rem;
  color: var(--color-text-main, #333333);
  text-decoration: none;
  font-size: 14px;
}

/* 桌面端适配 */
@media (min-width: 768px) {
  .header-content {
    padding: 0 2rem;
  }

  .logo-text {
    font-size: 20px;
  }
}
</style>
