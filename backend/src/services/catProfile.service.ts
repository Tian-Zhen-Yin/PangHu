/**
 * catProfileService — 读取/写入猫咪陪玩档案
 *
 * 字段映射约定：
 *   - personality 直接存字面量字符串；非法值映射为 null
 *   - energyBaseline 整数 1-5；超范围映射为 null
 *   - healthTags 存 JSON 字符串数组，未知标签会被过滤；解析失败返回 []
 *
 * 写入（update）契约：
 *   - 必须先通过 (id, userId) ownership 校验，否则返回 null
 *   - 仅写入 input 中显式提供的字段（partial update）
 *   - 字段传 null 表示清空（personality/energyBaseline/healthTags 均可空）
 *   - 返回归一化后的 CatProfile
 */

import prisma from '../config/database'
import type { Personality, HealthTag } from '../data/playGames.types'

export interface CatProfile {
  id: string
  name: string
  userId: string
  personality: Personality | null
  energyBaseline: number | null
  healthTags: HealthTag[]
}

const PERSONALITIES: ReadonlySet<string> = new Set([
  'active',
  'curious',
  'clingy',
  'aloof',
])

const HEALTH_TAGS: ReadonlySet<string> = new Set([
  'overweight',
  'senior',
  'post_op',
  'kitten',
])

function normalizePersonality(value: unknown): Personality | null {
  if (typeof value === 'string' && PERSONALITIES.has(value)) {
    return value as Personality
  }
  return null
}

function normalizeEnergy(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5) {
    return value
  }
  return null
}

function parseHealthTags(raw: unknown): HealthTag[] {
  if (typeof raw !== 'string' || raw.length === 0) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (tag): tag is HealthTag => typeof tag === 'string' && HEALTH_TAGS.has(tag)
    )
  } catch {
    return []
  }
}

export interface CatProfileUpdateInput {
  personality?: Personality | null
  energyBaseline?: number | null
  healthTags?: HealthTag[] | null
}

export const catProfileService = {
  async getById(catId: string): Promise<CatProfile | null> {
    const row = await prisma.cat.findUnique({
      where: { id: catId },
      select: {
        id: true,
        userId: true,
        name: true,
        personality: true,
        energyBaseline: true,
        healthTags: true,
      },
    })
    if (!row) return null

    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      personality: normalizePersonality(row.personality),
      energyBaseline: normalizeEnergy(row.energyBaseline),
      healthTags: parseHealthTags(row.healthTags),
    }
  },

  async update(
    catId: string,
    userId: string,
    input: CatProfileUpdateInput,
  ): Promise<CatProfile | null> {
    // ownership：cat 必须属于该 user
    const owned = await prisma.cat.findFirst({
      where: { id: catId, userId },
      select: { id: true },
    })
    if (!owned) return null

    // 仅写入 input 中显式出现的字段（含 null 清空）
    const data: Record<string, unknown> = {}
    if ('personality' in input) data.personality = input.personality ?? null
    if ('energyBaseline' in input) data.energyBaseline = input.energyBaseline ?? null
    if ('healthTags' in input) {
      data.healthTags = input.healthTags ? JSON.stringify(input.healthTags) : null
    }

    const row = await prisma.cat.update({
      where: { id: catId },
      data,
      select: {
        id: true,
        userId: true,
        name: true,
        personality: true,
        energyBaseline: true,
        healthTags: true,
      },
    })

    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      personality: normalizePersonality(row.personality),
      energyBaseline: normalizeEnergy(row.energyBaseline),
      healthTags: parseHealthTags(row.healthTags),
    }
  },
}
