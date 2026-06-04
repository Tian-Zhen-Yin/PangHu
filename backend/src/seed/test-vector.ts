import prisma from '../config/database'

async function testVectorInsert() {
  console.log('🧪 测试向量插入...')

  try {
    // 获取一个真实的 guide ID
    const guides = await prisma.$queryRaw`SELECT id, title FROM "Guide" LIMIT 1`
    if (!guides || (guides as any[]).length === 0) {
      console.log('❌ 没有可用的 guide')
      return
    }

    const guideId = (guides as any[])[0].id
    console.log('使用 guide:', guideId)

    // 创建 2048 维测试向量
    const testVector = new Array(2048).fill(0.1)
    const vectorString = `[${testVector.join(',')}]`

    // 测试插入
    await prisma.$queryRaw`
      INSERT INTO "GuideChunk" (
        id, "guideId", content, "chunkIndex", category, "embedding"
      ) VALUES (
        'test-2048', ${guideId}, '测试内容', 0, '测试', ${vectorString}::vector
      )
    `
    console.log('✅ 2048 维向量插入成功！')

    // 验证插入
    const result = await prisma.$queryRaw`SELECT id, content FROM "GuideChunk" WHERE id = 'test-2048'`
    console.log('✅ 验证成功:', result)

    // 清理测试数据
    await prisma.$queryRaw`DELETE FROM "GuideChunk" WHERE id = 'test-2048'`
    console.log('✅ 测试完成，已清理')

  } catch (error: any) {
    console.error('❌ 测试失败:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testVectorInsert()
