export type TrackEvent =
  | 'recommendation_view'
  | 'recommendation_click'
  | 'play_start'
  | 'play_complete'
  | 'feedback_submit'

export function track(event: TrackEvent, payload: Record<string, unknown> = {}): void {
  // 占位实现：等接入正式埋点 SDK 后改这里一处即可。
  // eslint-disable-next-line no-console
  console.info('[track]', event, payload)
}
