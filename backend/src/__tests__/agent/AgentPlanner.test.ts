// backend/src/__tests__/agent/AgentPlanner.test.ts
import { describe, it, expect } from 'vitest'
import { buildPlan, advancePlan } from '../../agent/core/AgentPlanner'
import type { AgentState, IntentResult, PlanStep, ToolResult } from '../../agent/types/agent'

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

describe('AgentPlanner.buildPlan - catName extraction (P0 #3)', () => {
  it('does not inject arbitrary leading Chinese text as catName for health consultation', () => {
    // Bug: prior matchCatName regex /叫?([\u4e00-\u9fa5A-Za-z]{1,6})(猫咪|猫猫)?/
    // would extract '我家猫咪最' as catName from this message.
    const state = makeState('我家猫咪最近不爱吃饭')
    const intent: IntentResult = { intent: 'health_consultation', confidence: 0.8 }

    const { plan } = buildPlan(state, intent)

    // No step should carry a junk catName
    for (const step of plan) {
      if (step.parameters && 'catName' in step.parameters) {
        expect(step.parameters.catName).toBeFalsy()
      }
    }
  })

  it('does not inject catName for cat_info_query without explicit naming', () => {
    const state = makeState('我想看看猫咪的档案信息')
    const intent: IntentResult = { intent: 'cat_info_query', confidence: 0.75 }

    const { plan } = buildPlan(state, intent)

    for (const step of plan) {
      if (step.parameters && 'catName' in step.parameters) {
        expect(step.parameters.catName).toBeFalsy()
      }
    }
  })

  it('does not inject catName into rag_search parameters for general knowledge', () => {
    const state = makeState('猫咪应该吃什么猫粮比较好')
    const intent: IntentResult = { intent: 'general_knowledge', confidence: 0.5 }

    const { plan } = buildPlan(state, intent)

    const ragStep = plan.find((p) => p.toolName === 'rag_search')
    expect(ragStep).toBeDefined()
    expect(ragStep!.parameters.catName).toBeUndefined()
  })

  it('returns empty plan for greeting', () => {
    const state = makeState('你好')
    const intent: IntentResult = { intent: 'greeting', confidence: 0.95 }

    const { plan, strategyType } = buildPlan(state, intent)

    expect(plan).toHaveLength(0)
    expect(strategyType).toBe('noop')
  })
})

describe('AgentPlanner.advancePlan', () => {
  it('drops dependent tools when get_cat_info fails', () => {
    const plan: PlanStep[] = [
      { toolName: 'get_cat_info', reason: 'r', parameters: {} },
      { toolName: 'check_health', reason: 'r', parameters: {} },
    ]
    const results: ToolResult[] = [
      { toolName: 'get_cat_info', success: false, error: 'no cat' },
    ]

    const { followUpPlan, shouldDropFailed } = advancePlan(plan, results)

    expect(shouldDropFailed).toBe(true)
    expect(followUpPlan).toHaveLength(0)
  })

  it('adds follow-up RAG when health status is abnormal', () => {
    const plan: PlanStep[] = [
      { toolName: 'get_cat_info', reason: 'r', parameters: {} },
      { toolName: 'check_health', reason: 'r', parameters: {} },
    ]
    const results: ToolResult[] = [
      { toolName: 'get_cat_info', success: true, output: { success: true } },
      {
        toolName: 'check_health',
        success: true,
        output: {
          success: true,
          weightAnalysis: { status: '超重' },
        },
      },
    ]

    const { followUpPlan, shouldDropFailed } = advancePlan(plan, results)

    expect(shouldDropFailed).toBe(false)
    expect(followUpPlan).toHaveLength(1)
    expect(followUpPlan[0].toolName).toBe('rag_search')
  })
})
