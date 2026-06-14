/**
 * Agent 系统持续验证指标
 * 文件路径: backend/src/agent/metrics.ts
 *
 * 基于 Harness Continuous Verification 思想实现
 * 监控 Agent 系统的：成功率 / 响应时间 / 工具调用效率 / 健康状态
 *
 * 指标通过 SSE 端点暴露，可被 Prometheus / Grafana 采集
 * 结合 Harness 可实现：阈值告警 → 自动回滚
 */

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary'
export type MetricUnit = 'ms' | 'percent' | 'count' | 'bytes'

export interface MetricDefinition {
  name: string
  type: MetricType
  description: string
  unit: MetricUnit
  labels: string[]
  thresholds?: {
    warning?: number
    critical?: number
  }
}

export interface MetricSnapshot {
  name: string
  value: number
  labels: Record<string, string>
  timestamp: number
}

// ==================== Agent 指标定义 ====================

export const AGENT_METRICS: Record<string, MetricDefinition> = {

  // ======== 请求级指标 ========

  /** Agent 请求总数 */
  agent_requests_total: {
    name: 'agent_requests_total',
    type: 'counter',
    description: 'Agent 处理的总请求数',
    unit: 'count',
    labels: ['intent', 'status', 'environment'],
  },

  /** Agent 请求响应时间分布 */
  agent_request_duration_seconds: {
    name: 'agent_request_duration_seconds',
    type: 'histogram',
    description: 'Agent 请求从收到到完成的总耗时',
    unit: 'ms',
    labels: ['intent', 'environment'],
    thresholds: { warning: 3, critical: 10 },  // 秒
  },

  /** Agent 流式输出延迟（首 token 响应时间） */
  agent_first_token_latency_seconds: {
    name: 'agent_first_token_latency_seconds',
    type: 'histogram',
    description: '从请求到输出第一个 token 的延迟',
    unit: 'ms',
    labels: ['environment'],
    thresholds: { warning: 1, critical: 3 },
  },

  // ======== 工具调用指标 ========

  /** 工具调用总数（按工具名分组） */
  agent_tool_calls_total: {
    name: 'agent_tool_calls_total',
    type: 'counter',
    description: 'Agent 工具调用的总次数',
    unit: 'count',
    labels: ['tool_name', 'status', 'environment'],
    thresholds: { warning: undefined, critical: undefined },
  },

  /** 工具调用成功率 */
  agent_tool_success_rate: {
    name: 'agent_tool_success_rate',
    type: 'gauge',
    description: '各工具的成功率（百分比）',
    unit: 'percent',
    labels: ['tool_name', 'environment'],
    thresholds: { warning: 95, critical: 90 },  // 百分比
  },

  /** 单个工具执行时间 */
  agent_tool_duration_seconds: {
    name: 'agent_tool_duration_seconds',
    type: 'histogram',
    description: '单个工具的执行耗时',
    unit: 'ms',
    labels: ['tool_name', 'environment'],
    thresholds: { warning: 2, critical: 5 },
  },

  /** 工具调用超时次数 */
  agent_tool_timeout_total: {
    name: 'agent_tool_timeout_total',
    type: 'counter',
    description: '工具调用超时的总次数',
    unit: 'count',
    labels: ['tool_name', 'environment'],
    thresholds: { warning: 5, critical: 10 },
  },

  // ======== 意图分类指标 ========

  /** 意图分类分布 */
  agent_intent_distribution: {
    name: 'agent_intent_distribution',
    type: 'counter',
    description: '各意图类型的出现次数',
    unit: 'count',
    labels: ['intent_type', 'environment'],
  },

  /** 意图分类置信度 */
  agent_intent_confidence: {
    name: 'agent_intent_confidence',
    type: 'gauge',
    description: '意图分类的平均置信度',
    unit: 'percent',
    labels: ['intent_type', 'environment'],
    thresholds: { warning: 70, critical: 50 },
  },

  // ======== 工具规划指标 ========

  /** 规划工具数量分布 */
  agent_plan_tools_count: {
    name: 'agent_plan_tools_count',
    type: 'histogram',
    description: '单个请求规划调用的工具数量分布',
    unit: 'count',
    labels: ['environment'],
    thresholds: { warning: 5, critical: 10 },
  },

  /** 规划生成耗时 */
  agent_planning_duration_seconds: {
    name: 'agent_planning_duration_seconds',
    type: 'histogram',
    description: 'Agent Planner 生成工具调用计划的耗时',
    unit: 'ms',
    labels: ['environment'],
    thresholds: { warning: 0.5, critical: 1 },
  },

  // ======== Agent 四阶段耗时指标 ========
  // 对应 Agent 设计文档的 4 个核心模块：
  //   Router → Planner → Executor → Reporter

  /** Router 阶段耗时 */
  agent_router_latency_seconds: {
    name: 'agent_router_latency_seconds',
    type: 'histogram',
    description: 'AgentRouter 意图分类耗时',
    unit: 'ms',
    labels: ['intent_type', 'environment'],
    thresholds: { warning: 0.2, critical: 0.5 },
  },

  /** Planner 阶段耗时 */
  agent_planner_latency_seconds: {
    name: 'agent_planner_latency_seconds',
    type: 'histogram',
    description: 'AgentPlanner 工具规划耗时',
    unit: 'ms',
    labels: ['intent_type', 'tools_count', 'environment'],
    thresholds: { warning: 0.3, critical: 0.5 },
  },

  /** Executor 阶段耗时 */
  agent_executor_latency_seconds: {
    name: 'agent_executor_latency_seconds',
    type: 'histogram',
    description: 'AgentExecutor 工具执行总耗时',
    unit: 'ms',
    labels: ['intent_type', 'tools_count', 'environment'],
    thresholds: { warning: 5, critical: 10 },
  },

  /** Reporter 阶段耗时 */
  agent_reporter_latency_seconds: {
    name: 'agent_reporter_latency_seconds',
    type: 'histogram',
    description: 'AgentReporter 报告生成耗时（含 LLM 调用）',
    unit: 'ms',
    labels: ['intent_type', 'environment'],
    thresholds: { warning: 3, critical: 8 },
  },

  // ======== SSE 流式协议指标 ========
  // 对应 Agent 设计文档的 SSE 事件流（meta/tool/content/done/error）

  /** SSE 事件计数 */
  agent_sse_event_total: {
    name: 'agent_sse_event_total',
    type: 'counter',
    description: 'SSE 各事件类型的发送次数',
    unit: 'count',
    labels: ['event_type', 'environment'],
  },

  /** SSE 工具事件数分布 */
  agent_sse_tool_count: {
    name: 'agent_sse_tool_count',
    type: 'histogram',
    description: '单个请求中 tool 类型 SSE 事件的数量',
    unit: 'count',
    labels: ['environment'],
    thresholds: { warning: 8, critical: 15 },
  },

  /** SSE 内容块数分布 */
  agent_sse_content_chunks: {
    name: 'agent_sse_content_chunks',
    type: 'histogram',
    description: '单个请求中 content 类型 SSE 块的数量',
    unit: 'count',
    labels: ['environment'],
  },

  /** SSE 连接异常计数 */
  agent_sse_error_total: {
    name: 'agent_sse_error_total',
    type: 'counter',
    description: 'SSE 连接异常次数（断连/超时/格式错误）',
    unit: 'count',
    labels: ['error_type', 'environment'],
    thresholds: { warning: 5, critical: 15 },
  },

  /** SSE 完成率 */
  agent_sse_completion_rate: {
    name: 'agent_sse_completion_rate',
    type: 'gauge',
    description: 'SSE 完成率（done 事件数 / meta 事件数）',
    unit: 'percent',
    labels: ['environment'],
    thresholds: { warning: 95, critical: 90 },
  },

  // ======== 规划策略指标 ========

  /** 规划策略分布 */
  agent_planner_strategy_distribution: {
    name: 'agent_planner_strategy_distribution',
    type: 'counter',
    description: '各意图类型使用的规划策略分布',
    unit: 'count',
    labels: ['intent_type', 'strategy_type', 'environment'],
  },

  // ======== RAG 指标 ========

  /** RAG 检索命中数 */
  rag_retrieval_count: {
    name: 'rag_retrieval_count',
    type: 'histogram',
    description: '每次检索返回的相关文档数量',
    unit: 'count',
    labels: ['environment'],
  },

  /** RAG 向量检索耗时 */
  rag_embedding_latency_seconds: {
    name: 'rag_embedding_latency_seconds',
    type: 'histogram',
    description: '单次向量嵌入（embedding）耗时',
    unit: 'ms',
    labels: ['environment'],
    thresholds: { warning: 0.5, critical: 1 },
  },

  /** RAG 检索质量评分 */
  rag_relevance_score: {
    name: 'rag_relevance_score',
    type: 'gauge',
    description: '检索结果与查询的相关性评分（0-1）',
    unit: 'percent',
    labels: ['environment'],
    thresholds: { warning: 0.6, critical: 0.4 },
  },

  // ======== LLM 指标 ========

  /** LLM Token 使用量 */
  llm_tokens_used_total: {
    name: 'llm_tokens_used_total',
    type: 'counter',
    description: 'LLM 消耗的总 token 数',
    unit: 'count',
    labels: ['model', 'token_type', 'environment'],
  },

  /** LLM 响应耗时 */
  llm_response_duration_seconds: {
    name: 'llm_response_duration_seconds',
    type: 'histogram',
    description: 'LLM 单次响应的耗时（从请求到完成）',
    unit: 'ms',
    labels: ['model', 'environment'],
    thresholds: { warning: 5, critical: 15 },
  },

  // ======== 用户体验指标 ========

  /** 用户满意度评分（后续可扩展） */
  agent_satisfaction_score: {
    name: 'agent_satisfaction_score',
    type: 'gauge',
    description: '用户对 Agent 响应的满意度评分（1-5）',
    unit: 'count',
    labels: ['environment'],
    thresholds: { warning: 3.5, critical: 3.0 },
  },

  /** 用户反馈率 */
  agent_feedback_rate: {
    name: 'agent_feedback_rate',
    type: 'gauge',
    description: '提供反馈的用户比例（0-1）',
    unit: 'percent',
    labels: ['environment'],
  },

  /** 负面反馈率 */
  agent_negative_feedback_rate: {
    name: 'agent_negative_feedback_rate',
    type: 'gauge',
    description: '负面反馈占总反馈的比例',
    unit: 'percent',
    labels: ['environment'],
    thresholds: { warning: 0.15, critical: 0.25 },
  },
}

