import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PetRecord, CreatePetRecordParams } from '../api/pet'
import {
  getPetRecords,
  createPetRecord as createPetRecordApi,
  updatePetRecord as updatePetRecordApi,
  deletePetRecord as deletePetRecordApi
} from '../api/pet'

export const usePetStore = defineStore('pet', () => {
  // 状态
  const records = ref<PetRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 获取所有宠物记录
  // 支持按 catId 过滤，只返回指定猫咪的记录
  async function fetchRecords(catId?: string) {
    loading.value = true
    error.value = null
    try {
      const response = await getPetRecords(catId)
      if (response.success) {
        records.value = response.data
      }
    } catch (err: any) {
      error.value = err.message || '获取记录失败'
    } finally {
      loading.value = false
    }
  }

  // 创建宠物记录
  async function createRecord(params: CreatePetRecordParams, file?: File) {
    loading.value = true
    error.value = null
    try {
      const response = await createPetRecordApi(params, file)
      if (response.success) {
        records.value.unshift(response.data)
        return true
      }
      error.value = response.message || '创建失败'
      return false
    } catch (err: any) {
      error.value = err.message || '创建失败'
      return false
    } finally {
      loading.value = false
    }
  }

  // 更新宠物记录
  async function updateRecord(id: string, params: Partial<CreatePetRecordParams>, file?: File) {
    loading.value = true
    error.value = null
    try {
      const response = await updatePetRecordApi(id, params, file)
      if (response.success) {
        const index = records.value.findIndex(r => r.id === id)
        if (index !== -1) {
          records.value[index] = response.data
        }
        return true
      }
      error.value = response.message || '更新失败'
      return false
    } catch (err: any) {
      error.value = err.message || '更新失败'
      return false
    } finally {
      loading.value = false
    }
  }

  // 删除宠物记录
  async function deleteRecord(id: string) {
    try {
      const response = await deletePetRecordApi(id)
      if (response.success) {
        records.value = records.value.filter(r => r.id !== id)
        return true
      }
      return false
    } catch (err: any) {
      console.error('删除记录失败:', err)
      return false
    }
  }

  // 获取按日期排序的记录（用于时间线）
  const sortedRecords = computed(() => {
    return [...records.value].sort((a, b) => {
      return new Date(a.recordDate).getTime() - new Date(b.recordDate).getTime()
    })
  })

  // 获取体重变化数据（用于图表）
  const weightHistory = computed(() => {
    return sortedRecords.value
      .filter(r => r.weight > 0)
      .map(r => ({
        date: r.recordDate,
        weight: r.weight,
        ageWeeks: r.ageWeeks
      }))
  })

  // 计算属性
  const hasRecords = computed(() => records.value.length > 0)
  const recordCount = computed(() => records.value.length)

  return {
    records,
    loading,
    error,
    sortedRecords,
    weightHistory,
    hasRecords,
    recordCount,
    fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord
  }
})
