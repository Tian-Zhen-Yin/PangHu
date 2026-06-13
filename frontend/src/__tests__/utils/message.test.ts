// frontend/src/__tests__/utils/message.test.ts
import { describe, it, expect, vi } from 'vitest'
import { ElMessage } from 'element-plus'
import { handleApiError, handleApiSuccess, handleBatchResult } from '../../utils/message'

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('message utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show success message', () => {
    handleApiSuccess('操作成功')
    
    expect(ElMessage.success).toHaveBeenCalledWith('操作成功')
  })

  it('should show error message for API error', () => {
    const error = { success: false, error: 'ERROR', message: '出错了' }
    handleApiError(error)
    
    expect(ElMessage.error).toHaveBeenCalledWith('出错了')
  })

  it('should show fallback error message', () => {
    const error = { message: '未知错误' }
    handleApiError(error, '操作失败')
    
    expect(ElMessage.error).toHaveBeenCalledWith('未知错误')
  })

  it('should show warning for partial batch failure', () => {
    handleBatchResult({ succeeded: 5, failed: 2 })
    
    expect(ElMessage.warning).toHaveBeenCalledWith('成功 5 项，失败 2 项')
  })

  it('should show success for all succeeded', () => {
    handleBatchResult({ succeeded: 5, failed: 0 })
    
    expect(ElMessage.success).toHaveBeenCalledWith('成功操作 5 项')
  })
})