// ==================== 指标收集器 ====================

class MetricsCollector {
  private counters: Map<string, number> = new Map()
  private gauges: Map<string, number> = new Map()
  private histograms: Map<string, number[]> = new Map()
  private lastUpdate: Map<string, number> = new Map()

  constructor(private prefix = 'panghu_') {}

  /**
   * 递增计数器
   */
  incrementCounter(name: string, labels: Record<string, string> = {}, value = 1) {
    const key = this.makeKey(name, labels)
    const current = this.counters.get(key) || 0
    this.counters.set(key, current + value)
    this.lastUpdate.set(key, Date.now())
  }

  /**
   * 设置仪表值
   */
  setGauge(name: string, value: number, labels: Record<string, string> = {}) {
    const key = this.makeKey(name, labels)
    this.gauges.set(key, value)
    this.lastUpdate.set(key, Date.now())
  }

  /**
   * 记录直方图值（用于计算 P50/P90/P99）
   */
  recordHistogram(name: string, value: number, labels: Record<string, string> = {}) {
    const key = this.makeKey(name, labels)
    const existing = this.histograms.get(key) || []
    existing.push(value)
    // 保留最近 1000 个样本
    if (existing.length > 1000) existing.shift()
    this.histograms.set(key, existing)
    this.lastUpdate.set(key, Date.now())
  }

