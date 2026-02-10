// 通用类型定义

/**
 * API响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message: string
  error: string | null
}

/**
 * 计划模板
 */
export interface Template {
  id: string
  name: string
  description: string
  category: string
  stageId: string | null
  content: string
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number
  pageSize: number
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
