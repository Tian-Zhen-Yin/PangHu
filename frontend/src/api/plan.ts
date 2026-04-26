import api from './index.js'
import type { ApiResponse } from '../types/common.js'

// 用户计划类型
export interface UserPlan {
  id: string
  userId: string
  templateId: string
  name: string
  progress: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  template?: any
}

/**
 * 获取用户的所有计划
 */
export function getUserPlans(): Promise<ApiResponse<UserPlan[]>> {
  return api.get('/plans')
}

/**
 * 创建用户计划（保存模板）
 */
export function createUserPlan(data: { templateId: string; name: string }): Promise<ApiResponse<UserPlan>> {
  return api.post('/plans', data)
}

/**
 * 获取单个计划详情
 */
export function getUserPlanById(id: string): Promise<ApiResponse<UserPlan>> {
  return api.get(`/plans/${id}`)
}

/**
 * 更新计划进度
 */
export function updatePlanProgress(id: string, progress: Record<string, any>): Promise<ApiResponse<UserPlan>> {
  return api.patch(`/plans/${id}/progress`, { progress })
}

/**
 * 设置激活计划
 */
export function setActivePlan(id: string): Promise<ApiResponse<null>> {
  return api.patch(`/plans/${id}/activate`)
}

/**
 * 删除计划
 */
export function deleteUserPlan(id: string): Promise<ApiResponse<null>> {
  return api.delete(`/plans/${id}`)
}
