// frontend/src/__tests__/composables/useLoading.test.ts
// 2026-09 对齐实现:useLoading 暴露 loading/loadingText/setLoading/wrap
import { describe, it, expect, vi } from 'vitest'
import { useLoading } from '../../composables/useLoading'

describe('useLoading', () => {
  it('默认 loading 为 false,文案为"加载中..."', () => {
    const { loading, loadingText } = useLoading()

    expect(loading.value).toBe(false)
    expect(loadingText.value).toBe('加载中...')
  })

  it('setLoading(true) 打开并可自定义文案', () => {
    const { loading, loadingText, setLoading } = useLoading()

    setLoading(true, '上传中...')
    expect(loading.value).toBe(true)
    expect(loadingText.value).toBe('上传中...')

    setLoading(false)
    expect(loading.value).toBe(false)
  })

  it('wrap 执行期间 loading 为 true,结束后为 false', async () => {
    const { loading, wrap } = useLoading()
    let resolveFn!: (v: string) => void
    const mockFn = vi.fn(() => new Promise<string>((r) => { resolveFn = r }))

    const p = wrap(mockFn)
    expect(loading.value).toBe(true)
    resolveFn('result')
    const result = await p

    expect(loading.value).toBe(false)
    expect(mockFn).toHaveBeenCalled()
    expect(result).toBe('result')
  })

  it('wrap 内抛错时同样关闭 loading 并透传异常', async () => {
    const { loading, wrap } = useLoading()
    const mockFn = vi.fn().mockRejectedValue(new Error('test error'))

    await expect(wrap(mockFn)).rejects.toThrow('test error')

    expect(loading.value).toBe(false)
  })
})
