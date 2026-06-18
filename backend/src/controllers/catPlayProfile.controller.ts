/**
 * PUT /api/cats/:id/play-profile — 写入猫咪陪玩档案
 *
 * 用于解锁 recommend 引擎：engine 在 cat.personality 为空时会直接返回
 * needProfileCompletion，因此必须暴露一个 authenticated owner 可写的入口。
 *
 * 校验层：
 *   - zod：personality 受控词汇、energyBaseline 1-5、healthTags 受控词汇数组
 *   - body 至少含一个字段（避免无意义空更新）
 *   - ownership 由 catProfileService.update 内部 (id, userId) 校验，返回 null → 403
 */

import type { Request, Response } from 'express'
import { z } from 'zod'
import { successResponse, errorResponse } from '../utils/response'
import { catProfileService } from '../services/catProfile.service'

const PERSONALITIES = ['active', 'curious', 'clingy', 'aloof'] as const
const HEALTH_TAGS = ['overweight', 'senior', 'post_op', 'kitten'] as const

const playProfileBodySchema = z
  .object({
    personality: z.enum(PERSONALITIES).nullable().optional(),
    energyBaseline: z.number().int().min(1).max(5).nullable().optional(),
    healthTags: z.array(z.enum(HEALTH_TAGS)).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: '至少需要提供一个字段',
  })

export async function updatePlayProfileHandler(req: Request, res: Response) {
  const parsed = playProfileBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json(errorResponse('VALIDATION_ERROR', '请求体不合法'))
  }

  const catId = req.params.id as string
  const userId = (req as any).user?.userId as string

  const updated = await catProfileService.update(catId, userId, parsed.data)
  if (!updated) {
    return res.status(403).json(errorResponse('FORBIDDEN', '无权访问该猫咪信息'))
  }

  return res.json(successResponse(updated, '陪玩档案已更新'))
}
