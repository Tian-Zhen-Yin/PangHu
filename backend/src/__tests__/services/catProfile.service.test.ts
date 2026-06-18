/**
 * catProfile.service 单测 — TDD RED
 *
 * 验证 getById 把 prisma.cat 行映射到 CatProfile 的契约：
 *   - 透传 id / name / userId
 *   - personality 透传（联合字面量 'active'|'curious'|'clingy'|'aloof'），非法值 -> null
 *   - energyBaseline 透传（1-5），不在范围或 null -> null
 *   - healthTags 解析自 JSON 字符串，非数组 / 解析失败 -> []，
 *     非法标签会被过滤
 *   - 找不到猫咪返回 null
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { catProfileService } from '../../services/catProfile.service'
import prisma from '../../config/database'

vi.mock('../../config/database', () => ({
  default: {
    cat: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

describe('catProfileService.getById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when cat does not exist', async () => {
    ;(prisma.cat.findUnique as any).mockResolvedValue(null)

    const result = await catProfileService.getById('cat-missing')

    expect(result).toBeNull()
  })

  it('maps a fully-populated cat row to CatProfile', async () => {
    ;(prisma.cat.findUnique as any).mockResolvedValue({
      id: 'cat-1',
      userId: 'user-1',
      name: 'Mochi',
      personality: 'active',
      energyBaseline: 4,
      healthTags: JSON.stringify(['overweight', 'senior']),
    })

    const result = await catProfileService.getById('cat-1')

    expect(result).toEqual({
      id: 'cat-1',
      userId: 'user-1',
      name: 'Mochi',
      personality: 'active',
      energyBaseline: 4,
      healthTags: ['overweight', 'senior'],
    })
  })

  it('treats null personality / energyBaseline / healthTags as nullable defaults', async () => {
    ;(prisma.cat.findUnique as any).mockResolvedValue({
      id: 'cat-2',
      userId: 'user-1',
      name: 'Cookie',
      personality: null,
      energyBaseline: null,
      healthTags: null,
    })

    const result = await catProfileService.getById('cat-2')

    expect(result).toMatchObject({
      personality: null,
      energyBaseline: null,
      healthTags: [],
    })
  })

  it('returns null personality when stored value is not a known label', async () => {
    ;(prisma.cat.findUnique as any).mockResolvedValue({
      id: 'cat-3',
      userId: 'user-1',
      name: 'Bug',
      personality: 'unknown_value',
      energyBaseline: 3,
      healthTags: '[]',
    })

    const result = await catProfileService.getById('cat-3')

    expect(result?.personality).toBeNull()
  })

  it('clamps out-of-range energyBaseline to null', async () => {
    ;(prisma.cat.findUnique as any).mockResolvedValue({
      id: 'cat-4',
      userId: 'user-1',
      name: 'Out',
      personality: 'curious',
      energyBaseline: 9,
      healthTags: '[]',
    })

    const result = await catProfileService.getById('cat-4')

    expect(result?.energyBaseline).toBeNull()
  })

  it('falls back to [] when healthTags is invalid JSON', async () => {
    ;(prisma.cat.findUnique as any).mockResolvedValue({
      id: 'cat-5',
      userId: 'user-1',
      name: 'Bad',
      personality: 'aloof',
      energyBaseline: 2,
      healthTags: '{not json',
    })

    const result = await catProfileService.getById('cat-5')

    expect(result?.healthTags).toEqual([])
  })

  it('filters out unknown tags from healthTags', async () => {
    ;(prisma.cat.findUnique as any).mockResolvedValue({
      id: 'cat-6',
      userId: 'user-1',
      name: 'Mix',
      personality: 'clingy',
      energyBaseline: 3,
      healthTags: JSON.stringify(['kitten', 'random_tag', 'post_op']),
    })

    const result = await catProfileService.getById('cat-6')

    expect(result?.healthTags).toEqual(['kitten', 'post_op'])
  })

  it('queries prisma.cat.findUnique with id', async () => {
    ;(prisma.cat.findUnique as any).mockResolvedValue(null)

    await catProfileService.getById('cat-x')

    expect(prisma.cat.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cat-x' },
      })
    )
  })
})

describe('catProfileService.update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when cat does not belong to user', async () => {
    ;(prisma.cat.findFirst as any).mockResolvedValue(null)

    const result = await catProfileService.update('cat-1', 'user-1', {
      personality: 'active',
    })

    expect(result).toBeNull()
    expect(prisma.cat.update).not.toHaveBeenCalled()
  })

  it('ownership check uses (id, userId) compound where', async () => {
    ;(prisma.cat.findFirst as any).mockResolvedValue({ id: 'cat-1', userId: 'user-1' })
    ;(prisma.cat.update as any).mockResolvedValue({
      id: 'cat-1', userId: 'user-1', name: 'Mochi',
      personality: 'active', energyBaseline: null, healthTags: null,
    })

    await catProfileService.update('cat-1', 'user-1', { personality: 'active' })

    expect(prisma.cat.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cat-1', userId: 'user-1' },
      })
    )
  })

  it('persists personality as a literal string', async () => {
    ;(prisma.cat.findFirst as any).mockResolvedValue({ id: 'cat-1', userId: 'user-1' })
    ;(prisma.cat.update as any).mockResolvedValue({
      id: 'cat-1', userId: 'user-1', name: 'Mochi',
      personality: 'curious', energyBaseline: null, healthTags: null,
    })

    await catProfileService.update('cat-1', 'user-1', { personality: 'curious' })

    expect(prisma.cat.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cat-1' },
        data: { personality: 'curious' },
      })
    )
  })

  it('persists energyBaseline as integer', async () => {
    ;(prisma.cat.findFirst as any).mockResolvedValue({ id: 'cat-1', userId: 'user-1' })
    ;(prisma.cat.update as any).mockResolvedValue({
      id: 'cat-1', userId: 'user-1', name: 'Mochi',
      personality: null, energyBaseline: 4, healthTags: null,
    })

    await catProfileService.update('cat-1', 'user-1', { energyBaseline: 4 })

    expect(prisma.cat.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { energyBaseline: 4 },
      })
    )
  })

  it('serializes healthTags array to JSON string', async () => {
    ;(prisma.cat.findFirst as any).mockResolvedValue({ id: 'cat-1', userId: 'user-1' })
    ;(prisma.cat.update as any).mockResolvedValue({
      id: 'cat-1', userId: 'user-1', name: 'Mochi',
      personality: null, energyBaseline: null, healthTags: '["senior"]',
    })

    await catProfileService.update('cat-1', 'user-1', { healthTags: ['senior'] })

    expect(prisma.cat.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { healthTags: JSON.stringify(['senior']) },
      })
    )
  })

  it('only writes provided fields (partial update)', async () => {
    ;(prisma.cat.findFirst as any).mockResolvedValue({ id: 'cat-1', userId: 'user-1' })
    ;(prisma.cat.update as any).mockResolvedValue({
      id: 'cat-1', userId: 'user-1', name: 'Mochi',
      personality: 'active', energyBaseline: null, healthTags: null,
    })

    await catProfileService.update('cat-1', 'user-1', { personality: 'active' })

    const call = (prisma.cat.update as any).mock.calls[0][0]
    expect(call.data).toEqual({ personality: 'active' })
    expect(call.data).not.toHaveProperty('energyBaseline')
    expect(call.data).not.toHaveProperty('healthTags')
  })

  it('returns normalized CatProfile after update', async () => {
    ;(prisma.cat.findFirst as any).mockResolvedValue({ id: 'cat-1', userId: 'user-1' })
    ;(prisma.cat.update as any).mockResolvedValue({
      id: 'cat-1', userId: 'user-1', name: 'Mochi',
      personality: 'active', energyBaseline: 4,
      healthTags: JSON.stringify(['senior']),
    })

    const result = await catProfileService.update('cat-1', 'user-1', {
      personality: 'active', energyBaseline: 4, healthTags: ['senior'],
    })

    expect(result).toEqual({
      id: 'cat-1', userId: 'user-1', name: 'Mochi',
      personality: 'active', energyBaseline: 4, healthTags: ['senior'],
    })
  })

  it('clears a field by passing null (energyBaseline → null)', async () => {
    ;(prisma.cat.findFirst as any).mockResolvedValue({ id: 'cat-1', userId: 'user-1' })
    ;(prisma.cat.update as any).mockResolvedValue({
      id: 'cat-1', userId: 'user-1', name: 'Mochi',
      personality: null, energyBaseline: null, healthTags: null,
    })

    await catProfileService.update('cat-1', 'user-1', { energyBaseline: null })

    expect(prisma.cat.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { energyBaseline: null },
      })
    )
  })
})
