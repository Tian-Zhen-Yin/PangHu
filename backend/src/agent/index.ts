import type { AgentContext, AgentState, PlanStep, ToolResult, AgentResponse, ChatMessage } from './types/agent'
import { classifyIntent } from './core/AgentRouter'
import { buildPlan, advancePlan } from './core/AgentPlanner'
import { executePlan } from './core/AgentExecutor'
import { generateReport } from './core/AgentReporter'
import { ExecutionTracer } from './core/AgentExecutionTracer'
import { listTools, getTool } from './tools'
import { getKnowledgeContext } from '../services/knowledge.service'
import { createConfirmation } from '../services/confirmation.service'
import type { Response } from 'express'
import { recordAgentPhase, recordPlannerStrategy, recordSseEvent } from './metrics'
import { AgentLoop, type PendingConfirmation } from './core/AgentLoop'
import { zhipuaiClient } from './llm/zhipuaiClient'
import { isFeatureEnabled, getDefaultContext, type UserSegment } from '../config/featureFlags'
import { getIntentRecaller } from './core/IntentRecaller'
import { callTool } from './core/AgentExecutor'

function generateTraceId(): string {
  return 'agent-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9)
}

/**
 * Agent 流式输出的最终聚合结果。
 * 控制层据此将 assistant 回复持久化到数据库（P0 #2 修复）。
 */
export interface AgentStreamResult {
  content: string         // 累积的回复文本（包含 greeting / 模板报告 / LLM 输出）
  citations: string[]     // RAG 引用（guide titles）
  traceId: string
  toolNames: string[]     // 实际执行的工具名列表
  toolResults?: ToolResult[] // 完整工具执行结果（供持久化卡片渲染数据）
}

/**
 * 从 SSE 写入字节流中提取文本内容。
 * 兼容两种格式：
 *   - Agent 自有格式：`data: {"type":"content","text":"..."}`
 *   - SSEStream 工具格式：`data: {"content":"..."}` （由 ai.service sendMessageStream 产出）
 */
function extractContentFromSseChunk(chunk: string): string[] {
  const parts: string[] = []
  for (const line of chunk.split('\n')) {
    if (!line.startsWith('data: ')) continue
    const raw = line.slice(6)
    try {
      const parsed = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null) continue
      if (parsed.type === 'content' && typeof parsed.text === 'string') {
        parts.push(parsed.text)
      } else if (typeof parsed.content === 'string') {
        parts.push(parsed.content)
      }
    } catch {
      // 非 JSON 行（如 SSE 注释）忽略
    }
  }
  return parts
}

function buildGreetingResponse(message: string): AgentResponse {
  const greetingText =
    /你好|您好|hi|hello|嗨|哈喽|在吗|有人吗|早上好|晚上好|下午好/i.test(message)
      ? '你好！我是喵喵医生 🐾\n\n我可以帮你：\n• 查看猫咪档案和健康状态\n• 分析体重变化趋势\n• 评估健康状况并给出建议\n• 检查疫苗接种记录\n• 解答养猫相关的专业问题\n\n直接告诉我你想了解什么吧～'
      : '很高兴为你服务！请告诉我你想了解的内容，我会尽力帮助你 🐾'

  return {
    answer: greetingText,
    toolResults: [],
    traceId: generateTraceId(),
    confidence: 1.0,
  }
}

export interface StreamCallbacks {
  onMeta?: (traceId: string, toolNames: string[]) => void
  onToolResult?: (result: ToolResult) => void
  onContent?: (text: string) => void
  onDone?: (traceId: string) => void
  onError?: (message: string) => void
}

export class CatAgent {
  /**
   * V3.1 LLM tool-calling loop 协调器（开放全部工具,含 write）。
   * write 工具仍由 confirmationToken 机制守门:LLM 选中后 → AgentLoop 中断 → SSE 推 pending_confirmation。
   */
  private readonly agentLoop = new AgentLoop(zhipuaiClient, listTools(), { maxIterations: 5 })

