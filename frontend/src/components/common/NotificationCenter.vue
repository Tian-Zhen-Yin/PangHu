<template>
  <div class="notification-center">
    <div class="notification-header">
      <h3>消息中心</h3>
      <div class="header-actions">
        <button v-if="hasUnread" class="text-btn" @click="handleMarkAllRead">
          全部已读
        </button>
        <button v-if="notifications.length > 0" class="text-btn danger" @click="handleClearAll">
          清空
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <LoadingSpinner />
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button class="retry-btn" @click="() => fetchNotifications()">重试</button>
    </div>

    <div v-else-if="notifications.length === 0" class="empty-state">
      <span class="empty-icon">📬</span>
      <p>暂无通知</p>
    </div>

    <div v-else class="notification-list">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="['notification-item', { unread: !notification.isRead }]"
        @click="handleNotificationClick(notification)"
      >
        <div class="notification-icon">
          {{ getNotificationIcon(notification.type) }}
        </div>
        <div class="notification-content">
          <div class="notification-title">{{ notification.title }}</div>
          <div class="notification-text">{{ notification.content }}</div>
          <div class="notification-time">{{ formatTime(notification.scheduledAt) }}</div>
        </div>
        <div v-if="!notification.isRead" class="unread-dot"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useNotificationStore } from '../../stores/notification.js'
import type { Notification } from '../../types/notification.js'
import LoadingSpinner from './LoadingSpinner.vue'

const notificationStore = useNotificationStore()
const { notifications, hasUnread, loading, error } = storeToRefs(notificationStore)

const {
  fetchNotifications,
  markAsRead,
  markAllRead,
  clearAll,
  getNotificationIcon,
  formatTime,
} = notificationStore

async function handleNotificationClick(notification: Notification) {
  if (!notification.isRead) {
    await markAsRead(notification.id)
  }
  // 可以在这里添加跳转逻辑，根据通知类型跳转到对应页面
}

async function handleMarkAllRead() {
  await markAllRead()
}

async function handleClearAll() {
  if (confirm('确定要清空所有通知吗？')) {
    await clearAll()
  }
}

onMounted(() => {
  fetchNotifications()
})
</script>

<style scoped>
.notification-center {
  width: 360px;
  max-height: 500px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.notification-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.text-btn {
  background: none;
  border: none;
  padding: 4px 8px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.text-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.text-btn.danger:hover {
  background: #fff1f0;
  color: #ff4d4f;
}

.loading,
.error,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #999;
}

.error p {
  margin-bottom: 12px;
}

.retry-btn {
  padding: 6px 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.retry-btn:hover {
  background: #e69520;
}

.empty-state {
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.notification-list {
  max-height: 420px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 14px 20px;
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
  border-bottom: 1px solid #f5f5f5;
}

.notification-item:hover {
  background: #fafafa;
}

.notification-item.unread {
  background: #fffbf0;
}

.notification-item.unread:hover {
  background: #fff7e6;
}

.notification-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: #f5f5f5;
  border-radius: 50%;
  margin-right: 12px;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.notification-text {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 4px;
}

.notification-time {
  font-size: 11px;
  color: #999;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: #ff4d4f;
  border-radius: 50%;
  margin-left: 8px;
  flex-shrink: 0;
  margin-top: 4px;
}

/* 滚动条样式 */
.notification-list::-webkit-scrollbar {
  width: 6px;
}

.notification-list::-webkit-scrollbar-track {
  background: #f5f5f5;
}

.notification-list::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
}

.notification-list::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}
</style>
