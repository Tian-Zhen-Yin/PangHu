import type { AgentState, IntentResult } from '../types/agent'

const GREETING_PATTERNS = [
  '你好', '您好', 'hi', 'hello', '嗨', '哈喽',
  '在吗', '有人吗', '早上好', '晚上好', '下午好',
  '嗨嗨', '你好啊', '您好啊',
]

const CAT_INFO_PATTERNS = [
  '信息', '档案', '多大', '多大了', '几岁', '性别', '品种',
  '介绍', '基本信息', '基本情况', '出生', '生日',
  '绝育', '绝育了', '记录', '最后', '最近记录',
]

const HEALTH_PATTERNS = [
  '健康', '体重', '胖了', '瘦了', '胖', '瘦', '超重',
  '减肥', '健康吗', '状况', '状态', '指标', '标准',
  '饮食', '喂食', '吃什么', '营养', '健康评估',
  '运动', '活动', '建议', '怎么办', '怎么处理',
]

const VACCINE_PATTERNS = [
  '疫苗', '接种', '打针', '免疫', '驱虫',
  '下次', '到期', '时间', '什么时候打', '该打了',
]

const WEIGHT_TREND_PATTERNS = [
  '趋势', '变化', '最近', '体重变化', '变化趋势',
  '曲线图', '图表', '记录', '历史', '趋势图',
]

// V2.0 过敏本体词：必须命中这些词才触发 allergy_query 意图。
// 症状词（皮肤/呕吐/拉肚子）不单独触发过敏意图，避免误判。
// 例："奶糖皮肤有点红" → health_consultation（而非误判为过敏）
//     "奶糖有哪些过敏" → allergy_query
const ALLERGY_BODY_KEYWORDS = [
  '过敏', '过敏史', '过敏原', '食物过敏',
]

// V2.0 周报意图关键词：时间词 × 健康词组合匹配
// 必须同时命中时间词和健康词，或命中显式词才触发 health_report_request。
// 避免"这周猫粮还剩多少""本周天气"等误触发。
const REPORT_TIME_KEYWORDS = ['这周', '本周', '最近一周', '上周', '近一周', '周报']
const REPORT_HEALTH_KEYWORDS = ['健康', '健康状况', '健康总结', '健康报告', '整体健康']
const REPORT_EXPLICIT_KEYWORDS = ['健康周报', '健康报告', '健康状况总结', '健康周总结']

function containsAny(message: string, patterns: string[]): boolean {
  const lower = message.toLowerCase()
  return patterns.some((p) => lower.includes(p.toLowerCase()))
}

/** 计算关键词密度：匹配的关键词数 / 消息总长度 */
function matchDensity(message: string, patterns: string[]): number {
  const lower = message.toLowerCase()
  const matches = patterns.filter((p) => lower.includes(p.toLowerCase()))
  if (matches.length === 0 || message.length === 0) return 0
  // 匹配关键词总字符数占比
  const matchChars = matches.reduce((sum, p) => sum + p.length, 0)
  return Math.min(matchChars / message.length, 1)
}

export function classifyIntent(state: AgentState): IntentResult {
  const message = state.userMessage.trim()

  if (message.length === 0) return { intent: 'unknown', confidence: 0 }

  const hasCatInfo = containsAny(message, CAT_INFO_PATTERNS)
  const hasHealth = containsAny(message, HEALTH_PATTERNS)
  const hasVaccine = containsAny(message, VACCINE_PATTERNS)
  const hasWeightTrend = containsAny(message, WEIGHT_TREND_PATTERNS)
  const isGreeting = containsAny(message, GREETING_PATTERNS)

  const dataQueryPatterns = hasCatInfo || hasHealth || hasVaccine || hasWeightTrend

  // 纯问候
  if (isGreeting && !dataQueryPatterns) {
    const density = matchDensity(message, GREETING_PATTERNS)
    return { intent: 'greeting', confidence: Math.min(0.7 + density * 0.3, 1.0) }
  }

  // V2.0 过敏意图检测（优先于其他数据查询）
  // 命中过敏本体词即判定为 allergy_query，不走 mixed 逻辑
  const hasAllergyBody = containsAny(message, ALLERGY_BODY_KEYWORDS)
  if (hasAllergyBody) {
    // V2.0 区分过敏查询 vs 录入：检查是否含记录动作词
    const RECORD_ACTION_KEYWORDS = ['记录', '新增', '添加', '记住', '录入', '记一下', '帮他记', '帮她记']
    const hasRecordAction = containsAny(message, RECORD_ACTION_KEYWORDS)
    if (hasRecordAction) {
      return { intent: 'allergy_record', confidence: 0.88 }
    }
    const density = matchDensity(message, ALLERGY_BODY_KEYWORDS)
    return { intent: 'allergy_query', confidence: Math.min(0.8 + density * 0.15, 0.95) }
  }

  // V2.0 周报意图检测：显式词 OR（时间词 AND 健康词）
  const isExplicitReport = containsAny(message, REPORT_EXPLICIT_KEYWORDS)
  const hasReportTime = containsAny(message, REPORT_TIME_KEYWORDS)
  const hasReportHealth = containsAny(message, REPORT_HEALTH_KEYWORDS)
  if (isExplicitReport || (hasReportTime && hasReportHealth)) {
    return { intent: 'health_report_request', confidence: 0.88 }
  }

  const matchedCategories: string[] = []
  if (hasCatInfo) matchedCategories.push('cat_info_query')
  if (hasHealth) matchedCategories.push('health_consultation')
  if (hasVaccine) matchedCategories.push('health_consultation')
  if (hasWeightTrend) matchedCategories.push('health_consultation')

  if (matchedCategories.length > 1) {
    // 混合意图：置信度取决于匹配密度
    const densities = [
      hasCatInfo ? matchDensity(message, CAT_INFO_PATTERNS) : 0,
      hasHealth ? matchDensity(message, HEALTH_PATTERNS) : 0,
      hasVaccine ? matchDensity(message, VACCINE_PATTERNS) : 0,
      hasWeightTrend ? matchDensity(message, WEIGHT_TREND_PATTERNS) : 0,
    ]
    const avgDensity = densities.reduce((a, b) => a + b, 0) / densities.length
    return { intent: 'mixed', confidence: Math.min(0.5 + avgDensity * 0.4, 0.95) }
  }

  if (matchedCategories.length === 1) {
    const intent = matchedCategories[0] as 'cat_info_query' | 'health_consultation'
    const patterns = intent === 'cat_info_query' ? CAT_INFO_PATTERNS : [...HEALTH_PATTERNS, ...VACCINE_PATTERNS, ...WEIGHT_TREND_PATTERNS]
    const density = matchDensity(message, patterns)
    return { intent, confidence: Math.min(0.6 + density * 0.35, 0.98) }
  }

  // 未匹配任何领域模式 → general_knowledge（低置信度）
  return { intent: 'general_knowledge', confidence: 0.45 }
}
