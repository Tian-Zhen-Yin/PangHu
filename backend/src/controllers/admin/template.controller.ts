// @ts-nocheck
import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AdminRequest } from '../../middlewares/adminAuth'

const prisma = new PrismaClient()

// 获取模板列表（管理员）
export async function getTemplates(req: AdminRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const category = req.query.category as string | undefined
    const keyword = req.query.keyword as string | undefined

    const where: any = {}
    if (category) {
      where.category = category
    }
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.template.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.template.count({ where }),
    ])

    // Parse JSON content for display
    const parsedItems = items.map(item => ({
      ...item,
      content: JSON.parse(item.content),
    }))

    res.json({
      success: true,
      data: {
        items: parsedItems,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    })
  } catch (error: any) {
    console.error('Failed to fetch templates:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '获取模板列表失败',
    })
  }
}

// 获取模板详情（管理员）
export async function getTemplateById(req: AdminRequest, res: Response) {
  try {
    const { id } = req.params

    const template = await prisma.template.findUnique({
      where: { id },
    })

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'TEMPLATE_NOT_FOUND',
        message: '模板不存在',
      })
    }

    res.json({
      success: true,
      data: {
        ...template,
        content: JSON.parse(template.content),
      },
    })
  } catch (error: any) {
    console.error('Failed to fetch template:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '获取模板详情失败',
    })
  }
}

// 创建模板
export async function createTemplate(req: AdminRequest, res: Response) {
  try {
    const { name, description, category, stageId, content } = req.body

    // 验证必填字段
    if (!name || !description || !category || !content) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '缺少必填字段',
        details: ['name', 'description', 'category', 'content'],
      })
    }

    // 验证 content 是否为有效 JSON
    let parsedContent
    try {
      parsedContent = typeof content === 'string' ? JSON.parse(content) : content
      if (typeof parsedContent !== 'object' || parsedContent === null) {
        throw new Error('Content must be an object')
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_CONTENT',
        message: '内容必须是有效的 JSON 格式',
      })
    }

    // 验证 stageId 是否存在（如果提供）
    if (stageId) {
      const stage = await prisma.stage.findUnique({
        where: { id: stageId },
      })
      if (!stage) {
        return res.status(400).json({
          success: false,
          error: 'STAGE_NOT_FOUND',
          message: '成长阶段不存在',
        })
      }
    }

    // 创建模板
    const template = await prisma.template.create({
      data: {
        name,
        description,
        category,
        stageId: stageId || null,
        content: JSON.stringify(parsedContent),
      },
    })

    // 记录操作日志
    if (req.admin) {
      await prisma.adminLog.create({
        data: {
          adminId: req.admin.adminId,
          action: 'create',
          module: 'template',
          targetId: template.id,
          detail: JSON.stringify({ name }),
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
      })
    }

    res.status(201).json({
      success: true,
      data: {
        ...template,
        content: parsedContent,
      },
      message: '模板创建成功',
    })
  } catch (error: any) {
    console.error('Failed to create template:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '创建模板失败',
    })
  }
}

// 更新模板
export async function updateTemplate(req: AdminRequest, res: Response) {
  try {
    const { id } = req.params
    const { name, description, category, stageId, content } = req.body

    // 验证模板是否存在
    const existingTemplate = await prisma.template.findUnique({
      where: { id },
    })

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'TEMPLATE_NOT_FOUND',
        message: '模板不存在',
      })
    }

    // 验证 content 是否为有效 JSON（如果提供）
    let parsedContent
    if (content !== undefined) {
      try {
        parsedContent = typeof content === 'string' ? JSON.parse(content) : content
        if (typeof parsedContent !== 'object' || parsedContent === null) {
          throw new Error('Content must be an object')
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_CONTENT',
          message: '内容必须是有效的 JSON 格式',
        })
      }
    }

    // 验证 stageId 是否存在（如果提供）
    if (stageId && stageId !== existingTemplate.stageId) {
      const stage = await prisma.stage.findUnique({
        where: { id: stageId },
      })
      if (!stage) {
        return res.status(400).json({
          success: false,
          error: 'STAGE_NOT_FOUND',
          message: '成长阶段不存在',
        })
      }
    }

    // 更新模板
    const template = await prisma.template.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(category && { category }),
        ...(stageId !== undefined && { stageId: stageId || null }),
        ...(content !== undefined && { content: JSON.stringify(parsedContent) }),
      },
    })

    // 记录操作日志
    if (req.admin) {
      await prisma.adminLog.create({
        data: {
          adminId: req.admin.adminId,
          action: 'update',
          module: 'template',
          targetId: template.id,
          detail: JSON.stringify({ name: template.name }),
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
      })
    }

    res.json({
      success: true,
      data: {
        ...template,
        content: JSON.parse(template.content),
      },
      message: '模板更新成功',
    })
  } catch (error: any) {
    console.error('Failed to update template:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '更新模板失败',
    })
  }
}

// 删除模板
export async function deleteTemplate(req: AdminRequest, res: Response) {
  try {
    const { id } = req.params

    // 验证模板是否存在
    const template = await prisma.template.findUnique({
      where: { id },
    })

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'TEMPLATE_NOT_FOUND',
        message: '模板不存在',
      })
    }

    // 删除模板
    await prisma.template.delete({
      where: { id },
    })

    // 记录操作日志
    if (req.admin) {
      await prisma.adminLog.create({
        data: {
          adminId: req.admin.adminId,
          action: 'delete',
          module: 'template',
          targetId: id,
          detail: JSON.stringify({ name: template.name }),
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
      })
    }

    res.json({
      success: true,
      message: '模板删除成功',
    })
  } catch (error: any) {
    console.error('Failed to delete template:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '删除模板失败',
    })
  }
}

// 获取所有成长阶段（用于下拉选择）
export async function getStages(req: AdminRequest, res: Response) {
  try {
    const stages = await prisma.stage.findMany({
      orderBy: { order: 'asc' },
    })

    res.json({
      success: true,
      data: stages,
    })
  } catch (error: any) {
    console.error('Failed to fetch stages:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '获取成长阶段列表失败',
    })
  }
}

// 获取模板分类统计
export async function getTemplateCategories(req: AdminRequest, res: Response) {
  try {
    // 获取所有唯一的分类
    const templates = await prisma.template.findMany({
      select: { category: true },
    })

    // 统计每个分类的数量
    const categoryCounts = templates.reduce((acc, template) => {
      const category = template.category
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // 转换为数组格式
    const categories = Object.entries(categoryCounts).map(([name, count]) => ({
      name,
      count,
    }))

    res.json({
      success: true,
      data: categories,
    })
  } catch (error: any) {
    console.error('Failed to fetch template categories:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '获取模板分类失败',
    })
  }
}
