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
  catId: z.string().optional().describe('猫咪 ID。通常无需填写，系统会自动使用当前选中的猫咪。'),
  availableTime: z.number().int().min(1).max(120).optional().describe('可用陪玩时长（分钟），如用户提到"只有10分钟"则填10。'),
  preferredCategory: z.enum(GAME_CATEGORIES).optional().describe('偏好的游戏类别：chase 追逐 / hunting 狩猎 / puzzle 益智 / interaction 互动 / climbing 攀爬 / solo 独自。'),
  currentEnergyOverride: z.number().int().min(1).max(5).optional().describe('当前精力档位 1-5，精力旺盛取高值、疲惫取低值。'),
})

export const RecommendPlayTool: Tool<z.infer<typeof recommendPlaySchema>, RecommendResult> = {
  name: 'RECOMMEND_play',
  description: '基于猫咪性格、精力、健康状态与可用时间，推荐 3-5 款合适的陪玩游戏。当用户想给猫咪安排游戏、互动、运动，或表达"陪它玩什么""玩点什么""推荐游戏"等陪玩意图时调用。',
  schema: recommendPlaySchema,
  permissions: ['read'],
  call: async (input, ctx: AgentContext) => {
    try {
      // catId 优先取 LLM 参数，缺省时回退到当前会话选中的猫咪
      const catId = input.catId || ctx.selectedCatId
      if (!catId) {
        return {
          success: false,
          fallback: false,
          suggestions: [],
          message: '请先选择一只猫咪再获取陪玩推荐。',
        }
      }
      return await recommend({ ...input, catId }, ctx)
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
