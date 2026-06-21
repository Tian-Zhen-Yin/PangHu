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

/** 陪玩指引中的单个操作步骤 */
export interface PlayStep {
  title: string          // 步骤标题，如「预热吸引」
  detail: string         // 具体操作说明
  durationSec?: number   // 建议时长（秒），用于节奏提示/未来跟练计时
}

/** 结构化陪玩指引 */
export interface PlayGuide {
  goal: string           // 本次陪玩想达到的目标
  steps: PlayStep[]      // 3~5 步操作流程
  cautions: string[]     // 安全 / 常见错误提醒（可多条）
  successSignal: string  // 「玩好了」的结束信号
}

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
  guide?: PlayGuide      // 结构化分步指引（可选，渐进式补全）
}

/** 性格中文标签（用于 reasons 文案） */
export const PERSONALITY_LABEL: Record<Personality, string> = {
  active: '活泼好动型',
  curious: '聪明好奇型',
  clingy: '黏人互动型',
  aloof: '高冷独立型',
}
