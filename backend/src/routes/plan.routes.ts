import { Router } from 'express'
import * as planController from '../controllers/plan.controller'
import { authMiddleware } from '../middlewares/auth'

const router = Router()

// 所有路由都需要认证
router.use(authMiddleware)

// 获取当前用户的所有计划
router.get('/', planController.getUserPlans)

// 创建新计划（保存模板）
router.post('/', planController.createUserPlan)

// 获取单个计划详情
router.get('/:id', planController.getUserPlanById)

// 更新计划进度
router.patch('/:id/progress', planController.updatePlanProgress)

// 设置激活计划
router.patch('/:id/activate', planController.setActivePlan)

// 删除计划
router.delete('/:id', planController.deleteUserPlan)

export default router
