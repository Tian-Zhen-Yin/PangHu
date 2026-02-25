/**
 * 通知路由
 */

import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth'
import {
  getNotifications,
  markAsRead,
  markAllRead,
  clearNotifications,
  getPreferences,
  updatePreferences,
  toggleType,
} from '../controllers/notification.controller'

const router = Router()

// 所有路由需要认证
router.use(authMiddleware)

/**
 * GET /api/notifications
 * 获取通知列表
 * Query: unreadOnly=true|false, limit=number, offset=number
 */
router.get('/', getNotifications)

/**
 * PATCH /api/notifications/:id/read
 * 标记通知为已读
 */
router.patch('/:id/read', markAsRead)

/**
 * POST /api/notifications/mark-all-read
 * 标记所有通知为已读
 */
router.post('/mark-all-read', markAllRead)

/**
 * DELETE /api/notifications
 * 清空所有通知
 */
router.delete('/', clearNotifications)

/**
 * GET /api/notifications/preferences
 * 获取通知偏好设置
 */
router.get('/preferences', getPreferences)

/**
 * PUT /api/notifications/preferences
 * 更新通知偏好设置
 */
router.put('/preferences', updatePreferences)

/**
 * PUT /api/notifications/preferences/:type/toggle
 * 切换指定类型的开关
 */
router.put('/preferences/:type/toggle', toggleType)

export default router
