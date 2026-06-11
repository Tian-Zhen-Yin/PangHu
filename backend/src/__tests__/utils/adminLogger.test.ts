import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createAdminLog, extractRequestMetadata } from '../../utils/adminLogger'
import prisma from '../../config/database'

// Mock Prisma
vi.mock('../../config/database', () => ({
  default: {
    adminLog: {
      create: vi.fn()
    }
  }
}))

describe('adminLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createAdminLog', () => {
    it('should create an admin log entry', async () => {
      const mockLog = {
        id: 'log-1',
        adminId: 'admin-1',
        action: 'login',
        module: 'auth',
        targetId: null,
        detail: null,
        ip: '127.0.0.1',
        userAgent: 'test-agent'
      }

      ;(prisma.adminLog.create as any).mockResolvedValue(mockLog)

      await createAdminLog('admin-1', {
        action: 'login',
        module: 'auth',
        ip: '127.0.0.1',
        userAgent: 'test-agent'
      })

      expect(prisma.adminLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          adminId: 'admin-1',
          action: 'login',
          module: 'auth'
        })
      })
    })

    it('should handle create errors gracefully', async () => {
      ;(prisma.adminLog.create as any).mockRejectedValue(new Error('DB Error'))

      // Should not throw
      await expect(
        createAdminLog('admin-1', {
          action: 'login',
          module: 'auth'
        })
      ).resolves.toBeUndefined()
    })
  })

  describe('extractRequestMetadata', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const req = {
        headers: {
          'x-forwarded-for': '10.0.0.1, 10.0.0.2',
          'user-agent': 'Mozilla/5.0'
        },
        socket: {}
      } as any

      const { ip, userAgent } = extractRequestMetadata(req)

      expect(ip).toBe('10.0.0.1')
      expect(userAgent).toBe('Mozilla/5.0')
    })

    it('should extract IP from x-real-ip header', () => {
      const req = {
        headers: {
          'x-real-ip': '10.0.0.3',
          'user-agent': 'TestAgent'
        },
        socket: {}
      } as any

      const { ip } = extractRequestMetadata(req)

      expect(ip).toBe('10.0.0.3')
    })

    it('should fallback to socket remoteAddress', () => {
      const req = {
        headers: {},
        socket: { remoteAddress: '10.0.0.4' }
      } as any

      const { ip } = extractRequestMetadata(req)

      expect(ip).toBe('10.0.0.4')
    })

    it('should return unknown for IP when not available', () => {
      const req = {
        headers: {},
        socket: {}
      } as any

      const { ip, userAgent } = extractRequestMetadata(req)

      expect(ip).toBe('unknown')
      expect(userAgent).toBe('unknown')
    })
  })
})
