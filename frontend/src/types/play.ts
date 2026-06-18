export type GameCategory = 'chase' | 'hunting' | 'puzzle' | 'interaction' | 'climbing' | 'solo'
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

export interface ScoreBreakdown {
  personality: number
  energy: number
  time: number
  preference: number
}

export interface Suggestion {
  game: PlayGame
  score: number
  breakdown: ScoreBreakdown | null
  reasons: string[]
}

export interface RecommendResult {
  success: boolean
  fallback: boolean
  suggestions: Suggestion[]
  message?: string
  needProfileCompletion?: boolean
}

export interface RecommendQuery {
  catId: string
  availableTime?: number
  preferredCategory?: GameCategory
  currentEnergyOverride?: number
}

export interface FeedbackPayload {
  catId: string
  gameId: string
  score: number
  completion: boolean
  actualDuration: number
  playedAt?: string
  notes?: string
}

export interface PlayProfilePayload {
  personality: Personality
  energyBaseline: number
  healthTags: HealthTag[]
}

// ===== 配置表（用户视角文案，对齐 PRD §4.2 / §4.4.1） =====

export const PERSONALITY_OPTIONS: Array<{
  value: Personality
  label: string
  description: string
  example: string
}> = [
  { value: 'active',  label: '活泼好动型', description: '精力旺盛，喜欢追逐奔跑',     example: '经常飞奔、扑咬、撕咬玩具' },
  { value: 'curious', label: '聪明好奇型', description: '喜欢探索，善于解谜',         example: '爱开柜门、研究新物品' },
  { value: 'clingy',  label: '黏人互动型', description: '依赖主人，喜欢被关注',       example: '跟随主人、爱被抚摸' },
  { value: 'aloof',   label: '高冷独立型', description: '喜欢独处，选择性互动',       example: '喜欢独自待着、不爱被打扰' },
]

export const ENERGY_LEVELS: Array<{
  value: 1 | 2 | 3 | 4 | 5
  label: string
  description: string
}> = [
  { value: 1, label: '极低', description: '多数时间在睡觉，几乎不主动活动' },
  { value: 2, label: '偏低', description: '喜欢趴卧，偶尔短暂玩耍' },
  { value: 3, label: '中等', description: '日常活动正常，每天主动玩耍数次' },
  { value: 4, label: '偏高', description: '经常跑动，对玩具反应强烈' },
  { value: 5, label: '极高', description: '几乎停不下来，需要大量运动消耗' },
]

export const HEALTH_TAG_OPTIONS: Array<{
  value: HealthTag
  label: string
  hint: string
}> = [
  { value: 'overweight', label: '体重偏重',     hint: '兽医评估超出标准体重 / BMI 偏高' },
  { value: 'senior',     label: '老年（≥10岁）', hint: '推荐避开高强度游戏' },
  { value: 'post_op',    label: '术后恢复',     hint: '术后 30 天内，避免拉扯' },
  { value: 'kitten',     label: '幼猫（<6月）', hint: '避免猫薄荷与激光等敏感刺激' },
]

export const CATEGORY_LABEL: Record<GameCategory, string> = {
  chase: '追逐',
  hunting: '狩猎',
  puzzle: '益智',
  interaction: '互动',
  climbing: '攀爬',
  solo: '独处',
}

export interface ScenarioPreset {
  id: 'SC1' | 'SC2' | 'SC3' | 'SC4' | 'SC5' | 'SC6'
  label: string
  query: Partial<Pick<RecommendQuery, 'availableTime' | 'currentEnergyOverride' | 'preferredCategory'>>
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  { id: 'SC1', label: '只有 5 分钟',  query: { availableTime: 5 } },
  { id: 'SC2', label: '只有 10 分钟', query: { availableTime: 10 } },
  { id: 'SC3', label: '精力旺盛',     query: { currentEnergyOverride: 5 } },
  { id: 'SC4', label: '有点累',       query: { currentEnergyOverride: 2 } },
  { id: 'SC5', label: '想玩追逐',     query: { preferredCategory: 'chase' } },
  { id: 'SC6', label: '想玩益智',     query: { preferredCategory: 'puzzle' } },
]
