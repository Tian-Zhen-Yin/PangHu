/**
 * 通知状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsRead,
  clearAllNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  toggleNotificationType,
} from '../api/notification'
import type { Notification, UserNotificationPreference } from '../types/notification'

export const useNotificationStore = defineStore('notification', () => {
  // 状态
  const notifications = ref<Notification[]>([])
  const unreadCount = ref(0)
  const preferences = ref<UserNotificationPreference | null>(null)
  const loading = ref(false)
  const error = ref('')

  // 计算属性
  const hasUnread = computed(() => unreadCount.value > 0)
  const unreadCountDisplay = computed(() => (unreadCount.value > 99 ? '99+' : unreadCount.value.toString()))

  /**
   * 获取通知列表
   */
  async function fetchNotifications(options?: { unreadOnly?: boolean; limit?: number }) {
    loading.value = true
    error.value = ''

    try {
      const result = await getNotifications(options)
      notifications.value = result.notifications
      unreadCount.value = result.unreadCount
    } catch (err: any) {
      error.value = err.message || '获取通知失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 标记通知为已读
   */
  async function markAsRead(notificationId: string) {
    try {
      await markNotificationAsRead(notificationId)

      // 更新本地状态
      const notification = notifications.value.find((n) => n.id === notificationId)
      if (notification && !notification.isRead) {
        notification.isRead = true
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    } catch (err: any) {
      error.value = err.message || '标记失败'
      throw err
    }
  }

  /**
   * 标记所有通知为已读
   */
  async function markAllRead() {
    try {
      await markAllNotificationsRead()

      // 更新本地状态
      notifications.value.forEach((n) => {
        n.isRead = true
      })
      unreadCount.value = 0
    } catch (err: any) {
      error.value = err.message || '标记失败'
      throw err
    }
  }

  /**
   * 清空所有通知
   */
  async function clearAll() {
    try {
      await clearAllNotifications()

      // 更新本地状态
      notifications.value = []
      unreadCount.value = 0
    } catch (err: any) {
      error.value = err.message || '清空失败'
      throw err
    }
  }

  /**
   * 获取通知偏好设置
   */
  async function fetchPreferences() {
    loading.value = true
    error.value = ''

    try {
      preferences.value = await getNotificationPreferences()
    } catch (err: any) {
      error.value = err.message || '获取偏好设置失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新通知偏好设置
   */
  async function updatePreferences(data: Partial<UserNotificationPreference>) {
    loading.value = true
    error.value = ''

    try {
      preferences.value = await updateNotificationPreferences(data)
    } catch (err: any) {
      error.value = err.message || '更新偏好设置失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 切换指定类型的开关
   */
  async function toggleType(type: 'vaccine' | 'deworming' | 'checkup' | 'weight' | 'record') {
    loading.value = true
    error.value = ''

    try {
      preferences.value = await toggleNotificationType(type)
    } catch (err: any) {
      error.value = err.message || '切换失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取通知图标
   */
  function getNotificationIcon(type: string): string {
    switch (type) {
      case 'vaccine':
        return '💉'
      case 'deworming':
        return '💊'
      case 'checkup':
        return '🏥'
      case 'weight':
        return '⚖️'
      case 'record':
        return '📝'
      default:
        return '🔔'
    }
  }

  /**
   * 格式化时间
   */
  function formatTime(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`

    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  return {
    // 状态
    notifications,
    unreadCount,
    preferences,
    loading,
    error,

    // 计算属性
    hasUnread,
    unreadCountDisplay,

    // 方法
    fetchNotifications,
    markAsRead,
    markAllRead,
    clearAll,
    fetchPreferences,
    updatePreferences,
    toggleType,
    getNotificationIcon,
    formatTime,
  }
})
