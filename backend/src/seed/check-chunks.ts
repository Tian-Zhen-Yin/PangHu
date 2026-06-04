import prisma from '../config/database'

async function checkChunks() {
  try {
    const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "GuideChunk"`
    console.log('GuideChunk 行数:', (count as any)[0]?.count || 0)

    if ((count as any)[0]?.count > 0) {
      const samples = await prisma.$queryRaw`SELECT id, "guideId", length(content) as len FROM "GuideChunk" LIMIT 3`
      console.log('示例数据:', samples)
    }
  } catch (error: any) {
    console.error('检查失败:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkChunks()
