import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Cat, CatFormData } from '../types/cat'
import { getMyCats, getMyCatById, createMyCat, updateMyCat, deleteMyCat } from '../api/myCat'

export const useMyCatStore = defineStore('myCat', () => {
  const cats = ref<Cat[]>([])
  const currentCat = ref<Cat | null>(null)
  const loading = ref(false)

  async function fetchCats() {
    loading.value = true
    try {
      const res = await getMyCats()
      if (res.success) {
        cats.value = res.data
        // 恢复上次选中的猫咪
        const savedId = localStorage.getItem('currentCatId')
        if (savedId) {
          const found = cats.value.find(c => c.id === savedId)
          if (found) currentCat.value = found
        }
        // 如果没有选中，默认选第一只
        if (!currentCat.value && cats.value.length > 0) {
          selectCat(cats.value[0])
        }
      }
    } finally {
      loading.value = false
    }
  }

  function selectCat(cat: Cat) {
    currentCat.value = cat
    localStorage.setItem('currentCatId', cat.id)
  }

  function clearCurrentCat() {
    currentCat.value = null
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

  return {
    cats,
    currentCat,
    loading,
    fetchCats,
    selectCat,
    clearCurrentCat,
    createCat,
    updateCat,
    deleteCat
  }
})
