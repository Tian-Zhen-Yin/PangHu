/**
 * 通知控制器
 */

import { Response, NextFunction } from 'express'
import { Request } from 'express'
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllAsRead,
  clearAllNotifications,
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
} from '../services/notification.service'
import { successResponse, errorResponse } from '../utils/response'

/**
 * 获取用户通知列表
 */
export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.userId
    const unreadOnly = req.query.unreadOnly === 'true'
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0

    if (!userId) {
      return res.status(401).json(errorResponse('用户未认证'))
    }

    console.log('[getNotifications] Request - userId:', userId, 'unreadOnly:', unreadOnly)

    const result = await getUserNotifications(userId, { unreadOnly, limit, offset })

    console.log('[getNotifications] Result - notifications:', result.notifications.length, 'unreadCount:', result.unreadCount)
    res.json(successResponse({
      notifications: result.notifications,
      unreadCount: result.unreadCount,
    }, '获取通知列表成功'))
  } catch (error: any) {
    console.error('[getNotifications] Error:', error)
    next(error)
  }
}

/**
 * 标记通知为已读
 */
export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.userId
    const notificationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id

    if (!userId) {
      return res.status(401).json(errorResponse('用户未认证'))
    }

    console.log('[markAsRead] Request - userId:', userId, 'notificationId:', notificationId)

    const success = await markNotificationAsRead(notificationId, userId)

    if (!success) {
      return res.status(404).json(errorResponse('通知不存在'))
    }

    res.json(successResponse(null, '标记成功'))
  } catch (error: any) {
    console.error('[markAsRead] Error:', error)
    next(error)
  }
}

/**
 * 标记所有通知为已读
 */
export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.userId

    if (!userId) {
      return res.status(401).json(errorResponse('用户未认证'))
    }

    console.log('[markAllRead] Request - userId:', userId)

    const count = await markAllAsRead(userId)

    res.json(successResponse({ count }, `已标记 ${count} 条通知为已读`))
  } catch (error: any) {
    console.error('[markAllRead] Error:', error)
    next(error)
  }
}

/**
 * 清空所有通知
 */
export async function clearNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.userId

    if (!userId) {
      return res.status(401).json(errorResponse('用户未认证'))
    }

    console.log('[clearNotifications] Request - userId:', userId)

    const count = await clearAllNotifications(userId)

    res.json(successResponse({ count }, `已清空 ${count} 条通知`))
  } catch (error: any) {
    console.error('[clearNotifications] Error:', error)
    next(error)
  }
}

/**
 * 获取通知偏好设置
 */
export async function getPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.userId

    if (!userId) {
      return res.status(401).json(errorResponse('用户未认证'))
    }

    console.log('[getPreferences] Request - userId:', userId)

    const preferences = await getUserNotificationPreferences(userId)

    // 解析 allowedHours JSON
    const result = {
      ...preferences,
      allowedHours: JSON.parse(preferences.allowedHours),
    }

    res.json(successResponse(result, '获取偏好设置成功'))
  } catch (error: any) {
    console.error('[getPreferences] Error:', error)
    next(error)
  }
}

/**
 * 更新通知偏好设置
 */
export async function updatePreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.userId

    if (!userId) {
      return res.status(401).json(errorResponse('用户未认证'))
    }

    const {
      enabled,
      allowedHours,
      quietStart,
      quietEnd,
      vaccineEnabled,
      dewormingEnabled,
      checkupEnabled,
      weightEnabled,
      recordEnabled,
    } = req.body

    console.log('[updatePreferences] Request - userId:', userId, 'data:', req.body)

    // 处理 allowedHours 数组转 JSON
    const data: any = {}
    if (enabled !== undefined) data.enabled = enabled
    if (allowedHours !== undefined) data.allowedHours = JSON.stringify(allowedHours)
    if (quietStart !== undefined) data.quietStart = quietStart
    if (quietEnd !== undefined) data.quietEnd = quietEnd
    if (vaccineEnabled !== undefined) data.vaccineEnabled = vaccineEnabled
    if (dewormingEnabled !== undefined) data.dewormingEnabled = dewormingEnabled
    if (checkupEnabled !== undefined) data.checkupEnabled = checkupEnabled
    if (weightEnabled !== undefined) data.weightEnabled = weightEnabled
    if (recordEnabled !== undefined) data.recordEnabled = recordEnabled

    const preferences = await updateUserNotificationPreferences(userId, data)

    const result = {
      ...preferences,
      allowedHours: JSON.parse(preferences.allowedHours),
    }

    res.json(successResponse(result, '更新偏好设置成功'))
  } catch (error: any) {
    console.error('[updatePreferences] Error:', error)
    next(error)
  }
}

/**
 * 切换指定类型的开关
 */
export async function toggleType(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.userId
    const type = req.params.type as 'vaccine' | 'deworming' | 'checkup' | 'weight' | 'record'

    if (!userId) {
      return res.status(401).json(errorResponse('用户未认证'))
    }

    console.log('[toggleType] Request - userId:', userId, 'type:', type)

    // 获取当前偏好
    const current = await getUserNotificationPreferences(userId)

    // 切换指定类型的开关
    const typeKey = `${type}Enabled` as const
    const currentValue = current[typeKey] ?? true
    const data: any = {}
    data[typeKey] = !currentValue

    const preferences = await updateUserNotificationPreferences(userId, data)

    const result = {
      ...preferences,
      allowedHours: JSON.parse(preferences.allowedHours),
    }

    res.json(successResponse(result, `已${data[typeKey] ? '开启' : '关闭'}${type}提醒`))
  } catch (error: any) {
    console.error('[toggleType] Error:', error)
    next(error)
  }
}
