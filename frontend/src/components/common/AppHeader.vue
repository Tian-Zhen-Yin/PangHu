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
        <!-- 搜索按钮 -->
        <button @click="openSearch" class="nav-link search-btn" title="搜索">
          🔍
        </button>
        <!-- 未登录状态 -->
        <template v-if="!authStore.isAuthenticated">
          <RouterLink to="/login" class="nav-link nav-link-auth">登录</RouterLink>
          <RouterLink to="/register" class="nav-link nav-link-auth">注册</RouterLink>
        </template>
        <!-- 已登录状态 -->
        <template v-else>
          <RouterLink to="/templates" class="nav-link">记录模板</RouterLink>
          <div class="user-menu-container">
            <button @click="showUserMenu = !showUserMenu" class="nav-link nav-link-user">
              {{ authStore.username }}
              <span class="arrow-icon">▼</span>
            </button>
            <div v-if="showUserMenu" class="user-dropdown">
              <RouterLink to="/templates" class="dropdown-item">📋 记录模板</RouterLink>
              <RouterLink to="/about" class="dropdown-item">ℹ️ 关于</RouterLink>
              <div class="dropdown-divider"></div>
              <a @click.prevent="authStore.logoutAction()" class="dropdown-item dropdown-logout">🚪 退出登录</a>
            </div>
          </div>
        </template>
      </nav>
    </div>

    <!-- 搜索弹窗 -->
    <div v-if="showSearch" class="search-modal" @click.self="closeSearch">
      <div class="search-modal-content">
        <div class="search-header">
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            placeholder="搜索指南、模板..."
            class="search-input"
            @keydown.enter="performSearch"
            autofocus
          />
          <button @click="closeSearch" class="search-close">×</button>
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
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.arrow-icon {
  font-size: 0.7rem;
  transition: transform 0.2s;
}

.user-menu-container {
  position: relative;
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  padding: 0.5rem 0;
  animation: slideDown 0.2s ease;
}

.dropdown-item {
  display: block;
  padding: 0.75rem 1rem;
  color: #475569;
  text-decoration: none;
  transition: background 0.2s;
  cursor: pointer;
}

.dropdown-item:hover {
  background: #f8fafc;
  color: #f97316;
}

.dropdown-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 0.5rem 0;
}

.dropdown-logout {
  color: #ef4444;
}

.dropdown-logout:hover {
  background: #fef2f2;
  color: #dc2626;
}

.search-btn {
  padding: 0.5rem 0.75rem;
  font-size: 1.125rem;
}

/* 搜索弹窗 */
.search-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 6rem;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.search-modal-content {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.search-header {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.search-input {
  flex: 1;
  padding: 0.875rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 1rem;
  outline: none;
}

.search-input:focus {
  border-color: #f97316;
}

.search-close {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #f1f5f9;
  border-radius: 0.5rem;
  font-size: 1.5rem;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.search-close:hover {
  background: #e2e8f0;
}

.search-suggestions {
  margin-top: 1.5rem;
}

.suggestions-title {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0 0 0.75rem 0;
}

.suggestion-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.suggestion-tag {
  padding: 0.5rem 1rem;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 2rem;
  color: #475569;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestion-tag:hover {
  background: #fff7ed;
  border-color: #f97316;
  color: #ea580c;
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
