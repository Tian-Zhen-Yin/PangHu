import { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { loginAdmin, getAdminById, updateAdmin, changePassword as changePasswordService } from '../../services/admin/auth.service'
import { createLog } from '../../services/admin/log.service'
import { successResponse } from '../../utils/response'
import { extractRequestMetadata } from '../../utils/adminLogger'
import { ROLE_PERMISSIONS } from '../../types/admin'
import type { LoginRequest, UpdateAdminRequest, ChangePasswordRequest } from '../../types/admin'

/**
 * Admin login
 */
export async function login(req: Request, res: Response) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '请求数据验证失败',
      errors: errors.array()
    })
  }

  try {
    const body = req.body as LoginRequest
    const { ip, userAgent } = extractRequestMetadata(req)

    const result = await loginAdmin(body, ip, userAgent)

    res.json(successResponse(result, '登录成功'))
  } catch (error: any) {
    if (error.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误',
        error: 'INVALID_CREDENTIALS'
      })
    }
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: '登录失败',
      error: 'INTERNAL_ERROR'
    })
  }
}

/**
 * Admin logout
 */
export async function logout(req: Request, res: Response) {
  try {
    const adminId = (req as any).admin?.adminId
    const { ip, userAgent } = extractRequestMetadata(req)

    // Create logout log
    if (adminId) {
      await createLog(adminId, {
        action: 'logout',
        module: 'auth',
        ip,
        userAgent
      })
    }

    res.json(successResponse(null, '登出成功'))
  } catch (error) {
    console.error('Logout error:', error)
    res.json(successResponse(null, '登出成功'))
  }
}

/**
 * Get current admin info
 */
export async function getMe(req: Request, res: Response) {
  try {
    const adminId = (req as any).admin?.adminId
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: '未登录',
        error: 'UNAUTHORIZED'
      })
    }

    const admin = await getAdminById(adminId)
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: '管理员不存在',
        error: 'NOT_FOUND'
      })
    }

    // Get permissions from role
    const permissions = ROLE_PERMISSIONS[admin.role] || []

    res.json(successResponse({
      admin,
      permissions
    }))
  } catch (error) {
    console.error('Get me error:', error)
    res.status(500).json({
      success: false,
      message: '获取管理员信息失败',
      error: 'INTERNAL_ERROR'
    })
  }
}

/**
 * Update admin profile
 */
export async function updateProfile(req: Request, res: Response) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '请求数据验证失败',
      errors: errors.array()
    })
  }

  try {
    const adminId = (req as any).admin?.adminId
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: '未登录',
        error: 'UNAUTHORIZED'
      })
    }

    const body = req.body as UpdateAdminRequest
    const admin = await updateAdmin(adminId, body)

    // Create update log
    const { ip, userAgent } = extractRequestMetadata(req)
    await createLog(adminId, {
      action: 'update',
      module: 'auth',
      targetId: adminId,
      detail: { fields: Object.keys(body) },
      ip,
      userAgent
    })

    res.json(successResponse(admin, '更新成功'))
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({
      success: false,
      message: '更新失败',
      error: 'INTERNAL_ERROR'
    })
  }
}

/**
 * Change password
 */
export async function changePassword(req: Request, res: Response) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '请求数据验证失败',
      errors: errors.array()
    })
  }

  try {
    const adminId = (req as any).admin?.adminId
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: '未登录',
        error: 'UNAUTHORIZED'
      })
    }

    const body = req.body as ChangePasswordRequest
    // Service handles password hashing internally
    await changePasswordService(adminId, body.oldPassword, body.newPassword)

    // Create password change log
    const { ip, userAgent } = extractRequestMetadata(req)
    await createLog(adminId, {
      action: 'update',
      module: 'auth',
      targetId: adminId,
      detail: { action: 'password_changed' },
      ip,
      userAgent
    })

    res.json(successResponse(null, '密码修改成功'))
  } catch (error: any) {
    if (error.message === 'ADMIN_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: '管理员不存在',
        error: 'NOT_FOUND'
      })
    }
    if (error.message === 'INVALID_PASSWORD') {
      return res.status(400).json({
        success: false,
        message: '原密码错误',
        error: 'INVALID_PASSWORD'
      })
    }
    console.error('Change password error:', error)
    res.status(500).json({
      success: false,
      message: '密码修改失败',
      error: 'INTERNAL_ERROR'
    })
  }
}

// Validation rules (using express-validator)
export const loginValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('用户名长度必须在3-30个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  body('password')
    .notEmpty()
    .withMessage('请输入密码')
    .isLength({ min: 8 })
    .withMessage('密码至少8个字符')
]

export const updateProfileValidation = [
  body('email').optional().isEmail().withMessage('请输入有效的邮箱地址'),
  body('name').optional().isLength({ max: 50 }).withMessage('姓名不能超过50个字符')
]

export const changePasswordValidation = [
  body('oldPassword').notEmpty().withMessage('请输入原密码'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('新密码至少8个字符')
]
