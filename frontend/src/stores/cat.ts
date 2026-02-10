import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Stage } from '../types/cat'
import { getStages } from '../api/cat'

export const useCatStore = defineStore('cat', () => {
  // 状态
  const stages = ref<Stage[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 获取所有阶段
  async function fetchStages() {
    loading.value = true
    error.value = null
    try {
      const response = await getStages()
      if (response.success) {
        stages.value = response.data
      }
    } catch (err: any) {
      error.value = err.message || '获取数据失败'
    } finally {
      loading.value = false
    }
  }

  // 根据order排序的阶段
  const sortedStages = computed(() => {
    return [...stages.value].sort((a, b) => a.order - b.order)
  })

  return {
    stages,
    sortedStages,
    loading,
    error,
    fetchStages
  }
})
