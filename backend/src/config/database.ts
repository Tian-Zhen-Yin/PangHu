import { PrismaClient } from '@prisma/client'

// Top-level requires so @vercel/nft can trace them statically
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

declare global {
  var prisma: undefined | PrismaClient
}

const isVercel = !!process.env.VERCEL

function createPrismaClient(): PrismaClient {
  if (isVercel) {
    const pool = new pg.Pool({
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

const prisma = globalThis.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

export default prisma
