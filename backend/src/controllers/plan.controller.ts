import { Request, Response } from 'express'
import prisma from '../config/database'
import { successResponse } from '../utils/response'

/**
 * 获取用户的所有计划
 */
export async function getUserPlans(req: Request, res: Response) {
  const userId = (req as any).user?.userId

  if (!userId) {
    return res.status(401).json({ success: false, data: null, message: '未授权', error: 'Unauthorized' })
  }

  try {
    const plans = await prisma.userPlan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    res.json(successResponse(plans))
  } catch (error) {
    res.status(500).json({ success: false, data: null, message: '获取计划失败' })
  }
}

/**
 * 创建用户计划（保存模板）
 */
export async function createUserPlan(req: Request, res: Response) {
  const userId = (req as any).user?.userId

  if (!userId) {
    return res.status(401).json({ success: false, data: null, message: '未授权', error: 'Unauthorized' })
  }

  const { templateId, name } = req.body

  if (!templateId || !name) {
    return res.status(400).json({ success: false, data: null, message: '缺少必要参数' })
  }

  try {
    // 获取模板信息
    const template = await prisma.template.findUnique({
      where: { id: templateId }
    })

    if (!template) {
      return res.status(404).json({ success: false, data: null, message: '模板不存在' })
    }

    // 创建用户计划
    const plan = await prisma.userPlan.create({
      data: {
        userId,
        templateId,
        name: name || template.name
      }
    })

    res.json({ success: true, data: plan, message: '计划创建成功' })
  } catch (error) {
    res.status(500).json({ success: false, data: null, message: '创建计划失败' })
  }
}

/**
 * 获取单个计划详情
 */
export async function getUserPlanById(req: Request, res: Response) {
  const userId = (req as any).user?.userId
  const { id } = req.params
  const planId = Array.isArray(id) ? id[0] : id

  if (!userId) {
    return res.status(401).json({ success: false, data: null, message: '未授权', error: 'Unauthorized' })
  }

  try {
    const plan = await prisma.userPlan.findFirst({
      where: { id: planId, userId }
    })

    if (!plan) {
      return res.status(404).json({ success: false, data: null, message: '计划不存在' })
    }

    // 获取关联的模板信息
    const template = await prisma.template.findUnique({
      where: { id: plan.templateId }
    })

    res.json({ success: true, data: { ...plan, template }, message: '操作成功' })
  } catch (error) {
    res.status(500).json({ success: false, data: null, message: '获取计划详情失败' })
  }
}

/**
 * 更新计划进度
 */
export async function updatePlanProgress(req: Request, res: Response) {
  const userId = (req as any).user?.userId
  const { id } = req.params
  const planId = Array.isArray(id) ? id[0] : id
  const { progress } = req.body

  if (!userId) {
    return res.status(401).json({ success: false, data: null, message: '未授权', error: 'Unauthorized' })
  }

  try {
    const plan = await prisma.userPlan.findFirst({
      where: { id: planId, userId }
    })

    if (!plan) {
      return res.status(404).json({ success: false, data: null, message: '计划不存在' })
    }

    const updatedPlan = await prisma.userPlan.update({
      where: { id: planId },
      data: {
        progress: JSON.stringify(progress || {})
      }
    })

    res.json({ success: true, data: updatedPlan, message: '进度已更新' })
  } catch (error) {
    res.status(500).json({ success: false, data: null, message: '更新进度失败' })
  }
}

/**
 * 删除用户计划
 */
export async function deleteUserPlan(req: Request, res: Response) {
  const userId = (req as any).user?.userId
  const { id } = req.params
  const planId = Array.isArray(id) ? id[0] : id

  if (!userId) {
    return res.status(401).json({ success: false, data: null, message: '未授权', error: 'Unauthorized' })
  }

  try {
    // 验证计划属于当前用户
    const plan = await prisma.userPlan.findFirst({
      where: { id: planId, userId }
    })

    if (!plan) {
      return res.status(404).json({ success: false, data: null, message: '计划不存在' })
    }

    await prisma.userPlan.delete({
      where: { id: planId }
    })

    res.json({ success: true, data: null, message: '计划已删除' })
  } catch (error) {
    res.status(500).json({ success: false, data: null, message: '删除计划失败' })
  }
}

/**
 * 设置激活计划
 */
export async function setActivePlan(req: Request, res: Response) {
  const userId = (req as any).user?.userId
  const { id } = req.params
  const planId = Array.isArray(id) ? id[0] : id

  if (!userId) {
    return res.status(401).json({ success: false, data: null, message: '未授权', error: 'Unauthorized' })
  }

  try {
    // 验证计划属于当前用户
    const plan = await prisma.userPlan.findFirst({
      where: { id: planId, userId }
    })

    if (!plan) {
      return res.status(404).json({ success: false, data: null, message: '计划不存在' })
    }

    // 取消所有计划的激活状态
    await prisma.userPlan.updateMany({
      where: { userId },
      data: { isActive: false }
    })

    // 激活当前计划
    await prisma.userPlan.update({
      where: { id: planId },
      data: { isActive: true }
    })

    res.json({ success: true, data: null, message: '计划已激活' })
  } catch (error) {
    res.status(500).json({ success: false, data: null, message: '设置激活计划失败' })
  }
}
