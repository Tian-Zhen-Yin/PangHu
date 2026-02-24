/**
 * 通知相关类型定义
 */

import type { ApiResponse } from './common'

/**
 * 通知类型
 */
export type NotificationType = 'vaccine' | 'deworming' | 'checkup' | 'weight' | 'record'

/**
 * 通知
 */
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  content: string
  relatedId?: string
  relatedType?: string
  isRead: boolean
  scheduledAt: string
  sentAt?: string
  createdAt: string
  updatedAt: string
}

/**
 * 用户通知偏好设置
 */
export interface UserNotificationPreference {
  id: string
  userId: string
  enabled: boolean
  allowedHours: number[]
  quietStart: string
  quietEnd: string
  vaccineEnabled: boolean
  dewormingEnabled: boolean
  checkupEnabled: boolean
  weightEnabled: boolean
  recordEnabled: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 通知列表响应
 */
export interface NotificationListResponse {
  notifications: Notification[]
  unreadCount: number
}

/**
 * API 响应类型
 */
export type NotificationsResponse = ApiResponse<NotificationListResponse>
export type PreferencesResponse = ApiResponse<UserNotificationPreference>
