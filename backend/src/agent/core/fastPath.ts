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
import type { AgentContext, ToolResult } from '../types/agent'
import { getTool } from '../tools'
import { callTool } from './AgentExecutor'
import { getIntentRecaller } from './IntentRecaller'
import type { AgentSseSink } from './sseSink'
import { buildConfirmGuideText, pushPendingConfirmation } from './v2Pipeline'

export interface FastPathHit {
  content: string
  toolNames: string[]
  toolResults: ToolResult[]
}

export async function tryFastPath(
  userMessage: string,
  ctx: AgentContext,
  sink: AgentSseSink,
): Promise<FastPathHit | null> {
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

    sink.writeEvent('trace', {
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
      pushPendingConfirmation(sink, ctx, tool.name, {}, userMessage)
      const guideText = buildConfirmGuideText(tool.name)
      if (guideText) sink.writeEvent('content', { text: guideText })

      return { content: guideText, toolNames: [tool.name], toolResults: [] }
    }

    // read 工具: 直接执行 + 推工具结果 + 简短总结
    const result = await callTool(tool.name, {}, ctx, 'fast-path recall', tool)
    sink.writeEvent('tool', {
      toolName: result.toolName,
      status: result.success ? 'success' : 'error',
      output: result.output,
    })

    if (!result.success) {
      // 失败回落到 LLM,让模型尝试别的方案
      ctx.logger.warn(`[FastPath] tool 执行失败,回落 LLM: ${result.error}`)
      return null
    }

    const summary = summarizeFastPathResult(result)
    if (summary) sink.writeEvent('content', { text: summary })

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
function summarizeFastPathResult(result: ToolResult): string {
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
