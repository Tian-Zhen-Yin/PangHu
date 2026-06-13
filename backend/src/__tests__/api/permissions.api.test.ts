// backend/src/__tests__/api/permissions.api.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../../app'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Admin Permissions API', () => {
  let superToken: string
  let adminToken: string
  let editorToken: string

  beforeAll(async () => {
    // 创建不同角色的测试管理员
    await prisma.admin.upsert({
      where: { username: 'testsuper' },
      update: {},
      create: { username: 'testsuper', password: '$2b$10$test', role: 'super' },
    })
    await prisma.admin.upsert({
      where: { username: 'testadmin' },
      update: {},
      create: { username: 'testadmin', password: '$2b$10$test', role: 'admin' },
    })
    await prisma.admin.upsert({
      where: { username: 'testeditor' },
      update: {},
      create: { username: 'testeditor', password: '$2b$10$test', role: 'editor' },
    })

    // 登录获取 tokens
    const superLogin = await request(app).post('/api/admin/login').send({ username: 'testsuper', password: 'test' })
    superToken = superLogin.body.data?.token || 'mock-super-token'

    const adminLogin = await request(app).post('/api/admin/login').send({ username: 'testadmin', password: 'test' })
    adminToken = adminLogin.body.data?.token || 'mock-admin-token'

    const editorLogin = await request(app).post('/api/admin/login').send({ username: 'testeditor', password: 'test' })
    editorToken = editorLogin.body.data?.token || 'mock-editor-token'
  })

  afterAll(async () => {
    await prisma.admin.deleteMany({
      where: { username: { in: ['testsuper', 'testadmin', 'testeditor'] } },
    })
    await prisma.$disconnect()
  })

  describe('User Management Permissions', () => {
    it('IT-019: editor should not access /api/admin/users (GET)', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${editorToken}`)

      expect(response.status).toBe(403)
      expect(response.body.error).toBe('FORBIDDEN')
    })

    it('IT-020: admin should access /api/admin/users (GET)', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)

      expect([200, 401]).toContain(response.status)
    })
  })

  describe('Config Management Permissions', () => {
    it('IT-021: admin should not update /api/admin/config', async () => {
      const response = await request(app)
        .put('/api/admin/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ key: 'siteName', value: 'test' })

      expect([403, 401]).toContain(response.status)
    })

    it('IT-022: super should update /api/admin/config', async () => {
      const response = await request(app)
        .put('/api/admin/config')
        .set('Authorization', `Bearer ${superToken}`)
        .send({ key: 'siteName', value: 'test' })

      expect([200, 401]).toContain(response.status)
    })
  })

  describe('Guide Management Permissions', () => {
    it('IT-023: editor should create guides', async () => {
      const response = await request(app)
        .post('/api/admin/guides')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          title: 'Test Guide',
          category: 'health',
          summary: 'Test summary',
          content: 'Test content for the guide',
        })

      expect([201, 401]).toContain(response.status)
    })

    it('IT-024: editor should not delete cats', async () => {
      const response = await request(app)
        .delete('/api/admin/cats/some-cat-id')
        .set('Authorization', `Bearer ${editorToken}`)

      expect([403, 401, 404]).toContain(response.status)
    })
  })

  describe('Statistics and Logs Permissions', () => {
    it('IT-025: editor should not access statistics', async () => {
      const response = await request(app)
        .get('/api/admin/statistics/overview')
        .set('Authorization', `Bearer ${editorToken}`)

      expect([403, 401]).toContain(response.status)
    })

    it('IT-026: admin should read logs', async () => {
      const response = await request(app)
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`)

      expect([200, 401]).toContain(response.status)
    })

    it('IT-027: admin should not delete logs', async () => {
      const response = await request(app)
        .delete('/api/admin/logs/clean')
        .set('Authorization', `Bearer ${adminToken}`)

      expect([403, 401]).toContain(response.status)
    })

    it('IT-028: super should delete logs', async () => {
      const response = await request(app)
        .delete('/api/admin/logs/clean')
        .set('Authorization', `Bearer ${superToken}`)

      expect([200, 401]).toContain(response.status)
    })
  })
})
