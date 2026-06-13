// @ts-nocheck
import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AdminRequest } from '../../middlewares/adminAuth'

const prisma = new PrismaClient()

// 获取指南列表（管理员）
export async function getGuides(req: AdminRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const categoryId = req.query.categoryId as string | undefined
    const keyword = req.query.keyword as string | undefined

    const where: any = {}
    if (categoryId) {
      where.categoryId = categoryId
    }
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { content: { contains: keyword, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.guide.findMany({
        where,
        include: {
          category: true,
          _count: {
            select: { chunks: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.guide.count({ where }),
    ])

    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    })
  } catch (error: any) {
    console.error('Failed to fetch guides:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '获取指南列表失败',
    })
  }
}

// 获取指南详情（管理员）
export async function getGuideById(req: AdminRequest, res: Response) {
  try {
    const { id } = req.params

    const guide = await prisma.guide.findUnique({
      where: { id },
      include: {
        category: true,
        chunks: {
          orderBy: { chunkIndex: 'asc' },
        },
      },
    }) as any

    if (!guide) {
      return res.status(404).json({
        success: false,
        error: 'GUIDE_NOT_FOUND',
        message: '指南不存在',
      })
    }

    res.json({
      success: true,
      data: guide,
    })
  } catch (error: any) {
    console.error('Failed to fetch guide:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '获取指南详情失败',
    })
  }
}

// 创建指南
export async function createGuide(req: AdminRequest, res: Response) {
  try {
    const { title, slug, content, excerpt, coverImage, categoryId, tags }: {
      title?: string
      slug?: string
      content?: string
      excerpt?: string | null
      coverImage?: string | null
      categoryId?: string
      tags?: string | string[] | null
    } = req.body

    // 验证必填字段
    if (!title || !slug || !content || !categoryId) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '缺少必填字段',
        details: ['title', 'slug', 'content', 'categoryId'],
      })
    }

    // 检查 slug 是否已存在
    const existingGuide = await prisma.guide.findUnique({
      where: { slug },
    }) as any

    if (existingGuide) {
      return res.status(400).json({
        success: false,
        error: 'SLUG_EXISTS',
        message: '该 slug 已被使用',
      })
    }

    // 验证分类是否存在
    const category = await prisma.guideCategory.findUnique({
      where: { id: categoryId },
    })

    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'CATEGORY_NOT_FOUND',
        message: '分类不存在',
      })
    }

    // 创建指南
    const guide = await prisma.guide.create({
      data: {
        title,
        slug,
        content,
        excerpt: excerpt || null,
        coverImage: coverImage || null,
        categoryId,
        tags: Array.isArray(tags) ? JSON.stringify(tags) : (tags || null),
      },
      include: {
        category: true,
      },
    })

    // 记录操作日志
    if (req.admin) {
      await prisma.adminLog.create({
        data: {
          adminId: req.admin.adminId,
          action: 'create',
          module: 'guide',
          targetId: guide.id,
          detail: JSON.stringify({ title }),
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
      })
    }

    res.status(201).json({
      success: true,
      data: guide,
      message: '指南创建成功',
    })
  } catch (error: any) {
    console.error('Failed to create guide:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '创建指南失败',
    })
  }
}

