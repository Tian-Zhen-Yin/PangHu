import { describe, it, expect, vi, beforeEach } from 'vitest'
import { successResult, fallbackResult, needProfileResult } from './fixtures'

vi.mock('@/api/play', () => ({
  getPlayRecommend: vi.fn(),
  submitPlayFeedback: vi.fn(),
  updatePlayProfile: vi.fn(),
}))

import { getPlayRecommend } from '@/api/play'
import { usePlayRecommend } from '@/composables/usePlayRecommend'
import { SCENARIO_PRESETS } from '@/types/play'

describe('usePlayRecommend', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('fetch sets result on success', async () => {
    ;(getPlayRecommend as any).mockResolvedValueOnce({ success: true, data: successResult, message: '', error: null })
    const c = usePlayRecommend()
    await c.fetch({ catId: 'c1' })
    expect(c.result.value).toEqual(successResult)
    expect(c.error.value).toBeNull()
    expect(c.loading.value).toBe(false)
  })

  it('fetch sets error when ApiResponse.success is false (non-business code path)', async () => {
    ;(getPlayRecommend as any).mockResolvedValueOnce({ success: false, data: null, message: '加载失败', error: 'X' })
    const c = usePlayRecommend()
    await c.fetch({ catId: 'c1' })
    expect(c.error.value).toBe('加载失败')
    expect(c.result.value).toBeNull()
  })

  it('treats RecommendResult.needProfileCompletion as a valid (non-error) result', async () => {
    ;(getPlayRecommend as any).mockResolvedValueOnce({ success: true, data: needProfileResult, message: '', error: null })
    const c = usePlayRecommend()
    await c.fetch({ catId: 'c1' })
    expect(c.result.value).toEqual(needProfileResult)
    expect(c.error.value).toBeNull()
  })

  it('older fetch result is discarded when superseded', async () => {
    let resolveOld: (v: any) => void = () => {}
    const oldPromise = new Promise(r => { resolveOld = r })
    ;(getPlayRecommend as any)
      .mockReturnValueOnce(oldPromise)
      .mockResolvedValueOnce({ success: true, data: fallbackResult, message: '', error: null })

    const c = usePlayRecommend()
    const p1 = c.fetch({ catId: 'c1' })
    const p2 = c.fetch({ catId: 'c1', availableTime: 5 })
    await p2
    resolveOld({ success: true, data: successResult, message: '', error: null })
    await p1
    expect(c.result.value).toEqual(fallbackResult)
  })

  it('aborts old AbortController when new fetch starts', async () => {
    const aborts: Array<(s: AbortSignal) => void> = []
    ;(getPlayRecommend as any).mockImplementation((_q: any, signal: AbortSignal) => {
      const cb = () => {}
      signal?.addEventListener('abort', cb)
      aborts.push(cb)
      return new Promise(() => { /* never */ })
    })
    const c = usePlayRecommend()
    void c.fetch({ catId: 'c1' })
    void c.fetch({ catId: 'c1', availableTime: 5 })
    expect(aborts.length).toBe(2)
  })

  it('network error sets error and resets loading', async () => {
    ;(getPlayRecommend as any).mockRejectedValueOnce(new Error('Network down'))
    const c = usePlayRecommend()
    await c.fetch({ catId: 'c1' })
    expect(c.error.value).toBe('网络异常，请重试')
    expect(c.loading.value).toBe(false)
  })

  it('CanceledError from axios is silently swallowed', async () => {
    const err = new Error('aborted')
    ;(err as any).name = 'CanceledError'
    ;(getPlayRecommend as any).mockRejectedValueOnce(err)
    const c = usePlayRecommend()
    await c.fetch({ catId: 'c1' })
    expect(c.error.value).toBeNull()
  })

  it('applyScenario sets activeScenarioId and merges query', async () => {
    ;(getPlayRecommend as any).mockResolvedValueOnce({ success: true, data: successResult, message: '', error: null })
    const c = usePlayRecommend()
    await c.applyScenario(SCENARIO_PRESETS[0], 'c1')
    expect(c.activeScenarioId.value).toBe('SC1')
    expect(getPlayRecommend).toHaveBeenCalledWith({ catId: 'c1', availableTime: 5 }, expect.any(AbortSignal))
  })

  it('reset clears result, error, activeScenarioId', async () => {
    ;(getPlayRecommend as any).mockResolvedValueOnce({ success: true, data: successResult, message: '', error: null })
    const c = usePlayRecommend()
    await c.applyScenario(SCENARIO_PRESETS[0], 'c1')
    c.reset()
    expect(c.result.value).toBeNull()
    expect(c.activeScenarioId.value).toBeNull()
    expect(c.error.value).toBeNull()
  })
})
