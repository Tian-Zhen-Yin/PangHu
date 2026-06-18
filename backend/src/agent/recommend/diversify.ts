/**
 * diversify — 对齐技术设计 §4.5
 *
 * 要求：
 *   1. 输入按 score 降序遍历（调用方保证）
 *   2. 同 category 累计达到 maxPerCategory 后跳过
 *   3. 总数到 top 立即停止
 *   4. 不修改原数组、不重新排序
 */

import type { PlayGame } from '../../data/playGames.types'

export interface Scored<T = unknown> {
  game: PlayGame
  score: number
  breakdown?: T
  reasons?: string[]
}

export interface DiversifyOptions {
  maxPerCategory: number
  top: number
}

export function diversify<T extends Scored>(items: T[], options: DiversifyOptions): T[] {
  const { maxPerCategory, top } = options
  const result: T[] = []
  const counts: Record<string, number> = {}
  for (const item of items) {
    if (result.length >= top) break
    const c = counts[item.game.category] ?? 0
    if (c >= maxPerCategory) continue
    counts[item.game.category] = c + 1
    result.push(item)
  }
  return result
}
