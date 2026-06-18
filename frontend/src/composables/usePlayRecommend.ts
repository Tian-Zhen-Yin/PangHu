import { ref } from 'vue'
import { getPlayRecommend } from '@/api/play'
import type { RecommendQuery, RecommendResult, ScenarioPreset } from '@/types/play'

export function usePlayRecommend() {
  const result = ref<RecommendResult | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const activeScenarioId = ref<string | null>(null)

  let reqSeq = 0
  let aborter: AbortController | null = null

  async function fetch(query: RecommendQuery): Promise<void> {
    const myId = ++reqSeq
    aborter?.abort()
    aborter = new AbortController()
    loading.value = true
    error.value = null
    try {
      const res = await getPlayRecommend(query, aborter.signal)
      if (myId !== reqSeq) return
      if (!res.success) {
        error.value = res.message || '加载推荐失败'
        return
      }
      result.value = res.data
    } catch (e: any) {
      if (e?.name === 'CanceledError' || e?.name === 'AbortError') return
      if (myId !== reqSeq) return
      error.value = '网络异常，请重试'
    } finally {
      if (myId === reqSeq) loading.value = false
    }
  }

  function applyScenario(preset: ScenarioPreset, catId: string): Promise<void> {
    activeScenarioId.value = preset.id
    return fetch({ catId, ...preset.query })
  }

  function reset(): void {
    activeScenarioId.value = null
    result.value = null
    error.value = null
  }

  return { result, loading, error, activeScenarioId, fetch, applyScenario, reset }
}
