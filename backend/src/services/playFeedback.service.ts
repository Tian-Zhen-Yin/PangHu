/**
 * playFeedbackService — 写入陪玩反馈，作为偏好聚合的源数据
 *
 * 复合唯一键 (catId, gameId, playedAt)：同一只猫在同一时刻对同一游戏只
 * 应该有一条反馈。重复提交（例如客户端重试）走 update 分支。
 *
 * update 分支不会覆盖 createdBy（首条记录的写入者是权威来源）。
 */

import prisma from '../config/database'

export interface PlayFeedbackUpsertInput {
  catId: string
  userId: string
  gameId: string
  score: number
  completion: boolean
  actualDuration: number
  playedAt: Date
  notes?: string
  createdBy: string
  source: 'agent' | 'user'
  confirmedAt: Date
}

export interface PlayFeedbackUpsertResult {
  success: boolean
  recordId?: string
}

export const playFeedbackService = {
  async upsert(args: PlayFeedbackUpsertInput): Promise<PlayFeedbackUpsertResult> {
    try {
      const row = await prisma.playFeedback.upsert({
        where: {
          catId_gameId_playedAt: {
            catId: args.catId,
            gameId: args.gameId,
            playedAt: args.playedAt,
          },
        },
        create: {
          catId: args.catId,
          userId: args.userId,
          gameId: args.gameId,
          score: args.score,
          completion: args.completion,
          actualDuration: args.actualDuration,
          playedAt: args.playedAt,
          notes: args.notes ?? null,
          createdBy: args.createdBy,
          source: args.source,
          confirmedAt: args.confirmedAt,
        },
        update: {
          score: args.score,
          completion: args.completion,
          actualDuration: args.actualDuration,
          notes: args.notes ?? null,
          source: args.source,
          confirmedAt: args.confirmedAt,
          // 注意：不更新 createdBy（保留首次写入者）
        },
      })
      return { success: true, recordId: row.id }
    } catch {
      return { success: false }
    }
  },
}
