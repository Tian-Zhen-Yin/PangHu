/**
 * 陪玩游戏库 - 10 款首批游戏
 *
 * 对齐 PRD §4.3.3 / 技术设计 §3.1。
 *
 * `playGames` 是经过 `expandContraindications` 处理后的最终列表
 * （ENERGY_BAN 等批量规则在启动时一次性展开到 contraindications）。
 * 运行时只读 `game.contraindications` 一个字段——这是单一数据源原则。
 */

import type { PlayGame } from './playGames.types'
import { expandContraindications } from './playGames.seed'

const RAW_GAMES: PlayGame[] = [
  {
    id: 'laser-chase',
    name: '激光追逐',
    category: 'chase',
    difficulty: 'easy',
    durationMin: 8,
    energyCost: 5,
    requiredProps: ['激光笔'],
    benefits: ['爆发力训练', '反应训练'],
    fitsPersonality: ['active'],
    contraindications: ['kitten'], // senior/post_op 由 seed 按 energyCost 展开
    description: '用激光点引导猫咪奔跑、跳跃。',
    tips: '结束时务必让激光落在零食或玩具上，避免猫咪因永远抓不到光点而焦虑。',
  },
  {
    id: 'feather-fishing',
    name: '羽毛钓鱼',
    category: 'hunting',
    difficulty: 'easy',
    durationMin: 10,
    energyCost: 4,
    requiredProps: ['羽毛逗猫棒'],
    benefits: ['狩猎模拟', '反应训练'],
    fitsPersonality: ['active', 'aloof'],
    contraindications: [],
    description: '用羽毛模拟鸟类飞行轨迹，让猫咪追扑。',
    tips: '动作时快时慢，模拟真实猎物。结束时让猫咪成功捕获以获得满足感。',
  },
  {
    id: 'food-puzzle',
    name: '食物谜题',
    category: 'puzzle',
    difficulty: 'medium',
    durationMin: 15,
    energyCost: 2,
    requiredProps: ['漏食球'],
    benefits: ['益智训练', '减缓进食'],
    fitsPersonality: ['curious'],
    contraindications: [],
    description: '把零食藏入漏食球，让猫咪通过推、滚获取食物。',
    tips: '初次使用先示范几次，避免猫咪放弃。',
  },
  {
    id: 'hide-seek',
    name: '藏猫猫',
    category: 'interaction',
    difficulty: 'easy',
    durationMin: 5,
    energyCost: 2,
    requiredProps: [],
    benefits: ['增进互动', '缓解分离焦虑'],
    fitsPersonality: ['clingy'],
    contraindications: [],
    description: '主人躲藏，呼唤猫咪名字让它寻找。',
    tips: '找到后给予零食或抚摸奖励。',
  },
  {
    id: 'tunnel-explore',
    name: '猫隧道探险',
    category: 'chase',
    difficulty: 'easy',
    durationMin: 10,
    energyCost: 3,
    requiredProps: ['猫隧道'],
    benefits: ['探索本能', '运动'],
    fitsPersonality: ['active', 'curious'],
    contraindications: [],
    description: '在隧道两端用玩具引导穿越。',
    tips: '可在隧道里塞响纸增加趣味。',
  },
  {
    id: 'mouse-toy',
    name: '逗猫老鼠',
    category: 'hunting',
    difficulty: 'easy',
    durationMin: 10,
    energyCost: 4,
    requiredProps: ['仿真猫玩具鼠'],
    benefits: ['狩猎模拟'],
    fitsPersonality: ['active', 'aloof'],
    contraindications: [],
    description: '拖动玩具鼠让猫咪追扑。',
    tips: '玩具鼠可以藏在沙发底/纸箱后增加难度。',
  },
  {
    id: 'high-perch',
    name: '高处瞭望',
    category: 'climbing',
    difficulty: 'medium',
    durationMin: 10,
    energyCost: 2,
    requiredProps: ['猫爬架/书架'],
    benefits: ['领地感', '探索'],
    fitsPersonality: ['curious'],
    contraindications: ['senior', 'post_op'], // 也由 seed 按 energyCost 加 post_op，这里补显式 senior 防漏
    description: '引导猫咪爬到高处观察环境。',
    tips: '老年猫优先选择平台间距小的爬架。',
  },
  {
    id: 'crinkle-chase',
    name: '响纸追逐',
    category: 'chase',
    difficulty: 'easy',
    durationMin: 5,
    energyCost: 3,
    requiredProps: ['响纸球'],
    benefits: ['听觉刺激', '运动'],
    fitsPersonality: ['active'],
    contraindications: [],
    description: '揉响纸吸引注意力后投掷让其追逐。',
    tips: '响纸不可被吞食，结束后及时收好。',
  },
  {
    id: 'training-handshake',
    name: '训练握手',
    category: 'interaction',
    difficulty: 'medium',
    durationMin: 5,
    energyCost: 1,
    requiredProps: ['零食'],
    benefits: ['训练', '增进信任'],
    fitsPersonality: ['clingy', 'curious'],
    contraindications: [],
    description: '用零食奖励逐步训练猫咪伸出爪子。',
    tips: '一次训练不超过 5 分钟，避免猫咪厌倦。',
  },
  {
    id: 'catnip-toy',
    name: '猫薄荷玩具',
    category: 'solo',
    difficulty: 'easy',
    durationMin: 10,
    energyCost: 2,
    requiredProps: ['含猫薄荷玩具'],
    benefits: ['情绪释放', '独处娱乐'],
    fitsPersonality: ['aloof'],
    contraindications: ['kitten'], // < 6 个月神经未发育完全
    description: '让猫咪自行与猫薄荷玩具互动。',
    tips: '一周不超过 2-3 次，避免脱敏。',
  },
]

/** 启动时已展开 ENERGY_BAN 规则的最终游戏列表（运行时使用） */
export const playGames: PlayGame[] = expandContraindications(RAW_GAMES)
