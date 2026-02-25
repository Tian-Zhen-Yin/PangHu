import { Request, Response } from 'express'
import prisma from '../config/database'
import { successResponse } from '../utils/response'

/**
 * 获取用户的所有宠物记录
 * 支持按 catId 过滤
 */
export async function getPetRecords(req: Request, res: Response) {
  const userId = (req as any).user?.userId
  const catId = req.query.catId as string | undefined

  if (!userId) {
    return res.status(401).json({ success: false, data: null, message: '未授权', error: 'Unauthorized' })
  }

  try {
    const where: any = { userId }

    // 如果指定了 catId，则只返回该猫咪的记录
    if (catId) {
      where.catId = catId
    }

    const records = await prisma.petRecord.findMany({
      where,
      orderBy: { recordDate: 'desc' }
    })

    res.json(successResponse(records.map(r => ({ ...r, photos: JSON.parse(r.photos) }))))
  } catch (error) {
    res.status(500).json({ success: false, data: null, message: '获取记录失败' })
  }
}

/**
 * 获取单个宠物记录详情
 */
export async function getPetRecordById(req: Request, res: Response) {
  const userId = (req as any).user?.userId
  const { id } = req.params
  const recordId = Array.isArray(id) ? id[0] : id

  if (!userId) {
    return res.status(401).json({ success: false, data: null, message: '未授权', error: 'Unauthorized' })
  }

  try {
    const record = await prisma.petRecord.findFirst({
      where: { id: recordId, userId }
    })

    if (!record) {
      return res.status(404).json({ success: false, data: null, message: '记录不存在' })
    }

    res.json(successResponse(record))
  } catch (error) {
    res.status(500).json({ success: false, data: null, message: '获取记录详情失败' })
  }
}

/**
 * 创建宠物记录
 */
export async function createPetRecord(req: Request, res: Response) {
  const userId = (req as any).user?.userId

  if (!userId) {
    return res.status(401).json({ success: false, data: null, message: '未授权', error: 'Unauthorized' })
  }

  try {
    const { petName, photoUrl, photos, ageWeeks, ageMonths, weight, notes, recordDate, catId, type, isAdoptionDay, templateData } = req.body

    const photosArr: string[] = photos ? JSON.parse(photos) : (photoUrl ? [photoUrl] : [])

    if (photosArr.length === 0 || !ageWeeks || weight === undefined) {
      return res.status(400).json({ success: false, data: null, message: '缺少必要参数' })
    }

    const record = await prisma.petRecord.create({
      data: {
        userId,
        catId: catId || null,
        petName: petName || '猫咪',
        photoUrl: photosArr[0] || '',
        photos: JSON.stringify(photosArr),
        type: type || 'daily',
        isAdoptionDay: isAdoptionDay === 'true' || isAdoptionDay === true,
        templateData: templateData || null,
        ageWeeks: parseInt(ageWeeks),
        ageMonths: ageMonths ? parseInt(ageMonths) : Math.floor(parseInt(ageWeeks) / 4),
        weight: parseFloat(weight),
        notes,
        recordDate: recordDate ? new Date(recordDate) : new Date()
      }
    })

    res.json({ success: true, data: { ...record, photos: JSON.parse(record.photos) }, message: '记录创建成功' })
  } catch (error) {
    console.error('创建记录失败:', error)
    res.status(500).json({ success: false, data: null, message: '创建记录失败' })
  }
}

/**
 * 更新宠物记录
 */
export async function updatePetRecord(req: Request, res: Response) {
  const userId = (req as any).user?.userId
  const { id } = req.params
  const recordId = Array.isArray(id) ? id[0] : id

  if (!userId) {
    return res.status(401).json({ success: false, data: null, message: '未授权', error: 'Unauthorized' })
  }

  try {
    const existing = await prisma.petRecord.findFirst({
      where: { id: recordId, userId }
    })

    if (!existing) {
      return res.status(404).json({ success: false, data: null, message: '记录不存在' })
    }

    const { petName, photoUrl, photos, ageWeeks, ageMonths, weight, notes, recordDate, type, isAdoptionDay, templateData } = req.body

    const photosArr: string[] | null = photos ? JSON.parse(photos) : (photoUrl ? [photoUrl] : null)

    const updated = await prisma.petRecord.update({
      where: { id: recordId },
      data: {
        petName: petName || existing.petName,
        photoUrl: photosArr ? photosArr[0] : existing.photoUrl,
        photos: photosArr ? JSON.stringify(photosArr) : existing.photos,
        type: type || existing.type,
        isAdoptionDay: isAdoptionDay !== undefined ? (isAdoptionDay === 'true' || isAdoptionDay === true) : existing.isAdoptionDay,
        templateData: templateData !== undefined ? templateData : existing.templateData,
        ageWeeks: ageWeeks !== undefined ? parseInt(ageWeeks) : existing.ageWeeks,
        ageMonths: ageMonths !== undefined ? parseInt(ageMonths) : existing.ageMonths,
        weight: weight !== undefined ? parseFloat(weight) : existing.weight,
        notes: notes !== undefined ? notes : existing.notes,
        recordDate: recordDate ? new Date(recordDate) : existing.recordDate
      }
    })

    res.json({ success: true, data: { ...updated, photos: JSON.parse(updated.photos) }, message: '记录更新成功' })
  } catch (error) {
    console.error('更新记录失败:', error)
    res.status(500).json({ success: false, data: null, message: '更新记录失败' })
  }
}

/**
 * 删除宠物记录
 */
export async function deletePetRecord(req: Request, res: Response) {
  const userId = (req as any).user?.userId
  const { id } = req.params
  const recordId = Array.isArray(id) ? id[0] : id

  if (!userId) {
    return res.status(401).json({ success: false, data: null, message: '未授权', error: 'Unauthorized' })
  }

  try {
    // 验证记录属于当前用户
    const existing = await prisma.petRecord.findFirst({
      where: { id: recordId, userId }
    })

    if (!existing) {
      return res.status(404).json({ success: false, data: null, message: '记录不存在' })
    }

    await prisma.petRecord.delete({
      where: { id: recordId }
    })

    res.json({ success: true, data: null, message: '记录已删除' })
  } catch (error) {
    console.error('删除记录失败:', error)
    res.status(500).json({ success: false, data: null, message: '删除记录失败' })
  }
}