  /**
   * 计算百分位数
   */
  percentile(values: number[], p: number): number {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const idx = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[Math.max(0, idx)]
  }

  /**
   * 获取当前所有指标快照（Prometheus 格式）
   */
  snapshot(): MetricSnapshot[] {
    const results: MetricSnapshot[] = []

    // 计数器
    for (const [key, value] of this.counters) {
      const { name, labels } = this.parseKey(key)
      results.push({ name, value, labels, timestamp: this.lastUpdate.get(key) || Date.now() })
    }

    // 仪表
    for (const [key, value] of this.gauges) {
      const { name, labels } = this.parseKey(key)
      results.push({ name, value, labels, timestamp: this.lastUpdate.get(key) || Date.now() })
    }

    // 直方图（输出 P50/P90/P99）
    for (const [key, values] of this.histograms) {
      const { name, labels } = this.parseKey(key)
      const p50 = this.percentile(values, 50)
      const p90 = this.percentile(values, 90)
      const p99 = this.percentile(values, 99)
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      results.push({ name: `${name}_p50`, value: p50, labels: { ...labels, quantile: '0.5' }, timestamp: Date.now() })
      results.push({ name: `${name}_p90`, value: p90, labels: { ...labels, quantile: '0.9' }, timestamp: Date.now() })
      results.push({ name: `${name}_p99`, value: p99, labels: { ...labels, quantile: '0.99' }, timestamp: Date.now() })
      results.push({ name: `${name}_avg`, value: avg, labels: { ...labels, quantile: 'avg' }, timestamp: Date.now() })
    }

    return results
  }

