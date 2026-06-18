/**
 * preferenceService — 按 PlayFeedback 聚合偏好数据
 *
 * 输出 PreferenceData，供 preferenceScore 三分支判定：
 *   - gameStats： gameId → {count, avgScore}
 *   - categoryStats：通过 playGames 库把 gameId 映射到 category 后聚合
 *
 * 库外 gameId（脏数据）仍进入 gameStats，但不进入 categoryStats（无法映射）。
 * avgScore 不预先取整，由 preferenceScore 末端再 round，避免累计误差。
 */

import prisma from '../config/database'
import { playGames } from '../data/playGames'
import type { GameCategory } from '../data/playGames.types'
import type { PreferenceData } from '../agent/recommend/scoring/preference'

// gameId → category 索引（启动时构建一次）
const GAME_CATEGORY_INDEX: ReadonlyMap<string, GameCategory> = new Map(
  playGames.map(g => [g.id, g.category]),
)

interface Acc {
  count: number
  sum: number
}

export const preferenceService = {
  async getByCatId(catId: string): Promise<PreferenceData> {
    const rows = await prisma.playFeedback.findMany({
      where: { catId },
      select: { gameId: true, score: true },
    })

    const gameAcc = new Map<string, Acc>()
    const catAcc = new Map<GameCategory, Acc>()

    for (const row of rows) {
      // gameStats：所有 gameId 都计入
      const g = gameAcc.get(row.gameId) ?? { count: 0, sum: 0 }
      g.count += 1
      g.sum += row.score
      gameAcc.set(row.gameId, g)

      // categoryStats：仅库内 gameId 才能映射
      const category = GAME_CATEGORY_INDEX.get(row.gameId)
      if (category) {
        const c = catAcc.get(category) ?? { count: 0, sum: 0 }
        c.count += 1
        c.sum += row.score
        catAcc.set(category, c)
      }
    }

    const gameStats: PreferenceData['gameStats'] = {}
    for (const [gameId, acc] of gameAcc) {
      gameStats[gameId] = { count: acc.count, avgScore: acc.sum / acc.count }
    }

    const categoryStats: PreferenceData['categoryStats'] = {}
    for (const [category, acc] of catAcc) {
      categoryStats[category] = { count: acc.count, avgScore: acc.sum / acc.count }
    }

    return { gameStats, categoryStats }
  },
}
