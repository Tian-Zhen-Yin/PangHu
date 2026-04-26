import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserPlan } from '../api/plan.js'
import {
  getUserPlans,
  createUserPlan,
  updatePlanProgress,
  deleteUserPlan as deleteUserPlanApi,
  setActivePlan as setActivePlanApi
} from '../api/plan.js'

export const usePlanStore = defineStore('plan', () => {
  // 状态
  const plans = ref<UserPlan[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 获取所有计划
  async function fetchPlans() {
    loading.value = true
    error.value = null
    try {
      const response = await getUserPlans()
      if (response.success) {
        plans.value = response.data
      }
    } catch (err: any) {
      error.value = err.message || '获取计划失败'
    } finally {
      loading.value = false
    }
  }

  // 保存模板为计划
  async function saveTemplate(templateId: string, name: string) {
    loading.value = true
    error.value = null
    try {
      const response = await createUserPlan({ templateId, name })
      if (response.success) {
        plans.value.unshift(response.data)
        return true
      }
      error.value = response.message || '保存失败'
      return false
    } catch (err: any) {
      error.value = err.message || '保存失败'
      return false
    } finally {
      loading.value = false
    }
  }

  // 更新计划进度
  async function updateProgress(planId: string, progress: Record<string, any>) {
    try {
      const response = await updatePlanProgress(planId, progress)
      if (response.success) {
        const index = plans.value.findIndex(p => p.id === planId)
        if (index !== -1) {
          plans.value[index] = response.data
        }
      }
    } catch (err: any) {
      console.error('更新进度失败:', err)
    }
  }

  // 设置激活计划
  async function setActivePlan(planId: string) {
    try {
      const response = await setActivePlanApi(planId)
      if (response.success) {
        plans.value.forEach(p => {
          p.isActive = p.id === planId
        })
      }
    } catch (err: any) {
      console.error('设置激活计划失败:', err)
    }
  }

  // 删除计划
  async function deleteUserPlan(planId: string) {
    try {
      const response = await deleteUserPlanApi(planId)
      if (response.success) {
        plans.value = plans.value.filter(p => p.id !== planId)
        return true
      }
      return false
    } catch (err: any) {
      console.error('删除计划失败:', err)
      return false
    }
  }

  // 解析进度数据
  function getPlanProgress(planId: string) {
    const plan = plans.value.find(p => p.id === planId)
    if (!plan) return {}
    try {
      return JSON.parse(plan.progress)
    } catch {
      return {}
    }
  }

  // 计算计划完成度
  function getPlanCompletion(planId: string): number {
    const progress = getPlanProgress(planId)
    const tasks = Object.keys(progress)
    if (tasks.length === 0) return 0
    const completed = tasks.filter(key => progress[key]?.completed).length
    return Math.round((completed / tasks.length) * 100)
  }

  // 计算属性
  const activePlans = computed(() => plans.value.filter(p => p.isActive))
  const hasPlans = computed(() => plans.value.length > 0)

  return {
    plans,
    loading,
    error,
    activePlans,
    hasPlans,
    fetchPlans,
    saveTemplate,
    updateProgress,
    setActivePlan,
    deleteUserPlan,
    getPlanProgress,
    getPlanCompletion
  }
})
