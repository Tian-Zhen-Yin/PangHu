/**
 * energyScore — 对齐技术设计 §4.3.2
 *
 * 公式：score = max(0, 100 - |currentEnergy - game.energyCost| * 25)
 *
 * | diff | 0   | 1  | 2  | 3  | 4 |
 * | sc   | 100 | 75 | 50 | 25 | 0 |
 *
 * 越界值（如 currentEnergy=10）应被 clamp 到 0，而不是负数。
 */

import type { PlayGame } from '../../../data/playGames.types'

export function energyScore(game: PlayGame, currentEnergy: number): number {
  const diff = Math.abs(currentEnergy - game.energyCost)
  return Math.max(0, 100 - diff * 25)
}
