import { Request, Response } from 'express'
import { getDashboardStats } from '../../services/admin/dashboard.service'
import { successResponse } from '../../utils/response'

/**
 * Get dashboard statistics
 */
export async function getStats(req: Request, res: Response) {
  try {
    const stats = await getDashboardStats()
    res.json(successResponse(stats))
  } catch (error) {
    console.error('Get stats error:', error)
    res.status(500).json({
      success: false,
      message: '获取统计数据失败',
      error: 'INTERNAL_ERROR'
    })
  }
}

/**
 * Get recent activity logs
 */
export async function getRecentLogs(req: Request, res: Response) {
  try {
    const { getRecentLogs } = await import('../../services/admin/log.service')
    const limit = parseInt(req.query.limit as string) || 5
    const logs = await getRecentLogs(limit)

    res.json(successResponse(logs))
  } catch (error) {
    console.error('Get recent logs error:', error)
    res.status(500).json({
      success: false,
      message: '获取日志失败',
      error: 'INTERNAL_ERROR'
    })
  }
}
