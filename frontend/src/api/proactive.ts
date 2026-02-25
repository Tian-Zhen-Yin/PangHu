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
  return response.data.data
}
