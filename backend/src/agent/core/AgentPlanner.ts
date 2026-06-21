import type { AgentState, PlanStep, IntentResult, ToolResult } from '../types/agent'

/**
 * 从用户消息解析陪玩推荐参数。
 *
 * 覆盖陪玩抽屉拼出的自然语言（"我只有 10 分钟""现在精力中等""想玩益智类"）
 * 以及用户手输的常见说法。catId 不在此解析，由 RECOMMEND_play 工具用
 * ctx.selectedCatId 兜底。
 */
function parsePlayParams(message: string): Record<string, unknown> {
  const params: Record<string, unknown> = {}

  // 时长：匹配"N 分钟"
  const timeMatch = message.match(/(\d+)\s*分钟/)
  if (timeMatch) {
    const t = parseInt(timeMatch[1], 10)
    if (t >= 1 && t <= 120) params.availableTime = t
  }

  // 精力档位：文案标签 + 自然语言
  const energyMap: Array<[RegExp, number]> = [
    [/极高|非常旺盛|精力爆棚|停不下来/, 5],
    [/偏高|很旺盛|比较旺盛/, 4],
    [/旺盛/, 5],
    [/中等|一般|正常/, 3],
    [/偏低|有点累|有些累|不太想动/, 2],
    [/极低|很累|没精神|没力气|嗜睡/, 1],
  ]
  for (const [re, val] of energyMap) {
    if (re.test(message)) { params.currentEnergyOverride = val; break }
  }

  // 偏好类别：CATEGORY_LABEL 文案 + 英文枚举
  const categoryMap: Array<[RegExp, string]> = [
    [/追逐|追跑|奔跑|chase/i, 'chase'],
    [/狩猎|捕猎|扑咬|hunting/i, 'hunting'],
    [/益智|解谜|动脑|puzzle/i, 'puzzle'],
    [/互动|陪伴|interaction/i, 'interaction'],
    [/攀爬|爬高|跳跃|climbing/i, 'climbing'],
    [/独自|自己玩|solo/i, 'solo'],
  ]
  for (const [re, val] of categoryMap) {
    if (re.test(message)) { params.preferredCategory = val; break }
  }

  return params
}

/**
 * 解析成长记录类型
 */
function parseGrowthType(message: string): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  if (/体检|检查/.test(message)) params.type = 'healthCheck'
  else if (/驱虫/.test(message)) params.type = 'deworm'
  else if (/领养|纪念日|接回家|到家/.test(message)) params.isAdoptionDay = true
  const weightMatch = message.match(/(\d+(?:\.\d+)?)\s*(kg|公斤|千克)/i)
  if (weightMatch) params.weight = parseFloat(weightMatch[1])
  return params
}

/**
 * 解析疫苗录入参数
 */
function parseVaccineParams(message: string): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  const nameMatch = message.match(/(妙三多|妙双方|猫三联|狂犬疫苗|狂犬|猫五联|英特威|辉瑞)/)
  if (nameMatch) params.vaccineName = nameMatch[1]
  return params
}

/**
 * 解析体重录入参数
 */
function parseWeightParams(message: string): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  const kgMatch = message.match(/(\d+(?:\.\d+)?)\s*(kg|公斤|千克)/i)
  if (kgMatch) {
    params.weight = parseFloat(kgMatch[1])
  } else {
    const jinMatch = message.match(/(\d+(?:\.\d+)?)\s*斤/)
    if (jinMatch) params.weight = parseFloat(jinMatch[1]) / 2
  }
  return params
}

/**
 * 根据意图和置信度确定策略类型
 */
function getStrategyType(intent: string, confidence: number, toolCount: number): string {
  if (intent === 'greeting') return 'noop'
  if (toolCount === 0) return 'noop'
  if (confidence < 0.5) return 'rag_fallback'
  if (toolCount >= 3) return 'multi_tool'
  if (toolCount === 1) return 'single_tool'
  return 'standard'
}

