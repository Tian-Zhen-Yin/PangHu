import { Router } from 'express'
import {
  getPetRecords,
  getPetRecordById,
  createPetRecord,
  updatePetRecord,
  deletePetRecord
} from '../controllers/pet.controller'
import { authMiddleware } from '../middlewares/auth'
import { uploadPetPhoto } from '../utils/upload'

const router = Router()

// 所有路由都需要认证
router.use(authMiddleware)

/**
 * @route   GET /api/pets/records
 * @desc    获取用户的所有宠物记录
 * @access  Private
 */
router.get('/records', getPetRecords)

/**
 * @route   GET /api/pets/records/:id
 * @desc    获取单个宠物记录详情
 * @access  Private
 */
router.get('/records/:id', getPetRecordById)

/**
 * @route   POST /api/pets/records
 * @desc    创建宠物记录（带图片上传）
 * @access  Private
 * @body    petName, photoUrl, ageWeeks, ageMonths, weight, notes, recordDate
 * @form    photo (file)
 */
router.post('/records', uploadPetPhoto, (req: any, res, next) => {
  // 如果有上传的文件，添加文件路径到请求体
  if (req.file) {
    req.body.photoUrl = `/uploads/pets/${req.file.filename}`
  }
  next()
}, createPetRecord)

/**
 * @route   PATCH /api/pets/records/:id
 * @desc    更新宠物记录（可选图片上传）
 * @access  Private
 */
router.patch('/records/:id', uploadPetPhoto, (req: any, res, next) => {
  // 如果有上传的文件，添加文件路径到请求体
  if (req.file) {
    req.body.photoUrl = `/uploads/pets/${req.file.filename}`
  }
  next()
}, updatePetRecord)

/**
 * @route   DELETE /api/pets/records/:id
 * @desc    删除宠物记录
 * @access  Private
 */
router.delete('/records/:id', deletePetRecord)

export default router
