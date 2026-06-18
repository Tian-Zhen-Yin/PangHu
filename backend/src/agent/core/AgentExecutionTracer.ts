/**
 * Agent 执行轨迹追踪器
 *
 * 在 Agent 执行过程中记录管道各阶段的执行情况（Router/Planner/Executor/Reporter）。
 * 注意：本组件记录的是确定性管道步骤，不等同于 LLM 的推理过程。
 *
 * 每个步骤携带真实的 durationMs（由调用方从外部计时传入），
 * 通过 SSE trace 事件推送到前端，供 ExecutionTracePanel 展示。
 */

export type TraceStepType = 'intent' | 'plan' | 'execute' | 'report'

export interface TraceStep {
  stepId: number
  type: TraceStepType
  title: string
  content: string
  timestamp: number
  durationMs?: number
  data?: Record<string, unknown>
}

export class ExecutionTracer {
  private steps: TraceStep[] = []
  private counter = 0

  private add(step: Omit<TraceStep, 'stepId'>): TraceStep {
    const full: TraceStep = { stepId: ++this.counter, ...step }
    this.steps.push(full)
    return full
  }

  recordIntent(
    message: string,
    intent: string,
    confidence: number,
    durationMs: number,
  ): TraceStep {
    const preview = message.length > 40 ? message.substring(0, 40) + '...' : message
    return this.add({
      type: 'intent',
      title: '意图识别',
      content: `用户输入："${preview}" → 命中【${intent}】`,
      timestamp: Date.now(),
      durationMs,
      data: { intent, confidence: Number(confidence.toFixed(2)) },
    })
  }

  recordPlan(
    toolNames: string[],
    strategyType: string,
    durationMs: number,
  ): TraceStep {
    return this.add({
      type: 'plan',
      title: '工具规划',
      content: `规划调用：${toolNames.join(' + ')}（${strategyType}）`,
      timestamp: Date.now(),
      durationMs,
      data: { toolNames, strategyType },
    })
  }

  recordExecute(
    toolName: string,
    status: 'start' | 'success' | 'error',
    durationMs?: number,
    error?: string,
  ): TraceStep {
    const content =
      status === 'start'
        ? `调用 ${toolName}`
        : status === 'success'
          ? `${toolName} 返回数据`
          : `${toolName} 失败：${error || '未知错误'}`
    return this.add({
      type: 'execute',
      title: `执行工具：${toolName}`,
      content,
      timestamp: Date.now(),
      durationMs,
      data: { toolName, status },
    })
  }

  recordReport(
    summary: string,
    keyPoints: string[],
    durationMs: number,
  ): TraceStep {
    return this.add({
      type: 'report',
      title: '生成回复',
      content: summary,
      timestamp: Date.now(),
      durationMs,
      data: { keyPoints },
    })
  }

  getTrace(): TraceStep[] {
    return [...this.steps]
  }
}
