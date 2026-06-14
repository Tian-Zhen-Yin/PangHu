import type { AgentState, ToolResult } from '../types/agent'

function formatCatInfo(result: ToolResult): string {
  const data = result.output
  if (!data?.cat) return data?.message || ''

  const cat = data.cat
  const lines: string[] = []
  lines.push(`【${cat.name}】`)
  lines.push(`• 品种: ${cat.breed || '未知'}`)
  lines.push(`• 性别: ${cat.gender}`)
  lines.push(`• 年龄: ${cat.age}`)
  if (cat.weight) lines.push(`• 当前体重: ${cat.weight}`)
  lines.push(`• 绝育状态: ${cat.isNeutered ? '已绝育' : '未绝育'}`)
  if (cat.allergies) lines.push(`• 过敏史: ${cat.allergies}`)
  if (cat.diseases) lines.push(`• 疾病史: ${cat.diseases}`)
  if (cat.lastVaccine) lines.push(`• 最近疫苗: ${cat.lastVaccine}`)
  if (cat.lastRecordDate) lines.push(`• 最近记录: ${cat.lastRecordDate}`)

  return lines.join('\n')
}

function formatWeightTrend(result: ToolResult): string {
  const data = result.output
  if (!data?.analysis) return data?.message || ''
  const analysis = data.analysis
  const catName = data.catName || ''

  const trendEmoji = analysis.trend === '上升' ? '📈' : analysis.trend === '下降' ? '📉' : '➡️'

  const lines: string[] = []
  lines.push(`【${catName} 体重趋势 ${trendEmoji}】`)
  lines.push(`• 记录总数: ${analysis.totalRecords} 条`)
  lines.push(`• 覆盖时间: ${analysis.daysCovered} 天`)
  if (analysis.startWeight !== null && analysis.endWeight !== null) {
    lines.push(`• 起始体重: ${analysis.startWeight} kg → 当前: ${analysis.endWeight} kg`)
  }
  if (analysis.change !== null && analysis.changePercent !== null) {
    const sign = analysis.change > 0 ? '+' : ''
    lines.push(`• 总体变化: ${sign}${analysis.change} kg (${sign}${analysis.changePercent}%)`)
  }
  if (analysis.averageWeight !== null) lines.push(`• 平均体重: ${analysis.averageWeight} kg`)
  if (analysis.maxWeight !== null && analysis.minWeight !== null) {
    lines.push(`• 体重范围: ${analysis.minWeight} - ${analysis.maxWeight} kg`)
  }
  if (analysis.recent30DaysChange !== null) {
    const sign = analysis.recent30DaysChange > 0 ? '+' : ''
    lines.push(`• 近 30 天变化: ${sign}${analysis.recent30DaysChange}%`)
  }
  lines.push(`• 趋势判断: ${analysis.trend}`)
  return lines.join('\n')
}

function formatHealthCheck(result: ToolResult): string {
  const data = result.output
  if (!data?.weightAnalysis) return data?.message || ''
  const wa = data.weightAnalysis
  const catName = data.catName || ''
  const statusEmoji = wa.status === '正常' ? '✅' : wa.status === '超重' ? '⚠️' : '⚖️'

  const lines: string[] = []
  lines.push(`【${catName} 健康评估 ${statusEmoji}】`)
  lines.push(`• 当前体重: ${wa.currentWeight}`)
  if (wa.standardRange) lines.push(`• 品种标准范围: ${wa.standardRange}`)
  lines.push(`• 与标准中心偏差: ${wa.deviation}`)
  lines.push(`• 健康状态: ${wa.status}`)
  lines.push(`• 评估结论: ${wa.message}`)

  if (data.generalAdvice && data.generalAdvice.length > 0) {
    lines.push('')
    lines.push('【专业建议】')
    for (const advice of data.generalAdvice) {
      lines.push(`• ${advice}`)
    }
  }

  return lines.join('\n')
}

function formatVaccineCheck(result: ToolResult): string {
  const data = result.output
  if (!data?.vaccines || data.vaccines.length === 0) return data?.message || ''
  const catName = data.catName || ''

  const lines: string[] = []
  lines.push(`【${catName} 疫苗接种记录】`)
  for (const v of data.vaccines) {
    let status = ''
    if (v.daysUntilDue !== null) {
      if (v.daysUntilDue < 0) status = ` (已逾期 ${Math.abs(v.daysUntilDue)} 天)`
      else status = ` (下次 ${v.nextDueDate}，还有 ${v.daysUntilDue} 天)`
    }
    lines.push(`• ${v.name} ${v.date}${status}`)
  }

  if (data.needsAttention && data.needsAttention.length > 0) {
    lines.push('')
    lines.push('【需要关注】')
    for (const item of data.needsAttention) {
      const icon = item.priority === 'high' ? '🔴' : '🟡'
      lines.push(`${icon} ${item.name}：${item.message}`)
    }
  }

  return lines.join('\n')
}

