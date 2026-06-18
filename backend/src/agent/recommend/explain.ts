/**
 * buildReasons — 对齐技术设计 §4.7
 *
 * 阈值规则：
 *   sP === 100         → "匹配{性格}"
 *   sE === 100         → "精力档位完全匹配"
 *   sE >= 75 且 ≠ 100  → "精力档位接近"
 *   sT === 100         → "刚好 N 分钟"
 *   sT >= 80 且 < 100 且 game.durationMin < availableTime → "时间充裕"
 *   sR >= 75           → "{name}之前很喜欢"
 *   全部空 → "综合评估推荐"
 *
 * 文案严格使用产品语言，禁止开发者术语（防 LLM 复述给用户）。
 */

import type { PlayGame, Personality } from '../../data/playGames.types'
import { PERSONALITY_LABEL } from '../../data/playGames.types'

interface ReasonCat {
  name: string
  personality: Personality | null
}

export interface ScoreBreakdown {
  sP: number
  sE: number
  sT: number
  sR: number
}

export function buildReasons(
  game: PlayGame,
  cat: ReasonCat,
  s: ScoreBreakdown,
  availableTime: number,
): string[] {
  const reasons: string[] = []

  if (s.sP === 100 && cat.personality) {
    reasons.push(`匹配${PERSONALITY_LABEL[cat.personality]}`)
  }

  if (s.sE === 100) {
    reasons.push('精力档位完全匹配')
  } else if (s.sE >= 75) {
    reasons.push('精力档位接近')
  }

  if (s.sT === 100) {
    reasons.push(`刚好 ${game.durationMin} 分钟`)
  } else if (s.sT >= 80 && game.durationMin < availableTime) {
    reasons.push('时间充裕')
  }

  if (s.sR >= 75) {
    reasons.push(`${cat.name}之前很喜欢`)
  }

  if (reasons.length === 0) {
    reasons.push('综合评估推荐')
  }

  return reasons
}
