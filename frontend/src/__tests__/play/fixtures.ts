import type { RecommendResult, PlayGame, Suggestion } from '@/types/play'

const featherFishing: PlayGame = {
  id: 'feather-fishing',
  name: '羽毛钓鱼',
  category: 'hunting',
  difficulty: 'easy',
  durationMin: 10,
  energyCost: 4,
  requiredProps: ['羽毛逗猫棒'],
  benefits: ['反应训练', '狩猎模拟'],
  fitsPersonality: ['active', 'aloof'],
  contraindications: ['senior', 'post_op'],
  description: '用羽毛模拟鸟类飞行轨迹引导猫咪扑咬',
  tips: '结束时用零食奖励',
}

const tunnelExplore: PlayGame = {
  id: 'tunnel-explore',
  name: '猫隧道探险',
  category: 'chase',
  difficulty: 'easy',
  durationMin: 10,
  energyCost: 3,
  requiredProps: ['猫隧道'],
  benefits: ['探索', '追逐'],
  fitsPersonality: ['active', 'curious'],
  contraindications: [],
  description: '用零食或玩具引导猫咪穿过隧道',
  tips: '可以铺响纸增加趣味',
}

const baseSuggestion = (game: PlayGame, score: number): Suggestion => ({
  game,
  score,
  breakdown: { personality: 100, energy: 75, time: 100, preference: 60 },
  reasons: ['匹配活泼好动型性格', '刚好 10 分钟'],
})

export const successResult: RecommendResult = {
  success: true,
  fallback: false,
  suggestions: [baseSuggestion(featherFishing, 92), baseSuggestion(tunnelExplore, 84)],
}

export const fallbackResult: RecommendResult = {
  success: true,
  fallback: true,
  suggestions: [
    {
      game: featherFishing,
      score: 0,
      breakdown: null,
      reasons: ['适合活泼好动型的猫咪'],
    },
  ],
}

export const needProfileResult: RecommendResult = {
  success: false,
  fallback: false,
  suggestions: [],
  needProfileCompletion: true,
  message: '请先完善猫咪的性格档案，以获得个性化推荐。',
}

export const vetHintResult: RecommendResult = {
  success: false,
  fallback: true,
  suggestions: [],
  message: '当前健康状况下暂不建议自行陪玩，请咨询兽医获取个性化建议。',
}
