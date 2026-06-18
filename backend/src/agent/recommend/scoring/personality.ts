/**
 * personalityScore — 对齐技术设计 §4.3.1
 *
 * 三档：
 *   100 — 显式命中 fitsPersonality
 *   60  — 性格落在 SUBCOMPATIBLE 列表中（次匹配）
 *   0   — 既未显式也无次匹配
 *
 * SUBCOMPATIBLE.aloof 必须为空：aloof 类游戏在 PRD §4.3.3 已显式打标，
 * 不能在 SUBCOMPATIBLE 中再次叠加，避免重复计分。
 */

import type { PlayGame, Personality, GameCategory } from '../../../data/playGames.types'

const SUBCOMPATIBLE: Record<Personality, GameCategory[]> = {
  active: ['hunting', 'chase'],
  curious: ['climbing', 'puzzle'],
  clingy: ['interaction'],
  aloof: [], // 必须为空（防回归）
}

export function personalityScore(game: PlayGame, personality: Personality): number {
  if (game.fitsPersonality.includes(personality)) return 100
  if (SUBCOMPATIBLE[personality].includes(game.category)) return 60
  return 0
}
