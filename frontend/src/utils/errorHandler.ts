/**
 * 全局错误处理工具
 */

import { toast } from '../composables/useToast'

export interface AppError {
  message: string
  code?: string
  status?: number
  stack?: string
}

/**
 * 解析错误对象
 */
function parseError(error: unknown): AppError {
  if (typeof error === 'string') {
    return { message: error }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack
    }
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>
    if (err.response) {
      const response = err.response as { status?: number; data?: { message?: string } }
      return {
        message: response.data?.message || '请求失败',
        status: response.status,
        code: 'API_ERROR'
      }
    }

    if (err.message) {
      return {
        message: String(err.message),
        code: (err.code as string) || 'UNKNOWN_ERROR'
      }
    }
  }

  return { message: '未知错误', code: 'UNKNOWN_ERROR' }
}

/**
 * 处理 API 错误
 */
export function handleApiError(error: unknown): void {
  const parsed = parseError(error)

  // 根据状态码显示不同提示
  if (parsed.status === 401) {
    toast.error('请先登录')
    // 可以跳转到登录页
    window.location.href = '/login'
    return
  }

  if (parsed.status === 403) {
    toast.error('没有权限执行此操作')
    return
  }

  if (parsed.status === 404) {
    toast.error('请求的资源不存在')
    return
  }

  if (parsed.status === 429) {
    toast.error('请求过于频繁，请稍后再试')
    return
  }

  if (parsed.status === 500) {
    toast.error('服务器错误，请稍后再试')
    return
  }

  if (parsed.status && parsed.status >= 500) {
    toast.error('网络错误，请稍后再试')
    return
  }

  // 显示错误消息
  toast.error(parsed.message)
}

/**
 * 处理网络错误
 */
export function handleNetworkError(error: unknown): void {
  console.error('Network error:', error)

  if (error instanceof TypeError && error.message.includes('fetch')) {
    toast.error('网络连接失败，请检查网络')
    return
  }

  toast.error('网络错误，请稍后再试')
}

/**
 * 设置 Vue 全局错误处理器
 */
export function setupGlobalErrorHandler(app: any): void {
  app.config.errorHandler = (err: unknown, instance: any, info: string) => {
    console.error('Global Vue error:', err, info)

    // 开发环境显示详细错误
    if (import.meta.env.DEV) {
      console.error('Error details:', {
        error: err,
        component: instance?.$options?.name || 'Unknown',
        info
      })
    }

    // 显示用户友好的错误提示
    const parsed = parseError(err)
    toast.error(parsed.message)
  }

  // 处理未捕获的 Promise 错误
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled rejection:', event.reason)
    event.preventDefault()

    const parsed = parseError(event.reason)
    toast.error(parsed.message || '操作失败，请重试')
  })

  // 处理全局错误
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error)
    event.preventDefault()

    // 只在开发环境显示全局错误提示
    if (import.meta.env.DEV) {
      toast.error('发生错误，请查看控制台')
    }
  })
}

/**
 * 创建安全的异步函数包装器
 */
export function safeAsync<T extends (...args: any[]) => any>(
  fn: T
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args)
    } catch (error) {
      handleApiError(error)
      throw error
    }
  }) as T
}

/**
 * 错误边界 mixin（用于 Options API）
 */
export const errorBoundaryMixin = {
  data() {
    return {
      hasError: false,
      errorMessage: ''
    }
  },
  errorCaptured(err: Error, instance: any, info: string) {
    console.error('Error captured:', err, info)
    this.hasError = true
    this.errorMessage = err.message
    toast.error('页面加载出错')
    return false // 阻止错误继续传播
  }
}
