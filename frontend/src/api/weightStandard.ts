/**
 * 体重健康标准 API
 */

import { api } from './index'
import type {
  WeightAnalysis,
  WeightAnalysisResponse,
  WeightHistoryWithStandard,
  WeightHistoryStandardResponse,
  BreedsResponse,
} from '../types/weight'

/**
 * 获取猫咪体重分析
 * @param catId 猫咪ID
 */
export async function getWeightAnalysis(catId: string): Promise<WeightAnalysisResponse> {
  const response = await api.get<WeightAnalysisResponse>(`/weight-standards/${catId}/analysis`)
  return response
}

/**
 * 获取猫咪体重历史及标准范围
 * @param catId 猫咪ID
 */
export async function getWeightHistoryStandards(catId: string): Promise<WeightHistoryStandardResponse> {
  const response = await api.get<WeightHistoryStandardResponse>(`/weight-standards/${catId}/history`)
  return response
}

/**
 * 获取支持的品种列表
 */
export async function getSupportedBreeds(): Promise<BreedsResponse> {
  const response = await api.get<BreedsResponse>('/weight-standards/breeds')
  return response
}

/**
 * 批量获取多只猫咪的体重分析
 * @param catIds 猫咪ID数组
 */
export async function getBatchWeightAnalysis(catIds: string[]): Promise<Record<string, WeightAnalysis>> {
  const response = await api.post<{ data: Record<string, WeightAnalysis> }>('/weight-standards/batch', { catIds })
  return response.data
}