  /**
   * 构造写入确认引导文案(在 pending_confirmation 之后推送给用户)。
   */
  private buildConfirmGuideText(toolName: string): string {
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

  /**
   * Embedding fast-path: 在 LLM 之前先用 IntentRecaller 做意图召回。
   *
   * - 高置信命中 read 工具: 直接执行 + 返回工具输出文本(零 LLM 调用)
   * - 高置信命中 write 工具: 推 pending_confirmation,等待用户确认
   * - 未命中或低置信: 返回 null,上层回落到 LLM AgentLoop
   *
   * 安全考虑:
   * - write 工具仍走 confirmationToken 二次确认(与 LLM 路径一致)
   * - 历史消息存在 / 多轮对话场景仍走 LLM(避免 fast-path 抢上下文)
   * - 错误时静默回落,不影响主流程
   */
  private async tryFastPath(
    userMessage: string,
    ctx: AgentContext,
    res: Response,
  ): Promise<{ content: string; toolNames: string[]; toolResults: ToolResult[] } | null> {
    const apiKey = process.env.ZHIPUAI_API_KEY
    if (!apiKey) return null

    const recaller = getIntentRecaller()
    if (!recaller.isReady()) return null

    try {
      const recall = await recaller.recall(userMessage, apiKey)
      if (!recall || !recall.highConfidence) {
        ctx.logger.log(`[FastPath] miss: ${recall ? `low_sim=${recall.similarity.toFixed(3)}` : 'no_recall'}`)
        return null
      }

      ctx.logger.log(
        `[FastPath] ✅ hit: ${recall.toolName} (sim=${recall.similarity.toFixed(3)}, ` +
        `anchor="${recall.matchedAnchor}", cache=${recall.cacheHit}, dur=${recall.durationMs}ms)`,
      )

      // 命中: 推 trace 事件方便前端展示
      this.writeSse(res, 'trace', {
        step: {
          type: 'fast_path_hit',
          toolName: recall.toolName,
          similarity: recall.similarity,
          matchedAnchor: recall.matchedAnchor,
        },
      })

      const tool = getTool(recall.toolName)
      if (!tool) {
        ctx.logger.warn(`[FastPath] anchor 指向了不存在的工具: ${recall.toolName}`)
        return null
      }

      // write 工具: 推 pending_confirmation,等待用户确认
      if (tool.permissions?.includes('write')) {
        const pending: PendingConfirmation = { toolName: tool.name, parameters: {} }
        const confirmationId = createConfirmation(
          ctx.userId,
          ctx.selectedCatId || '',
          pending.toolName,
          { userMessage, ...pending.parameters },
        )
        this.writeSse(res, 'pending_confirmation', {
          confirmationId,
          toolName: pending.toolName,
          draft: { userMessage, ...pending.parameters },
          message: '该操作需要您确认后方可执行',
          expiresAt: Date.now() + 5 * 60 * 1000,
        })
        recordSseEvent({ eventType: 'pending_confirmation', environment: process.env.NODE_ENV || 'development' })

        const guideText = this.buildConfirmGuideText(pending.toolName)
        if (guideText) this.writeSse(res, 'content', { text: guideText })

        return { content: guideText, toolNames: [tool.name], toolResults: [] }
      }

      // read 工具: 直接执行 + 推工具结果 + 简短总结
      const result = await callTool(tool.name, {}, ctx, 'fast-path recall', tool)
      this.writeSse(res, 'tool', {
        toolName: result.toolName,
        status: result.success ? 'success' : 'error',
        output: result.output,
      })

      if (!result.success) {
        // 失败回落到 LLM,让模型尝试别的方案
        ctx.logger.warn(`[FastPath] tool 执行失败,回落 LLM: ${result.error}`)
        return null
      }

      // 简短总结文本(避免完全无回复)
      const summary = this.summarizeFastPathResult(result)
      if (summary) this.writeSse(res, 'content', { text: summary })

      return { content: summary, toolNames: [result.toolName], toolResults: [result] }
    } catch (err: any) {
      ctx.logger.warn(`[FastPath] 异常,回落 LLM: ${err?.message || err}`)
      return null
    }
  }

  /**
   * 为 fast-path 命中的 read 工具结果产出极简总结(无需 LLM)。
   * 复杂工具结果会通过前端 AgentCardRenderer 卡片展示,这里只补一句引导文案。
   */
  private summarizeFastPathResult(result: ToolResult): string {
    const out = result.output as any
    switch (result.toolName) {
      case 'get_cat_info':
        return out?.cat?.name ? `这是 ${out.cat.name} 的基础档案 🐱` : '已为你查到猫咪档案 🐱'
      case 'get_weight_trend':
        return '体重趋势已为你拉好了 📊'
      case 'check_health':
        return '健康评估结果如下 🩺'
      case 'check_vaccine':
        return '疫苗状态查到啦 💉'
      case 'GET_allergy_records':
        return '过敏档案在这里 ⚠️'
      case 'GENERATE_health_report':
        return '健康周报已生成 📋'
      case 'RECOMMEND_play':
        return '为猫咪挑了几个好玩的 🎾'
      case 'get_growth_records':
        return '最近的成长记录在这里 📖'
      case 'rag_search':
        // RAG 通常需要 LLM 二次润色,fast-path 暂不处理
        return ''
      default:
        return ''
    }
  }

  /**
   * 执行 Agent 全流程（非流式，返回完整结果）
   */
  async handleMessage(
    userMessage: string,
    userId: string,
    sessionId: string,
    selectedCatId?: string,
    options?: { signal?: AbortSignal }
  ): Promise<AgentResponse> {
    const ctx: AgentContext = {
      userId,
      sessionId,
      selectedCatId,
      traceId: generateTraceId(),
      logger: console,
      signal: options?.signal,
      cache: new Map(),
    }

    ctx.logger.log(`[Agent] trace=${ctx.traceId} user=${userId} message=${userMessage.substring(0, 50)}`)

    const state: AgentState = {
      userId,
      sessionId,
      userMessage,
      selectedCatId,
      history: [],
      plan: [],
      toolResults: [],
      traceId: ctx.traceId,
    }

    // === 阶段 1: Router ===
    const routeStart = Date.now()
    const intentResult = classifyIntent(state)
    recordAgentPhase({ phase: 'router', intentType: intentResult.intent, durationMs: Date.now() - routeStart, environment: process.env.NODE_ENV || 'development' })
    ctx.logger.log(`[Agent] Intent: ${intentResult.intent} (confidence: ${intentResult.confidence.toFixed(2)})`)

    if (intentResult.intent === 'greeting') {
      return buildGreetingResponse(userMessage)
    }

    // === 阶段 2: Planner ===
    const planStart = Date.now()
    const { plan, strategyType } = buildPlan(state, intentResult)
    state.plan = plan
    recordAgentPhase({ phase: 'planner', intentType: intentResult.intent, durationMs: Date.now() - planStart, environment: process.env.NODE_ENV || 'development', toolCount: plan.length })
    recordPlannerStrategy({ intentType: intentResult.intent, strategyType, toolCount: plan.length, environment: process.env.NODE_ENV || 'development' })
    ctx.logger.log(`[Agent] Plan: ${strategyType} (${plan.length} tools: ${plan.map((p) => p.toolName).join(', ')})`)

    if (plan.length === 0 || ctx.signal?.aborted) {
      return buildGreetingResponse(userMessage)
    }

    // === 阶段 3: Executor ===
    const execStart = Date.now()
    let toolResults: ToolResult[] = await executePlan(plan, ctx)
    state.toolResults = toolResults
    recordAgentPhase({ phase: 'executor', intentType: intentResult.intent, durationMs: Date.now() - execStart, environment: process.env.NODE_ENV || 'development', toolCount: toolResults.length })

    // 动态分支：根据工具结果决定是否追加
    if (!ctx.signal?.aborted) {
      const { followUpPlan, shouldDropFailed } = advancePlan(plan, toolResults)
      if (shouldDropFailed) {
        toolResults = toolResults.filter((r) => r.toolName === 'rag_search' || r.success)
        state.toolResults = toolResults
        ctx.logger.log(`[Agent] Dropped tools depending on missing cat data`)
      }
      if (followUpPlan.length > 0) {
        ctx.logger.log(`[Agent] Advancing plan with ${followUpPlan.length} follow-up tools`)
        const followUpResults = await executePlan(followUpPlan, ctx)
        toolResults.push(...followUpResults)
        state.toolResults = toolResults
      }
    }

    const dataRichSteps = toolResults.filter((r) => r.success && r.output?.success !== false).length
    ctx.logger.log(`[Agent] ${dataRichSteps}/${toolResults.length} steps returned useful data`)

    // === 阶段 4: Reporter ===
    const reportStart = Date.now()
    const report = generateReport(state, toolResults)
    recordAgentPhase({ phase: 'reporter', intentType: intentResult.intent, durationMs: Date.now() - reportStart, environment: process.env.NODE_ENV || 'development' })

    return {
      answer: report,
      toolResults,
      traceId: ctx.traceId,
      confidence: intentResult.confidence,
    }
  }

  /**
   * 流式执行 Agent 全流程，通过回调实时推送 SSE 事件
   * 真正的流式：工具结果实时推送 + LLM 逐 token 输出
   *
   * 返回 AgentStreamResult，包含累积的回复文本和元数据，供控制层持久化（P0 #2）。
   *
   * userSegment 由调用方注入(从用户表/JWT claim/环境变量白名单解析),
   * 默认 'all' 让 V3.0 在缺乏用户段数据时安全降级到 V2 旧链路。
   */
  async handleStreaming(
    userMessage: string,
    userId: string,
    sessionId: string,
    res: Response,
    selectedCatId?: string,
    history: ChatMessage[] = [],
    userSegment: UserSegment = 'all',
    attachments: string[] = []
  ): Promise<AgentStreamResult> {
    // V3.1 flag 路由:LLM tool-calling loop 主导意图理解
    const flagCtx = getDefaultContext(userId, userSegment)
    const useNewLoop = isFeatureEnabled('LLM_TOOL_CALLING_LOOP', flagCtx)
    // 仅图片附件保留 V2 旧链路(图片→成长记录是硬规则,LLM 看不到图片)
    if (useNewLoop && attachments.length === 0) {
      return this.handleStreamingViaLoop(userMessage, userId, sessionId, res, selectedCatId, history)
    }

    const abortController = new AbortController()

    // 客户端断开 → 取消整个 pipeline
    res.on('close', () => {
      if (res.destroyed || !res.writable) {
        abortController.abort()
      }
    })

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

    ctx.logger.log(`[Agent] trace=${ctx.traceId} user=${userId} message=${userMessage.substring(0, 50)}`)

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

    // === 拦截 res.write 以累积所有 SSE content 文本，供控制层持久化 ===
    const capturedContent: string[] = []
    const realWrite = res.write.bind(res)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrappedWrite = (chunk: any, ...args: any[]): boolean => {
      if (typeof chunk === 'string') {
        for (const text of extractContentFromSseChunk(chunk)) {
          capturedContent.push(text)
        }
      } else if (Buffer.isBuffer(chunk)) {
        for (const text of extractContentFromSseChunk(chunk.toString('utf-8'))) {
          capturedContent.push(text)
        }
      }
      return realWrite(chunk, ...args)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(res as any).write = wrappedWrite

    let toolNames: string[] = []
    let citations: string[] = []
    let finalToolResults: ToolResult[] = []

    try {
      // === 阶段 1: Router ===
      const routeStart = Date.now()
      const intentResult = classifyIntent(state)
      recordAgentPhase({ phase: 'router', intentType: intentResult.intent, durationMs: Date.now() - routeStart, environment: process.env.NODE_ENV || 'development' })
      ctx.logger.log(`[Agent] Intent: ${intentResult.intent} (confidence: ${intentResult.confidence.toFixed(2)})`)

      // V2.0 执行轨迹：推送意图识别步骤
      const intentStep = tracer.recordIntent(userMessage, intentResult.intent, intentResult.confidence, Date.now() - routeStart)
      this.writeSse(res, 'trace', { step: intentStep })
      recordSseEvent({ eventType: 'trace', environment: process.env.NODE_ENV || 'development' })

      if (intentResult.intent === 'greeting') {
        const greeting = buildGreetingResponse(userMessage)
        this.writeSse(res, 'content', { text: greeting.answer })
        this.writeSse(res, 'done', { traceId: greeting.traceId })
        res.end()
        return {
          content: capturedContent.join(''),
          citations: [],
          traceId: greeting.traceId,
          toolNames: [],
        }
      }

      // === 阶段 2: Planner ===
      const planStart = Date.now()
      const { plan, strategyType } = buildPlan(state, intentResult)
      state.plan = plan
      recordAgentPhase({ phase: 'planner', intentType: intentResult.intent, durationMs: Date.now() - planStart, environment: process.env.NODE_ENV || 'development', toolCount: plan.length })
      recordPlannerStrategy({ intentType: intentResult.intent, strategyType, toolCount: plan.length, environment: process.env.NODE_ENV || 'development' })
      ctx.logger.log(`[Agent] Plan: ${strategyType} (${plan.length} tools)`)

      if (plan.length === 0 || abortController.signal.aborted) {
        this.writeSse(res, 'done', { traceId: ctx.traceId })
        res.end()
        return {
          content: capturedContent.join(''),
          citations: [],
          traceId: ctx.traceId,
          toolNames: [],
        }
      }

      // 发 meta 事件：告知前端即将执行哪些工具
      toolNames = plan.map((p) => p.toolName)
      // V2.0 执行轨迹：推送工具规划步骤（在 meta 之前）
      const planTraceStep = tracer.recordPlan(toolNames, strategyType, Date.now() - planStart)
      this.writeSse(res, 'trace', { step: planTraceStep })
      recordSseEvent({ eventType: 'trace', environment: process.env.NODE_ENV || 'development' })
      this.writeSse(res, 'meta', { traceId: ctx.traceId, toolsCalled: toolNames, toolCount: plan.length })
      recordSseEvent({ eventType: 'meta', environment: process.env.NODE_ENV || 'development' })

      // === 阶段 3: Executor（带进度回调：每完成一个工具就推送 SSE） ===
      const execStart = Date.now()
      let confirmationPending = false
      let toolResults: ToolResult[] = await executePlan(plan, ctx, (result) => {
        // V2.0 执行轨迹：推送工具执行步骤（在 tool 事件之前）
        const execStep = tracer.recordExecute(
          result.toolName,
          result.success ? 'success' : 'error',
          undefined,
          result.error,
        )
        this.writeSse(res, 'trace', { step: execStep })
        recordSseEvent({ eventType: 'trace', environment: process.env.NODE_ENV || 'development' })
        // V2.0 写入工具确认检测
        if (result.requiresConfirmation) {
          confirmationPending = true
          const confirmationId = createConfirmation(
            ctx.userId,
            ctx.selectedCatId || '',
            result.toolName,
            { userMessage, ...(result.draft || {}) },
          )
          this.writeSse(res, 'pending_confirmation', {
            confirmationId,
            toolName: result.toolName,
            draft: { userMessage, ...(result.draft || {}) },
            message: '该操作需要您确认后方可执行',
            expiresAt: Date.now() + 5 * 60 * 1000,
          })
          recordSseEvent({ eventType: 'pending_confirmation', environment: process.env.NODE_ENV || 'development' })
          return
        }
        // 实时推送每个工具的执行结果
        this.writeSse(res, 'tool', {
          toolName: result.toolName,
          status: result.success ? 'success' : 'error',
          output: result.output,
        })
        recordSseEvent({ eventType: 'tool', environment: process.env.NODE_ENV || 'development' })
      })
      state.toolResults = toolResults
      recordAgentPhase({ phase: 'executor', intentType: intentResult.intent, durationMs: Date.now() - execStart, environment: process.env.NODE_ENV || 'development', toolCount: toolResults.length })

      // 写入工具待确认：已推送 pending_confirmation，跳过后续报告，等待用户确认
      if (confirmationPending) {
        const writeToolName = plan.find((p) => p.toolName.startsWith('ADD_'))?.toolName || ''
        const guideText = this.buildConfirmGuideText(writeToolName)
        if (guideText) {
          this.writeSse(res, 'content', { text: guideText })
        }
        this.writeSse(res, 'done', { traceId: ctx.traceId })
        recordSseEvent({ eventType: 'done', environment: process.env.NODE_ENV || 'development' })
        res.end()
        return {
          content: guideText || '',
          citations: [],
          traceId: ctx.traceId,
          toolNames,
          toolResults,
        }
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
            const execStep = tracer.recordExecute(
              result.toolName,
              result.success ? 'success' : 'error',
              undefined,
              result.error,
            )
            this.writeSse(res, 'trace', { step: execStep })
            this.writeSse(res, 'tool', {
              toolName: result.toolName,
              status: result.success ? 'success' : 'error',
              output: result.output,
            })
            recordSseEvent({ eventType: 'tool', environment: process.env.NODE_ENV || 'development' })
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

        // V2.0 执行轨迹：推送回复生成步骤（在 content 之前）
        const reportTraceStep = tracer.recordReport('生成回复', [], Date.now() - reportStart)
        this.writeSse(res, 'trace', { step: reportTraceStep })
        recordSseEvent({ eventType: 'trace', environment: process.env.NODE_ENV || 'development' })

        // 当 reporter 主动返回空字符串（例如只调用了健康周报工具，前端会渲染卡片），
        // 直接跳过 LLM 调用，避免重复内容
        const reportIsEmpty = report.trim().length === 0
        const needsLLM = !reportIsEmpty && toolResults.length > 0 && report.length < 2000
        if (reportIsEmpty) {
          // 只渲染卡片，不发送任何 content 事件
          recordAgentPhase({ phase: 'reporter', intentType: intentResult.intent, durationMs: Date.now() - reportStart, environment: process.env.NODE_ENV || 'development' })
        } else if (needsLLM) {
          // 使用真实 LLM 流式输出，逐 token 推送
          const knowledgeContext = await getKnowledgeContext(userMessage)
          const finalPrompt =
            '请基于以下工具执行结果，用友好、自然、专业的中文回答用户问题。不要提及"工具"或"执行步骤"等技术细节。\n\n' +
            '【工具执行结果】\n' + report +
            '\n\n【用户原始问题】\n' + userMessage +
            (knowledgeContext.context ? '\n\n【参考知识库】\n' + knowledgeContext.context : '') +
            '\n\n请整理成一段通顺、结构化的回答。'

          // 流式调用智谱 AI，逐 chunk 推 content 事件
          const { sendMessageStream: llmStream } = await import('../services/ai.service')

          try {
            await llmStream(finalPrompt, history, '', res)
          } catch (error: any) {
            ctx.logger.log(`[Agent] LLM stream failed, falling back to chunked report: ${error.message}`)
            // 降级：分块推送模板报告（按字符分块，避免 UTF-8 多字节字符被截断）
            const chunkSize = Math.max(5, Math.ceil(report.length / 15))
            for (let i = 0; i < report.length && !abortController.signal.aborted; i += chunkSize) {
              this.writeSse(res, 'content', { text: report.slice(i, i + chunkSize) })
            }
          }
          recordAgentPhase({ phase: 'reporter', intentType: intentResult.intent, durationMs: Date.now() - reportStart, environment: process.env.NODE_ENV || 'development' })
        } else {
          // 简单回答直接分块推送（按字符分块，避免 UTF-8 多字节字符被截断）
          const chunkSize = Math.max(5, Math.ceil(report.length / 15))
          for (let i = 0; i < report.length && !abortController.signal.aborted; i += chunkSize) {
            this.writeSse(res, 'content', { text: report.slice(i, i + chunkSize) })
          }
          recordAgentPhase({ phase: 'reporter', intentType: intentResult.intent, durationMs: Date.now() - reportStart, environment: process.env.NODE_ENV || 'development' })
        }
      }

      // 完成
      if (!abortController.signal.aborted) {
        citations = toolResults
          .filter((r) => r.toolName === 'rag_search' && r.output?.guideTitles)
          .flatMap((r) => r.output.guideTitles as string[])
          .slice(0, 5)
        finalToolResults = toolResults
        this.writeSse(res, 'done', { traceId: ctx.traceId, citations })
        recordSseEvent({ eventType: 'done', environment: process.env.NODE_ENV || 'development' })
        res.end()
      }

      return {
        content: capturedContent.join(''),
        citations,
        traceId: ctx.traceId,
        toolNames,
        toolResults: finalToolResults,
      }
    } catch (error: any) {
      ctx.logger.log(`[Agent] Error: ${error.message}`)
      if (!res.writableEnded) {
        this.writeSse(res, 'error', { message: error.message || '处理失败' })
        recordSseEvent({ eventType: 'error', environment: process.env.NODE_ENV || 'development', errorType: 'agent_error' })
        res.end()
      }
      return {
        content: capturedContent.join(''),
        citations: [],
        traceId: ctx.traceId,
        toolNames,
        toolResults: finalToolResults,
      }
    } finally {
      // 恢复原 res.write，避免影响后续可能的复用
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(res as any).write = realWrite
    }
  }

  /**
   * V3.0 新链路:用 AgentLoop 跑 ReAct 多轮迭代。
   * 失败时自动降级到旧 sendMessageStream(RAG fallback)。
   */
  private async handleStreamingViaLoop(
    userMessage: string,
    userId: string,
    sessionId: string,
    res: Response,
    selectedCatId: string | undefined,
    history: ChatMessage[]
  ): Promise<AgentStreamResult> {
    const abortController = new AbortController()
    res.on('close', () => {
      if (res.destroyed || !res.writable) abortController.abort()
    })

    const ctx: AgentContext = {
      userId,
      sessionId,
      selectedCatId,
      traceId: generateTraceId(),
      logger: console,
      signal: abortController.signal,
      cache: new Map(),
    }

    ctx.logger.log(`[AgentLoop] trace=${ctx.traceId} user=${userId} message=${userMessage.substring(0, 50)}`)

    // SSE meta(预先告知 traceId,工具列表后续逐个推 tool 事件)
    this.writeSse(res, 'meta', { traceId: ctx.traceId, toolsCalled: [], toolCount: 0 })

    const startedAt = Date.now()
    const toolNamesSeen: string[] = []
    let llmFailed = false
    let resultContent = ''
    let citations: string[] = []

    // ===== Embedding fast-path =====
    // 在调用 LLM 之前先尝试用 IntentRecaller 做意图召回
    // 高置信命中 → 直接执行工具 + 简单总结,跳过 LLM ~800ms 调用
    const fastPathResult = await this.tryFastPath(userMessage, ctx, res)
    if (fastPathResult) {
      this.writeSse(res, 'done', { traceId: ctx.traceId })
      recordSseEvent({ eventType: 'done', environment: process.env.NODE_ENV || 'development' })
      res.end()
      return {
        content: fastPathResult.content,
        citations: [],
        traceId: ctx.traceId,
        toolNames: fastPathResult.toolNames,
        toolResults: fastPathResult.toolResults,
      }
    }
    // fast-path 未命中 → 继续走 LLM AgentLoop

    try {
      const result = await this.agentLoop.run({
        userMessage,
        history,
        ctx,
        onContent: (text) => {
          this.writeSse(res, 'content', { text })
        },
        onToolResult: (r) => {
          toolNamesSeen.push(r.toolName)
          this.writeSse(res, 'tool', {
            toolName: r.toolName,
            status: r.success ? 'success' : 'error',
            output: r.output,
          })
        },
        onPendingConfirmation: (pending) => {
          // LLM 选了 write 工具且未确认 → 推送 pending_confirmation,前端弹卡片
          const confirmationId = createConfirmation(
            ctx.userId,
            ctx.selectedCatId || '',
            pending.toolName,
            { userMessage, ...pending.parameters },
          )
          this.writeSse(res, 'pending_confirmation', {
            confirmationId,
            toolName: pending.toolName,
            draft: { userMessage, ...pending.parameters },
            message: '该操作需要您确认后方可执行',
            expiresAt: Date.now() + 5 * 60 * 1000,
          })
          recordSseEvent({ eventType: 'pending_confirmation', environment: process.env.NODE_ENV || 'development' })
        },
      })

      resultContent = result.content
      citations = result.toolResults
        .filter((r) => r.toolName === 'rag_search' && r.output?.guideTitles)
        .flatMap((r) => r.output.guideTitles as string[])
        .slice(0, 5)

      // write 工具触发 → 推引导文案,关闭流,等待用户确认
      if (result.pendingConfirmation) {
        const guideText = this.buildConfirmGuideText(result.pendingConfirmation.toolName)
        if (guideText) {
          this.writeSse(res, 'content', { text: guideText })
        }
        this.writeSse(res, 'done', { traceId: ctx.traceId })
        recordSseEvent({ eventType: 'done', environment: process.env.NODE_ENV || 'development' })
        res.end()
        return {
          content: guideText,
          citations: [],
          traceId: ctx.traceId,
          toolNames: toolNamesSeen,
          toolResults: result.toolResults,
        }
      }

      // maxIterations 超限 → RAG fallback
      if (result.maxIterationsExceeded) {
        ctx.logger.log('[AgentLoop] maxIterations exceeded, falling back to RAG')
        llmFailed = true
      }
    } catch (err: any) {
      ctx.logger.log(`[AgentLoop] error: ${err.message}, falling back to RAG`)
      llmFailed = true
    }

    // ★ V2 规则降级：LLM 未调任何工具时，用 classifyIntent + buildPlan 做规则兜底，
    //   避免 glm-4.5-flash 偶发不触发 tool_call 时 tools=[] 直接走 RAG（丢失结构化卡片）。
    if (!llmFailed && toolNamesSeen.length === 0 && !abortController.signal.aborted && !res.writableEnded) {
      ctx.logger.log('[AgentLoop] LLM returned no tool calls, trying V2 rule-based fallback')
      const v2State: AgentState = {
        userId,
        sessionId: ctx.sessionId,
        userMessage,
        selectedCatId: ctx.selectedCatId,
        history,
        plan: [],
        toolResults: [],
        traceId: ctx.traceId,
      }
      const v2Intent = classifyIntent(v2State)
      if (!['unknown', 'greeting', 'general_knowledge'].includes(v2Intent.intent)) {
        const { plan: v2Plan } = buildPlan(v2State, v2Intent)
        if (v2Plan.length > 0) {
          ctx.logger.log(`[AgentLoop] V2 fallback executing: ${v2Plan.map((p) => p.toolName).join(', ')}`)
          const v2Results = await executePlan(v2Plan, ctx, (r) => {
            toolNamesSeen.push(r.toolName)
            this.writeSse(res, 'tool', {
              toolName: r.toolName,
              status: r.success ? 'success' : 'error',
              output: r.output,
            })
          })
          v2State.toolResults = v2Results
          const report = generateReport(v2State, v2Results)
          if (report && report.trim().length > 0) {
            this.writeSse(res, 'content', { text: report })
            resultContent = report
          }
        }
      }
    }

    if (llmFailed && !abortController.signal.aborted && !res.writableEnded) {
      try {
        const { sendMessageStream } = await import('../services/ai.service')
        await sendMessageStream(userMessage, history, '', res)
      } catch (e: any) {
        this.writeSse(res, 'error', { message: e.message || 'RAG fallback 失败' })
      }
    }

    if (!res.writableEnded) {
      this.writeSse(res, 'done', { traceId: ctx.traceId, citations })
      res.end()
    }

    ctx.logger.log(
      `[AgentLoop] traceId=${ctx.traceId} tools=[${toolNamesSeen.join(',')}] latencyMs=${Date.now() - startedAt}`
    )

    return {
      content: resultContent,
      citations,
      traceId: ctx.traceId,
      toolNames: toolNamesSeen,
    }
  }

  private writeSse(res: Response, type: string, data: Record<string, any>): void {
    if (res.destroyed || !res.writable) return
    try {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`)
    } catch {
      // SSE 写入失败忽略
    }
  }

  getAvailableTools(): string[] {
    return listTools().map((t) => t.name)
  }
}

export const catAgent = new CatAgent()
