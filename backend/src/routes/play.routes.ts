/**
 * Play 路由 — 对齐技术设计 §6
 *
 * 路径：
 *   GET  /api/play/recommend   推荐游戏（只读）
 *   POST /api/play/feedback    提交反馈（写入；用户显式 POST 即视为已确认）
 *
 * 所有端点都挂 authMiddleware，未登录返回 401。
 */

import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth'
import * as playController from '../controllers/play.controller'

const router = Router()

router.get('/recommend', authMiddleware, playController.recommendHandler)
router.post('/feedback', authMiddleware, playController.feedbackHandler)

export default router
