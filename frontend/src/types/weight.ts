/**
 * 体重健康标准相关类型定义
 */

import type { ApiResponse } from './common'

/**
 * 体重分析结果
 */
export interface WeightAnalysis {
  status: 'thin' | 'normal' | 'overweight'
  message: string
  current: number
  min: number
  max: number
  percentage: number  // 0-100, 50为理想中心
  deviation: number   // 与理想体重的偏差（负数表示偏轻）
}

/**
 * 带标准范围的体重历史记录
 */
export interface WeightHistoryWithStandard {
  date: string
  weight: number
  notes?: string
  minWeight?: number
  maxWeight?: number
  status?: 'thin' | 'normal' | 'overweight'
}

/**
 * 体重标准信息
 */
export interface WeightStandard {
  breed: string
  ageMonth: number
  gender: 'male' | 'female' | 'all'
  neutered: boolean
  minWeight: number
  maxWeight: number
}

/**
 * API 响应类型
 */
export type WeightAnalysisResponse = ApiResponse<WeightAnalysis>
export type WeightHistoryStandardResponse = ApiResponse<WeightHistoryWithStandard[]>
export type BreedsResponse = ApiResponse<string[]>

/**
 * 多猫对比数据
 */
export interface CatComparisonData {
  cat: {
    id: string
    name: string
    avatar: string | null
    breed: string | null
    ageFormatted: string
    gender: string
  }
  analysis: WeightAnalysis | null
  history: WeightHistoryWithStandard[]
}

/**
 * 多猫对比 API 响应
 */
export type CatsComparisonResponse = ApiResponse<CatComparisonData[]>
