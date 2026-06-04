import prisma from '../config/database'

async function fixVectorDimensions() {
  console.log('🔧 修复向量维度...')

  try {
    // 完全重建 GuideChunk 表
    await prisma.$queryRaw`DROP TABLE IF EXISTS "GuideChunk" CASCADE`
    console.log('✅ 删除旧表')

    // 重新创建表（临时表，用于保留结构）
    await prisma.$queryRaw`
      CREATE TABLE "GuideChunk" (
        id TEXT PRIMARY KEY,
        "guideId" TEXT NOT NULL,
        content TEXT NOT NULL,
        "chunkIndex" INTEGER NOT NULL,
        category TEXT NOT NULL,
        "ageStage" TEXT,
        headings TEXT,
        "embedding" vector(2048),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("guideId") REFERENCES "Guide"("id") ON DELETE CASCADE
      )
    `
    console.log('✅ 创建新表')

    // 创建索引
    await prisma.$queryRaw`CREATE INDEX ON "GuideChunk"("guideId")`
    await prisma.$queryRaw`CREATE INDEX ON "GuideChunk"(category)`
    console.log('✅ 创建索引')

    console.log('\n✨ 修复完成！现在可以运行指南入库了')
  } catch (error: any) {
    console.error('❌ 修复失败:', error.message)
    console.log('\n💡 提示：如果向量扩展未安装，请先运行：')
    console.log('   CREATE EXTENSION vector;')
  } finally {
    await prisma.$disconnect()
  }
}

fixVectorDimensions()
