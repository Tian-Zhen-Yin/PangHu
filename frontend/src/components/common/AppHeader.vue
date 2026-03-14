<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const showSearch = ref(false)
const searchQuery = ref('')
const showUserMenu = ref(false)

const navigation = [
  { name: '首页', path: '/' },
  { name: '成长记录', path: '/timeline' },
  { name: '养猫指南', path: '/guides' },
  { name: '喵星小顾问', path: '/ai-chat', requiresAuth: true },
  { name: '我的猫咪', path: '/my-cats', requiresAuth: true }
]

function openSearch() {
  showSearch.value = true
}

function closeSearch() {
  showSearch.value = false
  searchQuery.value = ''
}

function performSearch() {
  if (searchQuery.value.trim()) {
    router.push({ name: 'Search', query: { q: searchQuery.value } })
    closeSearch()
  }
}

function quickSearch(query: string) {
  searchQuery.value = query
  performSearch()
}
</script>

<template>
  <header class="header">
    <div class="header-container">
      <RouterLink to="/" class="logo">
        <span class="logo-icon">🐱</span>
        <span class="logo-text">哈吉咪养成计划</span>
      </RouterLink>

      <!-- 桌面端导航 -->
      <nav class="nav desktop-nav" aria-label="主导航">
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
        <!-- 搜索按钮 -->
        <button @click="openSearch" class="nav-link search-btn" title="搜索" aria-label="搜索">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
        </button>
        <!-- 未登录状态 -->
        <template v-if="!authStore.isAuthenticated">
          <RouterLink to="/login" class="nav-link nav-link-auth">登录</RouterLink>
          <RouterLink to="/register" class="nav-link nav-link-auth nav-link-primary">注册</RouterLink>
        </template>
        <!-- 已登录状态 -->
        <template v-else>
          <RouterLink to="/templates" class="nav-link">记录模板</RouterLink>
          <div class="user-menu-container">
            <button @click="showUserMenu = !showUserMenu" class="nav-link nav-link-user" aria-haspopup="true" :aria-expanded="showUserMenu">
              <span class="user-avatar">{{ authStore.username?.[0] || 'U' }}</span>
              <span class="arrow-icon" :class="{ 'arrow-icon--open': showUserMenu }">▼</span>
            </button>
            <div v-if="showUserMenu" class="user-dropdown">
              <RouterLink to="/templates" class="dropdown-item">
                <span class="dropdown-icon">📋</span>
                记录模板
              </RouterLink>
              <RouterLink to="/about" class="dropdown-item">
                <span class="dropdown-icon">ℹ️</span>
                关于
              </RouterLink>
              <div class="dropdown-divider"></div>
              <a @click.prevent="authStore.logoutAction()" class="dropdown-item dropdown-logout">
                <span class="dropdown-icon">🚪</span>
                退出登录
              </a>
            </div>
          </div>
        </template>
      </nav>
    </div>

    <!-- 搜索弹窗 -->
    <Teleport to="body">
      <div v-if="showSearch" class="search-modal" @click.self="closeSearch">
        <div class="search-modal-content" role="dialog" aria-modal="true" aria-label="搜索">
          <div class="search-header">
            <div class="search-input-wrapper">
              <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索指南、模板..."
                class="search-input"
                @keydown.enter="performSearch"
                autofocus
              />
            </div>
            <button @click="closeSearch" class="search-close" aria-label="关闭搜索">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="search-suggestions">
            <p class="suggestions-title">热门搜索</p>
            <div class="suggestion-tags">
              <button @click="quickSearch('疫苗')" class="suggestion-tag">💉 疫苗</button>
              <button @click="quickSearch('喂养')" class="suggestion-tag">🍽️ 喂养</button>
              <button @click="quickSearch('训练')" class="suggestion-tag">🎾 训练</button>
              <button @click="quickSearch('健康')" class="suggestion-tag">🏥 健康</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </header>
</template>

