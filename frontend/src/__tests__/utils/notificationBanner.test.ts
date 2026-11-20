// frontend/src/__tests__/utils/notificationBanner.test.ts
// 单元测试：通知引导横幅的展示判定
// 背景：「暂不」此前不做持久化，每次页面加载都重新弹并遮挡操作（走查 F4 实测 5 次）。

import { describe, it, expect } from 'vitest'
import {
  NOTIFICATION_BANNER_COOLDOWN_MS,
  NOTIFICATION_BANNER_DISMISSED_KEY,
  shouldShowNotificationBanner,
  readBannerDismissedAt
} from '../../utils/notificationBanner'

function makeStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map(Object.entries(initial))
  return {
    get length() { return store.size },
    clear: () => store.clear(),
    getItem: (k: string) => store.get(k) ?? null,
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => { store.delete(k) },
    setItem: (k: string, v: string) => { store.set(k, v) }
  } as Storage
}

describe('shouldShowNotificationBanner', () => {
  const DAY = 24 * 60 * 60 * 1000
  const now = 1_700_000_000_000

  it('从未关闭过（null）→ 展示', () => {
    expect(shouldShowNotificationBanner(null, now)).toBe(true)
  })

  it('冷却期内（6 天前关闭）→ 不展示', () => {
    expect(shouldShowNotificationBanner(now - 6 * DAY, now)).toBe(false)
  })

  it('刚好超过冷却期（8 天前关闭）→ 再次展示', () => {
    expect(shouldShowNotificationBanner(now - 8 * DAY, now)).toBe(true)
  })

  it('时间戳晚于当前时间（异常数据）→ 不展示，避免永久弹出', () => {
    expect(shouldShowNotificationBanner(now + DAY, now)).toBe(false)
  })

  it('默认冷却期为 7 天', () => {
    expect(NOTIFICATION_BANNER_COOLDOWN_MS).toBe(7 * DAY)
  })
})

describe('readBannerDismissedAt', () => {
  it('无记录返回 null', () => {
    expect(readBannerDismissedAt(makeStorage())).toBeNull()
  })

  it('合法时间戳返回数值', () => {
    expect(readBannerDismissedAt(makeStorage({ [NOTIFICATION_BANNER_DISMISSED_KEY]: '1700000000000' }))).toBe(1_700_000_000_000)
  })

  it('非法内容返回 null 而不是 NaN', () => {
    expect(readBannerDismissedAt(makeStorage({ [NOTIFICATION_BANNER_DISMISSED_KEY]: 'abc' }))).toBeNull()
  })

  it('storage 抛异常时返回 null（隐私模式）', () => {
    const broken = makeStorage()
    broken.getItem = () => { throw new Error('denied') }
    expect(readBannerDismissedAt(broken)).toBeNull()
  })
})