function formatRagSearch(result: ToolResult): string {
  const data = result.output
  if (!data || !data.context) return ''
  return data.context
}

function formatHealthReport(result: ToolResult): string {
  const data = result.output
  if (!data?.success || !data?.report) return data?.message || ''
  const r = data.report
  const lines: string[] = []

  const start = new Date(r.timeRange.startDate)
  const end = new Date(r.timeRange.endDate)

  // ── 头部 ──
  lines.push(`📊 ${r.catInfo.name} 健康周报`)
  lines.push(`📅 ${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`)
  lines.push('')

  // ── 体重 ──
  if (r.weightTrend) {
    const wt = r.weightTrend
    const sign = (wt.changePercent ?? 0) >= 0 ? '+' : ''
    let weightLine = `📈 体重：${wt.currentWeight}${wt.unit}（${sign}${(wt.changePercent ?? 0).toFixed(2)}%）`
    if (wt.standardRange) {
      weightLine += `，标准 ${wt.standardRange.min}-${wt.standardRange.max}${wt.unit}`
    }
    lines.push(weightLine)
  }

  // ── 评分 ──
  const levelMap: Record<string, string> = { excellent: '优秀', good: '良好', fair: '一般', poor: '需关注' }
  lines.push(`🎯 评分：${r.healthScore.total}/100（${levelMap[r.healthScore.level] || r.healthScore.level}）`)

  // ── 疫苗 ──
  if (r.vaccineStatus) {
    const vs = r.vaccineStatus
    let vaxLine = `💉 疫苗：${vs.upToDate ? '已更新' : '需关注'}（共 ${vs.totalVaccines} 次）`
    if (vs.nextDueDate) {
      vaxLine += `，下次 ${vs.nextDueVaccine}（${vs.nextDueDate}）`
    }
    lines.push(vaxLine)
  }

  // ── 过敏 ──
  if (r.allergySummary.totalRecords > 0) {
    const a = r.allergySummary
    let allergyLine = `🤧 过敏：${a.totalRecords} 条记录`
    if (a.recentOccurrences > 0) {
      allergyLine += `，本周 ${a.recentOccurrences} 次`
    }
    if (a.topAllergens.length > 0) {
      allergyLine += `（${a.topAllergens.join('、')}）`
    }
    lines.push(allergyLine)
  }

  // ── 亮点 ──
  if (r.highlights && r.highlights.length > 0) {
    lines.push('')
    lines.push('🔔 本周亮点')
    for (const h of r.highlights) {
      const icon = h.type === 'positive' ? '✅' : h.type === 'warning' ? '⚠️' : 'ℹ️'
      lines.push(`  ${icon} ${h.title}：${h.detail}`)
    }
  }

  return lines.join('\n')
}

function formatResult(result: ToolResult): string {
  if (!result.success) {
    return `⚠️ ${result.toolName}: ${result.error || '执行失败'}`
  }
  if (result.output?.success === false) {
    return `⚠️ ${result.toolName}: ${result.output.message || '无相关数据'}`
  }
  switch (result.toolName) {
    case 'get_cat_info':
      return formatCatInfo(result)
    case 'get_weight_trend':
      return formatWeightTrend(result)
    case 'check_health':
      return formatHealthCheck(result)
    case 'check_vaccine':
      return formatVaccineCheck(result)
    case 'rag_search':
      return formatRagSearch(result)
    case 'GENERATE_health_report':
      return formatHealthReport(result)
    default:
      return JSON.stringify(result.output, null, 2)
  }
}

export function generateReport(state: AgentState, results: ToolResult[]): string {
  const bodyParts = results
    .map((r) => formatResult(r))
    .filter((text) => text && text.trim().length > 0)

  const body = bodyParts.join('\n\n')
  const closing = '\n\n希望这些信息对你有帮助～如果还有其他问题，随时可以问我！'

  if (bodyParts.length === 0) {
    return '你好！我是喵喵医生 🐾\n\n关于你的问题，我暂时没有找到足够的数据来回答。你可以：\n• 先去添加猫咪档案\n• 换一种方式描述你的问题\n\n或者直接问我关于养猫的一般性问题～'
  }

  const greeting = state.userMessage.length > 0 ? '让我来为你整理一下信息 🐾\n\n' : ''

  return greeting + body + closing
}
