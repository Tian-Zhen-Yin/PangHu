<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import MascotCharacter from '../../components/mascot/MascotCharacter.vue'

const authStore = useAuthStore()
</script>

<template>
  <header class="app-header">
    <div class="header-content">
      <RouterLink to="/" class="logo-group">
        <MascotCharacter
          expression="default"
          size="small"
          layout="inline"
          :animated="false"
          :float-animation="false"
        />
        <span class="brand-name">哈吉咪</span>
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
  background: var(--color-card);
  border-bottom: 1px solid var(--color-divider);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-lg);
  max-width: 1200px;
  margin: 0 auto;
}

.logo-group {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  text-decoration: none;
}

.brand-name {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-main);
}

.login-btn {
  padding: var(--space-sm) var(--space-lg);
  background: var(--color-primary);
  color: white;
  text-decoration: none;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 500;
  transition: background var(--transition-base);
}

.login-btn:hover {
  background: var(--color-primary-dark);
}

.user-link {
  padding: var(--space-sm) var(--space-lg);
  color: var(--color-text-main);
  text-decoration: none;
  font-size: var(--text-sm);
}

/* 桌面端适配 */
@media (min-width: 768px) {
  .header-content {
    padding: 0 var(--space-2xl);
  }

  .brand-name {
    font-size: var(--text-xl);
  }
}
</style>