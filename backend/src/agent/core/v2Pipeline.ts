/**
 * V2 规则管线(Router → Planner → Executor → Reporter)的流式实现。
 * 从 CatAgent.handleStreaming 中拆出:当 LLM_TOOL_CALLING_LOOP 关闭、
 * 或消息带图片附件时使用。AgentStreamResult.content 由 sink 累积。
 */
import type { AgentContext, AgentState, ToolResult, ChatMessage } from '../types/agent'
import { classifyIntent } from './AgentRouter'
import { buildPlan, advancePlan } from './AgentPlanner'
import { executePlan } from './AgentExecutor'
import { generateReport } from './AgentReporter'
import { ExecutionTracer } from './AgentExecutionTracer'
import { getKnowledgeContext } from '../../services/knowledge.service'
import { createConfirmation } from '../../services/confirmation.service'
import { recordAgentPhase, recordPlannerStrategy, recordSseEvent } from '../metrics'
import type { AgentSseSink } from './sseSink'
import type { AgentStreamResult } from '../index'
import { buildGreetingResponse } from '../prompts/greeting'
import { createLogger } from '../../utils/logger'

const log = createLogger('agent')

export function generateTraceId(): string {
  return 'agent-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 11)
}

const ENV = () => process.env.NODE_ENV || 'development'

function sseMetric(eventType: string, errorType?: string) {
  recordSseEvent({ eventType: eventType as 'meta', environment: ENV(), ...(errorType ? { errorType } : {}) })
}

/** 构造写入确认引导文案(在 pending_confirmation 之后推送给用户) */
export function buildConfirmGuideText(toolName: string): string {
  switch (toolName) {
    case 'ADD_growth_record':
      return '收到～我整理好了下面这条成长记录，请确认后我就帮你保存 🐾'
    case 'ADD_vaccine_record':
      return '收到～请确认下面的疫苗接种信息，确认后我会登记到健康档案 💉'
    case 'ADD_weight_record':
      return '收到～请确认下面的体重数据，确认后我会记录到体重曲线 ⚖️'
    case 'ADD_allergy_record':
      return '收到～请确认下面的过敏信息，确认后我会写入过敏档案 ⚠️'
    default:
      return '收到～请确认下面的信息后我再保存 🐾'
  }
}

/** 挂起一次写入确认并推送 pending_confirmation 事件(fast-path / V2 / V3 三路共用) */
export function pushPendingConfirmation(
  sink: AgentSseSink,
  ctx: AgentContext,
  toolName: string,
  draft: Record<string, unknown>,
  userMessage: string
): string {
  const confirmationId = createConfirmation(
    ctx.userId,
    ctx.selectedCatId || '',
    toolName,
    { userMessage, ...draft },
  )
  sink.writeEvent('pending_confirmation', {
    confirmationId,
    toolName,
    draft: { userMessage, ...draft },
    message: '该操作需要您确认后方可执行',
    expiresAt: Date.now() + 5 * 60 * 1000,
  })
  sseMetric('pending_confirmation')
  return confirmationId
}

export interface V2PipelineArgs {
  userMessage: string
  userId: string
  sessionId: string
  sink: AgentSseSink
  selectedCatId?: string
  history: ChatMessage[]
  attachments: string[]
  /** 管线结束(含提前返回)时上报聚合结果,由 CatAgent 转成返回值 */
  onFinish?: (result: AgentStreamResult) => void
}

