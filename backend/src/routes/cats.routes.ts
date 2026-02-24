import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth'
import {
  getCats,
  getCat,
  createCatHandler,
  updateCatHandler,
  deleteCatHandler,
  getWeightHistory
} from '../controllers/cats.controller'

const router = Router()
router.use(authMiddleware)

router.get('/', getCats)
router.get('/:id', getCat)
router.get('/:id/weight-history', getWeightHistory)
router.post('/', createCatHandler)
router.put('/:id', updateCatHandler)
router.delete('/:id', deleteCatHandler)

export default router
