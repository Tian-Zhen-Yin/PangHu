/**
 * 体重健康标准 API
 */

import api from './index'
import type {
  WeightAnalysis,
  WeightAnalysisResponse,
  WeightHistoryStandardResponse,
  BreedsResponse,
  WeightHistoryWithStandard,
} from '../types/weight'

/**
 * 获取猫咪体重分析
 * @param catId 猫咪ID
 */
export async function getWeightAnalysis(catId: string): Promise<WeightAnalysisResponse> {
  return (api.get as any)(`/weight-standards/${catId}/analysis`)
}

/**
 * 获取猫咪体重历史及标准范围
 * @param catId 猫咪ID
 */
export async function getWeightHistoryStandards(catId: string): Promise<WeightHistoryStandardResponse> {
  return (api.get as any)(`/weight-standards/${catId}/history`)
}

/**
 * 获取支持的品种列表
 */
export async function getSupportedBreeds(): Promise<BreedsResponse> {
  return (api.get as any)('/weight-standards/breeds')
}

/**
 * 批量获取多只猫咪的体重分析
 * @param catIds 猫咪ID数组
 */
export async function getBatchWeightAnalysis(catIds: string[]): Promise<Record<string, WeightAnalysis>> {
  const response = await api.post<Record<string, WeightAnalysis>>('/weight-standards/batch', { catIds })
  return response
}

/**
 * 批量获取多只猫咪的体重历史及标准范围
 * @param catIds 猫咪ID数组（2-5个）
 */
export async function getBatchWeightHistory(catIds: string[]): Promise<Record<string, WeightHistoryWithStandard[]>> {
  if (catIds.length < 2 || catIds.length > 5) {
    throw new Error('请选择2-5只猫咪进行对比')
  }
  const response = await api.post<Record<string, WeightHistoryWithStandard[]>>('/weight-standards/batch-history', { catIds })
  return response
}
