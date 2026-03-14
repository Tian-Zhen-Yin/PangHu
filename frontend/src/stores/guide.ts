import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Guide, GuideCategory } from '../types/guide'
import { getGuides, getCategories, searchGuides } from '../api/guide'

export const useGuideStore = defineStore('guide', () => {
  // 状态
  const guides = ref<Guide[]>([]) // 当前显示的指南（过滤后）
  const allGuides = ref<Guide[]>([]) // 所有指南（用于分类计数）
  const categories = ref<GuideCategory[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const searchResults = ref<Guide[] | null>(null)
  const pagination = ref({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0
  })

  // 获取所有分类
  async function fetchCategories() {
    try {
      const response = await getCategories()
      if (response.success) {
        // 添加"全部"选项
        const allCategory: GuideCategory = {
          id: 'all',
          name: '全部',
          slug: 'all',
          icon: '📚',
          description: null,
          order: -1
        }
        categories.value = [allCategory, ...response.data]
      }
    } catch (err: any) {
      error.value = err.message || '获取分类失败'
    }
  }

  // 获取指南列表
  async function fetchGuides(categoryId?: string) {
    loading.value = true
    error.value = null
    searchResults.value = null // 清空搜索结果
    try {
      const params: any = { page: 1, pageSize: 100 }

      // 如果没有传入 categoryId，或者 categoryId 是 'all'，则获取全部
      const isAllCategory = !categoryId || categoryId === 'all'

      if (!isAllCategory) {
        params.category = categoryId
      }

      console.log('[GuideStore] fetchGuides - params:', params, 'isAllCategory:', isAllCategory)
      const response = await getGuides(params)
      console.log('[GuideStore] fetchGuides - response:', response)
      if (response.success) {
        guides.value = response.data.items
        console.log('[GuideStore] 获取到指南:', response.data.items.length)
        // 如果是获取全部指南，同步到 allGuides 用于分类计数
        if (isAllCategory) {
          allGuides.value = response.data.items
          console.log('[GuideStore] 同步到 allGuides')
        }
        pagination.value = {
          total: response.data.total,
          page: response.data.page,
          pageSize: response.data.pageSize,
          totalPages: response.data.totalPages
        }
      }
    } catch (err: any) {
      console.error('[GuideStore] fetchGuides 失败:', err)
      error.value = err.message || '获取指南失败'
    } finally {
      loading.value = false
    }
  }

  // 搜索指南
  async function fetchSearchGuides(query: string) {
    if (!query.trim()) {
      searchResults.value = null
      return
    }
    loading.value = true
    error.value = null
    try {
      const response = await searchGuides(query)
      if (response.success) {
        searchResults.value = response.data
      }
    } catch (err: any) {
      error.value = err.message || '搜索失败'
    } finally {
      loading.value = false
    }
  }

  // 根据分类名称获取分类ID
  function getCategoryIdByName(name: string): string | undefined {
    const category = categories.value.find(c => c.name === name)
    return category?.id
  }

  // 当前显示的指南列表（搜索结果或普通列表）
  const displayGuides = computed(() => {
    return searchResults.value || guides.value
  })

  // 初始化：获取所有指南用于分类计数
  async function initAllGuides() {
    // 总是重新加载，确保获取最新数据
    console.log('[GuideStore] 正在调用 getGuides API...')
    try {
      const response = await getGuides({ page: 1, pageSize: 100 })
      console.log('[GuideStore] API 响应:', response)
      if (response.success) {
        allGuides.value = response.data.items
        console.log('[GuideStore] allGuides 设置成功:', response.data.items.length)
      } else {
        console.error('[GuideStore] API 返回失败:', response.message)
      }
    } catch (err: any) {
      console.error('[GuideStore] 初始化指南失败:', err)
    }
  }

  // 按分类分组的指南数量（使用 allGuides 确保计数准确）
  const categoryCounts = computed(() => {
    const counts: Record<string, number> = { '全部': allGuides.value.length }
    categories.value.forEach(cat => {
      if (cat.id !== 'all') {
        counts[cat.name] = allGuides.value.filter(g => g.categoryId === cat.id).length
      }
    })
    return counts
  })

  return {
    guides,
    allGuides,
    categories,
    loading,
    error,
    searchResults,
    pagination,
    displayGuides,
    categoryCounts,
    initAllGuides,
    fetchCategories,
    fetchGuides,
    fetchSearchGuides,
    getCategoryIdByName
  }
})
