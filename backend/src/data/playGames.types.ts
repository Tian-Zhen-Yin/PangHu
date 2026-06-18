/**
 * 陪玩游戏库 - 类型定义
 *
 * 对齐：
 *   PRD §4.3.1 数据结构（用户视角字段表）
 *   技术设计 §3.1 类型定义
 *
 * 这些类型对全 Agent Tool 共享（健康过滤、推荐、营养建议都可使用）。
 */

export type GameCategory =
  | 'chase'        // 追逐
  | 'hunting'      // 狩猎
  | 'puzzle'       // 益智
  | 'interaction'  // 互动
  | 'climbing'     // 攀爬
  | 'solo'         // 独处

export type Personality = 'active' | 'curious' | 'clingy' | 'aloof'

export type HealthTag = 'overweight' | 'senior' | 'post_op' | 'kitten'

export interface PlayGame {
  id: string
  name: string
  category: GameCategory
  difficulty: 'easy' | 'medium' | 'hard'
  durationMin: number
  energyCost: 1 | 2 | 3 | 4 | 5
  requiredProps: string[]
  benefits: string[]
  fitsPersonality: Personality[]
  contraindications: HealthTag[]
  description: string
  tips: string
}

/** 性格中文标签（用于 reasons 文案） */
export const PERSONALITY_LABEL: Record<Personality, string> = {
  active: '活泼好动型',
  curious: '聪明好奇型',
  clingy: '黏人互动型',
  aloof: '高冷独立型',
}
