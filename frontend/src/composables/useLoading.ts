import { ref } from 'vue'

/**
 * 全局 loading 状态管理
 * 提供统一的加载状态管理能力
 */
export function useLoading() {
  const loading = ref(false)
  const loadingText = ref('加载中...')

  /**
   * 包装异步函数，自动管理 loading 状态
   */
  function wrap<T>(fn: () => Promise<T>, text: string = '加载中...'): Promise<T> {
    loading.value = true
    loadingText.value = text
    return fn().finally(() => {
      loading.value = false
    })
  }

  /**
   * 手动设置 loading 状态
   */
  function setLoading(value: boolean, text: string = '加载中...') {
    loading.value = value
    loadingText.value = text
  }

  /**
   * 开始 loading
   */
  function start(text: string = '加载中...') {
    loading.value = true
    loadingText.value = text
  }

  /**
   * 停止 loading
   */
  function stop() {
    loading.value = false
  }

  return {
    loading,
    loadingText,
    wrap,
    setLoading,
    start,
    stop
  }
}
