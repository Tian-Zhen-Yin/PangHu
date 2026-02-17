import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'

// 扩展 Express Request 类型
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string
    email: string
    username: string
  }
}

/**
 * JWT 认证中间件
 */
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // 从请求头获取 token
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未提供认证令牌', error: 'Unauthorized' })
  }

  const token = authHeader.substring(7) // 移除 "Bearer " 前缀

  // 验证 token
  const payload = verifyToken(token)

  if (!payload) {
    return res.status(401).json({ success: false, message: '无效的认证令牌', error: 'Unauthorized' })
  }

  // 将用户信息添加到请求对象
  req.user = payload
  next()
}

/**
 * 可选的认证中间件 - 不强制要求登录
 */
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    if (payload) {
      req.user = payload
    }
  }

  next()
}
