import prisma from '../config/database'

async function checkDatabase() {
  try {
    const guideCount = await prisma.guide.count()
    const categoryCount = await prisma.guideCategory.count()
    const chunkCount = await prisma.guideChunk.count()

    console.log('📊 数据库状态:')
    console.log(`   指南数量: ${guideCount}`)
    console.log(`   分类数量: ${categoryCount}`)
    console.log(`   切片数量: ${chunkCount}`)

    if (guideCount === 0) {
      console.log('\n⚠️  数据库中没有指南数据')
      console.log('   请运行: npm run db:seed')
    } else {
      console.log('\n✅ 数据库中有指南数据')

      // 显示前几个指南
      const guides = await prisma.guide.findMany({ take: 3, select: { title: true } })
      console.log('\n📚 示例指南:')
      guides.forEach(g => console.log(`   - ${g.title}`))
    }
  } catch (error) {
    console.error('❌ 检查失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabase()
