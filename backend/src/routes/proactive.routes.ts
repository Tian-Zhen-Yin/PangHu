/**
 * 主动建议路由
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { getProactiveAdvice } from '../controllers/proactive.controller'

const router = Router()

// 所有路由需要认证
router.use(authMiddleware)

/**
 * GET /api/proactive/:catId
 * 获取猫咪主动健康建议
 * Query: types=weight,vaccine,age,general
 */
router.get('/:catId', getProactiveAdvice)

export default router
