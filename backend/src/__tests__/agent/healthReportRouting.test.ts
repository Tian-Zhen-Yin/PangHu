// backend/src/__tests__/agent/healthReportRouting.test.ts
//
// 回归测试：健康周报意图路由（V2 规则降级路径的确定性核心）。
//
// 背景：用户发"帮我生成本周的健康周报"时，AgentLoop 路径下 glm-4.5-flash 偶发
// 不触发 tool_call，导致 tools=[] 直接走 RAG、丢失结构化周报卡片。修复方案是在
// AgentLoop 空返回时用 classifyIntent + buildPlan 做规则兜底。本测试固化该兜底
// 链路的两步确定性逻辑，避免回归。
import { describe, it, expect } from 'vitest'
import { classifyIntent } from '../../agent/core/AgentRouter'
import { buildPlan } from '../../agent/core/AgentPlanner'
import { getTool } from '../../agent/tools'
import type { AgentState } from '../../agent/types/agent'

function makeState(message: string): AgentState {
  return {
    userId: 'test-user',
    sessionId: 'test-session',
    userMessage: message,
    history: [],
    plan: [],
    toolResults: [],
    traceId: 'test-trace',
  }
}

describe('健康周报意图路由（V2 规则降级核心）', () => {
  it('classifyIntent 把"帮我生成本周的健康周报"识别为 health_report_request', () => {
    // 这是线上实际失败的那条消息（含"的"字）
    const intent = classifyIntent(makeState('帮我生成本周的健康周报'))
    expect(intent.intent).toBe('health_report_request')
  })

  it('classifyIntent 覆盖常见周报变体', () => {
    const cases = [
      '帮我生成本周健康周报',       // 缺"的"
      '生成一份健康周报',
      '本周健康总结',
      '猫咪最近健康状况总结',
      '看看本周健康概况',
    ]
    for (const msg of cases) {
      const intent = classifyIntent(makeState(msg))
      expect(intent.intent, `消息 "${msg}" 应识别为 health_report_request`).toBe('health_report_request')
    }
  })

  it('buildPlan 对 health_report_request 产出 GENERATE_health_report 且无其它工具', () => {
    const state = makeState('帮我生成本周的健康周报')
    const intent = classifyIntent(state)
    const { plan } = buildPlan(state, intent)

    const toolNames = plan.map((p) => p.toolName)
    expect(toolNames).toContain('GENERATE_health_report')
    // 周报工具内部已聚合各维度数据，不应再附加 get_cat_info/check_health 等
    expect(toolNames.length).toBe(1)
  })

  it('GENERATE_health_report 工具已注册到 registry（V2 降级 executePlan 才能找到它）', () => {
    const tool = getTool('GENERATE_health_report')
    expect(tool).toBeDefined()
    expect(tool?.name).toBe('GENERATE_health_report')
  })

  it('周报意图不会被误判成 growth/health 查询', () => {
    // 防止 "本周/健康/总结" 等词被 growth_query 或 health_consultation 抢走
    const intent = classifyIntent(makeState('帮我生成本周的健康周报'))
    expect(intent.intent).not.toBe('growth_query')
    expect(intent.intent).not.toBe('health_consultation')
    expect(intent.intent).not.toBe('general_knowledge')
  })
})
