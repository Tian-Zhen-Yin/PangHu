import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Cat, CatFormData } from '../types/cat'
import { getMyCats, createMyCat, updateMyCat, deleteMyCat, setWeightGoal as setWeightGoalApi } from '../api/myCat'

export const useMyCatStore = defineStore('myCat', () => {
  const cats = ref<Cat[]>([])
  const currentCat = ref<Cat | null>(null)
  const loading = ref(false)
  const weightGoal = ref<{ target: number; date: string } | null>(null)

  async function fetchCats() {
    loading.value = true
    try {
      const res = await getMyCats()
      if (res.success) {
        cats.value = res.data
        const savedId = localStorage.getItem('currentCatId')
        if (savedId) {
          const found = cats.value.find(c => c.id === savedId)
          if (found) currentCat.value = found
        }
        if (!currentCat.value && cats.value.length > 0) {
          selectCat(cats.value[0]!)
        }
      }
    } finally {
      loading.value = false
    }
  }

  function selectCat(cat: Cat) {
    currentCat.value = cat
    localStorage.setItem('currentCatId', cat.id)
    // 恢复该猫咪的体重目标
    if (cat.weightGoalTarget && cat.weightGoalDate) {
      weightGoal.value = { target: cat.weightGoalTarget, date: cat.weightGoalDate }
    } else {
      weightGoal.value = null
    }
  }

  function clearCurrentCat() {
    currentCat.value = null
    weightGoal.value = null
    localStorage.removeItem('currentCatId')
  }

  async function createCat(data: CatFormData) {
    const res = await createMyCat(data)
    if (res.success) {
      cats.value.push(res.data)
      selectCat(res.data)
    }
    return res
  }

  async function updateCat(id: string, data: Partial<CatFormData>) {
    const res = await updateMyCat(id, data)
    if (res.success) {
      const idx = cats.value.findIndex(c => c.id === id)
      if (idx !== -1) cats.value[idx] = res.data
      if (currentCat.value?.id === id) currentCat.value = res.data
    }
    return res
  }

  async function deleteCat(id: string) {
    const res = await deleteMyCat(id)
    if (res.success) {
      cats.value = cats.value.filter(c => c.id !== id)
      if (currentCat.value?.id === id) {
        currentCat.value = cats.value[0] || null
        if (currentCat.value) localStorage.setItem('currentCatId', currentCat.value.id)
        else localStorage.removeItem('currentCatId')
      }
    }
    return res
  }

  async function setGoal(targetWeight: number, targetDate: string) {
    if (!currentCat.value) return false
    try {
      const res = await setWeightGoalApi(currentCat.value.id, targetWeight, targetDate)
      if (res.success) {
        weightGoal.value = { target: targetWeight, date: targetDate }
        if (currentCat.value) {
          currentCat.value = { ...currentCat.value, weightGoalTarget: targetWeight, weightGoalDate: targetDate }
        }
        return true
      }
    } catch {}
    return false
  }

  return {
    cats,
    currentCat,
    loading,
    weightGoal,
    fetchCats,
    selectCat,
    clearCurrentCat,
    createCat,
    updateCat,
    deleteCat,
    setGoal
  }
})
