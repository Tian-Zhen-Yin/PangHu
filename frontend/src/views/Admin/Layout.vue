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
          active-class="active"
        >
          <el-icon><DataAnalysis /></el-icon>
          <span class="nav-text">数据概览</span>
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
  background: #f5f7fa;
}

/* Sidebar */
.sidebar {
  width: 210px;
  background: #304156;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  transition: width 0.3s;
  z-index: 100;
}

.sidebar.collapsed {
  width: 64px;
}

.sidebar-header {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.badge {
  font-size: 12px;
  padding: 2px 8px;
  background: #ff6b6b;
  border-radius: 12px;
}

.sidebar-nav {
  padding: 8px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 48px;
  padding: 0 16px;
  color: #bfcbd9;
  text-decoration: none;
  transition: all 0.2s;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.nav-item.active {
  background: #ffb86c;
  color: #fff;
}

.collapsed .nav-text {
  display: none;
}

/* Main Wrapper */
.main-wrapper {
  flex: 1;
  margin-left: 210px;
  transition: margin-left 0.3s;
}

.sidebar-collapsed {
  margin-left: 64px;
}

/* Header */
.header {
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  position: sticky;
  top: 0;
  z-index: 99;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.user-info:hover {
  background: #f5f7fa;
}

.username {
  font-size: 14px;
  color: #303133;
}

.role-badge {
  font-size: 12px;
}

.email {
  font-size: 12px;
  color: #909399;
}

/* Main Content */
.main-content {
  padding: 24px;
  min-height: calc(100vh - 56px);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