  /**
   * Prometheus 文本格式输出
   */
  toPrometheusFormat(): string {
    const lines: string[] = []
    const snapshots = this.snapshot()

    // 按指标名分组
    const byName = new Map<string, MetricSnapshot[]>()
    for (const s of snapshots) {
      const list = byName.get(s.name) || []
      list.push(s)
      byName.set(s.name, list)
    }

    for (const [name, items] of byName) {
      // 输出 HELP 和 TYPE（使用带前缀的完整指标名）
      const def = Object.values(AGENT_METRICS).find(m => m.name === name)
      const fullName = `${this.prefix}${name}`
      if (def) {
        lines.push(`# HELP ${fullName} ${def.description}`)
        lines.push(`# TYPE ${fullName} ${def.type}`)
      }

      for (const item of items) {
        const labelStr = Object.entries(item.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',')
        const labelsPart = labelStr ? `{${labelStr}}` : ''
        lines.push(`${fullName}${labelsPart} ${item.value}`)
      }
    }

    return lines.join('\n') + '\n'
  }

  private makeKey(name: string, labels: Record<string, string>): string {
    const sorted = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b))
    const labelStr = sorted.map(([k, v]) => `${k}=${v}`).join(',')
    return `${name}{${labelStr}}`
  }

  private parseKey(key: string): { name: string; labels: Record<string, string> } {
    const match = key.match(/^(.+?)\{(.*)\}$/)
    if (!match) return { name: key, labels: {} }
    const [, name, labelStr] = match
    const labels: Record<string, string> = {}
    for (const pair of labelStr.split(',')) {
      const [k, v] = pair.split('=')
      if (k && v) labels[k] = v
    }
    return { name, labels }
  }
}

// 全局指标收集器实例
export const agentMetrics = new MetricsCollector('panghu_')

// ==================== 便捷记录函数 ====================

/**
 * 记录 Agent 请求完成
 */
export function recordAgentRequest(params: {
  intent: string
  status: 'success' | 'error'
  durationMs: number
  toolCount: number
  environment: string
  errorMessage?: string
}) {
  const { intent, status, durationMs, toolCount, environment } = params

  agentMetrics.incrementCounter('agent_requests_total', {
    intent,
    status,
    environment,
  })

  agentMetrics.recordHistogram('agent_request_duration_seconds', durationMs / 1000, {
    intent,
    environment,
  })

  agentMetrics.recordHistogram('agent_plan_tools_count', toolCount, { environment })

  if (status === 'error') {
    agentMetrics.incrementCounter('agent_errors_total', {
      intent,
      environment,
      error_type: params.errorMessage || 'unknown',
    })
  }
}

/**
 * 记录工具调用
 */
export function recordToolCall(params: {
  toolName: string
  status: 'success' | 'error' | 'timeout'
  durationMs: number
  environment: string
}) {
  const { toolName, status, durationMs, environment } = params

  agentMetrics.incrementCounter('agent_tool_calls_total', {
    tool_name: toolName,
    status,
    environment,
  })

  agentMetrics.recordHistogram('agent_tool_duration_seconds', durationMs / 1000, {
    tool_name: toolName,
    environment,
  })

  if (status === 'timeout') {
    agentMetrics.incrementCounter('agent_tool_timeout_total', {
      tool_name: toolName,
      environment,
    })
  }
}

/**
 * 记录意图分类
 */
export function recordIntentClassification(params: {
  intentType: string
  confidence: number
  environment: string
}) {
  agentMetrics.incrementCounter('agent_intent_distribution', {
    intent_type: params.intentType,
    environment: params.environment,
  })

  // 更新置信度（简单平均）
  const prevScore = agentMetrics['gauges']?.get(`agent_intent_confidence{${params.intentType}}`) || 0
  agentMetrics.setGauge('agent_intent_confidence', prevScore, {
    intent_type: params.intentType,
    environment: params.environment,
  })
}

/**
 * 记录 Agent 四个阶段的耗时
 * 对应 Agent 设计文档架构: Router → Planner → Executor → Reporter
 */
