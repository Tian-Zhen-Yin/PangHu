/**
 * Play 控制器 — 对齐技术设计 §6.1 / §6.2
 *
 * 端点：
 *   GET  /api/play/recommend   委派给 engine.recommend
 *   POST /api/play/feedback    用户显式 POST 视为已确认（对齐 §6.2 安全说明），
 *                              控制器构造已验证的 AgentContext 后调用 SubmitPlayFeedbackTool
 *
 * 鉴权由路由层 authMiddleware 保证；未登录在中间件层即返回 401。
 */

import type { Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../config/database'
import { successResponse, errorResponse } from '../utils/response'
import { recommend } from '../agent/recommend/engine'
import { SubmitPlayFeedbackTool } from '../agent/tools/submitPlayFeedback.tool'
import type { AgentContext } from '../agent/types/agent'

const GAME_CATEGORIES = ['chase', 'hunting', 'puzzle', 'interaction', 'climbing', 'solo'] as const

const recommendQuerySchema = z.object({
  catId: z.string().min(1),
  availableTime: z.coerce.number().int().min(1).max(120).optional(),
  preferredCategory: z.enum(GAME_CATEGORIES).optional(),
  currentEnergyOverride: z.coerce.number().int().min(1).max(5).optional(),
})

const feedbackBodySchema = z.object({
  catId: z.string().min(1),
  gameId: z.string().min(1),
  score: z.number().int().min(1).max(5),
  completion: z.boolean(),
  actualDuration: z.number().int().min(0),
  playedAt: z.string().optional(),
  notes: z.string().optional(),
})

function buildCtx(req: Request, withConfirmation = false): AgentContext {
  const userId = (req as any).user?.userId as string
  const ctx: AgentContext = {
    userId,
    sessionId: 'rest-' + Date.now(),
    traceId: 'rest-' + Date.now(),
    logger: console,
    cache: new Map(),
  }
  if (withConfirmation) {
    ctx.confirmationToken = {
      verified: true,
      confirmedAt: new Date(),
      confirmationId: 'rest-implicit',
    }
  }
  return ctx
}

/**
 * GET /api/play/recommend
 */
export async function recommendHandler(req: Request, res: Response) {
  const parsed = recommendQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res
      .status(400)
      .json(errorResponse('VALIDATION_ERROR', '查询参数不合法'))
  }

  const ctx = buildCtx(req, false)
  const result = await recommend(parsed.data, ctx)
  return res.json(successResponse(result))
}

/**
 * POST /api/play/feedback
 *
 * 用户显式 POST 视为隐式确认（对齐技术设计 §6.2：REST 上下文中
 * action 由客户端发起，无需再走 chat/confirm 二次确认）。
 */
export async function feedbackHandler(req: Request, res: Response) {
  const parsed = feedbackBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res
      .status(400)
      .json(errorResponse('VALIDATION_ERROR', '请求体不合法'))
  }
  const userId = (req as any).user?.userId as string

  // 控制器层做 ownership 前置校验（防止信息探测；Tool 层仍会再校验一次）
  const cat = await prisma.cat.findFirst({
    where: { id: parsed.data.catId, userId },
    select: { id: true, name: true, userId: true },
  })
  if (!cat) {
    return res.status(403).json(errorResponse('FORBIDDEN', '无权访问该猫咪信息'))
  }

  const ctx = buildCtx(req, true)
  const result = await SubmitPlayFeedbackTool.call(parsed.data, ctx)
  return res.json(successResponse(result, result.message))
}
