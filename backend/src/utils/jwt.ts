import jwt from 'jsonwebtoken'

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.')
  process.exit(1)
}
const JWT_SECRET: string = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export interface JwtPayload {
  userId: string
  email: string
  username: string
}

/**
 * 生成 JWT token
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload as any, JWT_SECRET as any, { expiresIn: JWT_EXPIRES_IN } as any)
}

/**
 * 验证 JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}
