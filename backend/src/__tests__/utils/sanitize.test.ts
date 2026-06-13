// backend/src/__tests__/utils/sanitize.test.ts
import { describe, it, expect } from 'vitest'
import { sanitizeObject } from '../../utils/sanitize'

describe('sanitizeObject', () => {
  it('should redact password field', () => {
    const input = { username: 'admin', password: 'secret123' }
    const result = sanitizeObject(input)
    
    expect(result.password).toBe('[REDACTED]')
    expect(result.username).toBe('admin')
  })

  it('should mask email address', () => {
    const input = { email: 'user@example.com' }
    const result = sanitizeObject(input)
    
    expect(result.email).toMatch(/^..\*\*\*@example\.com$/)
  })

  it('should redact token field', () => {
    const input = { token: 'abc123xyz789' }
    const result = sanitizeObject(input)
    
    expect(result.token).toBe('[REDACTED]')
  })

  it('should handle nested objects', () => {
    const input = {
      user: {
        username: 'admin',
        password: 'secret',
        profile: {
          email: 'test@test.com'
        }
      }
    }
    const result = sanitizeObject(input)
    
    expect(result.user.password).toBe('[REDACTED]')
    expect(result.user.profile.email).toMatch(/^..\*\*\*@test\.com$/)
    expect(result.user.username).toBe('admin')
  })

  it('should handle arrays', () => {
    const input = {
      users: [
        { username: 'user1', password: 'pass1' },
        { username: 'user2', password: 'pass2' }
      ]
    }
    const result = sanitizeObject(input)
    
    expect(result.users[0].password).toBe('[REDACTED]')
    expect(result.users[1].password).toBe('[REDACTED]')
    expect(result.users[0].username).toBe('user1')
  })

  it('should not modify non-sensitive fields', () => {
    const input = {
      id: '123',
      name: 'test',
      age: 25,
      active: true
    }
    const result = sanitizeObject(input)
    
    expect(result).toEqual(input)
  })

  it('should handle phone number masking', () => {
    const input = { phone: '13812345678' }
    const result = sanitizeObject(input)
    
    expect(result.phone).toBe('***5678')
  })

  it('should handle ip address masking', () => {
    const input = { ip: '192.168.1.100' }
    const result = sanitizeObject(input)
    
    expect(result.ip).toBe('192.168.***')
  })
})
