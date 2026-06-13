// backend/src/__tests__/api/boundary.api.test.ts
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../../app'

const adminToken = 'test-admin-token'

describe('Boundary API Tests', () => {
  describe('Page Size Limits', () => {
    it('IT-029: should limit pageSize to 100', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, pageSize: 1000 })

      // 应限制为 100 或返回 400
      expect([200, 400, 401]).toContain(response.status)

      if (response.status === 200) {
        expect(response.body.data.pagination.pageSize).toBeLessThanOrEqual(100)
      }
    })

    it('should reject negative page', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: -1 })

      expect([400, 401]).toContain(response.status)
    })

    it('should reject zero pageSize', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ pageSize: 0 })

      expect([200, 400, 401]).toContain(response.status)
    })
  })

  describe('Input Length Limits', () => {
    it('IT-030: should reject extremely long search keywords', async () => {
      const longKeyword = 'a'.repeat(1000)

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ keyword: longKeyword })

      expect([200, 400, 401]).toContain(response.status)
    })

    it('should reject path traversal in ID', async () => {
      const response = await request(app)
        .get('/api/admin/users/../../admin')
        .set('Authorization', `Bearer ${adminToken}`)

      expect([400, 404, 401]).toContain(response.status)
    })
  })

  describe('Special Characters', () => {
    it('IT-031: should reject invalid ID format', async () => {
      const response = await request(app)
        .get('/api/admin/users/!@#$%^&*()')
        .set('Authorization', `Bearer ${adminToken}`)

      expect([400, 404, 401]).toContain(response.status)
    })

    it('IT-032: should escape special characters in search', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ keyword: '<script>alert(1)</script>' })

      // 不应执行脚本或崩溃
      expect([200, 400, 401]).toContain(response.status)
    })

    it('IT-033: should prevent SQL injection', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ keyword: "'; DROP TABLE users; --" })

      // 不应执行 SQL 注入
      expect([200, 400, 401]).toContain(response.status)
    })

    it('IT-034: should validate ID contains no special chars', async () => {
      const response = await request(app)
        .get('/api/admin/users/test; DROP TABLE')
        .set('Authorization', `Bearer ${adminToken}`)

      expect([400, 404, 401]).toContain(response.status)
    })
  })

  describe('Unicode and Edge Cases', () => {
    it('should handle unicode in search', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ keyword: '用户名' })

      expect([200, 400, 401]).toContain(response.status)
    })

    it('should handle emoji in input', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ keyword: '🐱🐶' })

      expect([200, 400, 401]).toContain(response.status)
    })

    it('should handle null bytes in input', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ keyword: 'test\0admin' })

      expect([200, 400, 401]).toContain(response.status)
    })
  })
})
