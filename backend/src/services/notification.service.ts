/**
 * 通知服务
 *
 * 提供消息通知的创建、查询、标记已读等功能
 */

import { prisma } from '../lib/prisma'

/**
 * 通知类型
 */
export type NotificationType = 'vaccine' | 'deworming' | 'checkup' | 'weight' | 'record'

/**
 * 通知数据接口
 */
export interface NotificationData {
  userId: string
  type: NotificationType
  title: string
  content: string
  relatedId?: string
  relatedType?: string
  scheduledAt: Date
}

/**
 * 创建通知
 */
export async function createNotification(data: NotificationData) {
  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      content: data.content,
      relatedId: data.relatedId,
      relatedType: data.relatedType,
      scheduledAt: data.scheduledAt,
    },
  })

  console.log('[Notification] Created:', notification.id, 'type:', data.type, 'user:', data.userId)
  return notification
}

/**
 * 批量创建通知
 */
export async function createBulkNotifications(notifications: NotificationData[]) {
  const results = await prisma.notification.createMany({
    data: notifications,
    skipDuplicates: true,
  })

  console.log('[Notification] Bulk created:', results.count, 'notifications')
  return results
}

/**
 * 获取用户通知列表
 */
export async function getUserNotifications(
  userId: string,
  options: {
    unreadOnly?: boolean
    limit?: number
    offset?: number
  } = {}
) {
  const { unreadOnly = false, limit = 50, offset = 0 } = options

  const where: any = { userId }
  if (unreadOnly) {
    where.isRead = false
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { scheduledAt: 'desc' },
    take: limit,
    skip: offset,
  })

  // 获取未读数量
  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  })

  return {
    notifications,
    unreadCount,
  }
}

/**
 * 标记通知为已读
 */
export async function markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  })

  if (!notification) {
    return false
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  })

  console.log('[Notification] Marked as read:', notificationId)
  return true
}

/**
 * 标记所有通知为已读
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  })

  console.log('[Notification] Marked all as read for user:', userId, 'count:', result.count)
  return result.count
}

/**
 * 清空所有通知
 */
export async function clearAllNotifications(userId: string): Promise<number> {
  const result = await prisma.notification.deleteMany({
    where: { userId },
  })

  console.log('[Notification] Cleared all for user:', userId, 'count:', result.count)
  return result.count
}

/**
 * 获取用户通知偏好设置
 */
export async function getUserNotificationPreferences(userId: string) {
  let preferences = await prisma.userNotificationPreference.findUnique({
    where: { userId },
  })

  // 如果没有偏好设置，创建默认设置
  if (!preferences) {
    preferences = await prisma.userNotificationPreference.create({
      data: {
        userId,
        enabled: true,
        allowedHours: JSON.stringify([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]),
        quietStart: '22:00',
        quietEnd: '08:00',
        vaccineEnabled: true,
        dewormingEnabled: true,
        checkupEnabled: true,
        weightEnabled: true,
        recordEnabled: true,
      },
    })
  }

  return preferences
}

/**
 * 更新用户通知偏好设置
 */
export async function updateUserNotificationPreferences(
  userId: string,
  data: Partial<{
    enabled: boolean
    allowedHours: string
    quietStart: string
    quietEnd: string
    vaccineEnabled: boolean
    dewormingEnabled: boolean
    checkupEnabled: boolean
    weightEnabled: boolean
    recordEnabled: boolean
  }>
) {
  const preferences = await prisma.userNotificationPreference.update({
    where: { userId },
    data,
  })

  console.log('[Notification] Updated preferences for user:', userId)
  return preferences
}

/**
 * 检查通知类型是否启用
 */
export function isNotificationTypeEnabled(
  preferences: any,
  type: NotificationType
): boolean {
  if (!preferences?.enabled) return false

  switch (type) {
    case 'vaccine':
      return preferences.vaccineEnabled ?? true
    case 'deworming':
      return preferences.dewormingEnabled ?? true
    case 'checkup':
      return preferences.checkupEnabled ?? true
    case 'weight':
      return preferences.weightEnabled ?? true
    case 'record':
      return preferences.recordEnabled ?? true
    default:
      return true
  }
}

/**
 * 检查当前时间是否在允许的时段内
 */
export function isWithinAllowedHours(preferences: any): boolean {
  if (!preferences?.allowedHours) return true

  const allowedHours = JSON.parse(preferences.allowedHours) as number[]
  const currentHour = new Date().getHours()

  return allowedHours.includes(currentHour)
}

/**
 * 检查当前时间是否在静音时段内
 */
export function isInQuietHours(preferences: any): boolean {
  if (!preferences?.quietStart || !preferences?.quietEnd) return false

  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = currentHour * 60 + currentMinute

  const [quietStartHour, quietStartMinute] = preferences.quietStart.split(':').map(Number)
  const [quietEndHour, quietEndMinute] = preferences.quietEnd.split(':').map(Number)

  const quietStartTime = quietStartHour * 60 + quietStartMinute
  const quietEndTime = quietEndHour * 60 + quietEndMinute

  // 处理跨天情况
  if (quietStartTime > quietEndTime) {
    return currentTime >= quietStartTime || currentTime < quietEndTime
  } else {
    return currentTime >= quietStartTime && currentTime < quietEndTime
  }
}

/**
 * 检查是否应该发送通知
 */
export async function shouldSendNotification(userId: string, type: NotificationType): Promise<boolean> {
  const preferences = await getUserNotificationPreferences(userId)

  if (!isNotificationTypeEnabled(preferences, type)) {
    console.log('[Notification] Type disabled:', type, 'for user:', userId)
    return false
  }

  if (isInQuietHours(preferences)) {
    console.log('[Notification] In quiet hours for user:', userId)
    return false
  }

  if (!isWithinAllowedHours(preferences)) {
    console.log('[Notification] Outside allowed hours for user:', userId)
    return false
  }

  return true
}

/**
 * 发送通知（检查偏好后）
 */
export async function sendNotification(data: NotificationData): Promise<boolean> {
  const shouldSend = await shouldSendNotification(data.userId, data.type)

  if (!shouldSend) {
    return false
  }

  const notification = await createNotification({
    ...data,
    sentAt: new Date(),
  })

  return !!notification
}