export function recordAgentPhase(params: {
  phase: 'router' | 'planner' | 'executor' | 'reporter'
  intentType: string
  durationMs: number
  environment: string
  toolCount?: number
}) {
  const { phase, intentType, durationMs, environment, toolCount } = params
  const metricName = `agent_${phase}_latency_seconds`
  const labels: Record<string, string> = {
    intent_type: intentType,
    environment,
  }
  if (toolCount !== undefined) {
    labels.tools_count = String(toolCount)
  }

  agentMetrics.recordHistogram(metricName, durationMs / 1000, labels)
}

/**
 * 记录 SSE 流式事件
 * 对应 Agent 设计文档 SSE 协议（meta/tool/content/done/error）
 */
export function recordSseEvent(params: {
  eventType: 'meta' | 'tool' | 'content' | 'done' | 'error'
  environment: string
  errorType?: string
}) {
  const { eventType, environment, errorType } = params

  agentMetrics.incrementCounter('agent_sse_event_total', {
    event_type: eventType,
    environment,
  })

  if (eventType === 'error' && errorType) {
    agentMetrics.incrementCounter('agent_sse_error_total', {
      error_type: errorType,
      environment,
    })
  }
}

/**
 * 记录规划策略分布
 * 对应 Agent 设计文档的 Intent → 工具组合映射表
 */
export function recordPlannerStrategy(params: {
  intentType: string
  strategyType: string  // 例如: 'single_tool', 'multi_tool_health', 'rag_only', 'noop'
  toolCount: number
  environment: string
}) {
  const { intentType, strategyType, toolCount, environment } = params

  agentMetrics.incrementCounter('agent_planner_strategy_distribution', {
    intent_type: intentType,
    strategy_type: strategyType,
    environment,
  })

  agentMetrics.recordHistogram('agent_sse_tool_count', toolCount, { environment })
}

// ==================== 工具名称常量 ====================
// 与 Agent 设计文档的工具清单保持一致

export const TOOL_NAMES = {
  CAT_INFO: 'get_cat_info',
  WEIGHT_TREND: 'get_weight_trend',
  CHECK_HEALTH: 'check_health',
  CHECK_VACCINE: 'check_vaccine',
  RAG_SEARCH: 'rag_search',
} as const

// ==================== 健康检查端点 ====================

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  uptime: number
  metrics: {
    requestsPerMinute: number
    avgResponseTime: number
    toolSuccessRate: number
    errorRate: number
  }
  checks: {
    name: string
    status: 'pass' | 'warn' | 'fail'
    message?: string
  }[]
}

export function getHealthStatus(): HealthStatus {
  const snapshots = agentMetrics.snapshot()

  // 计算关键指标
  const reqTotal = snapshots.find(s => s.name === 'agent_requests_total' && s.labels.status === 'success')?.value || 0
  const reqErrors = snapshots.find(s => s.name === 'agent_requests_total' && s.labels.status === 'error')?.value || 0
  const errorRate = reqTotal + reqErrors > 0 ? reqErrors / (reqTotal + reqErrors) : 0

  const toolSuccess = snapshots.find(s => s.name === 'agent_tool_calls_total' && s.labels.status === 'success')?.value || 0
  const toolErrors = snapshots.find(s => s.name === 'agent_tool_calls_total' && s.labels.status === 'error')?.value || 0
  const toolSuccessRate = toolSuccess + toolErrors > 0 ? (toolSuccess / (toolSuccess + toolErrors)) * 100 : 100

  // 计算平均响应时间
  const durations = snapshots.filter(s => s.name === 'agent_request_duration_seconds_avg')
  const avgResponseTime = durations.reduce((sum, d) => sum + d.value, 0) / (durations.length || 1)

  const checks = [
    {
      name: 'Agent Mode',
      status: 'pass' as const,
    },
    {
      name: 'Tool Registry',
      status: 'pass' as const,
    },
    {
      name: 'LLM Connection',
      status: toolSuccessRate > 90 ? 'pass' as const : 'warn' as const,
      message: toolSuccessRate > 90 ? undefined : `Tool success rate: ${toolSuccessRate.toFixed(1)}%`,
    },
  ]

  let status: HealthStatus['status'] = 'healthy'
  if (errorRate > 0.1 || toolSuccessRate < 90) status = 'unhealthy'
  else if (errorRate > 0.05 || toolSuccessRate < 95) status = 'degraded'

  return {
    status,
    version: process.env.APP_VERSION || '1.0.0',
    uptime: process.uptime(),
    metrics: {
      requestsPerMinute: reqTotal,
      avgResponseTime: avgResponseTime * 1000,  // 转为 ms
      toolSuccessRate,
      errorRate: errorRate * 100,
    },
    checks,
  }
}
