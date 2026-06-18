/**
 * PUT /api/cats/:id/play-profile 集成测试 — TDD RED
 *
 * 端点契约：
 *   - 鉴权必需（authMiddleware 已挂在 cats.routes 顶层）
 *   - body 至少含 personality / energyBaseline / healthTags 之一
 *   - personality 必须是受控词汇
 *   - energyBaseline 必须是 1-5 整数
 *   - healthTags 是 HealthTag 数组（受控词汇）
 *   - cat 不属于当前 user → 403
 *   - 成功 → 200，data 是归一化后的 CatProfile
 *
 * 设计：直接复用 catProfileService.update（已单测覆盖），controller 仅做
 *       zod 校验 + 错误兜底；不重新实现 ownership（service 已做）。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express, { type Express } from 'express'

// ===== Mock 鉴权（默认放行 user-1） =====
let currentUserId: string | null = 'user-1'
vi.mock('../../middlewares/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    if (currentUserId === null) {
      return _res.status(401).json({ success: false, message: '未登录' })
    }
    req.user = { userId: currentUserId, email: 'a@b.c', username: 'tester' }
    next()
  },
}))

// ===== Mock catProfileService.update（隔离 controller 逻辑） =====
const updateMock = vi.fn()
vi.mock('../../services/catProfile.service', () => ({
  catProfileService: {
    update: (catId: any, userId: any, input: any) => updateMock(catId, userId, input),
  },
}))

import catsRoutes from '../../routes/cats.routes'

function createApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/api/cats', catsRoutes)
  return app
}

const app = createApp()

beforeEach(() => {
  vi.clearAllMocks()
  currentUserId = 'user-1'
})

describe('PUT /api/cats/:id/play-profile', () => {
  it('rejects unauthenticated request with 401', async () => {
    currentUserId = null

    const res = await request(app)
      .put('/api/cats/cat-1/play-profile')
      .send({ personality: 'active' })

    expect(res.status).toBe(401)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('rejects empty body with 400', async () => {
    const res = await request(app)
      .put('/api/cats/cat-1/play-profile')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('rejects unknown personality label with 400', async () => {
    const res = await request(app)
      .put('/api/cats/cat-1/play-profile')
      .send({ personality: 'unknown_value' })

    expect(res.status).toBe(400)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('rejects energyBaseline out of range with 400', async () => {
    const res = await request(app)
      .put('/api/cats/cat-1/play-profile')
      .send({ energyBaseline: 9 })

    expect(res.status).toBe(400)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('rejects unknown healthTag with 400', async () => {
    const res = await request(app)
      .put('/api/cats/cat-1/play-profile')
      .send({ healthTags: ['kitten', 'random_tag'] })

    expect(res.status).toBe(400)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('returns 403 when cat does not belong to user', async () => {
    updateMock.mockResolvedValue(null)

    const res = await request(app)
      .put('/api/cats/cat-1/play-profile')
      .send({ personality: 'active' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('FORBIDDEN')
  })

  it('accepts partial update with only personality and returns normalized profile', async () => {
    updateMock.mockResolvedValue({
      id: 'cat-1', userId: 'user-1', name: 'Mochi',
      personality: 'active', energyBaseline: null, healthTags: [],
    })

    const res = await request(app)
      .put('/api/cats/cat-1/play-profile')
      .send({ personality: 'active' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toMatchObject({
      id: 'cat-1', personality: 'active',
    })
    expect(updateMock).toHaveBeenCalledWith('cat-1', 'user-1', { personality: 'active' })
  })

  it('forwards all three fields when provided', async () => {
    updateMock.mockResolvedValue({
      id: 'cat-1', userId: 'user-1', name: 'Mochi',
      personality: 'curious', energyBaseline: 4, healthTags: ['senior'],
    })

    await request(app)
      .put('/api/cats/cat-1/play-profile')
      .send({ personality: 'curious', energyBaseline: 4, healthTags: ['senior'] })

    expect(updateMock).toHaveBeenCalledWith('cat-1', 'user-1', {
      personality: 'curious', energyBaseline: 4, healthTags: ['senior'],
    })
  })

  it('accepts null values to clear fields', async () => {
    updateMock.mockResolvedValue({
      id: 'cat-1', userId: 'user-1', name: 'Mochi',
      personality: null, energyBaseline: null, healthTags: [],
    })

    await request(app)
      .put('/api/cats/cat-1/play-profile')
      .send({ personality: null, energyBaseline: null, healthTags: null })

    expect(updateMock).toHaveBeenCalledWith('cat-1', 'user-1', {
      personality: null, energyBaseline: null, healthTags: null,
    })
  })
})
