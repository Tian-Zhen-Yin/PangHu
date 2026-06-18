/**
 * applyHealthFilter — 对齐技术设计 §4.4 单一数据源原则
 *
 * 运行时只读 game.contraindications 一个字段。
 * ENERGY_BAN / kitten 显式禁忌等批量规则在 seed 阶段（expandContraindications）
 * 已被展开到 contraindications，运行时不再叠加。
 *
 * - healthTags 为空 / 未传 → 不过滤，原样返回
 * - 多个标签按 OR 关系：任一命中即排除
 * - overweight 不进过滤层（鼓励运动语义）
 */

import type { PlayGame, HealthTag } from '../../data/playGames.types'

const FILTERED_TAGS: HealthTag[] = ['senior', 'post_op', 'kitten']

export function applyHealthFilter(games: PlayGame[], healthTags: HealthTag[] = []): PlayGame[] {
  const active = healthTags.filter(t => FILTERED_TAGS.includes(t))
  if (active.length === 0) return games
  return games.filter(game => {
    for (const tag of active) {
      if (game.contraindications.includes(tag)) return false
    }
    return true
  })
}
