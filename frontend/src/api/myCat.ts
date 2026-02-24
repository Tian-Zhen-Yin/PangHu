import api from './index'
import type { ApiResponse } from '../types/common'
import type { Cat, CatFormData, VaccineRecord, WeightHistoryRecord } from '../types/cat'

export function getMyCats(): Promise<ApiResponse<Cat[]>> {
  return api.get('/my-cats')
}

export function getMyCatById(id: string): Promise<ApiResponse<Cat>> {
  return api.get(`/my-cats/${id}`)
}

export function createMyCat(data: CatFormData): Promise<ApiResponse<Cat>> {
  return api.post('/my-cats', data)
}

export function updateMyCat(id: string, data: Partial<CatFormData>): Promise<ApiResponse<Cat>> {
  return api.put(`/my-cats/${id}`, data)
}

export function deleteMyCat(id: string): Promise<ApiResponse<null>> {
  return api.delete(`/my-cats/${id}`)
}

// 获取猫咪体重历史记录
export function getWeightHistory(catId: string): Promise<ApiResponse<WeightHistoryRecord[]>> {
  return api.get(`/my-cats/${catId}/weight-history`)
}
