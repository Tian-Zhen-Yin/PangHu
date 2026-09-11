/**
 * CatAgent —— Agent 入口与协调器。
 *
 * 职责只保留"路由与编排":
 * - handleStreaming:按灰度开关/附件情况在 V3.1 LLM loop 与 V2 规则管线间路由
 * - V3.1:Embedding fast-path → AgentLoop(ReAct) → V2 规则兜底 → RAG 降级
 * - V2 管线本体在 core/v2Pipeline.ts;SSE 输出经 core/sseSink.ts 的窄接口
 *   (agent 不再持有 express Response、不再 monkey-patch res.write)
 *
 * 2026-09 重构说明:删除了业务上无调用的 V2 非流式 handleMessage 链路;
 * pending_confirmation 推送收敛为 v2Pipeline.pushPendingConfirmation 单一实现。
 */
import type { AgentContext, AgentState, ToolResult, ChatMessage } from './types/agent'
import { classifyIntent } from './core/AgentRouter'
import { buildPlan } from './core/AgentPlanner'
import { executePlan } from './core/AgentExecutor'
import { generateReport } from './core/AgentReporter'
import { listTools } from './tools'
import { recordSseEvent } from './metrics'
import { AgentLoop } from './core/AgentLoop'
import { zhipuaiClient } from './llm/zhipuaiClient'
import { isFeatureEnabled, getDefaultContext, type UserSegment } from '../config/featureFlags'
import { tryFastPath } from './core/fastPath'
import type { AgentSseSink } from './core/sseSink'
import {
  runV2Pipeline,
  pushPendingConfirmation,
  buildConfirmGuideText,
  generateTraceId,
} from './core/v2Pipeline'
import { createLogger } from '../utils/logger'

const log = createLogger('agent')

const ENV = () => process.env.NODE_ENV || 'development'

