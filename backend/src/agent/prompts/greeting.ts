/**
 * greeting 问候回复 —— 文案与判定的唯一来源。
 * 判定复用 AgentRouter 的 GREETING_PATTERNS(此前 index.ts 里另维护了一份等价正则)。
 */
import { GREETING_PATTERNS } from '../core/AgentRouter'
import type { AgentResponse } from '../types/agent'

function generateTraceId(): string {
  return 'agent-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 11)
}

export function isGreetingMessage(message: string): boolean {
  const lower = message.toLowerCase()
  return GREETING_PATTERNS.some((p) => lower.includes(p.toLowerCase()))
}

export function buildGreetingResponse(message: string): AgentResponse {
  const greetingText = isGreetingMessage(message)
    ? '你好！我是喵喵医生 🐾\n\n我可以帮你：\n• 查看猫咪档案和健康状态\n• 分析体重变化趋势\n• 评估健康状况并给出建议\n• 检查疫苗接种记录\n• 解答养猫相关的专业问题\n\n直接告诉我你想了解什么吧～'
    : '很高兴为你服务！请告诉我你想了解的内容，我会尽力帮助你 🐾'

  return {
    answer: greetingText,
    toolResults: [],
    traceId: generateTraceId(),
    confidence: 1.0,
  }
}
