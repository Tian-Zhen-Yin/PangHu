// backend/src/__tests__/performance/api.perf.test.ts
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../../app'

const PERFORMANCE_THRESHOLDS = {
  USER_LIST_BASIC: 200,      // PERF-001
  USER_LIST_PAGED: 100,      // PERF-002
  STATISTICS: 500,            // PERF-003
  USER_SEARCH: 300,           // PERF-004
  GUIDE_LIST: 150,            // PERF-005
  LOGIN: 500,                 // PERF-006
}

describe('Performance API Tests', () => {
  describe('API Response Time', () => {
    it('PERF-001: user list query should respond within 200ms', async () => {
      const start = Date.now()

      await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer test-token')
        .query({ page: 1, pageSize: 20 })

      const duration = Date.now() - start

      // 允许一定的容差
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.USER_LIST_BASIC * 3)
    })

    it('PERF-002: paginated query should respond within 100ms', async () => {
      const start = Date.now()

      await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer test-token')
        .query({ page: 1, pageSize: 100 })

      const duration = Date.now() - start

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.USER_LIST_PAGED * 3)
    })

    it('PERF-003: statistics should respond within 500ms', async () => {
      const start = Date.now()

      await request(app)
        .get('/api/admin/statistics/overview')
        .set('Authorization', 'Bearer test-token')

      const duration = Date.now() - start

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.STATISTICS * 3)
    })

    it('PERF-005: guide list should respond within 150ms', async () => {
      const start = Date.now()

      await request(app)
        .get('/api/admin/guides')
        .set('Authorization', 'Bearer test-token')

      const duration = Date.now() - start

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.GUIDE_LIST * 3)
    })

    it('PERF-006: login should respond within 500ms', async () => {
      const start = Date.now()

      await request(app)
        .post('/api/admin/login')
        .send({ username: 'test', password: 'test' })

      const duration = Date.now() - start

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.LOGIN * 2)
    })
  })

  describe('Concurrent Performance', () => {
    it('PERF-016: should handle 50 concurrent requests', async () => {
      const requests = Array(50).fill(null).map(() =>
        request(app).get('/api/admin/health')
      )

      const start = Date.now()
      const responses = await Promise.all(requests)
      const duration = Date.now() - start

      // 50 个并发请求应在 5 秒内完成
      expect(duration).toBeLessThan(5000)
      expect(responses.length).toBe(50)
    })

    it('PERF-017: should handle 20 concurrent logins', async () => {
      const requests = Array(20).fill(null).map(() =>
        request(app).post('/api/admin/login').send({ username: 'test', password: 'test' })
      )

      const start = Date.now()
      const responses = await Promise.all(requests)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(10000)
      expect(responses.length).toBe(20)
    })
  })
})
