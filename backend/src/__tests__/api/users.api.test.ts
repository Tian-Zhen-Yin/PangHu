// backend/src/__tests__/api/users.api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../../app'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('Users API', () => {
  let adminToken: string
  let testUserId: string

  beforeAll(async () => {
    // 创建测试管理员
    await prisma.admin.upsert({
      where: { username: 'testadmin' },
      update: {},
      create: { username: 'testadmin', password: '$2b$10$test', role: 'admin' },
    })

    // 登录获取token
    const loginResponse = await request(app)
      .post('/api/admin/login')
      .send({ username: 'testadmin', password: 'testpassword' })
    adminToken = loginResponse.body.data.token

    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        username: 'testuser_' + Date.now(),
        email: 'test_' + Date.now() + '@test.com',
        password: 'hashed',
      },
    })
    testUserId = user.id
  })

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } })
    await prisma.admin.deleteMany({ where: { username: 'testadmin' } })
    await prisma.$disconnect()
  })

  describe('GET /api/admin/users', () => {
    it('should return paginated users', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, pageSize: 10 })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data.items)).toBe(true)
    })

    it('should return 403 for editor role', async () => {
      const editor = await prisma.admin.create({
        data: { username: 'testeditor', password: '$2b$10$test', role: 'editor' },
      })

      const loginResponse = await request(app)
        .post('/api/admin/login')
        .send({ username: 'testeditor', password: 'testpassword' })

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)

      expect(response.status).toBe(403)

      await prisma.admin.delete({ where: { id: editor.id } })
    })
  })

  describe('GET /api/admin/users/:id', () => {
    it('should return user detail', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.id).toBe(testUserId)
    })

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/admin/users/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/admin/users', () => {
    it('should create new user', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'newuser',
          email: 'newuser@test.com',
        })

      expect(response.status).toBe(201)
      expect(response.body.data.username).toBe('newuser')

      await prisma.user.delete({ where: { id: response.body.data.id } })
    })
  })

  describe('PUT /api/admin/users/:id', () => {
    it('should update user', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'updateduser' })

      expect(response.status).toBe(200)
      expect(response.body.data.username).toBe('updateduser')
    })
  })

  describe('DELETE /api/admin/users/:id', () => {
    it('should delete user', async () => {
      const user = await prisma.user.create({
        data: { username: 'todelete', email: 'todelete@test.com', password: 'hashed' },
      })

      const response = await request(app)
        .delete(`/api/admin/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })
})
