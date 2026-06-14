/**
 * 把 Tool 输出 JSON 转成 LLM 可读的中文压缩文本。
 *
 * 设计原则:
 *   - LLM 处理结构化中文比 JSON 节省 token,且回答更自然
 *   - 失败/空结果统一短文案,LLM 自然能根据上下文给出友好回复
 */
export function formatToolOutput(toolName: string, output: unknown): string {
  // 通用错误处理
  if (output && typeof output === 'object' && 'error' in output) {
    const err = (output as { error: unknown }).error
    return `工具 ${toolName} 调用失败:${String(err)}`
  }

  if (output && typeof output === 'object' && 'success' in output && (output as any).success === false) {
    const msg = (output as any).message
    return msg ? `未找到:${msg}` : '未找到相关数据'
  }

  switch (toolName) {
    case 'get_cat_info':
      return formatCatInfo(output)
    case 'get_weight_trend':
      return formatWeightTrend(output)
    case 'check_health':
      return formatHealthCheck(output)
    case 'check_vaccine':
      return formatVaccineCheck(output)
    case 'rag_search':
      return formatRagSearch(output)
    default:
      return safeJsonStringify(output)
  }
}

function formatCatInfo(output: any): string {
  const cat = output?.cat
  if (!cat) return '未找到猫咪档案'
  const parts = [
    `猫咪信息:${cat.name}`,
    cat.breed ? `(${cat.breed}` : '',
    cat.age ? `,${cat.age}` : '',
    cat.weight ? `,体重${cat.weight}` : '',
    cat.breed || cat.age || cat.weight ? ')' : '',
  ]
  let text = parts.join('')
  if (cat.gender) text += ` 性别:${cat.gender}`
  if (cat.isNeutered !== undefined) text += `,${cat.isNeutered ? '已绝育' : '未绝育'}`
  if (cat.allergies) text += `;过敏史:${cat.allergies}`
  if (cat.diseases) text += `;既往病史:${cat.diseases}`
  if (cat.lastVaccine) text += `;最近疫苗:${cat.lastVaccine}`
  return text
}

function formatWeightTrend(output: any): string {
  const points = output?.points
  if (!Array.isArray(points) || points.length === 0) return '暂无体重记录'
  const head = `体重记录${points.length}条`
  const trend = output.trend ? `,趋势:${output.trend}` : ''
  const recent = points.slice(-3).map((p: any) => `${p.date}=${p.weight}kg`).join('、')
  return `${head}${trend};最近:${recent}`
}

function formatHealthCheck(output: any): string {
  const status = output?.weightAnalysis?.status
  const summary = output?.summary
  return [summary, status ? `体重状态:${status}` : ''].filter(Boolean).join(';') || '健康评估完成'
}

function formatVaccineCheck(output: any): string {
  const upcoming = output?.upcoming
  if (Array.isArray(upcoming) && upcoming.length > 0) {
    const list = upcoming.map((v: any) => `${v.name}(${v.daysLeft}天后)`).join('、')
    return `即将到期疫苗:${list}`
  }
  return '当前无即将到期的疫苗'
}

function formatRagSearch(output: any): string {
  const chunks = output?.chunks
  const titles = output?.guideTitles
  if (Array.isArray(titles) && titles.length > 0) {
    return `知识库参考:${titles.join('、')}`
  }
  if (Array.isArray(chunks) && chunks.length > 0) {
    return `检索到${chunks.length}条参考片段`
  }
  return '知识库无相关内容'
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
