/**
 * JWT 密钥的启动期校验 —— 用户端(utils/jwt)与管理端(utils/adminJwt)共用,
 * 避免两处重复 "读 env → 缺失即 exit" 的逻辑。
 */
export function requireJwtSecret(name: string = 'JWT_SECRET'): string {
  const secret = process.env[name]
  if (!secret) {
    console.error(`FATAL: ${name} environment variable is not set. Refusing to start.`)
    process.exit(1)
  }
  return secret
}
