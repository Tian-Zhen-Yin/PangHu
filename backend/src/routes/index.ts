import { Router } from 'express'
import catRoutes from './cat.routes'
import catsRoutes from './cats.routes'
import vaccineRoutes from './vaccine.routes'
import guideRoutes from './guide.routes'
import templateRoutes from './template.routes'
import authRoutes from './auth.routes'
import planRoutes from './plan.routes'
import petRoutes from './pet.routes'
import chatRoutes from './chat.routes'
import knowledgeRoutes from './knowledge.routes'
import weightStandardRoutes from './weightStandards.routes'
import notificationRoutes from './notifications.routes'
import proactiveRoutes from './proactive.routes'
import adminRoutes from './admin.routes'
import playRoutes from './play.routes'

const router = Router()

// 认证路由
router.use('/auth', authRoutes)

// API路由
router.use('/cats', catRoutes)
router.use('/my-cats', catsRoutes)
router.use('/vaccines', vaccineRoutes)
router.use('/guides', guideRoutes)
router.use('/templates', templateRoutes)
router.use('/plans', planRoutes)
router.use('/pets', petRoutes)
router.use('/chat', chatRoutes)
router.use('/knowledge', knowledgeRoutes)
router.use('/weight-standards', weightStandardRoutes)
router.use('/notifications', notificationRoutes)
router.use('/proactive', proactiveRoutes)
router.use('/admin', adminRoutes)
router.use('/play', playRoutes)

// 健康检查
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default router
