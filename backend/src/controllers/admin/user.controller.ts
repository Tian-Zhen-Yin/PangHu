// @ts-nocheck
import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { AdminRequest } from '../../middlewares/adminAuth'

const prisma = new PrismaClient()

// 获取用户列表（管理员）
export async function getUsers(req: AdminRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const keyword = req.query.keyword as string | undefined
    const memberType = req.query.memberType as string | undefined
    const status = req.query.status as string | undefined

    const where: any = {}

    if (keyword) {
      where.OR = [
        { username: { contains: keyword, mode: 'insensitive' } },
        { email: { contains: keyword, mode: 'insensitive' } },
      ]
    }

    if (memberType) {
      where.memberType = memberType
    }

    // 活跃状态筛选（基于是否有最近的登录或活动）
    if (status === 'active') {
      where.OR = [
        { plans: { some: { isActive: true } } },
        // 可以添加其他活跃条件
      ]
    } else if (status === 'inactive') {
      where.NOT = {
        plans: { some: { isActive: true } },
      }
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          memberType: true,
          memberExpiredAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              cats: true,
              plans: true,
              conversations: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
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
    console.error('Failed to fetch users:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '获取用户列表失败',
    })
  }
}

// 获取用户详情（管理员）
export async function getUserById(req: AdminRequest, res: Response) {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        cats: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            breed: true,
            gender: true,
            birthDate: true,
            weight: true,
            isNeutered: true,
            createdAt: true,
          },
        },
        plans: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            cats: true,
            plans: true,
            conversations: true,
            notifications: true,
          },
        },
      },
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在',
      })
    }

    // 移除敏感信息
    const { password, ...userWithoutPassword } = user as any

    res.json({
      success: true,
      data: userWithoutPassword,
    })
  } catch (error: any) {
    console.error('Failed to fetch user:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '获取用户详情失败',
    })
  }
}

// 更新用户信息
export async function updateUser(req: AdminRequest, res: Response) {
  try {
    const { id } = req.params
    const { username, email, memberType, memberExpiredAt } = req.body

    // 验证用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true },
    })

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在',
      })
    }

    // 检查用户名是否已被其他用户使用
    if (username && username !== existingUser.username) {
      const usernameExists = await prisma.user.findUnique({
        where: { username },
      })
      if (usernameExists) {
        return res.status(400).json({
          success: false,
          error: 'USERNAME_EXISTS',
          message: '该用户名已被使用',
        })
      }
    }

    // 检查邮箱是否已被其他用户使用
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      })
      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'EMAIL_EXISTS',
          message: '该邮箱已被使用',
        })
      }
    }

    // 更新用户
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(username && { username }),
        ...(email && { email }),
        ...(memberType && { memberType }),
        ...(memberExpiredAt !== undefined && {
          memberExpiredAt: memberExpiredAt ? new Date(memberExpiredAt) : null,
        }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        memberType: true,
        memberExpiredAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // 记录操作日志
    if (req.admin) {
      await prisma.adminLog.create({
        data: {
          adminId: req.admin.adminId,
          action: 'update',
          module: 'user',
          targetId: user.id,
          detail: JSON.stringify({ username: user.username }),
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
      })
    }

    res.json({
      success: true,
      data: user,
      message: '用户信息更新成功',
    })
  } catch (error: any) {
    console.error('Failed to update user:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '更新用户信息失败',
    })
  }
}

// 删除用户
export async function deleteUser(req: AdminRequest, res: Response) {
  try {
    const { id } = req.params

    // 验证用户是否存在
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true },
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在',
      })
    }

    // 删除用户（级联删除相关数据）
    await prisma.user.delete({
      where: { id },
    })

    // 记录操作日志
    if (req.admin) {
      await prisma.adminLog.create({
        data: {
          adminId: req.admin.adminId,
          action: 'delete',
          module: 'user',
          targetId: id,
          detail: JSON.stringify({ username: user.username }),
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
      })
    }

    res.json({
      success: true,
      message: '用户删除成功',
    })
  } catch (error: any) {
    console.error('Failed to delete user:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '删除用户失败',
    })
  }
}

