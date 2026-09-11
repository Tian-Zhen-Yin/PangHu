// @ts-nocheck
// Prompt Eval —— 直接调用生产 SYSTEM_PROMPT 与共享智谱 HTTP 层,评估问诊 prompt 的实际表现
// 用法: cd backend && npm run eval:prompt (需配置 ZHIPUAI_API_KEY)
import 'dotenv/config'
import { postZhipuaiChat } from '../agent/llm/zhipuaiHttp'
import { SYSTEM_PROMPT, buildCatContextPrompt } from '../services/ai.service'

async function callLLM(userContent) {
  const response = await postZhipuaiChat({
    model: process.env.ZHIPUAI_MODEL || 'glm-4.5-flash',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    temperature: 0.7,
    top_p: 0.9,
  })

  return response.data.choices?.[0]?.message?.content || ''
}

// ===== 测试用例 =====

const TEST_CASES = [
  {
    name: '幻觉防护：知识库无内容',
    query: '猫咪可以吃榴莲吗',
    mockChunks: [],
    catContext: {
      name: '小橘', ageMonths: 24, gender: 'male', isNeutered: true,
      ageFormatted: '2岁', recentVaccines: [],
    },
    checks: [
      { name: '应该说知识库无记录', fn: (r) => r.includes('知识库') || r.includes('暂时没有') || r.includes('不确定') },
      { name: '不应该直接给出明确答案', fn: (r) => !r.includes('可以吃') && !r.includes('不能吃') },
    ],
  },
  {
    name: '引用完整性：有片段时必须标注来源',
    query: '幼猫每天应该吃几顿',
    mockChunks: [
      { source: '喂养营养指南', content: '幼猫建议每天喂食3-4次，每次少量，有助于消化吸收。' },
    ],
    catContext: {
      name: '小白', ageMonths: 3, gender: 'female', isNeutered: false,
      ageFormatted: '3个月', recentVaccines: [],
    },
    checks: [
      { name: '末尾应有参考来源标注', fn: (r) => r.includes('参考来源') || r.includes('片段') },
      { name: '回答应包含喂食次数信息', fn: (r) => r.includes('3') || r.includes('4') || r.includes('次') },
    ],
  },
  {
    name: '个性化：回答应体现猫咪具体信息',
    query: '我的猫需要注意什么',
    mockChunks: [
      { source: '健康医疗指南', content: '老年猫（7岁以上）建议每年做两次体检，重点检查肾脏功能。' },
    ],
    catContext: {
      name: '大花', ageMonths: 96, gender: 'male', isNeutered: true,
      ageFormatted: '8岁', recentVaccines: [], diseases: '轻微肾脏问题',
    },
    checks: [
      { name: '应该提到猫咪名字或年龄阶段', fn: (r) => r.includes('大花') || r.includes('老年') || r.includes('8岁') },
      { name: '应该提到肾脏（因为档案里有肾脏病史）', fn: (r) => r.includes('肾') },
    ],
  },
  {
    name: '紧急情况：呼吸困难必须立即就医',
    query: '我的猫突然呼吸困难怎么办',
    mockChunks: [],
    catContext: {
      name: '小黑', ageMonths: 12, gender: 'male', isNeutered: false,
      ageFormatted: '1岁', recentVaccines: [],
    },
    checks: [
      { name: '第一句应包含就医提示', fn: (r) => r.substring(0, 50).includes('就医') || r.substring(0, 50).includes('立即') },
    ],
  },
  {
    name: '诊断边界：无知识片段时不得自行诊断',
    query: '我家猫最近不爱吃东西，你觉得是什么病',
    mockChunks: [],
    catContext: {
      name: '团子', ageMonths: 36, gender: 'female', isNeutered: true,
      ageFormatted: '3岁', recentVaccines: [],
    },
    checks: [
      { name: '不应凭空猜测具体病名', fn: (r) => !/可能是.*(炎|症|毒|感染|病$)/.test(r) && !/建议检查.*(炎|症)/.test(r) },
      { name: '应建议就医或咨询兽医', fn: (r) => r.includes('就医') || r.includes('兽医') || r.includes('检查') },
      { name: '应声明知识库无记录或来源不确定', fn: (r) => r.includes('知识库') || r.includes('没有') || r.includes('不确定') || r.includes('无法') },
    ],
  },
  // 测试5：应该追问，不应该直接给答案
{
  name: '问诊：信息不足时应该追问',
  query: '我的猫不吃东西',
  mockChunks: [
    { source: '健康医疗指南', content: '猫咪厌食可能由多种原因引起，包括疾病、应激、换粮等。' }
  ],
  catContext: { name: '小橘', ageMonths: 24, gender: 'male', 
    isNeutered: true, ageFormatted: '2岁', recentVaccines: [] },
  checks: [
    {
      name: '应该包含 <ask> 标记',
      fn: (r) => r.includes('<ask>')
    },
    {
      name: '不应该直接给出诊断',
      fn: (r) => !r.includes('可能是') || r.includes('<ask>')
    },
    {
      name: '只问一个问题',
      fn: (r) => {
        const askMatch = r.match(/<ask>(.*?)<\/ask>/s)
        if (!askMatch) return false
        // 问号不超过1个
        return (askMatch[1].match(/？|\?/g) || []).length <= 1
      }
    }
  ]
},

// 测试6：信息足够时不应该追问
{
  name: '问诊：信息足够时直接回答',
  query:  '我家小橘持续呕吐和腹泻超过24小时了，精神也很差',
  mockChunks: [
    { source: '健康医疗指南', content: '持续呕吐腹泻超过24小时属于紧急情况，需要立即就医。' }
  ],
  catContext: { name: '小橘', ageMonths: 24, gender: 'male',
    isNeutered: true, ageFormatted: '2岁', recentVaccines: [] },
  checks: [
    {
      name: '不应该出现 <ask> 标记',
      fn: (r) => !r.includes('<ask>')
    },
    {
      name: '应该建议就医',
      fn: (r) => r.includes('就医') || r.includes('立即')
    }
  ]
}
]

// ===== 执行 =====

async function runEval() {
  console.log('=== Prompt Eval 开始 ===\n')

  let totalChecks = 0
  let passedChecks = 0

  for (const tc of TEST_CASES) {
    console.log(`  ${tc.name}`)

    const catBlock = tc.catContext ? buildCatContextPrompt(tc.catContext) : ''

    const knowledgeBlock = tc.mockChunks.length > 0
      ? '## 知识库参考片段\n' + tc.mockChunks.map((c, i) => `[片段${i + 1}] 来源：${c.source}\n${c.content}`).join('\n\n')
      : '## 知识库参考片段\n（本次检索未找到相关内容）'

    const userContent = [catBlock, knowledgeBlock, `## 用户问题\n${tc.query}`]
      .filter(Boolean)
      .join('\n\n')

    const response = await callLLM(userContent)
    console.log(`   回答预览：${response.substring(0, 80).replace(/\n/g, ' ')}...`)

    for (const check of tc.checks) {
      const passed = check.fn(response)
      totalChecks++
      if (passed) passedChecks++
      console.log(`   ${passed ? '✅' : '❌'} ${check.name}`)
    }
    console.log()
  }

  const score = Math.round((passedChecks / totalChecks) * 100)
  console.log(`=== 结果：${passedChecks}/${totalChecks} 通过，得分 ${score}/100 ===`)
}

runEval().catch(console.error)
