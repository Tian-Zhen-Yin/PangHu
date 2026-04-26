import { PrismaClient } from '@prisma/client'

// 创建单例Prisma客户端
const prismaClientSingleton = () => {
  const isVercel = !!process.env.VERCEL

  if (isVercel) {
    // On Vercel: use --no-engine with pg driver adapter (no native binary needed)
    const { PrismaPg } = require('@prisma/adapter-pg')
    const { Pool } = require('pg')
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
    const adapter = new PrismaPg(pool)
    return new PrismaClient({ adapter, log: ['error'] })
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
