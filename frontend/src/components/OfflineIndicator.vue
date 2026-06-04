<template>
  <transition name="el-fade-in">
    <div v-if="!isOnline" class="offline-indicator">
      <div class="offline-content">
        <div class="offline-icon">
          <el-icon :size="32" color="#FF8A4C">
            <WarningFilled />
          </el-icon>
        </div>
        <div class="offline-text">
          <div class="offline-title">网络连接已断开</div>
          <div class="offline-description">
            您正在使用离线模式，部分功能可能受限
          </div>
        </div>
        <div class="offline-status">
          <el-tag type="warning" size="small">离线中</el-tag>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'
import { monitorOnlineStatus } from '../utils/pwa'
import { ElNotification } from 'element-plus'

// State
const isOnline = ref(true)

// Show notification when going offline
const showOfflineNotification = () => {
  ElNotification({
    title: '网络连接已断开',
    message: '您正在使用离线模式，部分功能可能受限',
    type: 'warning',
    duration: 5000,
    position: 'bottom-right'
  })
}

// Show notification when coming back online
const showOnlineNotification = () => {
  ElNotification({
    title: '网络连接已恢复',
    message: '您现在可以使用全部功能',
    type: 'success',
    duration: 3000,
    position: 'bottom-right'
  })
}

// Handle online status changes
const handleOnlineStatusChange = (online: boolean) => {
  const wasOffline = !isOnline.value
  isOnline.value = online

  if (!online && wasOffline === false) {
    // Just went offline
    showOfflineNotification()
  } else if (online && wasOffline === true) {
    // Just came back online
    showOnlineNotification()
  }
}

// Lifecycle hooks
onMounted(() => {
  // Initialize online status
  isOnline.value = navigator.onLine

  // Monitor online status changes
  const cleanup = monitorOnlineStatus(handleOnlineStatusChange)

  // Store cleanup function for unmount
  onBeforeUnmount(() => {
    cleanup()
  })
})
</script>

<style scoped>
.offline-indicator {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9998;
  max-width: 500px;
  width: 90%;
}

.offline-content {
  background: var(--color-surface-elevated, #FFFFFF);
  border: 2px solid var(--color-warning, #FF8A4C);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(255, 138, 76, 0.2);
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--color-text-primary, #1F2937);
}

.offline-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-warning-bg, #FFF5EB);
  border-radius: 50%;
}

.offline-text {
  flex: 1;
  min-width: 0;
}

.offline-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary, #1F2937);
  margin-bottom: 4px;
}

.offline-description {
  font-size: 12px;
  color: var(--color-text-secondary, #6B7280);
  line-height: 1.4;
}

.offline-status {
  flex-shrink: 0;
}

/* Mobile responsive */
@media (max-width: 640px) {
  .offline-indicator {
    bottom: 10px;
  }

  .offline-content {
    padding: 12px;
  }

  .offline-title {
    font-size: 13px;
  }

  .offline-description {
    font-size: 11px;
  }
}
</style>
