/**
 * SubmitPlayFeedbackTool — 对齐技术设计 §5.2
 *
 * 写入安全契约（与 ADD_allergy_record 保持一致）：
 *   1. 必须有 ctx.confirmationToken.verified（Executor 与工具双重保险）
 *   2. cat 必须属于 ctx.userId（防止越权）
 *   3. 写入数据带审计字段：createdBy = ctx.userId, source = 'agent',
 *      confirmedAt = ctx.confirmationToken.confirmedAt
 *   4. PlayFeedback.userId 冗余字段使用 cat.userId（权威来源），不直接信任 ctx.userId
 */

import { z } from 'zod'
import prisma from '../../config/database'
import { playFeedbackService } from '../../services/playFeedback.service'
import type { Tool, AgentContext } from '../types/agent'

interface SubmitPlayFeedbackOutput {
  success: boolean
  message?: string
  recordId?: string
}

export const submitPlayFeedbackSchema = z.object({
  catId: z.string(),
  gameId: z.string(),
  score: z.number().int().min(1).max(5),
  completion: z.boolean(),
  actualDuration: z.number().int().min(0),
  playedAt: z.string().optional(),
  notes: z.string().optional(),
})

export const SubmitPlayFeedbackTool: Tool<
  z.infer<typeof submitPlayFeedbackSchema>,
  SubmitPlayFeedbackOutput
> = {
  name: 'SUBMIT_play_feedback',
  description: '提交陪玩反馈（评分、完成度、时长），用于偏好学习。需要用户确认。',
  schema: submitPlayFeedbackSchema,
  permissions: ['write'],
  call: async (input, ctx: AgentContext) => {
    try {
      // 1. 确认令牌（双重保险）
      if (!ctx.confirmationToken?.verified) {
        return { success: false, message: '写入操作需用户确认后方可执行' }
      }

      // 2. 归属校验
      const cat = await prisma.cat.findFirst({
        where: { id: input.catId, userId: ctx.userId },
        select: { id: true, name: true, userId: true },
      })
      if (!cat) {
        return { success: false, message: '无权访问该猫咪信息' }
      }

      // 3. 写入（带审计字段；userId 冗余字段用 cat.userId 作为权威来源）
      const result = await playFeedbackService.upsert({
        catId: input.catId,
        userId: cat.userId,
        gameId: input.gameId,
        score: input.score,
        completion: input.completion,
        actualDuration: input.actualDuration,
        playedAt: input.playedAt ? new Date(input.playedAt) : new Date(),
        notes: input.notes,
        createdBy: ctx.userId,
        source: 'agent',
        confirmedAt: ctx.confirmationToken.confirmedAt,
      })

      return {
        success: result.success,
        recordId: result.recordId,
        message: result.success ? `已记录 ${cat.name} 的陪玩反馈` : undefined,
      }
    } catch (error: any) {
      ctx.logger.error(`[SUBMIT_play_feedback] Error: ${error.message}`)
      return { success: false, message: '记录陪玩反馈时出错，请稍后重试。' }
    }
  },
}
