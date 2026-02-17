import { Request, Response } from 'express'
import prisma from '../config/database'
import { successResponse } from '../utils/response'

/**
 * 获取所有模板
 */
export async function getTemplates(_req: Request, res: Response) {
  const templates = await prisma.template.findMany({
    orderBy: { createdAt: 'desc' }
  })

  res.json(successResponse(templates))
}

/**
 * 获取单个模板详情
 */
export async function getTemplateById(req: Request, res: Response) {
  const { id } = req.params
  const templateId = Array.isArray(id) ? id[0] : id

  const template = await prisma.template.findUnique({
    where: { id: templateId }
  })

  if (!template) {
    return res.status(404).json(successResponse(null, '模板不存在'))
  }

  res.json(successResponse(template))
}

/**
 * 复制模板（用于创建个人计划）
 */
export async function cloneTemplate(req: Request, res: Response) {
  const { id } = req.params
  const templateId = Array.isArray(id) ? id[0] : id

  const template = await prisma.template.findUnique({
    where: { id: templateId }
  })

  if (!template) {
    return res.status(404).json(successResponse(null, '模板不存在'))
  }

  // 返回模板内容供前端使用
  res.json(successResponse({
    name: template.name,
    content: template.content
  }))
}
