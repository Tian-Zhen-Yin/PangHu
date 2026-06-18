/**
 * 陪玩功能测试 fixtures
 *
 * 用于 backend/src/__tests__/agent/recommend/ 下所有测试。
 * 对齐技术设计 §3.1 PlayGame 类型与 §4.3.3 / PRD §4.3.3 游戏库（10 款）。
 *
 * fixture 与生产数据脱钩：测试中可任意构造场景，避免依赖真实数据演化。
 */

import type {
  PlayGame,
  Personality,
  HealthTag,
  GameCategory,
} from '../../../data/playGames.types'

// ===== 猫画像 =====

export interface FakeCatProfile {
  id: string
  name: string
  userId: string
  personality: Personality | null
  energyBaseline: number | null
  healthTags: HealthTag[]
}

export function fakeCat(overrides: Partial<FakeCatProfile> = {}): FakeCatProfile {
  return {
    id: 'cat-1',
    name: 'Mimi',
    userId: 'user-1',
    personality: 'active',
    energyBaseline: 3,
    healthTags: [],
    ...overrides,
  }
}

// ===== 游戏 =====

export function fakeGame(overrides: Partial<PlayGame> = {}): PlayGame {
  return {
    id: 'g-test',
    name: '测试游戏',
    category: 'chase',
    difficulty: 'easy',
    durationMin: 10,
    energyCost: 3,
    requiredProps: [],
    benefits: [],
    fitsPersonality: ['active'],
    contraindications: [],
    description: 'desc',
    tips: 'tip',
    ...overrides,
  }
}

/** 返回完整 10 款游戏（与 PRD §4.3.3 一致），方便集成测试 */
export function fakeGameLibrary(): PlayGame[] {
  return [
    fakeGame({ id: 'laser-chase',       category: 'chase',       energyCost: 5, durationMin: 8,  fitsPersonality: ['active'],          contraindications: ['senior', 'post_op', 'kitten'] }),
    fakeGame({ id: 'feather-fishing',   category: 'hunting',     energyCost: 4, durationMin: 10, fitsPersonality: ['active', 'aloof'], contraindications: ['senior', 'post_op'] }),
    fakeGame({ id: 'food-puzzle',       category: 'puzzle',      energyCost: 2, durationMin: 15, fitsPersonality: ['curious'],         contraindications: [] }),
    fakeGame({ id: 'hide-seek',         category: 'interaction', energyCost: 2, durationMin: 5,  fitsPersonality: ['clingy'],          contraindications: [] }),
    fakeGame({ id: 'tunnel-explore',    category: 'chase',       energyCost: 3, durationMin: 10, fitsPersonality: ['active', 'curious'], contraindications: ['post_op'] }),
    fakeGame({ id: 'mouse-toy',         category: 'hunting',     energyCost: 4, durationMin: 10, fitsPersonality: ['active', 'aloof'], contraindications: ['senior', 'post_op'] }),
    fakeGame({ id: 'high-perch',        category: 'climbing',    energyCost: 2, durationMin: 10, fitsPersonality: ['curious'],         contraindications: ['senior', 'post_op'] }),
    fakeGame({ id: 'crinkle-chase',     category: 'chase',       energyCost: 3, durationMin: 5,  fitsPersonality: ['active'],          contraindications: ['post_op'] }),
    fakeGame({ id: 'training-handshake',category: 'interaction', energyCost: 1, durationMin: 5,  fitsPersonality: ['clingy', 'curious'], contraindications: [] }),
    fakeGame({ id: 'catnip-toy',        category: 'solo',        energyCost: 2, durationMin: 10, fitsPersonality: ['aloof'],           contraindications: ['kitten'] }),
  ]
}

// ===== 偏好 =====

export interface FakePreference {
  gameStats: Record<string, { count: number; avgScore: number }>
  categoryStats: Record<string, { count: number; avgScore: number }>
}

export function emptyPref(): FakePreference {
  return { gameStats: {}, categoryStats: {} }
}

export function prefWithGame(
  gameId: string,
  count: number,
  avgScore: number,
): FakePreference {
  return {
    gameStats: { [gameId]: { count, avgScore } },
    categoryStats: {},
  }
}

export function prefWithCategory(
  category: GameCategory,
  count: number,
  avgScore: number,
): FakePreference {
  return {
    gameStats: {},
    categoryStats: { [category]: { count, avgScore } },
  }
}