/**
 * 构建初始工具计划
 *
 * 注意：此处不再从用户消息中提取 catName。原 matchCatName 正则会把任意中文字符串
 * 的前 1-6 字当成猫咪名，导致 catName 字段几乎总是被噪声污染。工具层会在
 * catName 缺省时回退到该用户的第一只猫（cats[0]），多猫场景的精确选择应通过
 * 前端 selectedCatId 走 AgentContext.selectedCatId 路径（待 P1 接入）。
 */
export function buildPlan(state: AgentState, intentResult: IntentResult): { plan: PlanStep[]; strategyType: string } {
  const message = state.userMessage
  const plan: PlanStep[] = []
  const { intent, confidence } = intentResult

  switch (intent) {
    case 'greeting':
      return { plan: [], strategyType: 'noop' }

    case 'cat_info_query': {
      plan.push({
        toolName: 'get_cat_info',
        reason: '用户询问猫咪的基本信息，需要读取档案数据',
        parameters: {},
      })
      if (confidence > 0.6) {
        plan.push({
          toolName: 'get_weight_trend',
          reason: '补充体重趋势数据以提供完整的健康概况',
          parameters: {},
        })
      }
      break
    }

    case 'health_consultation': {
      const hasWeightWord = /体重|胖|瘦|标准|kg|公斤/.test(message)
      const hasVaccineWord = /疫苗|接种|打针|驱虫|免疫/.test(message)
      const hasTrendWord = /趋势|变化|最近|历史|曲线图|记录/.test(message)

      plan.push({
        toolName: 'get_cat_info',
        reason: '获取猫咪基础档案以便给出个性化健康建议',
        parameters: {},
      })

      if (hasTrendWord || hasWeightWord) {
        plan.push({
          toolName: 'get_weight_trend',
          reason: '用户关注体重变化趋势',
          parameters: {},
        })
      }

      plan.push({
        toolName: 'check_health',
        reason: '基于品种标准评估猫咪的健康状态',
        parameters: { aspect: hasWeightWord ? 'weight' : 'general' },
      })

      // V2.0：健康咨询附带查询过敏记录（只读，提供更全面的健康建议）
      plan.push({
        toolName: 'GET_allergy_records',
        reason: '附带查询过敏信息，辅助健康评估',
        parameters: {},
      })

      if (hasVaccineWord) {
        plan.push({
          toolName: 'check_vaccine',
          reason: '用户询问疫苗接种状态',
          parameters: {},
        })
      }
      break
    }

    case 'allergy_query': {
      plan.push({
        toolName: 'get_cat_info',
        reason: '获取猫咪基础档案',
        parameters: {},
      })
      plan.push({
        toolName: 'GET_allergy_records',
        reason: '获取过敏记录及模式分析',
        parameters: {},
      })
      break
    }

    case 'allergy_record': {
      plan.push({
        toolName: 'get_cat_info',
        reason: '获取猫咪基础档案',
        parameters: {},
      })
      // V2.0 写入工具：标记 requiresConfirmation，Executor 会暂停并请求用户确认
      plan.push({
        toolName: 'ADD_allergy_record',
        reason: '创建过敏记录（需用户确认）',
        parameters: {},
        requiresConfirmation: true,
      })
      break
    }

    case 'health_report_request': {
      // GENERATE_health_report 内部已聚合体重、健康、疫苗、过敏数据，
      // 无需额外调用 get_cat_info / check_health 等工具（避免重复查询）
      plan.push({
        toolName: 'GENERATE_health_report',
        reason: '生成健康周报（聚合多维度健康数据）',
        parameters: {},
      })
      break
    }

    case 'play_recommendation': {
      // 从用户消息解析陪玩参数（catId 由 RECOMMEND_play 工具用 ctx.selectedCatId 兜底）
      plan.push({
        toolName: 'RECOMMEND_play',
        reason: '用户想给猫咪安排陪玩，调用推荐引擎生成个性化游戏推荐',
        parameters: parsePlayParams(message),
      })
      break
    }

    case 'growth_record': {
      // 成长记录写入：携带文字描述 + 图片附件，需用户确认
      plan.push({
        toolName: 'ADD_growth_record',
        reason: '用户想记录猫咪成长（含文字/图片），创建成长记录（需用户确认）',
        parameters: {
          notes: message,
          photos: state.attachments || [],
          ...parseGrowthType(message),
        },
        requiresConfirmation: true,
      })
      break
    }

    case 'growth_query': {
      plan.push({
        toolName: 'get_growth_records',
        reason: '用户想查看成长记录历史',
        parameters: {},
      })
      break
    }

    case 'vaccine_record': {
      plan.push({
        toolName: 'ADD_vaccine_record',
        reason: '用户想登记疫苗接种记录（需用户确认）',
        parameters: { ...parseVaccineParams(message) },
        requiresConfirmation: true,
      })
      break
    }

    case 'weight_record': {
      plan.push({
        toolName: 'ADD_weight_record',
        reason: '用户想登记体重记录（需用户确认）',
        parameters: { ...parseWeightParams(message) },
        requiresConfirmation: true,
      })
      break
    }

    case 'mixed': {
      plan.push({
        toolName: 'get_cat_info',
        reason: '用户的问题涉及多方面，先获取猫咪基础档案',
        parameters: {},
      })
      plan.push({
        toolName: 'check_health',
        reason: '评估健康状态',
        parameters: {},
      })
      plan.push({
        toolName: 'rag_search',
        reason: '从知识库中补充相关专业知识',
        parameters: { query: message },
      })
      break
    }

    case 'general_knowledge': {
      plan.push({
        toolName: 'rag_search',
        reason: '用户的问题属于一般性养猫知识查询',
        parameters: { query: message },
      })
      break
    }

    case 'unknown':
    default: {
      plan.push({
        toolName: 'rag_search',
        reason: '无法明确分类，使用知识库检索兜底',
        parameters: { query: message },
      })
    }
  }

  // 补充：如果用户问了"怎么办/建议"类问题，且不是纯知识查询，附加 RAG
  if (plan.length > 0 && !plan.some((p) => p.toolName === 'rag_search')) {
    if (/怎么办|如何|怎么|为什么|是否|应该|建议/.test(message)) {
      plan.push({
        toolName: 'rag_search',
        reason: '在数据分析基础上，提供专业的养护建议',
        parameters: { query: message },
      })
    }
  }

  const strategyType = getStrategyType(intent, confidence, plan.length)
  return { plan: plan.slice(0, 5), strategyType }
}

