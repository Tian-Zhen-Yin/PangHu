import { Router } from 'express'
import {
  getPetRecords,
  getPetRecordById,
  createPetRecord,
  updatePetRecord,
  deletePetRecord
} from '../controllers/pet.controller'
import { authMiddleware } from '../middlewares/auth'
import { uploadPetPhotos } from '../utils/upload'

const router = Router()

router.use(authMiddleware)

router.get('/records', getPetRecords)
router.get('/records/:id', getPetRecordById)

router.post('/records', uploadPetPhotos, (req: any, _res, next) => {
  if (req.files?.length) {
    req.body.photos = JSON.stringify((req.files as Express.Multer.File[]).map(f => `/uploads/pets/${f.filename}`))
  }
  next()
}, createPetRecord)

router.patch('/records/:id', uploadPetPhotos, (req: any, _res, next) => {
  if (req.files?.length) {
    req.body.photos = JSON.stringify((req.files as Express.Multer.File[]).map(f => `/uploads/pets/${f.filename}`))
  }
  next()
}, updatePetRecord)

router.delete('/records/:id', deletePetRecord)

export default router
