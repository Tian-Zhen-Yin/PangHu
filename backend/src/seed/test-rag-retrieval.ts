import { retrieveKnowledge } from '../services/rag.service'

async function testRAGRetrieval() {
  try {
    const apiKey = process.env.ZHIPUAI_API_KEY || ''
    if (!apiKey) {
      console.error('❌ ZHIPUAI_API_KEY 环境变量未设置')
      process.exit(1)
    }

    const testQueries = [
      '小猫什么时候打疫苗？',
      '猫咪疫苗接种时间表',
      '猫三联疫苗什么时候打？',
      '新生小猫如何保暖？',
      '如何给猫咪洗澡？'
    ]

    console.log('🔍 测试 RAG 检索功能...\n')

    for (const query of testQueries) {
      console.log(`\n📝 测试问题: ${query}`)
      console.log('─'.repeat(50))

      const result = await retrieveKnowledge(query, apiKey, {
        topK: 3,
        minScore: 0.2,
        ageStage: undefined
      })

      console.log(`✅ 检索到 ${result.chunks.length} 个相关片段`)

      if (result.chunks.length > 0) {
        result.chunks.forEach((chunk, i) => {
          console.log(`\n片段 ${i + 1}:`)
          console.log(`  相似度: ${chunk.score.toFixed(4)}`)
          console.log(`  来源: ${chunk.metadata.title}`)
          console.log(`  分类: ${chunk.metadata.category}`)
          console.log(`  内容: ${chunk.content.substring(0, 100)}...`)
        })

        console.log(`\n📚 引用数: ${result.citations.length}`)
      } else {
        console.log('❌ 未检索到相关内容')
      }

      if (result.error) {
        console.log(`⚠️  错误: ${result.error}`)
      }
    }

    console.log('\n\n✅ 测试完成')

  } catch (error: any) {
    console.error('❌ 测试失败:', error.message)
    console.error(error.stack)
  }
}

testRAGRetrieval()