// 重置用户密码
export async function resetUserPassword(req: AdminRequest, res: Response) {
  try {
    const { id } = req.params
    const { newPassword = 'TempPassword123!' } = req.body

    // 验证用户是否存在
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true },
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在',
      })
    }

    // 生成新密码的哈希
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // 更新密码
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    })

    // 记录操作日志
    if (req.admin) {
      await prisma.adminLog.create({
        data: {
          adminId: req.admin.adminId,
          action: 'update',
          module: 'user',
          targetId: user.id,
          detail: JSON.stringify({ action: 'resetPassword', username: user.username }),
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
      })
    }

    res.json({
      success: true,
      message: '密码重置成功',
      data: { tempPassword: newPassword },
    })
  } catch (error: any) {
    console.error('Failed to reset password:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '重置密码失败',
    })
  }
}

// 切换用户会员状态
export async function toggleUserStatus(req: AdminRequest, res: Response) {
  try {
    const { id } = req.params
    const { memberType } = req.body

    // 验证用户是否存在
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, memberType: true },
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: '用户不存在',
      })
    }

    // 更新会员类型
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        memberType: memberType || 'free',
        memberExpiredAt: memberType === 'premium' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        memberType: true,
        memberExpiredAt: true,
        updatedAt: true,
      },
    })

    // 记录操作日志
    if (req.admin) {
      await prisma.adminLog.create({
        data: {
          adminId: req.admin.adminId,
          action: 'update',
          module: 'user',
          targetId: updatedUser.id,
          detail: JSON.stringify({
            action: 'toggleStatus',
            username: updatedUser.username,
            memberType: updatedUser.memberType,
          }),
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
      })
    }

    res.json({
      success: true,
      data: updatedUser,
      message: '用户状态更新成功',
    })
  } catch (error: any) {
    console.error('Failed to toggle user status:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '更新用户状态失败',
    })
  }
}

// 导出用户列表
export async function exportUsers(req: AdminRequest, res: Response) {
  try {
    const { format = 'json' } = req.query

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        memberType: true,
        memberExpiredAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            cats: true,
            plans: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (format === 'json') {
      res.json({
        success: true,
        data: users,
        message: `导出 ${users.length} 个用户`,
      })
    } else if (format === 'csv') {
      // 简单的 CSV 格式化
      const csvHeaders = ['ID', '用户名', '邮箱', '会员类型', '会员到期时间', '猫咪数量', '计划数量', '创建时间']
      const csvRows = users.map(user => [
        user.id,
        user.username,
        user.email,
        user.memberType,
        user.memberExpiredAt?.toISOString().split('T')[0] || '',
        user._count.cats,
        user._count.plans,
        user.createdAt.toISOString().split('T')[0],
      ])

      const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n')

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename=users_${Date.now()}.csv`)
      res.send(csvContent)
    } else {
      res.status(400).json({
        success: false,
        error: 'INVALID_FORMAT',
        message: '不支持的导出格式',
      })
    }
  } catch (error: any) {
    console.error('Failed to export users:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '导出用户列表失败',
    })
  }
}

// 获取用户统计信息
export async function getUserStats(req: AdminRequest, res: Response) {
  try {
    const [
      totalUsers,
      freeUsers,
      premiumUsers,
      newUsersThisMonth,
      activeUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { memberType: 'free' } }),
      prisma.user.count({ where: { memberType: 'premium' } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.user.count({
        where: {
          OR: [
            { plans: { some: { isActive: true } } },
          ],
        },
      }),
    ])

    res.json({
      success: true,
      data: {
        totalUsers,
        freeUsers,
        premiumUsers,
        newUsersThisMonth,
        activeUsers,
        premiumRate: totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : '0',
      },
    })
  } catch (error: any) {
    console.error('Failed to get user stats:', error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '获取用户统计失败',
    })
  }
}
