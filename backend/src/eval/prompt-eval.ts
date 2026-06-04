// @ts-nocheck
// 独立的 Prompt Eval —— 不依赖 ai.service.ts，避免 axios 缺失问题
import 'dotenv/config'
import crypto from 'crypto'
import https from 'https'

const httpsAgent = new https.Agent({ rejectUnauthorized: false })

// ===== 从 ai.service.ts 复制的内部逻辑 =====

const SYSTEM_PROMPT = `你是"喵喵医生"，一位专业的猫咪医疗顾问和养护专家。

## ⚠️ 核心原则：按顺序判断，匹配即停止

### 步骤1：判断信息是否完整
**如果用户提到症状但未说明持续时间/严重程度，必须追问！**

⚠️ 重要：先检查用户是否已经提供了时间信息
时间关键词包括：超过、持续、已经、X小时、X天、从X开始、一直等

问诊触发条件（症状关键词 + 无时间信息）：
- 不吃东西/不喝水 + 无时间 → 追问"持续多久了？"
- 呕吐/拉稀 + 无时间 → 追问"几次了？持续多久？"
- 没精神/精神差 + 无时间 → 追问"从什么时候开始？"
- 咳嗽/喘气 + 无时间 → 追问"持续多久了？"

问诊格式：
<ask>单个问题</ask>

示例：
- 用户："我的猫不吃东西" → 你：<ask>这种情况持续多久了？</ask> ❌追问
- 用户："我的猫持续呕吐超过24小时" → 直接进入步骤2 ✅不追问
- 用户："它呕吐了" → 你：<ask>呕吐几次了？持续多久？</ask> ❌追问

**严禁：在追问时给诊断、建议或判断是否紧急**

### 步骤2：判断是否紧急
用户明确说了以下【已持续】的症状：
- "呼吸困难" + 持续进行中
- "无法排尿" / 憋尿
- "呕吐/腹泻" + "超过24小时" / "一天多" / "两天了"
- "不食/不吃" + "超过24小时" / "一天多" / "两天了"
- 出血 / 骨折 / 抽搐 / 昏迷

→ 第一句必须是"**请立即就医！**"

### 步骤3：正常回答
症状清晰、信息完整、非紧急情况

→ 基于知识库片段回答
→ 片段不足时说："我的知识库暂时没有这方面的记录，建议咨询专业兽医"

## 知识库使用规则
每次对话中，我会提供标注了编号的【知识库参考片段】：
1. 优先且只基于这些片段回答，不允许凭空推断
2. 回答末尾用"参考来源：[片段编号]"注明出处
3. 片段为空或不相关时，声明"知识库无记录"

## 输出格式
- Markdown，300字以内
- 重要警告加粗
- 末尾必须有"参考来源：[编号]"或"知识库无记录"声明`

function buildCatContextPrompt(catContext) {
  const genderText = catContext.gender === 'male' ? '公猫' : catContext.gender === 'female' ? '母猫' : '未知性别'
  const vaccineText = catContext.recentVaccines.length > 0
    ? catContext.recentVaccines.map(v => `${v.name}(${v.date})`).join('、')
    : '暂无记录'

  return `
## 当前咨询的猫咪档案
- 名字：${catContext.name}
- 品种：${catContext.breed || '未知'}
- 性别：${genderText}
- 年龄：${catContext.ageFormatted}
- 体重：${catContext.weight ? `${catContext.weight}kg` : '未记录'}
- 绝育状态：${catContext.isNeutered ? '已绝育' : '未绝育'}${catContext.allergies ? `\n- 过敏信息：${catContext.allergies}` : ''}${catContext.diseases ? `\n- 既往病史：${catContext.diseases}` : ''}
- 近期疫苗：${vaccineText}

**请根据以上猫咪的具体情况提供个性化建议。**`
}

function generateToken(apiKey) {
  const [id, secret] = apiKey.split('.')
  if (!id || !secret) throw new Error('Invalid API key format')

  const header = { alg: 'HS256', sign_type: 'SIGN' }
  const now = Date.now()
  const payload = { api_key: id, exp: now + 3600000, timestamp: now }

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64')

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url')

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

function getApiConfig() {
  const apiKey = process.env.ZHIPUAI_API_KEY || ''
  const token = generateToken(apiKey)
  return { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', token, apiKey }
}

// ===== callLLM =====

async function callLLM(userContent) {
  const { baseUrl, token } = getApiConfig()

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ]

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    agent: httpsAgent,
    body: JSON.stringify({
      model: process.env.ZHIPUAI_MODEL || 'glm-4-flash',
      messages,
      temperature: 0.7,
      top_p: 0.9,
    }),
  })

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
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
  query:  ',
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
