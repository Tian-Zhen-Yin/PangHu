import { ingestAllGuides } from '../services/rag.service'

async function test() {
  try {
    console.log('开始指南入库...')
    const apiKey = process.env.ZHIPUAI_API_KEY || ''
    if (!apiKey) {
      console.error('❌ ZHIPUAI_API_KEY 环境变量未设置')
      process.exit(1)
    }
    const result = await ingestAllGuides(apiKey)
    console.log('✅ 入库完成:', `成功: ${result.success}, 失败: ${result.failed}`)

    if (result.errors.length > 0) {
      console.log('\n错误详情:')
      result.errors.slice(0, 3).forEach(err => {
        console.log(`  - ${err.title}: ${err.error.substring(0, 100)}...`)
      })
    }
  } catch (error: any) {
    console.error('❌ 入库失败:', error.message)
  }
}

test()
