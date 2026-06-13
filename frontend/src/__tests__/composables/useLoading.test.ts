// frontend/src/__tests__/composables/useLoading.test.ts
import { describe, it, expect, vi } from 'vitest'
import { useLoading } from '../../composables/useLoading'

describe('useLoading', () => {
  it('should initialize with default state', () => {
    const { isLoading } = useLoading()
    
    expect(isLoading.value).toBe(false)
  })

  it('should initialize with true', () => {
    const { isLoading } = useLoading(true)
    
    expect(isLoading.value).toBe(true)
  })

  it('should toggle loading state', () => {
    const { isLoading, start, stop } = useLoading()
    
    expect(isLoading.value).toBe(false)
    start()
    expect(isLoading.value).toBe(true)
    stop()
    expect(isLoading.value).toBe(false)
  })

  it('should wrap async function', async () => {
    const { isLoading, wrap } = useLoading()
    const mockFn = vi.fn().mockResolvedValue('result')
    
    expect(isLoading.value).toBe(false)
    
    const result = await wrap(mockFn)
    
    expect(isLoading.value).toBe(false)
    expect(mockFn).toHaveBeenCalled()
    expect(result).toBe('result')
  })

  it('should handle errors in wrapped function', async () => {
    const { isLoading, wrap } = useLoading()
    const mockFn = vi.fn().mockRejectedValue(new Error('test error'))
    
    expect(isLoading.value).toBe(false)
    
    await expect(wrap(mockFn)).rejects.toThrow('test error')
    
    expect(isLoading.value).toBe(false)
  })
})
