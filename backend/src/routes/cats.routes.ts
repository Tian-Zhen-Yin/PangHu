import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth'
import { uploadCatAvatar } from '../utils/upload'
import {
  getCats,
  getCat,
  createCatHandler,
  updateCatHandler,
  deleteCatHandler,
  getWeightHistory,
  exportWeightCSV,
  updateWeightGoal,
  uploadCatAvatarHandler,
  uploadCatAvatarBase64Handler
} from '../controllers/cats.controller'

const router = Router()
router.use(authMiddleware)

router.get('/', getCats)
router.get('/:id', getCat)
router.get('/:id/weight-history', getWeightHistory)
router.get('/:id/weight/export', exportWeightCSV)
router.put('/:id/weight-goal', updateWeightGoal)
router.post('/', createCatHandler)
router.put('/:id', updateCatHandler)
router.delete('/:id', deleteCatHandler)
router.post('/:id/avatar', uploadCatAvatar, uploadCatAvatarHandler)
router.post('/:id/avatar-base64', uploadCatAvatarBase64Handler)

export default router
