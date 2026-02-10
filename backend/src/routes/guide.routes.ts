import { Router } from 'express'
import * as guideController from '../controllers/guide.controller'

const router = Router()

// 指南相关
router.get('/', guideController.getGuides)
router.get('/search', guideController.searchGuides)
router.get('/categories', guideController.getCategories)
router.get('/:id', guideController.getGuideById)

export default router
