import { Request, Response } from 'express'
import prisma from '../config/database'
import { successResponse } from '../utils/response'

/**
 * 获取所有指南（支持分页和筛选）
 */
export async function getGuides(req: Request, res: Response) {
  const { category, page = '1', pageSize = '10' } = req.query

  const skip = (Number(page) - 1) * Number(pageSize)
  const take = Number(pageSize)

  const where = category ? { categoryId: String(category) } : {}

  const [guides, total] = await Promise.all([
    prisma.guide.findMany({
      where,
      include: {
        category: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    }),
    prisma.guide.count({ where })
  ])

  res.json(successResponse({
    items: guides,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
    totalPages: Math.ceil(total / Number(pageSize))
  }))
}

/**
 * 获取单个指南详情
 */
export async function getGuideById(req: Request, res: Response) {
  const { id } = req.params
  const guideId = Array.isArray(id) ? id[0] : id

  const guide = await prisma.guide.findUnique({
    where: { id: guideId },
    include: {
      category: true
    }
  })

  if (!guide) {
    return res.status(404).json(successResponse(null, '指南不存在'))
  }

  // 增加浏览次数
  await prisma.guide.update({
    where: { id: guideId },
    data: { viewCount: { increment: 1 } }
  })

  res.json(successResponse({ ...guide, viewCount: guide.viewCount + 1 }))
}

/**
 * 获取所有指南分类
 */
export async function getCategories(_req: Request, res: Response) {
  const categories = await prisma.guideCategory.findMany({
    include: {
      _count: {
        select: { guides: true }
      }
    },
    orderBy: { order: 'asc' }
  })

  res.json(successResponse(categories))
}

/**
 * 搜索指南
 */
export async function searchGuides(req: Request, res: Response) {
  const { q } = req.query

  if (!q || typeof q !== 'string') {
    return res.json(successResponse([]))
  }

  const guides = await prisma.guide.findMany({
    where: {
      OR: [
        { title: { contains: q } },
        { content: { contains: q } }
      ]
    },
    include: {
      category: true
    }
  })

  res.json(successResponse(guides))
}
