import api from './index.js'
import type { ApiResponse } from '../types/common.js'
import type { Template } from '../types/common.js'

/**
 * 获取所有模板
 */
export function getTemplates(): Promise<ApiResponse<Template[]>> {
  return api.get('/templates')
}

/**
 * 获取单个模板详情
 * @param id 模板ID
 */
export function getTemplateById(id: string): Promise<ApiResponse<Template>> {
  return api.get(`/templates/${id}`)
}
