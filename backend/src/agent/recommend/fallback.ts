/**
 * 双层降级 — 对齐技术设计 §4.6
 *
 * L1: fallbackRecommend
 *   - 按性格从 healthyPool 取前 3 条；性格无命中则退化为 healthyPool 前 3 条
 *   - reasons 用产品文案，禁止 "降级" / "fallback" / "L1/L2" / "未匹配" 等开发者术语
 *   - score = 0、breakdown = null（前端凭 fallback=true 不展示分数）
 *
 * L2: emptyResultWithVetHint
 *   - healthyPool 自身为空时调用
 *   - success=false，message 引导兽医
 */

import type { PlayGame, Personality } from '../../data/playGames.types'
import { PERSONALITY_LABEL } from '../../data/playGames.types'

export interface Suggestion {
  game: PlayGame
  score: number
  breakdown: null | {
    personality: number
    energy: number
    time: number
    preference: number
  }
  reasons: string[]
}

export interface RecommendResult {
  success: boolean
  fallback: boolean
  suggestions: Suggestion[]
  message?: string
  needProfileCompletion?: boolean
}

interface FallbackCat {
  name: string
  personality: Personality | null
}

export function fallbackRecommend(cat: FallbackCat, healthyPool: PlayGame[]): RecommendResult {
  const personality = cat.personality
  let picked: PlayGame[] = []

  if (personality) {
    picked = healthyPool.filter(g => g.fitsPersonality.includes(personality)).slice(0, 3)
  }

  // 性格无命中 → 退化为 healthyPool 前 3 条
  if (picked.length === 0) {
    picked = healthyPool.slice(0, 3)
  }

  const personalityHint = personality ? PERSONALITY_LABEL[personality] : null
  const suggestions: Suggestion[] = picked.map(game => {
    const reasons: string[] = []
    if (personalityHint && game.fitsPersonality.includes(personality!)) {
      reasons.push(`适合${personalityHint}的猫咪`)
    } else if (personalityHint) {
      reasons.push(`为${personalityHint}的${cat.name}精选`)
    } else {
      reasons.push(`为 ${cat.name} 精选`)
    }
    return {
      game,
      score: 0,
      breakdown: null,
      reasons,
    }
  })

  return {
    success: true,
    fallback: true,
    suggestions,
  }
}

export function emptyResultWithVetHint(): RecommendResult {
  return {
    success: false,
    fallback: true,
    suggestions: [],
    message: '当前健康状况下暂不建议自行陪玩，请咨询兽医获取个性化建议。',
  }
}
