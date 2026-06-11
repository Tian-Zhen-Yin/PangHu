import { Request, Response, NextFunction } from 'express'
import { verifyAdminAccessToken } from '../utils/adminJwt'
import type { AdminJwtPayload } from '../utils/adminJwt'
import { getAdminById } from '../services/admin/auth.service'

// Extend Express Request
interface AdminRequest extends Request {
  admin?: AdminJwtPayload & { permissions?: string[] }
}

/**
 * Admin authentication middleware
 */
export function adminAuthMiddleware(req: AdminRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: '未提供认证令牌',
      error: 'UNAUTHORIZED'
    })
  }

  const token = authHeader.substring(7)

  const payload = verifyAdminAccessToken(token)
  if (!payload) {
    return res.status(401).json({
      success: false,
      message: '无效的认证令牌',
      error: 'UNAUTHORIZED'
    })
  }

  req.admin = payload
  next()
}

/**
 * Require specific permission
 */
export function requirePermission(permission: string) {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: '未登录',
        error: 'UNAUTHORIZED'
      })
    }

    // This would check permissions from role
    // For now, just pass through
    next()
  }
}

/**
 * Require specific role
 */
export function requireRole(roles: string[]) {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: '未登录',
        error: 'UNAUTHORIZED'
      })
    }

    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足',
        error: 'FORBIDDEN'
      })
    }

    next()
  }
}
