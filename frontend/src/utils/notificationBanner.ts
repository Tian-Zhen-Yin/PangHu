/**
 * 通知引导横幅的展示判定（纯函数，便于单测）。
 *
 * 背景：横幅「暂不」此前不做持久化，每次页面加载都会重新弹出并遮挡内容。
 * 现在点击「暂不」会写入时间戳，冷却期内不再打扰。
 */

/** 「暂不」后的静默时长：7 天内不再打扰 */
export const NOTIFICATION_BANNER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

/** localStorage key：上次点击「暂不」的时间戳（毫秒） */
export const NOTIFICATION_BANNER_DISMISSED_KEY = 'notification-banner-dismissed-at'

/**
 * 是否应该展示通知引导横幅：从未关闭过，或关闭后已超过冷却期。
 * （权限已 granted/denied 的分支由调用方在 onMounted 中另行处理）
 */
export function shouldShowNotificationBanner(
  dismissedAt: number | null,
  now: number = Date.now(),
  cooldownMs: number = NOTIFICATION_BANNER_COOLDOWN_MS
): boolean {
  if (dismissedAt === null) return true
  return now - dismissedAt >= cooldownMs
}

/**
 * 读取本地记录的「暂不」时间戳；无记录或值非法（含隐私模式下写入失败）时返回 null。
 */
export function readBannerDismissedAt(storage: Storage | null = null): number | null {
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null)
  if (!store) return null
  try {
    const saved = store.getItem(NOTIFICATION_BANNER_DISMISSED_KEY)
    if (!saved) return null
    const parsed = Number(saved)
    return Number.isFinite(parsed) ? parsed : null
  } catch {
    return null
  }
}
