/**
 * 通知 API
 */

import api from './index.js'
import type {
  NotificationListResponse,
  UserNotificationPreference,
  NotificationsResponse,
  PreferencesResponse,
} from '../types/notification.js'

/**
 * 获取通知列表
 * @param options 查询选项
 */
export async function getNotifications(options?: {
  unreadOnly?: boolean
  limit?: number
  offset?: number
}): Promise<NotificationListResponse> {
  const params = new URLSearchParams()
  if (options?.unreadOnly) params.append('unreadOnly', 'true')
  if (options?.limit) params.append('limit', options.limit.toString())
  if (options?.offset) params.append('offset', options.offset.toString())

  const response = await api.get<NotificationsResponse>(`/notifications?${params.toString()}`)
  return response.data.data
}

/**
 * 标记通知为已读
 * @param notificationId 通知ID
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  await api.patch(`/notifications/${notificationId}/read`)
}

/**
 * 标记所有通知为已读
 */
export async function markAllNotificationsRead(): Promise<{ count: number }> {
  const response = await api.post<{ data: { count: number } }>('/notifications/mark-all-read')
  return { count: response.data.data.count }
}

/**
 * 清空所有通知
 */
export async function clearAllNotifications(): Promise<{ count: number }> {
  const response = await api.delete<{ data: { count: number } }>('/notifications')
  return { count: response.data.data.count }
}

/**
 * 获取通知偏好设置
 */
export async function getNotificationPreferences(): Promise<UserNotificationPreference> {
  const response = await api.get<PreferencesResponse>('/notifications/preferences')
  return response.data.data
}

/**
 * 更新通知偏好设置
 * @param preferences 偏好设置
 */
export async function updateNotificationPreferences(
  preferences: Partial<UserNotificationPreference>
): Promise<UserNotificationPreference> {
  const response = await api.put<PreferencesResponse>('/notifications/preferences', preferences)
  return response.data.data
}

/**
 * 切换指定类型的开关
 * @param type 通知类型
 */
export async function toggleNotificationType(
  type: 'vaccine' | 'deworming' | 'checkup' | 'weight' | 'record'
): Promise<UserNotificationPreference> {
  const response = await api.put<PreferencesResponse>(`/notifications/preferences/${type}/toggle`)
  return response.data.data
}
