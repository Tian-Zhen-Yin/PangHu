/**
 * 陪玩游戏库 seed 阶段批量规则展开 — 对齐技术设计 §4.4 单一数据源原则
 *
 * `expandContraindications` 在启动时一次性把 ENERGY_BAN 规则展开到
 * `game.contraindications` 字段。运行时只读这一字段，避免规则散落到
 * 多个过滤层之间产生不一致。
 *
 * ENERGY_BAN 规则：
 *   - energyCost ≥ 4 → 自动加 'senior'
 *   - energyCost ≥ 3 → 自动加 'post_op'
 *
 * 规则必须满足"幂等"：同一份输入多次展开结果稳定（防回归）。
 */

import type { PlayGame, HealthTag } from './playGames.types'

export function expandContraindications(games: PlayGame[]): PlayGame[] {
  return games.map(game => {
    const tags = new Set<HealthTag>(game.contraindications)
    if (game.energyCost >= 4) tags.add('senior')
    if (game.energyCost >= 3) tags.add('post_op')
    return {
      ...game,
      contraindications: Array.from(tags),
    }
  })
}

/**
 * 启动校验：12 字段全部完备（PRD NFR）
 *
 * 不抛错，仅返回缺字段游戏 id 列表，供启动日志记录。
 */
export function validatePlayGames(games: PlayGame[]): string[] {
  const invalid: string[] = []
  for (const g of games) {
    if (
      !g.id ||
      !g.name ||
      !g.category ||
      !g.difficulty ||
      typeof g.durationMin !== 'number' ||
      typeof g.energyCost !== 'number' ||
      !Array.isArray(g.requiredProps) ||
      !Array.isArray(g.benefits) ||
      !Array.isArray(g.fitsPersonality) ||
      !Array.isArray(g.contraindications) ||
      !g.description ||
      !g.tips
    ) {
      invalid.push(g.id || '(no-id)')
    }
  }
  return invalid
}
