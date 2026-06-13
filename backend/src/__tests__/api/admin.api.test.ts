// backend/src/__tests__/api/admin.api.test.ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import { app } from '../../app'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Admin API', () => {
  let adminToken: string

  beforeAll(async () => {
    // 创建测试管理员
    await prisma.admin.upsert({
      where: { username: 'testadmin' },
      update: {},
      create: {
        username: 'testadmin',
        password: '$2b$10$test',
        role: 'admin',
      },
    })
  })

  afterAll(async () => {
    await prisma.admin.deleteMany({ where: { username: 'testadmin' } })
    await prisma.$disconnect()
  })

  describe('POST /api/admin/login', () => {
    it('should return token with correct credentials', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({ username: 'testadmin', password: 'testpassword' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.token).toBeTruthy()
      adminToken = response.body.data.token
    })

    it('should return 401 with wrong password', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({ username: 'testadmin', password: 'wrong' })

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
    })

    it('should return 400 with empty fields', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({ username: '', password: '' })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /api/admin/me', () => {
    it('should return admin info when authenticated', async () => {
      const response = await request(app)
        .get('/api/admin/me')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.admin.username).toBe('testadmin')
    })

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/admin/me')

      expect(response.status).toBe(401)
    })
  })
})
