import jwt from 'jsonwebtoken'
import type { AdminJwtPayload } from '../types/admin'

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.')
  process.exit(1)
}
const JWT_SECRET: string = process.env.JWT_SECRET
const JWT_EXPIRES_IN = '15m'
const JWT_REFRESH_EXPIRES_IN = '7d'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET

/**
 * Generate admin access token
 */
export function generateAdminAccessToken(payload: Omit<AdminJwtPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'access' } as AdminJwtPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

/**
 * Generate admin refresh token
 */
export function generateAdminRefreshToken(payload: Omit<AdminJwtPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'refresh' } as AdminJwtPayload,
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  )
}

/**
 * Verify admin access token
 */
export function verifyAdminAccessToken(token: string): AdminJwtPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AdminJwtPayload
    if (payload.type !== 'access') return null
    return payload
  } catch {
    return null
  }
}

/**
 * Verify admin refresh token
 */
export function verifyAdminRefreshToken(token: string): AdminJwtPayload | null {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as AdminJwtPayload
    if (payload.type !== 'refresh') return null
    return payload
  } catch {
    return null
  }
}
