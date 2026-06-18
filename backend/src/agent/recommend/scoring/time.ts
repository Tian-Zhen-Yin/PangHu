/**
 * timeScore — 对齐技术设计 §4.3.3
 *
 * 三段梯形函数（ratio = game.durationMin / availableTime）：
 *   ratio ≤ 1.0   → 60 + 40 * ratio
 *   1.0 < r ≤ 1.5 → 100 - 100 * (r - 1.0)
 *   ratio > 1.5   → 0
 *
 * availableTime ≤ 0 → 0（防止除零 / 异常入参）
 */

import type { PlayGame } from '../../../data/playGames.types'

export function timeScore(game: PlayGame, availableTime: number): number {
  if (availableTime <= 0) return 0
  const ratio = game.durationMin / availableTime
  if (ratio <= 1.0) return Math.round(60 + 40 * ratio)
  if (ratio <= 1.5) return Math.round(100 - 100 * (ratio - 1.0))
  return 0
}