function sseMetric(eventType: string) {
  recordSseEvent({ eventType: eventType as 'meta', environment: ENV() })
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

export class CatAgent {
  /**
   * V3.1 LLM tool-calling loop 协调器（开放全部工具,含 write）。
   * write 工具仍由 confirmationToken 机制守门:LLM 选中后 → AgentLoop 中断 → SSE 推 pending_confirmation。
   */
  private readonly agentLoop = new AgentLoop(zhipuaiClient, listTools(), { maxIterations: 5 })

  /**
   * 流式执行 Agent 全流程。
   *
   * 路由规则：
   * - LLM_TOOL_CALLING_LOOP 开启且无图片附件 → V3.1 AgentLoop
   * - 其余（灰度未开 / 图片附件,图片→成长记录是硬规则,LLM 看不到图片）→ V2 规则管线
   *
   * userSegment 由调用方注入(从用户表/JWT claim/环境变量白名单解析),
   * 默认 'all' 让 V3.0 在缺乏用户段数据时安全降级到 V2 旧链路。
   */
  async handleStreaming(
    userMessage: string,
    userId: string,
    sessionId: string,
    sink: AgentSseSink,
    selectedCatId?: string,
    history: ChatMessage[] = [],
    userSegment: UserSegment = 'all',
    attachments: string[] = []
  ): Promise<AgentStreamResult> {
    const flagCtx = getDefaultContext(userId, userSegment)
    const useNewLoop = isFeatureEnabled('LLM_TOOL_CALLING_LOOP', flagCtx)

    if (useNewLoop && attachments.length === 0) {
      return this.handleStreamingViaLoop(userMessage, userId, sessionId, sink, selectedCatId, history)
    }

    return new Promise<AgentStreamResult>((resolve) => {
      void runV2Pipeline({
        userMessage,
        userId,
        sessionId,
        sink,
        selectedCatId,
        history,
        attachments,
        onFinish: resolve,
      })
    })
  }


  /**
   * V3.1 新链路:fast-path → AgentLoop(ReAct 多轮迭代)。
   * LLM 未调工具时回落 V2 规则;彻底失败时降级到旧 RAG 流式回复。
   */
  private async handleStreamingViaLoop(
    userMessage: string,
    userId: string,
    sessionId: string,
    sink: AgentSseSink,
    selectedCatId: string | undefined,
    history: ChatMessage[]
  ): Promise<AgentStreamResult> {
    const abortController = new AbortController()
    sink.onClose(() => {
      if (sink.closed) abortController.abort()
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
    sink.writeEvent('meta', { traceId: ctx.traceId, toolsCalled: [], toolCount: 0 })

    const startedAt = Date.now()
    const toolNamesSeen: string[] = []
    let llmFailed = false
    let resultContent = ''
    let citations: string[] = []

    // ===== Embedding fast-path =====
    // 高置信命中 → 直接执行工具 + 简单总结,跳过 LLM ~800ms 调用
    const fastPathResult = await tryFastPath(userMessage, ctx, sink)
    if (fastPathResult) {
      sink.writeEvent('done', { traceId: ctx.traceId })
      sseMetric('done')
      sink.end()
      return {
        content: fastPathResult.content,
        citations: [],
        traceId: ctx.traceId,
        toolNames: fastPathResult.toolNames,
        toolResults: fastPathResult.toolResults,
      }
    }
    // fast-path 未命中 → 继续走 LLM AgentLoop

    let loopResult: Awaited<ReturnType<AgentLoop['run']>> | null = null
    try {
      loopResult = await this.agentLoop.run({
        userMessage,
        history,
        ctx,
        onContent: (text) => {
          sink.writeEvent('content', { text })
        },
        onToolResult: (r) => {
          toolNamesSeen.push(r.toolName)
          sink.writeEvent('tool', {
            toolName: r.toolName,
            status: r.success ? 'success' : 'error',
            output: r.output,
          })
        },
        onPendingConfirmation: (pending) => {
          // LLM 选了 write 工具且未确认 → 推送 pending_confirmation,前端弹卡片
          pushPendingConfirmation(sink, ctx, pending.toolName, pending.parameters, userMessage)
        },
      })

      resultContent = loopResult.content
      citations = loopResult.toolResults
        .filter((r) => r.toolName === 'rag_search' && r.output?.guideTitles)
        .flatMap((r) => r.output.guideTitles as string[])
        .slice(0, 5)

      // write 工具触发 → 推引导文案,关闭流,等待用户确认
      if (loopResult.pendingConfirmation) {
        const guideText = buildConfirmGuideText(loopResult.pendingConfirmation.toolName)
        if (guideText) {
          sink.writeEvent('content', { text: guideText })
        }
        sink.writeEvent('done', { traceId: ctx.traceId })
        sseMetric('done')
        sink.end()
        return {
          content: guideText,
          citations: [],
          traceId: ctx.traceId,
          toolNames: toolNamesSeen,
          toolResults: loopResult.toolResults,
        }
      }

      // maxIterations 超限 → RAG fallback
      if (loopResult.maxIterationsExceeded) {
        ctx.logger.log('[AgentLoop] maxIterations exceeded, falling back to RAG')
        llmFailed = true
      }
    } catch (err: any) {
      ctx.logger.log(`[AgentLoop] error: ${err.message}, falling back to RAG`)
      llmFailed = true
    }

    // ★ V2 规则降级：LLM 未调任何工具时,用规则链路兜底,
    //   避免 glm-4.5-flash 偶发不触发 tool_call 时丢失结构化卡片。
    if (!llmFailed && toolNamesSeen.length === 0 && !sink.closed) {
      const fallback = await this.runV2RuleFallback(userMessage, ctx, sink, history, toolNamesSeen)
      if (fallback) resultContent = fallback
    }

    if (llmFailed && !sink.closed) {
      try {
        const { sendMessageStream } = await import('../services/ai.service')
        await sink.runCaptured((carrier) => sendMessageStream(userMessage, history, '', carrier as never))
        // 遗留 RAG 降级路径的文本经 sink 捕获,这里补进持久化内容
        resultContent = resultContent || sink.getContent()
      } catch (e: any) {
        sink.writeEvent('error', { message: e.message || 'RAG fallback 失败' })
      }
    }

    if (!sink.closed) {
      sink.writeEvent('done', { traceId: ctx.traceId, citations })
      sink.end()
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

  /**
   * V2 规则兜底:classifyIntent + buildPlan 执行一轮工具并生成模板报告。
   * 返回报告文本;无需兜底(意图为 unknown/greeting/general_knowledge 或计划为空)时返回 null。
   */
  private async runV2RuleFallback(
    userMessage: string,
    ctx: AgentContext,
    sink: AgentSseSink,
    history: ChatMessage[],
    toolNamesSeen: string[]
  ): Promise<string | null> {
    ctx.logger.log('[AgentLoop] LLM returned no tool calls, trying V2 rule-based fallback')
    const v2State: AgentState = {
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      userMessage,
      selectedCatId: ctx.selectedCatId,
      history,
      plan: [],
      toolResults: [],
      traceId: ctx.traceId,
    }
    const v2Intent = classifyIntent(v2State)
    if (['unknown', 'greeting', 'general_knowledge'].includes(v2Intent.intent)) return null

    const { plan: v2Plan } = buildPlan(v2State, v2Intent)
    if (v2Plan.length === 0) return null

    ctx.logger.log(`[AgentLoop] V2 fallback executing: ${v2Plan.map((p) => p.toolName).join(', ')}`)
    const v2Results = await executePlan(v2Plan, ctx, (r) => {
      toolNamesSeen.push(r.toolName)
      sink.writeEvent('tool', {
        toolName: r.toolName,
        status: r.success ? 'success' : 'error',
        output: r.output,
      })
    })
    v2State.toolResults = v2Results
    const report = generateReport(v2State, v2Results)
    if (report && report.trim().length > 0) {
      sink.writeEvent('content', { text: report })
      return report
    }
    return null
  }

  getAvailableTools(): string[] {
    return listTools().map((t) => t.name)
  }
}

export const catAgent = new CatAgent()
