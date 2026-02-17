import { Router } from 'express'
import catRoutes from './cat.routes'
import guideRoutes from './guide.routes'
import templateRoutes from './template.routes'
import authRoutes from './auth.routes'
import planRoutes from './plan.routes'
import petRoutes from './pet.routes'
import chatRoutes from './chat.routes'

const router = Router()

// 认证路由
router.use('/auth', authRoutes)

// API路由
router.use('/cats', catRoutes)
router.use('/guides', guideRoutes)
router.use('/templates', templateRoutes)
router.use('/plans', planRoutes)
router.use('/pets', petRoutes)
router.use('/chat', chatRoutes)

// 健康检查
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default router
