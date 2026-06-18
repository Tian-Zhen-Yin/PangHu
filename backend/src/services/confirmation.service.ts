/**
 * 确认流程服务
 *
 * 管理写入工具的挂起会话（pending confirmation sessions）。
 * 当 Agent 遇到 requiresConfirmation 的工具时，将草稿数据存入此服务，
 * 等待用户通过 POST /api/chat/confirm 确认后再执行写入。
 *
 * P3 阶段使用内存 Map 存储（适用于单实例部署）。
 * 生产环境多实例部署应替换为 Redis 实现。
 */

import { randomUUID } from 'crypto'

const DEFAULT_TTL_MS = 5 * 60 * 1000  // 5 分钟

export interface SuspendedSession {
  confirmationId: string
  userId: string
  catId: string
  toolName: string
  draft: Record<string, unknown>
  createdAt: number
  expiresAt: number
}

const sessions = new Map<string, SuspendedSession>()

/**
 * 创建挂起会话，返回 confirmationId
 */
export function createConfirmation(
  userId: string,
  catId: string,
  toolName: string,
  draft: Record<string, unknown>,
  ttlMs: number = DEFAULT_TTL_MS,
): string {
  const confirmationId = randomUUID()
  const now = Date.now()

  sessions.set(confirmationId, {
    confirmationId,
    userId,
    catId,
    toolName,
    draft,
    createdAt: now,
    expiresAt: now + ttlMs,
  })

  // 清理过期会话
  cleanupExpired()

  return confirmationId
}

/**
 * 查找挂起会话（已过期返回 null）
 */
export function findConfirmation(confirmationId: string): SuspendedSession | null {
  const session = sessions.get(confirmationId)
  if (!session) return null
  if (Date.now() > session.expiresAt) {
    sessions.delete(confirmationId)
    return null
  }
  return session
}

/**
 * 验证 confirmationId 是否属于该用户
 */
export function verifyConfirmation(confirmationId: string, userId: string): SuspendedSession | null {
  const session = findConfirmation(confirmationId)
  if (!session) return null
  if (session.userId !== userId) return null
  return session
}

/**
 * 消费挂起会话（确认后移除）
 */
export function consumeConfirmation(confirmationId: string, userId: string): SuspendedSession | null {
  const session = verifyConfirmation(confirmationId, userId)
  if (session) {
    sessions.delete(confirmationId)
  }
  return session
}

/**
 * 取消挂起会话
 */
export function cancelConfirmation(confirmationId: string, userId: string): boolean {
  const session = verifyConfirmation(confirmationId, userId)
  if (session) {
    sessions.delete(confirmationId)
    return true
  }
  return false
}

/**
 * 清理过期会话
 */
function cleanupExpired(): void {
  const now = Date.now()
  for (const [id, session] of sessions) {
    if (now > session.expiresAt) {
      sessions.delete(id)
    }
  }
}
