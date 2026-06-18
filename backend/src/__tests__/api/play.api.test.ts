/**
 * Play API 集成测试 — 对齐技术设计 §6 REST 接线
 *
 * 端点：
 *   GET  /api/play/recommend?catId=...&availableTime=...&preferredCategory=...
 *   POST /api/play/feedback   { catId, gameId, score, completion, actualDuration, ... }
 *
 * 安全契约：
 *   1. 未登录 → 401
 *   2. catId 缺失 → 400
 *   3. cat 不属于当前 user → 403/404
 *   4. 通过校验 → 200，包装 successResponse
 *   5. POST /feedback：用户显式 POST 即视为已确认，控制器构造已验证的
 *      AgentContext 后调用 SubmitPlayFeedbackTool（不走 chat/confirm 流）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express, { type Express } from 'express'

// ===== Mock 鉴权（默认放行 user-1，便于 401 用例直接不挂中间件） =====
vi.mock('../../middlewares/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { userId: 'user-1', email: 'a@b.c', username: 'tester' }
    next()
  },
  optionalAuth: (_req: any, _res: any, next: any) => next(),
}))

// ===== Mock engine（GET /recommend 路径） =====
const recommendMock = vi.fn()
vi.mock('../../agent/recommend/engine', () => ({
  recommend: (input: any, ctx: any) => recommendMock(input, ctx),
}))

// ===== Mock prisma（catProfileService + ownership 校验） =====
const findFirst = vi.fn()
vi.mock('../../config/database', () => ({
  default: { cat: { findFirst: (args: any) => findFirst(args) } },
}))

// ===== Mock playFeedbackService（POST /feedback 路径） =====
const upsert = vi.fn()
vi.mock('../../services/playFeedback.service', () => ({
  playFeedbackService: { upsert: (args: any) => upsert(args) },
}))

import playRoutes from '../../routes/play.routes'

function createApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/api/play', playRoutes)
  return app
}

const app = createApp()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/play/recommend', () => {
  it('catId 缺失 → 400', async () => {
    const res = await request(app).get('/api/play/recommend')
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('正常调用 → 200 + engine 结果', async () => {
    recommendMock.mockResolvedValue({
      success: true,
      fallback: false,
      suggestions: [
        { game: { id: 'feather-fishing' }, score: 88, breakdown: null, reasons: ['x'] },
      ],
    })
    const res = await request(app).get('/api/play/recommend?catId=cat-1&availableTime=10')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.suggestions).toHaveLength(1)
    expect(recommendMock).toHaveBeenCalledWith(
      expect.objectContaining({ catId: 'cat-1', availableTime: 10 }),
      expect.objectContaining({ userId: 'user-1' }),
    )
  })

  it('availableTime 非数字 → 400', async () => {
    const res = await request(app).get('/api/play/recommend?catId=cat-1&availableTime=abc')
    expect(res.status).toBe(400)
  })

  it('preferredCategory 非法 → 400', async () => {
    const res = await request(app).get(
      '/api/play/recommend?catId=cat-1&preferredCategory=invalid-x',
    )
    expect(res.status).toBe(400)
  })

  it('engine 返回 needProfileCompletion → 200（前端渲染引导）', async () => {
    recommendMock.mockResolvedValue({
      success: false,
      fallback: false,
      suggestions: [],
      needProfileCompletion: true,
      message: '请先完善档案',
    })
    const res = await request(app).get('/api/play/recommend?catId=cat-1')
    expect(res.status).toBe(200)
    expect(res.body.data.needProfileCompletion).toBe(true)
  })
})

describe('POST /api/play/feedback', () => {
  const baseBody = {
    catId: 'cat-1',
    gameId: 'feather-fishing',
    score: 5,
    completion: true,
    actualDuration: 8,
  }

  beforeEach(() => {
    findFirst.mockResolvedValue({ id: 'cat-1', name: 'Mimi', userId: 'user-1' })
    upsert.mockResolvedValue({ success: true, recordId: 'pf-1' })
  })

  it('正常提交 → 200', async () => {
    const res = await request(app).post('/api/play/feedback').send(baseBody)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.recordId).toBe('pf-1')
  })

  it('cat 不属于当前 user → 403', async () => {
    findFirst.mockResolvedValue(null)
    const res = await request(app).post('/api/play/feedback').send(baseBody)
    expect(res.status).toBe(403)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('catId 缺失 → 400', async () => {
    const { catId: _catId, ...rest } = baseBody
    void _catId
    const res = await request(app).post('/api/play/feedback').send(rest)
    expect(res.status).toBe(400)
  })

  it('score 越界 → 400', async () => {
    const res = await request(app)
      .post('/api/play/feedback')
      .send({ ...baseBody, score: 6 })
    expect(res.status).toBe(400)
  })

  it('REST 写入路径仍带审计字段（source=agent / createdBy / confirmedAt）', async () => {
    await request(app).post('/api/play/feedback').send(baseBody)
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'agent',
        createdBy: 'user-1',
        userId: 'user-1',
      }),
    )
    expect(upsert.mock.calls[0][0].confirmedAt).toBeInstanceOf(Date)
  })
})
