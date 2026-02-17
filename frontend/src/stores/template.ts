import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Template } from '../types/common'
import { getTemplates, getTemplateById } from '../api/template'

// 分类图标映射
const categoryIcons: Record<string, string> = {
  '新手': '🌟',
  '健康': '💉',
  '护理': '🧼',
  '其他': '📋'
}

export const useTemplateStore = defineStore('template', () => {
  // 状态
  const templates = ref<Template[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 获取所有模板
  async function fetchTemplates() {
    loading.value = true
    error.value = null
    try {
      const response = await getTemplates()
      if (response.success) {
        templates.value = response.data
      }
    } catch (err: any) {
      error.value = err.message || '获取模板失败'
    } finally {
      loading.value = false
    }
  }

  // 获取单个模板详情
  async function fetchTemplateById(id: string): Promise<Template | null> {
    loading.value = true
    error.value = null
    try {
      const response = await getTemplateById(id)
      if (response.success) {
        return response.data
      }
      return null
    } catch (err: any) {
      error.value = err.message || '获取模板详情失败'
      return null
    } finally {
      loading.value = false
    }
  }

  // 获取分类图标
  function getCategoryIcon(category: string): string {
    return categoryIcons[category] ?? categoryIcons['其他'] ?? '📋'
  }

  // 解析模板内容
  function parseTemplateContent(content: string) {
    try {
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    fetchTemplateById,
    getCategoryIcon,
    parseTemplateContent
  }
})
