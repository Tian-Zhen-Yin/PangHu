import api from './index.js'
import type { ApiResponse } from '../types/common.js'
import type {
  RecommendQuery,
  RecommendResult,
  FeedbackPayload,
  PlayProfilePayload,
} from '../types/play.js'

export function getPlayRecommend(
  query: RecommendQuery,
  signal?: AbortSignal,
): Promise<ApiResponse<RecommendResult>> {
  return api.get('/play/recommend', { params: query, signal })
}

export function submitPlayFeedback(
  payload: FeedbackPayload,
): Promise<ApiResponse<{ id: string; message?: string }>> {
  return api.post('/play/feedback', payload)
}

export function updatePlayProfile(
  catId: string,
  payload: PlayProfilePayload,
): Promise<ApiResponse<unknown>> {
  return api.put(`/cats/${catId}/play-profile`, payload)
}
