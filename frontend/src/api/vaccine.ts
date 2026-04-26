import api from './index.js'
import type { ApiResponse } from '../types/common.js'
import type { VaccineRecord, VaccineFormData } from '../types/cat.js'

export function getVaccinesByCat(catId: string): Promise<ApiResponse<VaccineRecord[]>> {
  return api.get(`/vaccines/cat/${catId}`)
}

export function getUpcomingVaccines(days = 30): Promise<ApiResponse<VaccineRecord[]>> {
  return api.get('/vaccines/upcoming', { params: { days } })
}

export function createVaccine(data: VaccineFormData): Promise<ApiResponse<VaccineRecord>> {
  return api.post('/vaccines', data)
}

export function updateVaccine(id: string, data: Partial<VaccineFormData>): Promise<ApiResponse<VaccineRecord>> {
  return api.put(`/vaccines/${id}`, data)
}

export function deleteVaccine(id: string): Promise<ApiResponse<null>> {
  return api.delete(`/vaccines/${id}`)
}
