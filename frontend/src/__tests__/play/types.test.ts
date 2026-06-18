import { describe, it, expect } from 'vitest'
import {
  PERSONALITY_OPTIONS,
  ENERGY_LEVELS,
  HEALTH_TAG_OPTIONS,
  SCENARIO_PRESETS,
  CATEGORY_LABEL,
} from '@/types/play'

describe('types/play config tables', () => {
  it('PERSONALITY_OPTIONS covers exactly 4 personalities', () => {
    expect(PERSONALITY_OPTIONS.map(o => o.value).sort()).toEqual(
      ['active', 'aloof', 'clingy', 'curious'],
    )
    PERSONALITY_OPTIONS.forEach(o => {
      expect(o.label).toBeTruthy()
      expect(o.description).toBeTruthy()
      expect(o.example).toBeTruthy()
    })
  })

  it('ENERGY_LEVELS covers 1..5 in order', () => {
    expect(ENERGY_LEVELS.map(l => l.value)).toEqual([1, 2, 3, 4, 5])
  })

  it('HEALTH_TAG_OPTIONS covers all 4 tags', () => {
    expect(HEALTH_TAG_OPTIONS.map(t => t.value).sort()).toEqual(
      ['kitten', 'overweight', 'post_op', 'senior'],
    )
  })

  it('SCENARIO_PRESETS has 6 unique ids SC1..SC6', () => {
    const ids = SCENARIO_PRESETS.map(p => p.id)
    expect(ids).toEqual(['SC1', 'SC2', 'SC3', 'SC4', 'SC5', 'SC6'])
    expect(new Set(ids).size).toBe(6)
    SCENARIO_PRESETS.forEach(p => {
      expect(Object.keys(p.query).length).toBeGreaterThan(0)
    })
  })

  it('CATEGORY_LABEL covers all 6 categories', () => {
    expect(Object.keys(CATEGORY_LABEL).sort()).toEqual(
      ['chase', 'climbing', 'hunting', 'interaction', 'puzzle', 'solo'],
    )
  })
})
