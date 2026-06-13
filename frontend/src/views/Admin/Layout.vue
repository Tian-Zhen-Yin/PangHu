<template>
  <div class="admin-layout">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-header">
        <div class="logo">
          <span>哈吉咪</span>
          <span class="badge">管理后台</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link
          to="/admin"
          class="nav-item"
          exact-active-class="active"
        >
          <el-icon><DataAnalysis /></el-icon>
          <span class="nav-text">数据概览</span>
        </router-link>

        <router-link
          to="/admin/users"
          class="nav-item"
          active-class="active"
        >
          <el-icon><User /></el-icon>
          <span class="nav-text">用户管理</span>
        </router-link>

        <router-link
          to="/admin/guides"
          class="nav-item"
          active-class="active"
        >
          <el-icon><Document /></el-icon>
          <span class="nav-text">指南管理</span>
        </router-link>

        <router-link
          to="/admin/templates"
          class="nav-item"
          active-class="active"
        >
          <el-icon><Memo /></el-icon>
          <span class="nav-text">模板管理</span>
        </router-link>

        <!-- More menu items will be added in later phases -->
      </nav>
    </aside>

    <!-- Main Content -->
    <div class="main-wrapper" :class="{ 'sidebar-collapsed': isCollapsed }">
      <!-- Header -->
      <header class="header">
        <div class="header-left">
          <el-button
            :icon="isCollapsed ? Expand : Fold"
            circle
            @click="toggleSidebar"
          />
        </div>

        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <div class="user-info">
              <el-avatar :size="32" :src="adminStore.userInfo?.avatar">
                {{ adminStore.userInfo?.username?.charAt(0).toUpperCase() }}
              </el-avatar>
              <span class="username">{{ adminStore.userInfo?.name || adminStore.userInfo?.username }}</span>
              <el-badge
                :type="adminStore.userInfo?.role === 'super' ? 'danger' : 'warning'"
                class="role-badge"
              >
                {{ adminStore.userInfo?.role === 'super' ? '超级管理员' : '管理员' }}
              </el-badge>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  <div class="user-dropdown-info">
                    <div>{{ adminStore.userInfo?.name || adminStore.userInfo?.username }}</div>
                    <div class="email">{{ adminStore.userInfo?.email || '-' }}</div>
                  </div>
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- Page Content -->
      <main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  DataAnalysis,
  Document,
  Memo,
  User,
  Expand,
  Fold,
  SwitchButton
} from '@element-plus/icons-vue'
import { useAdminStore } from '@/stores/admin'

const router = useRouter()
const adminStore = useAdminStore()

const isCollapsed = ref(false)

function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value
}

async function handleCommand(command: string) {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm(
        '确定要退出登录吗？',
        '退出确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )

      await adminStore.logout()
      ElMessage.success('已退出登录')
      router.push('/admin/login')
    } catch {
      // User cancelled
    }
  }
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #f0f2f5;
}

/* Sidebar - Modern Professional */
.sidebar {
  width: 220px;
  background: linear-gradient(180deg, #1a1f2c 0%, #242836 100%);
  flex-shrink: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
}

.sidebar.collapsed {
  width: 64px;
}

.sidebar-header {
  height: 64px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 500;
  color: #fff;
  letter-spacing: 0.5px;
}

.badge {
  font-size: 11px;
  padding: 3px 10px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 12px;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.sidebar-nav {
  padding: 12px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 44px;
  padding: 0 20px;
  margin: 0 8px;
  color: #a3b1cc;
  text-decoration: none;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 6px;
  font-size: 14px;
  font-weight: 400;
}

.nav-item:hover {
  background: rgba(59, 130, 246, 0.1);
  color: #fff;
  transform: translateX(2px);
}

.nav-item.active {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
  font-weight: 500;
}

.nav-item .el-icon {
  font-size: 18px;
  transition: transform 0.25s;
}

.nav-item:hover .el-icon {
  transform: scale(1.1);
}

.collapsed .nav-text {
  display: none;
}

/* Main Wrapper */
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-collapsed {
  /* No need for margin-left with flex layout */
}

/* Header - Modern Clean */
.header {
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.header-left .el-button {
  border: none;
  background: transparent;
  color: #5a6c7f;
  transition: all 0.25s;
}

.header-left .el-button:hover {
  background: #f0f2f5;
  color: #3b82f6;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.25s;
}

.user-info:hover {
  background: #f0f2f5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.user-info .el-avatar {
  border: 2px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: #1a1f2c;
}

.role-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
}

.email {
  font-size: 12px;
  color: #64748b;
}

/* Main Content - Better Spacing */
.main-content {
  flex: 1;
  padding: 0;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.main-content > * {
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 32px 32px;
}

.main-content > *:first-child {
  padding-top: 32px;
}

/* Transitions - Smoother */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<style>
/* Global admin styles import */
@import './admin-styles.css';
</style>