/**
 * 动态分支：执行完计划后检查结果，决定是否需要追加工具
 * 例如：get_cat_info 没找到猫 → 跳过后续分析工具
 */
export function advancePlan(
  initialPlan: PlanStep[],
  results: ToolResult[]
): { followUpPlan: PlanStep[]; shouldDropFailed: boolean } {
  const catInfoResult = results.find((r) => r.toolName === 'get_cat_info')
  const isCatMissing = catInfoResult && (!catInfoResult.success || catInfoResult.output?.success === false)

  if (isCatMissing) {
    // 猫咪档案不存在，跳过所有依赖猫咪数据的分析工具
    return { followUpPlan: [], shouldDropFailed: true }
  }

  // 可扩展：根据 check_health 结果追加 RAG 查询饮食建议等
  const healthResult = results.find((r) => r.toolName === 'check_health')
  if (healthResult?.success && healthResult.output?.weightAnalysis?.status !== '正常') {
    // 健康异常 → 追加 RAG 查询建议
    return {
      followUpPlan: [
        {
          toolName: 'rag_search',
          reason: '健康状态异常，查询专业养护建议',
          parameters: { query: `猫咪健康建议 ${healthResult.output.weightAnalysis?.status || ''}` },
        },
      ],
      shouldDropFailed: false,
    }
  }

  return { followUpPlan: [], shouldDropFailed: false }
}
