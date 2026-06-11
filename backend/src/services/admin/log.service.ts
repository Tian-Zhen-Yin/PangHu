import prisma from '../../config/database'
import type { AdminLogResponse, CreateAdminLogRequest } from '../../types/admin'

/**
 * Create an admin log entry
 */
export async function createLog(
  adminId: string | null,
  data: CreateAdminLogRequest
): Promise<AdminLogResponse> {
  const log = await prisma.adminLog.create({
    data: {
      adminId,
      action: data.action,
      module: data.module,
      targetId: data.targetId,
      detail: data.detail ? JSON.stringify(data.detail) : null,
      ip: data.ip,
      userAgent: data.userAgent
    }
  })

  return {
    id: log.id,
    adminId: log.adminId,
    action: log.action,
    module: log.module,
    targetId: log.targetId,
    detail: log.detail,
    ip: log.ip,
    userAgent: log.userAgent,
    createdAt: log.createdAt
  }
}

/**
 * Get recent logs for an admin
 */
export async function getRecentLogs(limit: number = 10): Promise<AdminLogResponse[]> {
  const logs = await prisma.adminLog.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' }
  })

  return logs.map(log => ({
    id: log.id,
    adminId: log.adminId,
    action: log.action,
    module: log.module,
    targetId: log.targetId,
    detail: log.detail,
    ip: log.ip,
    userAgent: log.userAgent,
    createdAt: log.createdAt
  }))
}

/**
 * Get logs by admin ID
 */
export async function getLogsByAdminId(
  adminId: string,
  limit: number = 50
): Promise<AdminLogResponse[]> {
  const logs = await prisma.adminLog.findMany({
    where: { adminId },
    take: limit,
    orderBy: { createdAt: 'desc' }
  })

  return logs.map(log => ({
    id: log.id,
    adminId: log.adminId,
    action: log.action,
    module: log.module,
    targetId: log.targetId,
    detail: log.detail,
    ip: log.ip,
    userAgent: log.userAgent,
    createdAt: log.createdAt
  }))
}
