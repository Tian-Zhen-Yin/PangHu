// tests/preflight.ts
import fetch from 'node-fetch'

interface CheckItem {
  name: string
  url: string
  port?: number
}

const checks: CheckItem[] = [
  { name: '后端服务', url: 'http://localhost:3000/api/health', port: 3000 },
  { name: '前端服务', url: 'http://localhost:5173', port: 5173 },
]

export async function preflightCheck(): Promise<void> {
  console.log('🚀 开始执行前置检查...\n')

  const failures: string[] = []

  for (const check of checks) {
    try {
      console.log(`检查 ${check.name}...`)
      const response = await fetch(check.url, { timeout: 5000 })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      console.log(`✅ ${check.name} 正常 (${check.url})\n`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '连接失败'
      failures.push(`${check.name} (端口 ${check.port}): ${errorMsg}`)
      console.log(`❌ ${check.name} 失败: ${errorMsg}\n`)
    }
  }

  if (failures.length > 0) {
    console.error('❌ 前置检查未通过：')
    failures.forEach((f) => console.error(`  - ${f}`))
    console.error('\n请先启动相关服务后再运行测试')
    process.exit(1)
  }

  console.log('🎉 所有前置检查通过！')
}

// 直接运行检查
if (require.main === module) {
  preflightCheck().catch((error) => {
    console.error('前置检查异常:', error)
    process.exit(1)
  })
}
