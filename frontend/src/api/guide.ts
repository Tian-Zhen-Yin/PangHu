import api from './index'
import type { ApiResponse, PaginatedResponse } from '../types/common'
import type { Guide, GuideCategory } from '../types/guide'

/**
 * 获取指南列表
 * @param params 查询参数
 */
export function getGuides(params?: {
  page?: number
  pageSize?: number
  category?: string
}): Promise<ApiResponse<PaginatedResponse<Guide>>> {
  return api.get('/guides', { params })
}

/**
 * 获取单个指南详情
 * @param id 指南ID
 */
export function getGuideById(id: string): Promise<ApiResponse<Guide>> {
  return api.get(`/guides/${id}`)
}

/**
 * 获取所有指南分类
 */
export function getCategories(): Promise<ApiResponse<GuideCategory[]>> {
  return api.get('/guides/categories')
}

/**
 * 搜索指南
 * @param query 搜索关键词
 */
export function searchGuides(query: string): Promise<ApiResponse<Guide[]>> {
  return api.get('/guides/search', { params: { q: query } })
}
