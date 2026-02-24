/**
 * 主动建议控制器
 */

import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth'
import { generateProactiveAdvice } from '../services/ai.service'
import { successResponse, errorResponse } from '../utils/response'

/**
 * 获取猫咪主动健康建议
 */
export async function getProactiveAdvice(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId
    const catId = req.params.catId as string
    const types = req.query.types as string | undefined

    if (!userId) {
      return res.status(401).json(errorResponse('用户未认证'))
    }

    // 解析 types 参数
    let adviceTypes: ('weight' | 'vaccine' | 'age' | 'general')[] = ['weight', 'vaccine', 'age', 'general']
    if (types) {
      adviceTypes = types.split(',') as ('weight' | 'vaccine' | 'age' | 'general')[]
    }

    console.log('[getProactiveAdvice] Request - userId:', userId, 'catId:', catId, 'types:', adviceTypes)

    const advice = await generateProactiveAdvice(catId, userId, adviceTypes)

    console.log('[getProactiveAdvice] Result:', Object.keys(advice))
    res.json(successResponse(advice, '获取健康建议成功'))
  } catch (error: any) {
    console.error('[getProactiveAdvice] Error:', error)
    next(error)
  }
}
