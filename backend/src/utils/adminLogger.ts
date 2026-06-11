import { Request } from 'express'
import prisma from '../config/database'
import type { CreateAdminLogRequest } from '../types/admin'

/**
 * Create an admin log entry
 */
export async function createAdminLog(
  adminId: string | null,
  data: CreateAdminLogRequest
): Promise<void> {
  try {
    await prisma.adminLog.create({
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
  } catch (error) {
    console.error('Failed to create admin log:', error)
  }
}

/**
 * Extract request metadata for logging
 */
export function extractRequestMetadata(req: Request): {
  ip: string
  userAgent: string
} {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
             req.headers['x-real-ip'] as string ||
             req.socket?.remoteAddress ||
             'unknown'

  const userAgent = req.headers['user-agent'] || 'unknown'

  return { ip, userAgent }
}

/**
 * Get client IP from request
 */
export function getClientIp(req: Request): string {
  return extractRequestMetadata(req).ip
}
