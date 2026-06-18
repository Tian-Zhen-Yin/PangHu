import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { track } from '@/utils/track'

describe('utils/track', () => {
  let spy: ReturnType<typeof vi.spyOn>
  beforeEach(() => { spy = vi.spyOn(console, 'info').mockImplementation(() => {}) })
  afterEach(() => { spy.mockRestore() })

  it('emits structured event with [track] prefix', () => {
    track('feedback_submit', { catId: 'c1', gameId: 'g1', score: 5, completion: true })
    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0][0]).toBe('[track]')
    expect(spy.mock.calls[0][1]).toBe('feedback_submit')
    expect(spy.mock.calls[0][2]).toEqual({
      catId: 'c1', gameId: 'g1', score: 5, completion: true,
    })
  })

  it('serializes payload safely even when undefined', () => {
    track('recommendation_view')
    expect(spy).toHaveBeenCalledWith('[track]', 'recommendation_view', {})
  })
})