<style scoped>
/* ========== Header 容器 ========== */
.header {
  background: var(--color-primary-gradient);
  box-shadow: var(--shadow-card-normal);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.header-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-md) var(--space-2xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* ========== Logo ========== */
.logo {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  color: var(--color-text-white);
  text-decoration: none;
  font-size: var(--text-lg);
  font-weight: 600;
  transition: opacity 0.2s;
}

.logo:hover {
  opacity: 0.9;
}

.logo-icon {
  font-size: 24px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

/* ========== 导航 ========== */
.nav {
  display: flex;
  gap: var(--space-xs);
  align-items: center;
}

.nav-link {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  padding: var(--space-sm) var(--space-md);
  border-radius: 8px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  transform: translateY(-1px);
}

.nav-link-active {
  background: rgba(255, 255, 255, 0.25);
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.nav-link-auth {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.nav-link-auth:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.nav-link-primary {
  background: white;
  color: var(--color-primary);
  border-color: transparent;
}

.nav-link-primary:hover {
  background: var(--color-bg-page);
  color: var(--color-primary-hover);
}

/* ========== 搜索按钮 ========== */
.search-btn {
  padding: var(--space-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-btn svg {
  stroke: white;
}

/* ========== 用户菜单 ========== */
.nav-link-user {
  gap: var(--space-sm);
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.arrow-icon {
  font-size: 10px;
  transition: transform 0.25s;
}

.arrow-icon--open {
  transform: rotate(180deg);
}

.user-menu-container {
  position: relative;
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--color-bg-card);
  border-radius: 12px;
  box-shadow: var(--shadow-card-hover);
  min-width: 180px;
  padding: var(--space-sm);
  animation: dropdownSlide 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--color-border-light);
}

@keyframes dropdownSlide {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  color: var(--color-text-primary);
  text-decoration: none;
  transition: all 0.15s;
  cursor: pointer;
  border-radius: 8px;
  font-size: var(--text-sm);
}

.dropdown-item:hover {
  background: var(--color-bg-hover);
  color: var(--color-primary);
}

.dropdown-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.dropdown-divider {
  height: 1px;
  background: var(--color-divider);
  margin: var(--space-sm) 0;
}

.dropdown-logout {
  color: var(--color-danger);
}

.dropdown-logout:hover {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

/* ========== 搜索弹窗 ========== */
.search-modal {
  position: fixed;
  inset: 0;
  background: rgba(45, 41, 38, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 120px;
  z-index: var(--z-modal);
  animation: modalFadeIn 0.2s ease;
}

@keyframes modalFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.search-modal-content {
  background: var(--color-bg-card);
  border-radius: 16px;
  padding: var(--space-xl);
  width: 90%;
  max-width: 480px;
  box-shadow: var(--shadow-card-hover);
  animation: modalSlideDown 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalSlideDown {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.search-header {
  display: flex;
  gap: var(--space-md);
  align-items: center;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: var(--space-md);
  color: var(--color-text-secondary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: var(--space-md) var(--space-md) var(--space-md) 40px;
  border: 2px solid var(--color-border);
  border-radius: 10px;
  font-size: var(--text-base);
  outline: none;
  background: var(--color-bg-page);
  transition: all 0.2s;
}

.search-input:focus {
  border-color: var(--color-primary);
  background: var(--color-bg-card);
  box-shadow: 0 0 0 3px var(--color-primary-soft);
}

.search-close {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--color-bg-block);
  border-radius: 10px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.search-close:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.search-close svg {
  stroke: currentColor;
}

.search-suggestions {
  margin-top: var(--space-lg);
}

.suggestions-title {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-md) 0;
  font-weight: 500;
}

.suggestion-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.suggestion-tag {
  padding: var(--space-sm) var(--space-md);
  background: var(--color-action-orange);
  border: 2px solid transparent;
  border-radius: 100px;
  color: var(--color-text-regular);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.suggestion-tag:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-normal);
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .header-container {
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-md);
  }

  .nav {
    gap: var(--space-xs);
    flex-wrap: wrap;
    justify-content: center;
  }

  .nav-link {
    padding: var(--space-sm) var(--space-md);
    font-size: var(--text-xs);
  }

  .logo-text {
    display: none;
  }
}
</style>
