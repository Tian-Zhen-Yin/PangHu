/**
 * 主动健康建议类型定义
 */

import type { ApiResponse } from './common.js'

/**
 * 体重建议
 */
export interface WeightAdvice {
  status: 'thin' | 'normal' | 'overweight'
  suggestion: string
}

/**
 * 疫苗建议
 */
export interface VaccineAdvice {
  nextAction: string
  upcoming: Array<{
    name: string
    date: string
    daysLeft: number
  }>
}

/**
 * 年龄阶段建议
 */
export interface AgeAdvice {
  stage: string
  tips: string[]
}

/**
 * 主动健康建议响应
 */
export interface ProactiveAdvice {
  weightAdvice?: WeightAdvice
  vaccineAdvice?: VaccineAdvice
  ageAdvice?: AgeAdvice
  generalAdvice?: string
}

/**
 * API 响应类型
 */
export type ProactiveAdviceResponse = ApiResponse<ProactiveAdvice>
