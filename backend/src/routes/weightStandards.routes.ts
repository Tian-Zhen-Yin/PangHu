/**
 * 体重健康标准路由
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import {
  getWeightAnalysis,
  getWeightHistoryStandards,
  getBreeds,
  getBatchAnalysis,
} from '../controllers/weightStandard.controller'

const router = Router()

// 所有路由需要认证
router.use(authMiddleware)

/**
 * GET /api/weight-standards/breeds
 * 获取支持的品种列表
 */
router.get('/breeds', getBreeds)

/**
 * GET /api/weight-standards/:catId/analysis
 * 获取猫咪体重分析
 */
router.get('/:catId/analysis', getWeightAnalysis)

/**
 * GET /api/weight-standards/:catId/history
 * 获取猫咪体重历史及标准范围
 */
router.get('/:catId/history', getWeightHistoryStandards)

/**
 * POST /api/weight-standards/batch
 * 批量获取多只猫咪的体重分析
 */
router.post('/batch', getBatchAnalysis)

export default router
