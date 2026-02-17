import { Request, Response } from 'express'
import prisma from '../config/database'
import { successResponse } from '../utils/response'

/**
 * 获取用户的所有宠物记录
 */
export async function getPetRecords(req: Request, res: Response) {
  const userId = (req as any).user?.userId

  if (!userId) {
    return res.status(401).json({ success: false, data: null, message: '未授权', error: 'Unauthorized' })
  }

  try {
    const records = await prisma.petRecord.findMany({
      where: { userId },
      orderBy: { recordDate: 'desc' }
    })

    res.json(successResponse(records))
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
    const { petName, photoUrl, ageWeeks, ageMonths, weight, notes, recordDate } = req.body

    // 验证必填字段
    if (!photoUrl || !ageWeeks || weight === undefined) {
      return res.status(400).json({ success: false, data: null, message: '缺少必要参数' })
    }

    const record = await prisma.petRecord.create({
      data: {
        userId,
        petName: petName || '猫咪',
        photoUrl,
        ageWeeks,
        ageMonths: ageMonths || Math.floor(ageWeeks / 4),
        weight: parseFloat(weight),
        notes,
        recordDate: recordDate ? new Date(recordDate) : new Date()
      }
    })

    res.json({ success: true, data: record, message: '记录创建成功' })
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
    // 验证记录属于当前用户
    const existing = await prisma.petRecord.findFirst({
      where: { id: recordId, userId }
    })

    if (!existing) {
      return res.status(404).json({ success: false, data: null, message: '记录不存在' })
    }

    const { petName, photoUrl, ageWeeks, ageMonths, weight, notes, recordDate } = req.body

    const updated = await prisma.petRecord.update({
      where: { id: recordId },
      data: {
        petName: petName || existing.petName,
        photoUrl: photoUrl || existing.photoUrl,
        ageWeeks: ageWeeks !== undefined ? ageWeeks : existing.ageWeeks,
        ageMonths: ageMonths !== undefined ? ageMonths : existing.ageMonths,
        weight: weight !== undefined ? parseFloat(weight) : existing.weight,
        notes: notes !== undefined ? notes : existing.notes,
        recordDate: recordDate ? new Date(recordDate) : existing.recordDate
      }
    })

    res.json({ success: true, data: updated, message: '记录更新成功' })
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
