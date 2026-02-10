import { Router } from 'express'
import * as templateController from '../controllers/template.controller'

const router = Router()

// 模板相关
router.get('/', templateController.getTemplates)
router.get('/:id', templateController.getTemplateById)
router.post('/:id/clone', templateController.cloneTemplate)

export default router
