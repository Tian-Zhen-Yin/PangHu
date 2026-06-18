/**
 * RecommendPlayTool — 对齐技术设计 §5.1
 *
 * 只读工具，不需要 confirmationToken。仅作为 engine.recommend 的 Agent
 * 入口包装：负责 schema 校验 + 错误兜底，业务逻辑全部委派给 engine。
 */

import { z } from 'zod'
import { recommend } from '../recommend/engine'
import type { Tool, AgentContext } from '../types/agent'
import type { RecommendResult } from '../recommend/fallback'

const GAME_CATEGORIES = ['chase', 'hunting', 'puzzle', 'interaction', 'climbing', 'solo'] as const

export const recommendPlaySchema = z.object({
  catId: z.string(),
  availableTime: z.number().int().min(1).max(120).optional(),
  preferredCategory: z.enum(GAME_CATEGORIES).optional(),
  currentEnergyOverride: z.number().int().min(1).max(5).optional(),
})

export const RecommendPlayTool: Tool<z.infer<typeof recommendPlaySchema>, RecommendResult> = {
  name: 'RECOMMEND_play',
  description: '基于猫咪性格、精力、健康状态与可用时间，推荐 3-5 款合适的陪玩游戏。',
  schema: recommendPlaySchema,
  permissions: ['read'],
  call: async (input, ctx: AgentContext) => {
    try {
      return await recommend(input, ctx)
    } catch (error: any) {
      ctx.logger.error(`[RECOMMEND_play] Error: ${error.message}`)
      return {
        success: false,
        fallback: false,
        suggestions: [],
        message: '推荐生成失败，请稍后重试。',
      }
    }
  },
}
