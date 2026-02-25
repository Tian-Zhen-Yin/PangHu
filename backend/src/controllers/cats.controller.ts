// @ts-nocheck
import { Request, Response } from 'express'
import {
  getCatsByUser,
  getCatById,
  createCat,
  updateCat,
  deleteCat,
  getCatWeightHistory
} from '../services/cat.service'
import { successResponse, errorResponse } from '../utils/response'

export async function getCats(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId
    const cats = await getCatsByUser(userId)
    res.json(successResponse(cats, '获取猫咪列表成功'))
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message || '获取猫咪列表失败'))
  }
}

export async function getCat(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId
    const id = req.params.id as string
    const cat = await getCatById(id, userId)
    if (!cat) return res.status(404).json(errorResponse('猫咪不存在'))
    res.json(successResponse(cat, '获取猫咪详情成功'))
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message || '获取猫咪详情失败'))
  }
}

export async function createCatHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId
    const { name, gender, birthDate } = req.body
    if (!name || !gender || !birthDate) {
      return res.status(400).json(errorResponse('名字、性别和出生日期为必填项'))
    }
    const cat = await createCat(userId, req.body)
    res.status(201).json(successResponse(cat, '创建猫咪档案成功'))
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message || '创建猫咪档案失败'))
  }
}

export async function updateCatHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId
    const id = req.params.id as string
    const cat = await updateCat(id, userId, req.body)
    if (!cat) return res.status(404).json(errorResponse('猫咪不存在'))
    res.json(successResponse(cat, '更新猫咪档案成功'))
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message || '更新猫咪档案失败'))
  }
}

export async function deleteCatHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId
    const id = req.params.id as string
    const cat = await deleteCat(id, userId)
    if (!cat) return res.status(404).json(errorResponse('猫咪不存在'))
    res.json(successResponse(null, '删除猫咪档案成功'))
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message || '删除猫咪档案失败'))
  }
}

export async function getWeightHistory(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId
    const id = req.params.id as string
    console.log('[getWeightHistory] Request - userId:', userId, 'catId:', id)
    const history = await getCatWeightHistory(id, userId)
    console.log('[getWeightHistory] Result - records count:', history?.length || 0)
    if (!history) return res.status(404).json(errorResponse('猫咪不存在'))
    res.json(successResponse(history, '获取体重历史成功'))
  } catch (error: any) {
    console.error('[getWeightHistory] Error:', error)
    res.status(500).json(errorResponse(error.message || '获取体重历史失败'))
  }
}


export async function exportWeightCSV(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId
    const id = req.params.id as string
    const records = await getCatWeightHistory(id, userId)
    if (!records) return res.status(404).json(errorResponse('猫咪不存在'))
    const csv = ['日期,体重(kg),备注', ...records.map(r => `${r.date},${r.weight},${r.notes || ''}`)]
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="weight-${id}.csv"`)
    res.send('\uFEFF' + csv.join('\n'))
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message || '导出失败'))
  }
}

export async function updateWeightGoal(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId
    const id = req.params.id as string
    const { targetWeight, targetDate } = req.body
    if (!targetWeight || !targetDate) return res.status(400).json(errorResponse('缺少必要参数'))
    const { setWeightGoal } = await import('../services/cat.service')
    const cat = await setWeightGoal(id, userId, parseFloat(targetWeight), targetDate)
    if (!cat) return res.status(404).json(errorResponse('猫咪不存在'))
    res.json(successResponse({ weightGoalTarget: cat.weightGoalTarget, weightGoalDate: cat.weightGoalDate }, '目标设置成功'))
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message || '设置失败'))
  }
}

export async function uploadCatAvatarHandler(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId
    const id = req.params.id as string
    const file = req.file as Express.Multer.File

    if (!file) {
      return res.status(400).json(errorResponse('请选择要上传的头像'))
    }

    const { updateCatAvatar } = await import('../services/cat.service')
    const avatarUrl = `/uploads/avatars/${file.filename}`
    const cat = await updateCatAvatar(id, userId, avatarUrl)

    if (!cat) {
      return res.status(404).json(errorResponse('猫咪不存在'))
    }

    res.json(successResponse({ avatar: avatarUrl }, '头像上传成功'))
  } catch (error: any) {
    res.status(500).json(errorResponse(error.message || '头像上传失败'))
  }
}
