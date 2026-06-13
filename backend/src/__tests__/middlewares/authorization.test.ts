// backend/src/__tests__/middlewares/authorization.test.ts
import { describe, it, expect, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { requirePermission, requireRole } from '../../middlewares/authorization'

describe('Authorization Middleware', () => {
  const mockRequest = {
    admin: {
      id: 'admin1',
      role: 'admin',
      permissions: ['user.read', 'user.create'],
    },
  } as any

  const mockResponse = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as any

  const mockNext = vi.fn() as NextFunction

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call next if permission exists', () => {
    const middleware = requirePermission('user.read')
    middleware(mockRequest, mockResponse, mockNext)

    expect(mockNext).toHaveBeenCalled()
    expect(mockResponse.status).not.toHaveBeenCalled()
  })

  it('should return 403 if permission not exists', () => {
    const middleware = requirePermission('user.delete')
    middleware(mockRequest, mockResponse, mockNext)

    expect(mockResponse.status).toHaveBeenCalledWith(403)
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 401 if not authenticated', () => {
    const middleware = requirePermission('user.read')
    middleware({} as Request, mockResponse, mockNext)

    expect(mockResponse.status).toHaveBeenCalledWith(401)
  })

  it('should allow access for matching role', () => {
    const middleware = requireRole(['admin', 'super'])
    middleware(mockRequest, mockResponse, mockNext)

    expect(mockNext).toHaveBeenCalled()
  })

  it('should deny access for non-matching role', () => {
    const middleware = requireRole(['super'])
    middleware(mockRequest, mockResponse, mockNext)

    expect(mockResponse.status).toHaveBeenCalledWith(403)
    expect(mockNext).not.toHaveBeenCalled()
  })
})
