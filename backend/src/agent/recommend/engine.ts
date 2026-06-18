/**
 * recommend 引擎 — 对齐技术设计 §4.2 主流程
 *
 * 流程：
 *   1. 加载猫画像 + 偏好
 *   2. 档案不完整 → needProfileCompletion 提示（success=false）
 *   3. 健康过滤
 *   4. healthyPool 为空 → emptyResultWithVetHint（L2）
 *   5. 打分 + 排序 + 多样化 + soft-fallback 放宽
 *   6. 候选 < 3 → fallbackRecommend（L1）
 *   7. 否则正常返回（含 reasons 与 breakdown）
 *
 * soft-fallback 4 步放宽：
 *   - 步 1：maxPerCategory 2 → 3
 *   - 步 2：preferredCategory 硬过滤 → 软加权
 *   - 步 3：timeFlex 1.0 → 0.8（允许 timeScore=0 但不超时太多）
 *   - 步 4：timeFlex → 0.5（最后兜底）
 */

import { playGames as DEFAULT_GAMES } from '../../data/playGames'
import type { PlayGame, GameCategory, HealthTag } from '../../data/playGames.types'
import { catProfileService } from '../../services/catProfile.service'
import { preferenceService } from '../../services/preference.service'
import type { AgentContext } from '../types/agent'

import { applyHealthFilter } from './filters'
import { diversify, type Scored } from './diversify'
import { fallbackRecommend, emptyResultWithVetHint, type RecommendResult, type Suggestion } from './fallback'
import { buildReasons } from './explain'
import { personalityScore } from './scoring/personality'
import { energyScore } from './scoring/energy'
import { timeScore } from './scoring/time'
import { preferenceScore } from './scoring/preference'

export interface RecommendInput {
  catId: string
  availableTime?: number
  preferredCategory?: GameCategory
  currentEnergyOverride?: number
}

const WEIGHTS = { personality: 0.35, energy: 0.25, time: 0.20, preference: 0.20 }
const DEFAULT_AVAILABLE_TIME = 10
const TARGET = 3

interface ScoredItem {
  game: PlayGame
  score: number
  breakdown: { personality: number; energy: number; time: number; preference: number }
  reasons: string[]
  sT: number
}

export async function recommend(
  input: RecommendInput,
  _ctx: AgentContext,
): Promise<RecommendResult> {
  // 1. 加载画像
  const cat = await catProfileService.getById(input.catId)
  if (!cat) {
    return {
      success: false,
      fallback: false,
      suggestions: [],
      message: '未找到该猫咪的档案。',
    }
  }

  // 2. 档案不完整
  if (!cat.personality) {
    return {
      success: false,
      fallback: false,
      suggestions: [],
      needProfileCompletion: true,
      message: '请先完善猫咪的性格档案，以获得个性化推荐。',
    }
  }

  // 3. 健康过滤
  const healthyPool = applyHealthFilter(DEFAULT_GAMES, cat.healthTags as HealthTag[])

  // 4. 健康池为空 → L2
  if (healthyPool.length === 0) {
    return emptyResultWithVetHint()
  }

  const availableTime = input.availableTime ?? DEFAULT_AVAILABLE_TIME
  const currentEnergy = input.currentEnergyOverride ?? cat.energyBaseline ?? 3
  const pref = await preferenceService.getByCatId(input.catId)

  // 5. 打分 — 同时记录是否命中 preferredCategory（供步 2 软加权）
  const baseScored: ScoredItem[] = healthyPool.map(game => {
    const sP = personalityScore(game, cat.personality!)
    const sE = energyScore(game, currentEnergy)
    const sT = timeScore(game, availableTime)
    const sR = preferenceScore(game, pref)
    const total = Math.round(
      sP * WEIGHTS.personality +
      sE * WEIGHTS.energy +
      sT * WEIGHTS.time +
      sR * WEIGHTS.preference,
    )
    return {
      game,
      score: total,
      breakdown: { personality: sP, energy: sE, time: sT, preference: sR },
      reasons: buildReasons(game, cat, { sP, sE, sT, sR }, availableTime),
      sT,
    }
  })

  // 6. soft-fallback 4 步
  const result = trySoftFallback(baseScored, input.preferredCategory)
  if (result.length >= TARGET) {
    return {
      success: true,
      fallback: false,
      suggestions: toSuggestions(result),
    }
  }

  // 7. 候选不足 → L1 fallbackRecommend
  return fallbackRecommend(cat, healthyPool)
}

function trySoftFallback(
  base: ScoredItem[],
  preferredCategory?: GameCategory,
): ScoredItem[] {
  // 步 1: 硬 preferredCategory + maxPerCategory=2
  let pool = preferredCategory
    ? base.filter(s => s.game.category === preferredCategory)
    : base
  let scored = pool.filter(s => s.sT > 0)
  scored = sortDesc(scored)
  let result = diversify(scored, { maxPerCategory: 2, top: 5 })
  if (result.length >= TARGET) return result

  // 步 1b: maxPerCategory 2 → 3
  result = diversify(scored, { maxPerCategory: 3, top: 5 })
  if (result.length >= TARGET) return result

  // 步 2: 放弃 preferredCategory 硬过滤 → 软加权（首选类别 +20 分）
  if (preferredCategory) {
    const softScored = base
      .filter(s => s.sT > 0)
      .map(s =>
        s.game.category === preferredCategory
          ? { ...s, score: s.score + 20 }
          : s,
      )
    scored = sortDesc(softScored)
    result = diversify(scored, { maxPerCategory: 2, top: 5 })
    if (result.length >= TARGET) return result
    result = diversify(scored, { maxPerCategory: 3, top: 5 })
    if (result.length >= TARGET) return result
  }

  // 步 3: timeFlex → 允许 sT=0 的游戏（极端短可用时长场景）
  scored = sortDesc(base)
  result = diversify(scored, { maxPerCategory: 3, top: 5 })
  return result
}

function sortDesc(items: ScoredItem[]): ScoredItem[] {
  return [...items].sort((a, b) => b.score - a.score)
}

function toSuggestions(items: ScoredItem[]): Suggestion[] {
  return items.map(it => ({
    game: it.game,
    score: it.score,
    breakdown: it.breakdown,
    reasons: it.reasons,
  }))
}
