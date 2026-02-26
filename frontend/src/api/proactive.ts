/**
 * 主动健康建议 API
 */

import api from './index'
import type { ProactiveAdvice, ProactiveAdviceResponse } from '../types/proactive'

/**
 * 获取猫咪主动健康建议
 * @param catId 猫咪ID
 * @param types 建议类型数组
 */
export async function getProactiveAdvice(
  catId: string,
  types?: ('weight' | 'vaccine' | 'age' | 'general')[]
): Promise<ProactiveAdvice> {
  const params = types ? `?types=${types.join(',')}` : ''
  const response = await api.get<ProactiveAdviceResponse>(`/proactive/${catId}${params}`)
  // response 已经是解包后的 { success: true, data: {...} }
  // 需要检查 success 并返回 data
  if (response && typeof response === 'object' && 'success' in response && response.success && 'data' in response) {
    return response.data
  }
  // 如果直接返回的就是 ProactiveAdvice，直接返回
  return response as any
}
