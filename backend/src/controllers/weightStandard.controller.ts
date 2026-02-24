/**
 * 体重健康标准控制器
 */

import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import {
  analyzeWeight,
  getWeightHistoryWithStandards,
  getSupportedBreeds,
  analyzeMultipleCats,
} from '../services/weightStandard.service'
import { successResponse, errorResponse } from '../utils/response'

/**
 * 获取猫咪体重分析
 */
export async function getWeightAnalysis(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId
    const catId = req.params.catId as string

    if (!userId) {
      return res.status(401).json(errorResponse('用户未认证'))
    }

    console.log('[getWeightAnalysis] Request - userId:', userId, 'catId:', catId)

    const analysis = await analyzeWeight(catId, userId)

    if (!analysis) {
      return res.status(404).json(errorResponse('猫咪不存在或暂无体重数据'))
    }

    console.log('[getWeightAnalysis] Result - status:', analysis.status, 'current:', analysis.current)
    res.json(successResponse(analysis, '获取体重分析成功'))
  } catch (error: any) {
    console.error('[getWeightAnalysis] Error:', error)
    next(error)
  }
}

/**
 * 获取猫咪体重历史及标准范围
 */
export async function getWeightHistoryStandards(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId
    const catId = req.params.catId as string

    if (!userId) {
      return res.status(401).json(errorResponse('用户未认证'))
    }

    console.log('[getWeightHistoryStandards] Request - userId:', userId, 'catId:', catId)

    const history = await getWeightHistoryWithStandards(catId, userId)

    if (!history) {
      return res.status(404).json(errorResponse('猫咪不存在'))
    }

    console.log('[getWeightHistoryStandards] Result - records:', history.length)
    res.json(successResponse(history, '获取体重历史及标准范围成功'))
  } catch (error: any) {
    console.error('[getWeightHistoryStandards] Error:', error)
    next(error)
  }
}

/**
 * 获取支持的品种列表
 */
export async function getBreeds(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    console.log('[getBreeds] Request')

    const breeds = await getSupportedBreeds()

    console.log('[getBreeds] Result - breeds:', breeds.length)
    res.json(successResponse(breeds, '获取品种列表成功'))
  } catch (error: any) {
    console.error('[getBreeds] Error:', error)
    next(error)
  }
}

/**
 * 批量获取多只猫咪的体重分析
 */
export async function getBatchAnalysis(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId
    const { catIds } = req.body

    if (!userId) {
      return res.status(401).json(errorResponse('用户未认证'))
    }

    if (!Array.isArray(catIds) || catIds.length === 0) {
      return res.status(400).json(errorResponse('请提供猫咪ID数组'))
    }

    console.log('[getBatchAnalysis] Request - userId:', userId, 'catIds:', catIds)

    const results = await analyzeMultipleCats(catIds, userId)

    // 转换 Map 为对象
    const analysisObj: Record<string, any> = {}
    results.forEach((value, key) => {
      analysisObj[key] = value
    })

    console.log('[getBatchAnalysis] Result - analyzed:', results.size)
    res.json(successResponse(analysisObj, '批量分析成功'))
  } catch (error: any) {
    console.error('[getBatchAnalysis] Error:', error)
    next(error)
  }
}
