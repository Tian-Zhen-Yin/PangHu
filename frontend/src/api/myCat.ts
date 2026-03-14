import api from './index'
import type { ApiResponse } from '../types/common'
import type { Cat, CatFormData, WeightHistoryRecord } from '../types/cat'

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

// 导出体重历史为 CSV
export function exportWeightCSV(catId: string): Promise<Blob> {
  return api.get(`/my-cats/${catId}/weight/export`, { responseType: 'blob' })
}

// 设置体重目标
export function setWeightGoal(catId: string, targetWeight: number, targetDate: string): Promise<ApiResponse<{ weightGoalTarget: number; weightGoalDate: string }>> {
  return api.put(`/my-cats/${catId}/weight-goal`, { targetWeight, targetDate })
}

// 上传猫咪头像
export function uploadCatAvatar(catId: string, file: File): Promise<ApiResponse<{ avatar: string }>> {
  const formData = new FormData()
  formData.append('avatar', file)
  return api.post(`/my-cats/${catId}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// 上传猫咪头像（base64 格式）
export function uploadCatAvatarBase64(catId: string, base64Data: string): Promise<ApiResponse<{ avatarData: string }>> {
  return api.post(`/my-cats/${catId}/avatar-base64`, { avatarData: base64Data })
}
