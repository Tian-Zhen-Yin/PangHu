import api from './index.js'
import type { ApiResponse } from '../types/common.js'

export interface PetRecord {
  id: string
  userId: string
  catId?: string | null
  petName: string
  photoUrl: string
  photos: string[]
  type: string // 'daily'|'vaccine'|'deworm'|'healthCheck'|'free'
  isAdoptionDay: boolean
  templateData: string | null
  ageWeeks: number
  ageMonths: number
  weight: number
  notes: string | null
  recordDate: string
  createdAt: string
  updatedAt: string
}

export interface CreatePetRecordParams {
  petName?: string
  ageWeeks: number
  ageMonths?: number
  weight: number
  notes?: string
  recordDate?: string
  catId?: string
  type?: string
  isAdoptionDay?: boolean
  templateData?: string
}

export function getPetRecords(catId?: string): Promise<ApiResponse<PetRecord[]>> {
  if (catId) return api.get('/pets/records', { params: { catId } })
  return api.get('/pets/records')
}

export function getPetRecordById(id: string): Promise<ApiResponse<PetRecord>> {
  return api.get(`/pets/records/${id}`)
}

export function createPetRecord(params: CreatePetRecordParams, files?: File[]): Promise<ApiResponse<PetRecord>> {
  const formData = new FormData()
  if (files?.length) files.forEach(f => formData.append('photos', f))
  if (params.petName) formData.append('petName', params.petName)
  formData.append('ageWeeks', params.ageWeeks.toString())
  if (params.ageMonths) formData.append('ageMonths', params.ageMonths.toString())
  formData.append('weight', params.weight.toString())
  if (params.notes) formData.append('notes', params.notes)
  if (params.recordDate) formData.append('recordDate', params.recordDate)
  if (params.catId) formData.append('catId', params.catId)
  if (params.type) formData.append('type', params.type)
  if (params.isAdoptionDay) formData.append('isAdoptionDay', 'true')
  if (params.templateData) formData.append('templateData', params.templateData)
  return api.post('/pets/records', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
}

export function updatePetRecord(id: string, params: Partial<CreatePetRecordParams>, files?: File[]): Promise<ApiResponse<PetRecord>> {
  const formData = new FormData()
  if (files?.length) files.forEach(f => formData.append('photos', f))
  if (params.petName) formData.append('petName', params.petName)
  if (params.ageWeeks !== undefined) formData.append('ageWeeks', params.ageWeeks.toString())
  if (params.ageMonths !== undefined) formData.append('ageMonths', params.ageMonths.toString())
  if (params.weight !== undefined) formData.append('weight', params.weight.toString())
  if (params.notes !== undefined) formData.append('notes', params.notes)
  if (params.recordDate) formData.append('recordDate', params.recordDate)
  if (params.type) formData.append('type', params.type)
  if (params.templateData) formData.append('templateData', params.templateData)
  return api.patch(`/pets/records/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
}

export function deletePetRecord(id: string): Promise<ApiResponse<null>> {
  return api.delete(`/pets/records/${id}`)
}
