import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth'
import { successResponse, errorResponse } from '../utils/response'
import {
  getVaccinesByCat,
  createVaccineRecord,
  updateVaccineRecord,
  deleteVaccineRecord,
  getUpcomingVaccines
} from '../services/vaccine.service'

const router = Router()
router.use(authMiddleware)

router.get('/upcoming', async (req, res) => {
  try {
    const userId = (req as any).user.id
    const days = parseInt(req.query.days as string) || 30
    const vaccines = await getUpcomingVaccines(userId, days)
    res.json(successResponse(vaccines, '获取即将到期疫苗成功'))
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message || '获取疫苗提醒失败'))
  }
})

router.get('/cat/:catId', async (req, res) => {
  try {
    const userId = (req as any).user.id
    const { catId } = req.params
    const vaccines = await getVaccinesByCat(catId, userId)
    if (vaccines === null) return res.status(404).json(errorResponse('猫咪不存在'))
    res.json(successResponse(vaccines, '获取疫苗记录成功'))
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message || '获取疫苗记录失败'))
  }
})

router.post('/', async (req, res) => {
  try {
    const userId = (req as any).user.id
    const { catId, vaccineName, vaccinatedAt } = req.body
    if (!catId || !vaccineName || !vaccinatedAt) {
      return res.status(400).json(errorResponse('猫咪ID、疫苗名称和接种日期为必填项'))
    }
    const record = await createVaccineRecord(catId, userId, req.body)
    if (!record) return res.status(404).json(errorResponse('猫咪不存在'))
    res.status(201).json(successResponse(record, '添加疫苗记录成功'))
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message || '添加疫苗记录失败'))
  }
})

router.put('/:id', async (req, res) => {
  try {
    const userId = (req as any).user.id
    const { id } = req.params
    const record = await updateVaccineRecord(id, userId, req.body)
    if (!record) return res.status(404).json(errorResponse('疫苗记录不存在'))
    res.json(successResponse(record, '更新疫苗记录成功'))
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message || '更新疫苗记录失败'))
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const userId = (req as any).user.id
    const { id } = req.params
    const record = await deleteVaccineRecord(id, userId)
    if (!record) return res.status(404).json(errorResponse('疫苗记录不存在'))
    res.json(successResponse(null, '删除疫苗记录成功'))
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message || '删除疫苗记录失败'))
  }
})

export default router
