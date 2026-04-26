import api from './index.js'
import type { ApiResponse } from '../types/common.js'
import type { Stage, Milestone, Vaccine } from '../types/cat.js'

/**
 * 获取所有成长阶段
 */
export function getStages(): Promise<ApiResponse<Stage[]>> {
  return api.get('/cats/stages')
}

/**
 * 获取单个阶段详情
 */
export function getStageById(id: string): Promise<ApiResponse<Stage>> {
  return api.get(`/cats/stages/${id}`)
}

/**
 * 获取所有里程碑
 */
export function getMilestones(): Promise<ApiResponse<Milestone[]>> {
  return api.get('/cats/milestones')
}

/**
 * 获取疫苗接种表
 */
export function getVaccinations(): Promise<ApiResponse<Vaccine[]>> {
  return api.get('/cats/vaccinations')
}
