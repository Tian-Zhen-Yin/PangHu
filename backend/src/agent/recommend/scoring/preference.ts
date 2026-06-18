/**
 * preferenceScore — 对齐技术设计 §4.3.4
 *
 * 三分支优先级：
 *   1. 游戏级：count ≥ 2 → (avgScore - 1) * 25       （1→0, 5→100）
 *   2. 类别级：count ≥ 3 → (avgScore - 1) * 25 * 0.7 （类别级打 0.7 折）
 *   3. 冷启动：NEUTRAL = 60                          （所有游戏同分，不影响排序）
 */

import type { PlayGame } from '../../../data/playGames.types'

export interface PreferenceData {
  gameStats: Record<string, { count: number; avgScore: number }>
  categoryStats: Record<string, { count: number; avgScore: number }>
}

const NEUTRAL = 60
const MIN_GAME_SAMPLE = 2
const MIN_CAT_SAMPLE = 3

export function preferenceScore(game: PlayGame, pref: PreferenceData): number {
  const gameStat = pref.gameStats[game.id]
  if (gameStat && gameStat.count >= MIN_GAME_SAMPLE) {
    return Math.round((gameStat.avgScore - 1) * 25)
  }
  const catStat = pref.categoryStats[game.category]
  if (catStat && catStat.count >= MIN_CAT_SAMPLE) {
    return Math.round((catStat.avgScore - 1) * 25 * 0.7)
  }
  return NEUTRAL
}
