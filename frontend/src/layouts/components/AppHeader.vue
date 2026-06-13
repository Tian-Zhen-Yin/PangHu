<script setup lang="ts">
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'
import { useMyCatStore } from '../../stores/myCat.js'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import MascotCharacter from '../../components/mascot/MascotCharacter.vue'
import { getAvatarUrl } from '../../utils/format.js'

const authStore = useAuthStore()
const catStore = useMyCatStore()
const { currentCat } = storeToRefs(catStore)
const router = useRouter()
const route = useRoute()

// 判断是否是详情页（需要隐藏头像、显示返回按钮）
const isDetailPage = computed(() => {
  const path = route.path
  // 指南详情页、模板详情页等
  return /\/(guides|templates)\/[^/]+$/.test(path)
})

// 判断是否应该显示头像（不是详情页 + 已登录）
const shouldShowAvatar = computed(() => {
  return authStore.isAuthenticated && !isDetailPage.value
})

// 详情页头部返回：有历史就回上一页，没历史就退到上级路径
// 例如 /guides/abc → /guides，/templates/xyz → /templates
function goBack() {
  if (window.history.state?.back) {
    router.back()
  } else {
    const segments = route.path.split('/').filter(Boolean)
    segments.pop()
    router.push('/' + segments.join('/'))
  }
}
</script>

<template>
  <header class="app-header">
    <div class="header-content">
      <!-- 详情页：左侧显示返回按钮 -->
      <button v-if="isDetailPage" class="back-btn" @click="goBack" aria-label="返回">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        <span>返回</span>
      </button>
      <!-- 其他页面：显示 logo -->
      <RouterLink v-else to="/" class="logo-group">
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
        <RouterLink v-else-if="shouldShowAvatar" to="/my-cats" class="user-link">
          <div v-if="currentCat" class="current-cat-avatar">
            <img v-if="currentCat.avatar || currentCat.avatarData" :src="getAvatarUrl(currentCat)" :alt="currentCat.name" />
            <span v-else class="avatar-placeholder">{{ currentCat.name?.charAt(0) || '?' }}</span>
          </div>
          <span v-else class="user-text">我的猫咪</span>
        </RouterLink>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: 56px;
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-divider);
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
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

.back-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  background: transparent;
  border: none;
  color: var(--color-text-main);
  font-size: var(--text-base);
  font-weight: 500;
  cursor: pointer;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-sm);
  transition: background var(--transition-base);
}

.back-btn:hover {
  background: var(--color-bg-hover, rgba(0, 0, 0, 0.04));
}

.back-btn svg {
  width: 20px;
  height: 20px;
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
  display: flex;
  align-items: center;
}

.user-link:hover .current-cat-avatar {
  animation-play-state: paused;
}

.user-text {
  font-weight: 500;
}

.current-cat-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-muted);
  border: 2px solid var(--color-primary);
  animation: breathe 2s ease-in-out infinite;
  transition: border-color 0.2s ease;
}

@keyframes breathe {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(255, 138, 76, 0.4);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(255, 138, 76, 0);
  }
}

.current-cat-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.current-cat-avatar .avatar-placeholder {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-regular);
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