export async function runV2Pipeline(args: V2PipelineArgs): Promise<void> {
  const { userMessage, userId, sessionId, sink, selectedCatId, history, attachments } = args

  const abortController = new AbortController()
  sink.onClose(() => abortController.abort())

  const ctx: AgentContext = {
    userId,
    sessionId,
    selectedCatId,
    traceId: generateTraceId(),
    logger: console,
    signal: abortController.signal,
    cache: new Map(),
  }

  const tracer = new ExecutionTracer()
  log.info(`trace=${ctx.traceId} user=${userId} message=${userMessage.substring(0, 50)}`)

  const state: AgentState = {
    userId,
    sessionId,
    userMessage,
    selectedCatId,
    history,
    attachments,
    plan: [],
    toolResults: [],
    traceId: ctx.traceId,
  }

  let toolNames: string[] = []
  let citations: string[] = []
  let finalToolResults: ToolResult[] = []

  try {
    // === 阶段 1: Router ===
    const routeStart = Date.now()
    const intentResult = classifyIntent(state)
    recordAgentPhase({ phase: 'router', intentType: intentResult.intent, durationMs: Date.now() - routeStart, environment: ENV() })
    ctx.logger.log(`[Agent] Intent: ${intentResult.intent} (confidence: ${intentResult.confidence.toFixed(2)})`)

    const intentStep = tracer.recordIntent(userMessage, intentResult.intent, intentResult.confidence, Date.now() - routeStart)
    sink.writeEvent('trace', { step: intentStep })
    sseMetric('trace')

    if (intentResult.intent === 'greeting') {
      const greeting = buildGreetingResponse(userMessage)
      sink.writeEvent('content', { text: greeting.answer })
      sink.writeEvent('done', { traceId: greeting.traceId })
      sink.end()
      return
    }

    // === 阶段 2: Planner ===
    const planStart = Date.now()
    const { plan, strategyType } = buildPlan(state, intentResult)
    state.plan = plan
    recordAgentPhase({ phase: 'planner', intentType: intentResult.intent, durationMs: Date.now() - planStart, environment: ENV(), toolCount: plan.length })
    recordPlannerStrategy({ intentType: intentResult.intent, strategyType, toolCount: plan.length, environment: ENV() })
    ctx.logger.log(`[Agent] Plan: ${strategyType} (${plan.length} tools)`)

    if (plan.length === 0 || abortController.signal.aborted) {
      sink.writeEvent('done', { traceId: ctx.traceId })
      sink.end()
      return
    }

    // 发 meta 事件：告知前端即将执行哪些工具
    toolNames = plan.map((p) => p.toolName)
    const planTraceStep = tracer.recordPlan(toolNames, strategyType, Date.now() - planStart)
    sink.writeEvent('trace', { step: planTraceStep })
    sseMetric('trace')
    sink.writeEvent('meta', { traceId: ctx.traceId, toolsCalled: toolNames, toolCount: plan.length })
    sseMetric('meta')

    // === 阶段 3: Executor（每完成一个工具就推送 SSE）===
    const execStart = Date.now()
    let confirmationPending = false
    const onToolResult = (result: ToolResult) => {
      const execStep = tracer.recordExecute(result.toolName, result.success ? 'success' : 'error', undefined, result.error)
      sink.writeEvent('trace', { step: execStep })
      sseMetric('trace')
      // V2.0 写入工具确认检测
      if (result.requiresConfirmation) {
        confirmationPending = true
        pushPendingConfirmation(sink, ctx, result.toolName, result.draft || {}, userMessage)
        return
      }
      sink.writeEvent('tool', {
        toolName: result.toolName,
        status: result.success ? 'success' : 'error',
        output: result.output,
      })
      sseMetric('tool')
    }

    let toolResults: ToolResult[] = await executePlan(plan, ctx, onToolResult)
    state.toolResults = toolResults
    recordAgentPhase({ phase: 'executor', intentType: intentResult.intent, durationMs: Date.now() - execStart, environment: ENV(), toolCount: toolResults.length })

    // 写入工具待确认：已推送 pending_confirmation，跳过后续报告，等待用户确认
    if (confirmationPending) {
      const writeToolName = plan.find((p) => p.toolName.startsWith('ADD_'))?.toolName || ''
      const guideText = buildConfirmGuideText(writeToolName)
      if (guideText) {
        sink.writeEvent('content', { text: guideText })
      }
      sink.writeEvent('done', { traceId: ctx.traceId })
      sseMetric('done')
      sink.end()
      return
    }

    // 动态分支
    if (!abortController.signal.aborted) {
      const { followUpPlan, shouldDropFailed } = advancePlan(plan, toolResults)
      if (shouldDropFailed) {
        toolResults = toolResults.filter((r) => r.toolName === 'rag_search' || r.success)
        state.toolResults = toolResults
      }
      if (followUpPlan.length > 0) {
        ctx.logger.log(`[Agent] Advancing plan with ${followUpPlan.length} tools`)
        const followUpResults = await executePlan(followUpPlan, ctx, (result) => {
          const execStep = tracer.recordExecute(result.toolName, result.success ? 'success' : 'error', undefined, result.error)
          sink.writeEvent('trace', { step: execStep })
          sink.writeEvent('tool', {
            toolName: result.toolName,
            status: result.success ? 'success' : 'error',
            output: result.output,
          })
          sseMetric('tool')
        })
        toolResults.push(...followUpResults)
        state.toolResults = toolResults
      }
    }

    const dataRichSteps = toolResults.filter((r) => r.success && r.output?.success !== false).length
    ctx.logger.log(`[Agent] ${dataRichSteps}/${toolResults.length} steps returned useful data`)

    // === 阶段 4: Reporter → 真实 LLM 流式输出 ===
    if (!abortController.signal.aborted) {
      const reportStart = Date.now()
      const report = generateReport(state, toolResults)

      const reportTraceStep = tracer.recordReport('生成回复', [], Date.now() - reportStart)
      sink.writeEvent('trace', { step: reportTraceStep })
      sseMetric('trace')

      // 当 reporter 主动返回空字符串（例如只调用了健康周报工具，前端会渲染卡片），
      // 直接跳过 LLM 调用，避免重复内容
      const reportIsEmpty = report.trim().length === 0
      const needsLLM = !reportIsEmpty && toolResults.length > 0 && report.length < 2000
      if (reportIsEmpty) {
        recordAgentPhase({ phase: 'reporter', intentType: intentResult.intent, durationMs: Date.now() - reportStart, environment: ENV() })
      } else if (needsLLM) {
        const knowledgeContext = await getKnowledgeContext(userMessage)
        const finalPrompt =
          '请基于以下工具执行结果，用友好、自然、专业的中文回答用户问题。不要提及"工具"或"执行步骤"等技术细节。\n\n' +
          '【工具执行结果】\n' + report +
          '\n\n【用户原始问题】\n' + userMessage +
          (knowledgeContext.context ? '\n\n【参考知识库】\n' + knowledgeContext.context : '') +
          '\n\n请整理成一段通顺、结构化的回答。'

        // 流式调用智谱 AI，逐 chunk 推 content 事件
        const { sendMessageStream: llmStream } = await import('../../services/ai.service')

        try {
          await sink.runCaptured((carrier) => llmStream(finalPrompt, history, '', carrier as never))
        } catch (error: any) {
          ctx.logger.log(`[Agent] LLM stream failed, falling back to chunked report: ${error.message}`)
          // 降级：分块推送模板报告（按字符分块，避免 UTF-8 多字节字符被截断）
          const chunkSize = Math.max(5, Math.ceil(report.length / 15))
          for (let i = 0; i < report.length && !abortController.signal.aborted; i += chunkSize) {
            sink.writeEvent('content', { text: report.slice(i, i + chunkSize) })
          }
        }
        recordAgentPhase({ phase: 'reporter', intentType: intentResult.intent, durationMs: Date.now() - reportStart, environment: ENV() })
      } else {
        const chunkSize = Math.max(5, Math.ceil(report.length / 15))
        for (let i = 0; i < report.length && !abortController.signal.aborted; i += chunkSize) {
          sink.writeEvent('content', { text: report.slice(i, i + chunkSize) })
        }
        recordAgentPhase({ phase: 'reporter', intentType: intentResult.intent, durationMs: Date.now() - reportStart, environment: ENV() })
      }
    }

    // 完成
    if (!abortController.signal.aborted) {
      citations = toolResults
        .filter((r) => r.toolName === 'rag_search' && r.output?.guideTitles)
        .flatMap((r) => r.output.guideTitles as string[])
        .slice(0, 5)
      finalToolResults = toolResults
      sink.writeEvent('done', { traceId: ctx.traceId, citations })
      sseMetric('done')
      sink.end()
    }
  } catch (error: any) {
    ctx.logger.log(`[Agent] Error: ${error.message}`)
    if (!sink.closed) {
      sink.writeEvent('error', { message: error.message || '处理失败' })
      recordSseEvent({ eventType: 'error', environment: ENV(), errorType: 'agent_error' })
      sink.end()
    }
  } finally {
    // 记录最终聚合结果,供上层读取(greeting/confirmation 提前返回时也覆盖)
    args.onFinish?.({
      content: sink.getContent(),
      citations,
      traceId: ctx.traceId,
      toolNames,
      toolResults: finalToolResults,
    })
  }
}