// 更新指南
export async function updateGuide(req: AdminRequest, res: Response) {
  try {
    const { id } = req.params
    const { title, slug, content, excerpt, coverImage, categoryId, tags }: {
      title?: string
      slug?: string
      content?: string
      excerpt?: string | null
      coverImage?: string | null
      categoryId?: string
      tags?: string | string[] | null
    } = req.body

    // 验证指南是否存在
    const existingGuide = await prisma.guide.findUnique({
      where: { id },
    }) as any

    if (!existingGuide) {
      return res.status(404).json({
        success: false,
        error: 'GUIDE_NOT_FOUND',
        message: '指南不存在',
      })
    }

    // 如果修改了 slug，检查新 slug 是否已被使用
    if (slug && slug !== existingGuide.slug) {
      const slugExists = await prisma.guide.findUnique({
        where: { slug },
      }) as any
      if (slugExists) {
        return res.status(400).json({
          success: false,
          error: 'SLUG_EXISTS',
          message: '该 slug 已被使用',
        })
      }
    }

    // 如果修改了分类，验证分类是否存在
    if (categoryId && categoryId !== existingGuide.categoryId) {
      const category = await prisma.guideCategory.findUnique({
        where: { id: categoryId },
      })
      if (!category) {
        return res.status(400).json({
          success: false,
          error: 'CATEGORY_NOT_FOUND',
          message: '分类不存在',
        })
      }
    }

    // 更新指南
    const guide = await prisma.guide.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(slug && { slug }),
        ...(content && { content }),
        ...(excerpt !== undefined && { excerpt }),
        ...(coverImage !== undefined && { coverImage }),
        ...(categoryId && { categoryId }),
        ...(tags !== undefined && {
          tags: Array.isArray(tags) ? JSON.stringify(tags) : (tags || null)
        }),
      },
      include: {
        category: true,
      },
    })

    // 记录操作日志
    if (req.admin) {
      await prisma.adminLog.create({
        data: {
          adminId: req.admin.adminId,
          action: 'update',
          module: 'guide',
          targetId: guide.id,
          detail: JSON.stringify({ title: guide.title }),
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
      })
    }

    res.json({
      success: true,
      data: guide,
      message: '指南更新成功',
    })
  } catch (error: any) {
    console.error('Failed to update guide:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '更新指南失败',
    })
  }
}

// 删除指南
export async function deleteGuide(req: AdminRequest, res: Response) {
  try {
    const { id } = req.params

    // 验证指南是否存在
    const guide = await prisma.guide.findUnique({
      where: { id },
    }) as any

    if (!guide) {
      return res.status(404).json({
        success: false,
        error: 'GUIDE_NOT_FOUND',
        message: '指南不存在',
      })
    }

    // 删除指南（级联删除关联的 chunks）
    await prisma.guide.delete({
      where: { id },
    })

    // 记录操作日志
    if (req.admin) {
      await prisma.adminLog.create({
        data: {
          adminId: req.admin.adminId,
          action: 'delete',
          module: 'guide',
          targetId: id,
          detail: JSON.stringify({ title: guide.title }),
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
      })
    }

    res.json({
      success: true,
      message: '指南删除成功',
    })
  } catch (error: any) {
    console.error('Failed to delete guide:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '删除指南失败',
    })
  }
}

// 同步指南到知识库（单个）
export async function ingestGuide(req: AdminRequest, res: Response) {
  try {
    const { id } = req.params

    const guide = await prisma.guide.findUnique({
      where: { id },
      include: {
        category: true,
      },
    }) as any

    if (!guide) {
      return res.status(404).json({
        success: false,
        error: 'GUIDE_NOT_FOUND',
        message: '指南不存在',
      })
    }

    // TODO: 实现 RAG 入库逻辑
    // 这里需要调用知识服务，将指南内容切分并生成向量嵌入

    // 记录操作日志
    if (req.admin) {
      await prisma.adminLog.create({
        data: {
          adminId: req.admin.adminId,
          action: 'update',
          module: 'guide',
          targetId: guide.id,
          detail: JSON.stringify({ action: 'ingest', title: guide.title }),
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
      })
    }

    res.json({
      success: true,
      message: '指南同步到知识库成功',
      data: { guideId: id },
    })
  } catch (error: any) {
    console.error('Failed to ingest guide:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '同步指南到知识库失败',
    })
  }
}

// 批量同步所有指南到知识库
export async function ingestAllGuides(req: AdminRequest, res: Response) {
  try {
    const guides = await prisma.guide.findMany({
      select: { id: true, title: true },
    })

    // TODO: 实现批量 RAG 入库逻辑

    // 记录操作日志
    if (req.admin) {
      await prisma.adminLog.create({
        data: {
          adminId: req.admin.adminId,
          action: 'update',
          module: 'guide',
          detail: JSON.stringify({ action: 'ingestAll', count: guides.length }),
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
      })
    }

    res.json({
      success: true,
      message: `成功将 ${guides.length} 个指南同步到知识库`,
      data: { count: guides.length },
    })
  } catch (error: any) {
    console.error('Failed to ingest all guides:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '批量同步指南失败',
    })
  }
}

// 获取所有分类（用于下拉选择）
export async function getCategories(req: AdminRequest, res: Response) {
  try {
    const categories = await prisma.guideCategory.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { guides: true },
        },
      },
    })

    res.json({
      success: true,
      data: categories,
    })
  } catch (error: any) {
    console.error('Failed to fetch categories:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '获取分类列表失败',
    })
  }
}
