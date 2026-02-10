import { Router } from 'express'
import catRoutes from './cat.routes'
import guideRoutes from './guide.routes'
import templateRoutes from './template.routes'

const router = Router()

// API路由
router.use('/cats', catRoutes)
router.use('/guides', guideRoutes)
router.use('/templates', templateRoutes)

// 健康检查
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default router
