import { Request, Response, NextFunction } from 'express'
import { errorResponse } from '../utils/response'

/**
 * 全局错误处理中间件
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Error:', err)

  const statusCode = (err as any).statusCode || 500
  const message = err.message || '服务器内部错误'

  res.status(statusCode).json(errorResponse(message))
}

/**
 * 404处理中间件
 */
export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json(errorResponse('请求的资源不存在'))
}
