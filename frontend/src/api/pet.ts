import api from './index'
import type { ApiResponse } from '../types/common'

// 宠物记录类型
export interface PetRecord {
  id: string
  userId: string
  petName: string
  photoUrl: string
  ageWeeks: number
  ageMonths: number
  weight: number
  notes: string | null
  recordDate: string
  createdAt: string
  updatedAt: string
}

// 创建宠物记录的参数
export interface CreatePetRecordParams {
  petName?: string
  photoUrl: string
  ageWeeks: number
  ageMonths?: number
  weight: number
  notes?: string
  recordDate?: string
}

/**
 * 获取用户的所有宠物记录
 */
export function getPetRecords(): Promise<ApiResponse<PetRecord[]>> {
  return api.get('/pets/records')
}

/**
 * 获取单个宠物记录详情
 */
export function getPetRecordById(id: string): Promise<ApiResponse<PetRecord>> {
  return api.get(`/pets/records/${id}`)
}

/**
 * 创建宠物记录（带图片上传）
 */
export function createPetRecord(params: CreatePetRecordParams, file?: File): Promise<ApiResponse<PetRecord>> {
  if (file) {
    // 使用 FormData 上传文件
    const formData = new FormData()
    formData.append('photo', file)
    if (params.petName) formData.append('petName', params.petName)
    formData.append('ageWeeks', params.ageWeeks.toString())
    if (params.ageMonths) formData.append('ageMonths', params.ageMonths.toString())
    formData.append('weight', params.weight.toString())
    if (params.notes) formData.append('notes', params.notes)
    if (params.recordDate) formData.append('recordDate', params.recordDate)

    return api.post('/pets/records', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  } else {
    // 普通请求
    return api.post('/pets/records', params)
  }
}

/**
 * 更新宠物记录（可选图片上传）
 */
export function updatePetRecord(id: string, params: Partial<CreatePetRecordParams>, file?: File): Promise<ApiResponse<PetRecord>> {
  if (file) {
    const formData = new FormData()
    formData.append('photo', file)
    if (params.petName) formData.append('petName', params.petName)
    if (params.ageWeeks !== undefined) formData.append('ageWeeks', params.ageWeeks.toString())
    if (params.ageMonths !== undefined) formData.append('ageMonths', params.ageMonths.toString())
    if (params.weight !== undefined) formData.append('weight', params.weight.toString())
    if (params.notes !== undefined) formData.append('notes', params.notes)
    if (params.recordDate) formData.append('recordDate', params.recordDate)

    return api.patch(`/pets/records/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  } else {
    return api.patch(`/pets/records/${id}`, params)
  }
}

/**
 * 删除宠物记录
 */
export function deletePetRecord(id: string): Promise<ApiResponse<null>> {
  return api.delete(`/pets/records/${id}`)
}
