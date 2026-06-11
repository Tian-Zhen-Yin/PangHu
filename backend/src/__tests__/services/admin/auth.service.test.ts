import { describe, it, expect, beforeEach, vi } from 'vitest'
import { validateCredentials, loginAdmin, getAdminById } from '../../../services/admin/auth.service'
import prisma from '../../../config/database'

// Mock dependencies
vi.mock('../../../config/database', () => ({
  default: {
    admin: {
      findUnique: vi.fn(),
      update: vi.fn()
    },
    adminLog: {
      create: vi.fn()
    }
  }
}))

vi.mock('../../../utils/password', () => ({
  comparePassword: vi.fn(),
  hashPassword: vi.fn()
}))

vi.mock('../../../utils/adminJwt', () => ({
  generateAdminAccessToken: vi.fn().mockReturnValue('mock-access-token'),
  generateAdminRefreshToken: vi.fn().mockReturnValue('mock-refresh-token')
}))

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateCredentials', () => {
    it('should return null for non-existent admin', async () => {
      ;(prisma.admin.findUnique as any).mockResolvedValue(null)

      const { comparePassword } = await import('../../../utils/password')
      ;(comparePassword as any).mockResolvedValue(false)

      const result = await validateCredentials('test', 'pass')

      expect(result).toBeNull()
    })

    it('should return null for inactive admin', async () => {
      const mockAdmin = {
        id: 'admin-1',
        username: 'test',
        password: 'hash',
        isActive: false,
        role: 'admin'
      }

      ;(prisma.admin.findUnique as any).mockResolvedValue(mockAdmin)
      const { comparePassword } = await import('../../../utils/password')
      ;(comparePassword as any).mockResolvedValue(true)

      const result = await validateCredentials('test', 'pass')

      expect(result).toBeNull()
    })

    it('should return null for invalid password', async () => {
      const mockAdmin = {
        id: 'admin-1',
        username: 'test',
        password: 'hash',
        isActive: true,
        role: 'admin'
      }

      ;(prisma.admin.findUnique as any).mockResolvedValue(mockAdmin)
      const { comparePassword } = await import('../../../utils/password')
      ;(comparePassword as any).mockResolvedValue(false)

      const result = await validateCredentials('test', 'pass')

      expect(result).toBeNull()
    })

    it('should return admin response for valid credentials', async () => {
      const mockAdmin = {
        id: 'admin-1',
        username: 'test',
        email: 'test@example.com',
        name: 'Test Admin',
        password: 'hash',
        isActive: true,
        role: 'admin',
        avatar: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      ;(prisma.admin.findUnique as any).mockResolvedValue(mockAdmin)
      const { comparePassword } = await import('../../../utils/password')
      ;(comparePassword as any).mockResolvedValue(true)

      const result = await validateCredentials('test', 'pass')

      expect(result).toEqual({
        id: 'admin-1',
        username: 'test',
        email: 'test@example.com',
        name: 'Test Admin',
        role: 'admin',
        avatar: null,
        isActive: true,
        lastLoginAt: null,
        createdAt: mockAdmin.createdAt,
        updatedAt: mockAdmin.updatedAt
      })
    })
  })

  describe('loginAdmin', () => {
    it('should throw error for invalid credentials', async () => {
      // Set up so validateCredentials returns null
      ;(prisma.admin.findUnique as any).mockResolvedValue(null)
      const { comparePassword } = await import('../../../utils/password')
      ;(comparePassword as any).mockResolvedValue(false)

      await expect(
        loginAdmin({ username: 'test', password: 'wrong' }, '127.0.0.1', 'agent')
      ).rejects.toThrow('INVALID_CREDENTIALS')
    })

    it('should return login response with tokens', async () => {
      const mockAdmin = {
        id: 'admin-1',
        username: 'test',
        email: 'test@example.com',
        name: 'Test',
        password: 'hash',
        role: 'admin',
        isActive: true,
        avatar: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Set up so validateCredentials returns the admin
      ;(prisma.admin.findUnique as any).mockResolvedValue(mockAdmin)
      const { comparePassword } = await import('../../../utils/password')
      ;(comparePassword as any).mockResolvedValue(true)
      ;(prisma.admin.update as any).mockResolvedValue({ ...mockAdmin, lastLoginAt: new Date() })
      ;(prisma.adminLog.create as any).mockResolvedValue({})

      const result = await loginAdmin({ username: 'test', password: 'pass' }, '127.0.0.1', 'agent')

      expect(result).toHaveProperty('token')
      expect(result).toHaveProperty('refreshToken')
      expect(result).toHaveProperty('admin')
      expect(result).toHaveProperty('permissions')
      expect(Array.isArray(result.permissions)).toBe(true)
    })
  })
})
