/**
 * 统一API响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message: string
  error: string | null
}

/**
 * 成功响应
 */
export function successResponse<T>(data: T, message = '操作成功'): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    error: null
  }
}

/**
 * 错误响应
 */
export function errorResponse(error: string, message = '操作失败'): ApiResponse {
  return {
    success: false,
    data: null,
    message,
    error
  }
}
