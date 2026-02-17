import { Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import prisma from '../config/database'
import { hashPassword, comparePassword } from '../utils/password'
import { generateToken, JwtPayload } from '../utils/jwt'
import { successResponse } from '../utils/response'

/**
 * 用户注册
 */
export async function register(req: Request, res: Response) {
  // 验证请求数据
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: '请求数据验证失败', errors: errors.array() })
  }

  const { email, username, password } = req.body

  try {
    // 检查邮箱是否已存在
    const existingUserByEmail = await prisma.user.findUnique({ where: { email } })
    if (existingUserByEmail) {
      return res.status(400).json({ success: false, message: '该邮箱已被注册', error: 'Email already exists' })
    }

    // 检查用户名是否已存在
    const existingUserByUsername = await prisma.user.findUnique({ where: { username } })
    if (existingUserByUsername) {
      return res.status(400).json({ success: false, message: '该用户名已被使用', error: 'Username already exists' })
    }

    // 加密密码
    const hashedPassword = await hashPassword(password)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword
      },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true
      }
    })

    // 生成 token
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      username: user.username
    }
    const token = generateToken(payload)

    res.status(201).json(successResponse({
      user,
      token
    }, '注册成功'))
  } catch (error) {
    console.error('注册失败:', error)
    res.status(500).json({ success: false, message: '注册失败', error: 'Internal server error' })
  }
}

/**
 * 用户登录
 */
export async function login(req: Request, res: Response) {
  // 验证请求数据
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: '请求数据验证失败', errors: errors.array() })
  }

  const { account, password } = req.body // account 可以是邮箱或用户名

  try {
    // 查找用户（通过邮箱或用户名）
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: account },
          { username: account }
        ]
      }
    })

    if (!user) {
      return res.status(401).json({ success: false, message: '账号或密码错误', error: 'Invalid credentials' })
    }

    // 验证密码
    const isPasswordValid = await comparePassword(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: '账号或密码错误', error: 'Invalid credentials' })
    }

    // 生成 token
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      username: user.username
    }
    const token = generateToken(payload)

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user

    res.json(successResponse({
      user: userWithoutPassword,
      token
    }, '登录成功'))
  } catch (error) {
    console.error('登录失败:', error)
    res.status(500).json({ success: false, message: '登录失败', error: 'Internal server error' })
  }
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(req: Request, res: Response) {
  // 用户信息已通过 authMiddleware 添加到 req.user
  const userPayload = (req as any).user
  if (!userPayload) {
    return res.status(401).json({ success: false, message: '未认证', error: 'Unauthorized' })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userPayload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在', error: 'User not found' })
    }

    res.json(successResponse(user))
  } catch (error) {
    console.error('获取用户信息失败:', error)
    res.status(500).json({ success: false, message: '获取用户信息失败', error: 'Internal server error' })
  }
}

/**
 * 登出（前端清除 token 即可，后端仅做确认）
 */
export function logout(_req: Request, res: Response) {
  res.json(successResponse(null, '登出成功'))
}

/**
 * 更新用户名
 */
export async function updateUsername(req: Request, res: Response) {
  // 验证请求数据
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: '请求数据验证失败', errors: errors.array() })
  }

  const userPayload = (req as any).user
  if (!userPayload) {
    return res.status(401).json({ success: false, message: '未认证', error: 'Unauthorized' })
  }

  const { username } = req.body

  try {
    // 检查用户名是否已被其他用户使用
    const existingUser = await prisma.user.findFirst({
      where: {
        username,
        NOT: { id: userPayload.userId }
      }
    })

    if (existingUser) {
      return res.status(400).json({ success: false, message: '该用户名已被使用', error: 'Username already exists' })
    }

    // 更新用户名
    const user = await prisma.user.update({
      where: { id: userPayload.userId },
      data: { username },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
        updatedAt: true
      }
    })

    res.json(successResponse(user, '用户名更新成功'))
  } catch (error) {
    console.error('更新用户名失败:', error)
    res.status(500).json({ success: false, message: '更新用户名失败', error: 'Internal server error' })
  }
}

// 验证规则
export const registerValidation = [
  body('email').isEmail().withMessage('请输入有效的邮箱地址'),
  body('username').isLength({ min: 3, max: 20 }).withMessage('用户名长度必须在3-20个字符之间（支持中文、字母、数字）'),
  body('password').isLength({ min: 6 }).withMessage('密码长度至少6个字符')
]

export const loginValidation = [
  body('account').notEmpty().withMessage('请输入邮箱或用户名'),
  body('password').notEmpty().withMessage('请输入密码')
]

export const updateUsernameValidation = [
  body('username').isLength({ min: 3, max: 20 }).withMessage('用户名长度必须在3-20个字符之间（支持中文、字母、数字）')
]
