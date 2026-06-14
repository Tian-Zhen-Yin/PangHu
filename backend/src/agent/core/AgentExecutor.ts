import type { AgentContext, PlanStep, ToolResult } from '../types/agent'
import { getTool } from '../tools'

/** 工具默认超时（ms），可通过环境变量覆盖 */
const TOOL_TIMEOUT_MS = Number(process.env.AGENT_TOOL_TIMEOUT_MS || 5000)

/** 最大重试次数 */
const MAX_RETRIES = 2

/** 判断错误是否为可重试的瞬时故障 */
function isRetryable(error: unknown): boolean {
  const msg = String(error instanceof Error ? error.message : error).toLowerCase()
  return (
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('5xx') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('service unavailable') ||
    msg.includes('internal server error')
  )
}

/**
 * 带超时 + 取消信号的工具调用包装
 */
async function callWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<T> {
  // 如果外部已取消，立即失败
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined

  // 融合外部 signal 和内部超时
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Tool timeout after ${timeoutMs}ms`)), timeoutMs)
  })

  // 外部取消信号
  const abortPromise = signal
    ? new Promise<never>((_, reject) => {
        const onAbort = () => {
          signal.removeEventListener('abort', onAbort)
          reject(new DOMException('Aborted', 'AbortError'))
        }
        signal.addEventListener('abort', onAbort, { once: true })
      })
    : null

  try {
    const promises = abortPromise
      ? [fn(), timeoutPromise, abortPromise]
      : [fn(), timeoutPromise]
    return await Promise.race(promises)
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * 执行单个工具（含超时 + 重试）
 */
export async function executeTool(
  step: PlanStep,
  ctx: AgentContext,
  onProgress?: (result: ToolResult) => void
): Promise<ToolResult> {
  const tool = getTool(step.toolName)

  if (!tool) {
    return { toolName: step.toolName, success: false, error: `未找到工具: ${step.toolName}`, reason: step.reason }
  }

  // V2.0 写入工具确认检查：requiresConfirmation 标记的工具在未确认时不执行
  if (step.requiresConfirmation && !ctx.confirmationToken?.verified) {
    const result: ToolResult = {
      toolName: step.toolName,
      success: false,
      requiresConfirmation: true,
      draft: step.parameters,
      reason: step.reason,
    }
    onProgress?.(result)
    return result
  }

  // 参数校验
  const validated = tool.schema.safeParse(step.parameters)
  if (!validated.success) {
    const errors = validated.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    return { toolName: step.toolName, success: false, error: `参数校验失败: ${errors}`, reason: step.reason }
  }

  // 带重试的执行
  let lastError: Error | undefined
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (ctx.signal?.aborted) {
        return { toolName: step.toolName, success: false, error: '请求已取消', reason: step.reason }
      }

      ctx.logger.log(`[AgentExec] Calling ${step.toolName}${attempt > 0 ? ` (retry ${attempt}/${MAX_RETRIES})` : ''}...`)

      const output = await callWithTimeout(
        () => tool.call(validated.data, ctx),
        TOOL_TIMEOUT_MS,
        ctx.signal
      )

      // 写回请求缓存
      ctx.cache.set(`tool:${step.toolName}:${JSON.stringify(step.parameters)}`, output)

      const result: ToolResult = { toolName: step.toolName, success: true, output, reason: step.reason }
      onProgress?.(result)
      return result
    } catch (error: any) {
      lastError = error
      const isAborted = error instanceof DOMException && error.name === 'AbortError'

      if (isAborted) {
        ctx.logger.log(`[AgentExec] ${step.toolName} aborted`)
        return { toolName: step.toolName, success: false, error: '请求已取消', reason: step.reason }
      }

      if (isRetryable(error) && attempt < MAX_RETRIES) {
        const delay = Math.min(200 * Math.pow(2, attempt), 1000)
        ctx.logger.log(`[AgentExec] ${step.toolName} failed, retrying in ${delay}ms: ${error.message}`)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }

      // 不可重试或已达最大重试次数
      const result: ToolResult = {
        toolName: step.toolName,
        success: false,
        error: error.message || '工具执行失败',
        reason: step.reason,
      }
      onProgress?.(result)
      return result
    }
  }

  // 所有重试耗尽
  return { toolName: step.toolName, success: false, error: lastError?.message || '执行失败', reason: step.reason }
}

/**
 * 工具分组：独立工具可并行，有依赖的串行
 * 当前所有工具均为只读且无数据依赖，全部可并行
 */
function groupIndependent(plan: PlanStep[]): PlanStep[][] {
  // 按工具名去重分组（同名工具视为有顺序依赖）
  const seen = new Set<string>()
  const groups: PlanStep[][] = []
  const independent: PlanStep[] = []

  for (const step of plan) {
    if (seen.has(step.toolName)) {
      // 同名工具不能并行（会竞争 DB 写）
      if (independent.length > 0) {
        groups.push([...independent])
        independent.length = 0
      }
      groups.push([step])
    } else {
      seen.add(step.toolName)
      independent.push(step)
    }
  }
  if (independent.length > 0) groups.push(independent)

  return groups
}

/**
 * 执行工具计划
 * - 独立工具并行执行
 * - 每步含超时 + 重试 + 取消支持
 * - 支持进度回调（用于 SSE 实时推送）
 */
export async function executePlan(
  plan: PlanStep[],
  ctx: AgentContext,
  onProgress?: (result: ToolResult) => void
): Promise<ToolResult[]> {
  const results: ToolResult[] = []
  const groups = groupIndependent(plan)

  for (const group of groups) {
    if (ctx.signal?.aborted) break

    if (group.length === 1) {
      // 单个工具直接执行
      const result = await executeTool(group[0], ctx, onProgress)
      results.push(result)
    } else {
      // 多个独立工具并行执行
      const parallelResults = await Promise.all(
        group.map((step) => executeTool(step, ctx, onProgress))
      )
      results.push(...parallelResults)
    }
  }

  return results
}

/**
 * 单工具调用入口(供 AgentLoop 使用)。
 * 复用 executeTool 的全部能力:Zod 校验、超时、重试、abort、cache。
 *
 * @param toolName 工具名(必须已注册到 toolRegistry)
 * @param parameters 工具参数(将经过 Zod 校验)
 * @param ctx Agent 上下文
 * @param reason 可选的调用理由(由 LLM 提供时传入)
 */
export async function callTool(
  toolName: string,
  parameters: Record<string, unknown>,
  ctx: AgentContext,
  reason: string = 'LLM tool-calling'
): Promise<ToolResult> {
  return executeTool({ toolName, parameters, reason }, ctx)
}
