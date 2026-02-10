import { Router } from 'express'
import * as catController from '../controllers/cat.controller'

const router = Router()

// 成长阶段相关
router.get('/stages', catController.getStages)
router.get('/stages/:id', catController.getStageById)

// 里程碑
router.get('/milestones', catController.getMilestones)

// 疫苗接种
router.get('/vaccinations', catController.getVaccinations)

export default router
