// backend/src/__tests__/api/admin.auth.api.test.ts
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { adminAuthMiddleware } from '../../middlewares/adminAuth'
import * as authController from '../../controllers/admin/auth.controller'

// Mock dependencies before creating the app
vi.mock('../../services/admin/auth.service', () => ({
  loginAdmin: vi.fn(),
  getAdminById: vi.fn(),
  updateAdmin: vi.fn(),
  changePassword: vi.fn(),
  validateCredentials: vi.fn(),
}))

vi.mock('../../services/admin/log.service', () => ({
  createLog: vi.fn(),
}))

vi.mock('../../config/database', () => ({
  default: {
    admin: {
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    adminLog: {
      create: vi.fn(),
    },
  },
}))

vi.mock('../../utils/password', () => ({
  comparePassword: vi.fn(),
  hashPassword: vi.fn(),
}))

vi.mock('../../utils/adminJwt', () => ({
  generateAdminAccessToken: vi.fn().mockReturnValue('mock-access-token'),
  generateAdminRefreshToken: vi.fn().mockReturnValue('mock-refresh-token'),
  verifyAdminAccessToken: vi.fn(),
}))

vi.mock('../../utils/adminLogger', () => ({
  extractRequestMetadata: vi.fn().mockReturnValue({ ip: '127.0.0.1', userAgent: 'test-agent' }),
}))

import { loginAdmin, getAdminById } from '../../services/admin/auth.service'
import { generateAdminAccessToken, verifyAdminAccessToken } from '../../utils/adminJwt'

// Build a test Express app that mirrors the real route setup
function createTestApp() {
  const app = express()
  app.use(express.json())

  // Mount admin auth routes (mirrors admin.routes.ts)
  app.post('/api/admin/login', authController.loginValidation, authController.login)
  app.post('/api/admin/logout', adminAuthMiddleware, authController.logout)
  app.get('/api/admin/me', adminAuthMiddleware, authController.getMe)

  return app
}

const app = createTestApp()

describe('Admin Auth API Integration Tests', () => {
  let validToken: string

  const mockAdmin = {
    id: 'admin-test-id-001',
    username: 'testadmin',
    email: 'testadmin@example.com',
    name: 'Test Admin',
    role: 'admin' as const,
    avatar: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/admin/login', () => {
    it('should login with valid credentials', async () => {
      const loginResponse = {
        token: 'jwt-token-abc123',
        refreshToken: 'refresh-token-xyz789',
        admin: mockAdmin,
        permissions: ['user.read', 'user.create', 'user.update'],
      }

      vi.mocked(loginAdmin).mockResolvedValue(loginResponse)

      const response = await request(app)
        .post('/api/admin/login')
        .send({ username: 'testadmin', password: 'validpassword123' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
      expect(response.body.data.token).toBe('jwt-token-abc123')
      expect(response.body.data.admin).toBeDefined()
      expect(response.body.data.admin.username).toBe('testadmin')
      expect(loginAdmin).toHaveBeenCalledWith(
        { username: 'testadmin', password: 'validpassword123' },
        '127.0.0.1',
        'test-agent'
      )
    })

    it('should reject invalid username', async () => {
      vi.mocked(loginAdmin).mockRejectedValue(new Error('INVALID_CREDENTIALS'))

      const response = await request(app)
        .post('/api/admin/login')
        .send({ username: 'nonexistentuser', password: 'validpassword123' })

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('INVALID_CREDENTIALS')
    })

    it('should reject invalid password', async () => {
      vi.mocked(loginAdmin).mockRejectedValue(new Error('INVALID_CREDENTIALS'))

      const response = await request(app)
        .post('/api/admin/login')
        .send({ username: 'testadmin', password: 'wrongpassword123' })

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('INVALID_CREDENTIALS')
    })

    it('should validate username format (too short)', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({ username: 'ab', password: 'validpassword123' })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      // express-validator returns validation errors
      expect(response.body.errors).toBeDefined()
    })

    it('should validate password length', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({ username: 'testadmin', password: 'short' })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.errors).toBeDefined()
    })
  })

  describe('GET /api/admin/me', () => {
    beforeEach(() => {
      // Set up a valid token for /me tests
      validToken = 'valid-admin-jwt-token'
      vi.mocked(verifyAdminAccessToken).mockReturnValue({
        adminId: 'admin-test-id-001',
        username: 'testadmin',
        role: 'admin',
        type: 'access',
      })
      vi.mocked(getAdminById).mockResolvedValue(mockAdmin)
    })

    it('should return admin info with valid token', async () => {
      const response = await request(app)
        .get('/api/admin/me')
        .set('Authorization', `Bearer ${validToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
      expect(response.body.data.admin).toBeDefined()
      expect(response.body.data.admin.username).toBe('testadmin')
      expect(response.body.data.admin.role).toBe('admin')
      expect(response.body.data.permissions).toBeDefined()
      expect(Array.isArray(response.body.data.permissions)).toBe(true)
    })

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/admin/me')

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('UNAUTHORIZED')
    })

    it('should reject request with invalid token', async () => {
      vi.mocked(verifyAdminAccessToken).mockReturnValue(null)

      const response = await request(app)
        .get('/api/admin/me')
        .set('Authorization', 'Bearer invalid.token.value')

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('UNAUTHORIZED')
    })
  })

  describe('POST /api/admin/logout', () => {
    beforeEach(() => {
      validToken = 'valid-admin-jwt-token'
      vi.mocked(verifyAdminAccessToken).mockReturnValue({
        adminId: 'admin-test-id-001',
        username: 'testadmin',
        role: 'admin',
        type: 'access',
      })
    })

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/admin/logout')
        .set('Authorization', `Bearer ${validToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/admin/logout')

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('UNAUTHORIZED')
    })
  })
})
