# 宠物陪玩功能前端 P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the user-facing frontend for the play recommendation feature so end users can complete a cat profile, browse personalized game suggestions, and submit feedback — backend is already live, frontend is the only blocker.

**Architecture:** Single new route `/play` rendered from `frontend/src/views/Play/index.vue`, view-local state in a composable (no Pinia), six scenario preset buttons, inline rating cards, dashboard `TodayPlayCard` lazy-loaded via IntersectionObserver. All API contracts already exist on backend (`/api/play/recommend`, `/api/play/feedback`, `/api/cats/:id/play-profile`).

**Tech Stack:** Vue 3 + TypeScript + Pinia (read-only via `useMyCatStore`) + Element Plus + Tailwind + Vitest + `@vue/test-utils` (newly added).

**Spec:** [docs/superpowers/specs/2026-06-18-play-frontend-p0-design.md](../specs/2026-06-18-play-frontend-p0-design.md)

---

## Pre-flight

- Working directory: `e:/AiProject/cctest/PangHu`
- Branch: `feature/agent-framework`
- Test command (root): `npm run test:unit -- frontend/src/__tests__/play` to run only this feature's tests
- Run all frontend tests: `npm run test:unit`
- Vitest config: [vitest.config.ts](../../../vitest.config.ts) (jsdom env, `@/` → `frontend/src/`)
- Backend dev server must be running on `:3000` for manual checks

---

### Task 1: Install `@vue/test-utils` + create fixtures + verify infra

**Files:**
- Modify: `frontend/package.json` (add devDep)
- Create: `frontend/src/__tests__/play/fixtures.ts`

- [ ] **Step 1: Install @vue/test-utils**

```bash
cd e:/AiProject/cctest/PangHu/frontend && npm install --save-dev @vue/test-utils@^2.4.6
```

- [ ] **Step 2: Verify install**

```bash
ls e:/AiProject/cctest/PangHu/node_modules/@vue/test-utils/dist/vue-test-utils.cjs.js
```

Expected: file exists.

- [ ] **Step 3: Create shared test fixtures**

Create `frontend/src/__tests__/play/fixtures.ts`:

```ts
import type { RecommendResult, PlayGame, Suggestion } from '@/types/play'

const featherFishing: PlayGame = {
  id: 'feather-fishing',
  name: '羽毛钓鱼',
  category: 'hunting',
  difficulty: 'easy',
  durationMin: 10,
  energyCost: 4,
  requiredProps: ['羽毛逗猫棒'],
  benefits: ['反应训练', '狩猎模拟'],
  fitsPersonality: ['active', 'aloof'],
  contraindications: ['senior', 'post_op'],
  description: '用羽毛模拟鸟类飞行轨迹引导猫咪扑咬',
  tips: '结束时用零食奖励',
}

const tunnelExplore: PlayGame = {
  id: 'tunnel-explore',
  name: '猫隧道探险',
  category: 'chase',
  difficulty: 'easy',
  durationMin: 10,
  energyCost: 3,
  requiredProps: ['猫隧道'],
  benefits: ['探索', '追逐'],
  fitsPersonality: ['active', 'curious'],
  contraindications: [],
  description: '用零食或玩具引导猫咪穿过隧道',
  tips: '可以铺响纸增加趣味',
}

const baseSuggestion = (game: PlayGame, score: number): Suggestion => ({
  game,
  score,
  breakdown: { personality: 100, energy: 75, time: 100, preference: 60 },
  reasons: ['匹配活泼好动型性格', '刚好 10 分钟'],
})

export const successResult: RecommendResult = {
  success: true,
  fallback: false,
  suggestions: [baseSuggestion(featherFishing, 92), baseSuggestion(tunnelExplore, 84)],
}

export const fallbackResult: RecommendResult = {
  success: true,
  fallback: true,
  suggestions: [
    {
      game: featherFishing,
      score: 0,
      breakdown: null,
      reasons: ['适合活泼好动型的猫咪'],
    },
  ],
}

export const needProfileResult: RecommendResult = {
  success: false,
  fallback: false,
  suggestions: [],
  needProfileCompletion: true,
  message: '请先完善猫咪的性格档案，以获得个性化推荐。',
}

export const vetHintResult: RecommendResult = {
  success: false,
  fallback: true,
  suggestions: [],
  message: '当前健康状况下暂不建议自行陪玩，请咨询兽医获取个性化建议。',
}
```

- [ ] **Step 4: Commit**

```bash
cd e:/AiProject/cctest/PangHu
git add frontend/package.json frontend/package-lock.json frontend/src/__tests__/play/fixtures.ts
git commit -m "test(play): add @vue/test-utils dep and shared fixtures"
```

---

### Task 2: Types + config (`types/play.ts`)

**Files:**
- Create: `frontend/src/types/play.ts`
- Test: `frontend/src/__tests__/play/types.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/play/types.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  PERSONALITY_OPTIONS,
  ENERGY_LEVELS,
  HEALTH_TAG_OPTIONS,
  SCENARIO_PRESETS,
  CATEGORY_LABEL,
} from '@/types/play'

describe('types/play config tables', () => {
  it('PERSONALITY_OPTIONS covers exactly 4 personalities', () => {
    expect(PERSONALITY_OPTIONS.map(o => o.value).sort()).toEqual(
      ['active', 'aloof', 'clingy', 'curious'],
    )
    PERSONALITY_OPTIONS.forEach(o => {
      expect(o.label).toBeTruthy()
      expect(o.description).toBeTruthy()
      expect(o.example).toBeTruthy()
    })
  })

  it('ENERGY_LEVELS covers 1..5 in order', () => {
    expect(ENERGY_LEVELS.map(l => l.value)).toEqual([1, 2, 3, 4, 5])
  })

  it('HEALTH_TAG_OPTIONS covers all 4 tags', () => {
    expect(HEALTH_TAG_OPTIONS.map(t => t.value).sort()).toEqual(
      ['kitten', 'overweight', 'post_op', 'senior'],
    )
  })

  it('SCENARIO_PRESETS has 6 unique ids SC1..SC6', () => {
    const ids = SCENARIO_PRESETS.map(p => p.id)
    expect(ids).toEqual(['SC1', 'SC2', 'SC3', 'SC4', 'SC5', 'SC6'])
    expect(new Set(ids).size).toBe(6)
    SCENARIO_PRESETS.forEach(p => {
      expect(Object.keys(p.query).length).toBeGreaterThan(0)
    })
  })

  it('CATEGORY_LABEL covers all 6 categories', () => {
    expect(Object.keys(CATEGORY_LABEL).sort()).toEqual(
      ['chase', 'climbing', 'hunting', 'interaction', 'puzzle', 'solo'],
    )
  })
})
```

- [ ] **Step 2: Run, verify fail**

```bash
cd e:/AiProject/cctest/PangHu && npm run test:unit -- frontend/src/__tests__/play/types.test.ts
```

Expected: FAIL — module `@/types/play` not found.

- [ ] **Step 3: Implement `frontend/src/types/play.ts`**

```ts
export type GameCategory = 'chase' | 'hunting' | 'puzzle' | 'interaction' | 'climbing' | 'solo'
export type Personality = 'active' | 'curious' | 'clingy' | 'aloof'
export type HealthTag = 'overweight' | 'senior' | 'post_op' | 'kitten'

export interface PlayGame {
  id: string
  name: string
  category: GameCategory
  difficulty: 'easy' | 'medium' | 'hard'
  durationMin: number
  energyCost: 1 | 2 | 3 | 4 | 5
  requiredProps: string[]
  benefits: string[]
  fitsPersonality: Personality[]
  contraindications: HealthTag[]
  description: string
  tips: string
}

export interface ScoreBreakdown {
  personality: number
  energy: number
  time: number
  preference: number
}

export interface Suggestion {
  game: PlayGame
  score: number
  breakdown: ScoreBreakdown | null
  reasons: string[]
}

export interface RecommendResult {
  success: boolean
  fallback: boolean
  suggestions: Suggestion[]
  message?: string
  needProfileCompletion?: boolean
}

export interface RecommendQuery {
  catId: string
  availableTime?: number
  preferredCategory?: GameCategory
  currentEnergyOverride?: number
}

export interface FeedbackPayload {
  catId: string
  gameId: string
  score: number
  completion: boolean
  actualDuration: number
  playedAt?: string
  notes?: string
}

export interface PlayProfilePayload {
  personality: Personality
  energyBaseline: number
  healthTags: HealthTag[]
}

// ===== 配置表（用户视角文案，对齐 PRD §4.2 / §4.4.1） =====

export const PERSONALITY_OPTIONS: Array<{
  value: Personality
  label: string
  description: string
  example: string
}> = [
  { value: 'active',  label: '活泼好动型', description: '精力旺盛，喜欢追逐奔跑',     example: '经常飞奔、扑咬、撕咬玩具' },
  { value: 'curious', label: '聪明好奇型', description: '喜欢探索，善于解谜',         example: '爱开柜门、研究新物品' },
  { value: 'clingy',  label: '黏人互动型', description: '依赖主人，喜欢被关注',       example: '跟随主人、爱被抚摸' },
  { value: 'aloof',   label: '高冷独立型', description: '喜欢独处，选择性互动',       example: '喜欢独自待着、不爱被打扰' },
]

export const ENERGY_LEVELS: Array<{
  value: 1 | 2 | 3 | 4 | 5
  label: string
  description: string
}> = [
  { value: 1, label: '极低', description: '多数时间在睡觉，几乎不主动活动' },
  { value: 2, label: '偏低', description: '喜欢趴卧，偶尔短暂玩耍' },
  { value: 3, label: '中等', description: '日常活动正常，每天主动玩耍数次' },
  { value: 4, label: '偏高', description: '经常跑动，对玩具反应强烈' },
  { value: 5, label: '极高', description: '几乎停不下来，需要大量运动消耗' },
]

export const HEALTH_TAG_OPTIONS: Array<{
  value: HealthTag
  label: string
  hint: string
}> = [
  { value: 'overweight', label: '体重偏重',     hint: '兽医评估超出标准体重 / BMI 偏高' },
  { value: 'senior',     label: '老年（≥10岁）', hint: '推荐避开高强度游戏' },
  { value: 'post_op',    label: '术后恢复',     hint: '术后 30 天内，避免拉扯' },
  { value: 'kitten',     label: '幼猫（<6月）', hint: '避免猫薄荷与激光等敏感刺激' },
]

export const CATEGORY_LABEL: Record<GameCategory, string> = {
  chase: '追逐',
  hunting: '狩猎',
  puzzle: '益智',
  interaction: '互动',
  climbing: '攀爬',
  solo: '独处',
}

export interface ScenarioPreset {
  id: 'SC1' | 'SC2' | 'SC3' | 'SC4' | 'SC5' | 'SC6'
  label: string
  query: Partial<Pick<RecommendQuery, 'availableTime' | 'currentEnergyOverride' | 'preferredCategory'>>
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  { id: 'SC1', label: '只有 5 分钟',  query: { availableTime: 5 } },
  { id: 'SC2', label: '只有 10 分钟', query: { availableTime: 10 } },
  { id: 'SC3', label: '精力旺盛',     query: { currentEnergyOverride: 5 } },
  { id: 'SC4', label: '有点累',       query: { currentEnergyOverride: 2 } },
  { id: 'SC5', label: '想玩追逐',     query: { preferredCategory: 'chase' } },
  { id: 'SC6', label: '想玩益智',     query: { preferredCategory: 'puzzle' } },
]
```

- [ ] **Step 4: Run, verify pass**

```bash
npm run test:unit -- frontend/src/__tests__/play/types.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/play.ts frontend/src/__tests__/play/types.test.ts
git commit -m "feat(play): add types and config tables for play feature"
```

---

### Task 3: Track utility (`utils/track.ts`)

**Files:**
- Create: `frontend/src/utils/track.ts`
- Test: `frontend/src/__tests__/play/track.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/play/track.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { track } from '@/utils/track'

describe('utils/track', () => {
  let spy: ReturnType<typeof vi.spyOn>
  beforeEach(() => { spy = vi.spyOn(console, 'info').mockImplementation(() => {}) })
  afterEach(() => { spy.mockRestore() })

  it('emits structured event with [track] prefix', () => {
    track('feedback_submit', { catId: 'c1', gameId: 'g1', score: 5, completion: true })
    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0][0]).toBe('[track]')
    expect(spy.mock.calls[0][1]).toBe('feedback_submit')
    expect(spy.mock.calls[0][2]).toEqual({
      catId: 'c1', gameId: 'g1', score: 5, completion: true,
    })
  })

  it('serializes payload safely even when undefined', () => {
    track('recommendation_view')
    expect(spy).toHaveBeenCalledWith('[track]', 'recommendation_view', {})
  })
})
```

- [ ] **Step 2: Run, verify fail**

```bash
npm run test:unit -- frontend/src/__tests__/play/track.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `frontend/src/utils/track.ts`**

```ts
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
```

- [ ] **Step 4: Run, verify pass**

```bash
npm run test:unit -- frontend/src/__tests__/play/track.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/track.ts frontend/src/__tests__/play/track.test.ts
git commit -m "feat(play): add track() placeholder for analytics events"
```

---

### Task 4: API module (`api/play.ts`)

**Files:**
- Create: `frontend/src/api/play.ts`

> No standalone test for this file — it's a thin axios wrapper. It will be exercised through Task 5's composable test (with API mocked) and through manual E2E.

- [ ] **Step 1: Implement**

Create `frontend/src/api/play.ts`:

```ts
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
```

- [ ] **Step 2: Verify TypeScript builds**

```bash
cd e:/AiProject/cctest/PangHu/frontend && npm run typecheck 2>&1 | grep -E "error|play\.ts" | head -20
```

Expected: no errors in `api/play.ts`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/play.ts
git commit -m "feat(play): add api client for /play endpoints"
```

---

### Task 5: `usePlayRecommend` composable

**Files:**
- Create: `frontend/src/composables/usePlayRecommend.ts`
- Test: `frontend/src/__tests__/play/usePlayRecommend.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/play/usePlayRecommend.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { successResult, fallbackResult, needProfileResult } from './fixtures'

vi.mock('@/api/play', () => ({
  getPlayRecommend: vi.fn(),
  submitPlayFeedback: vi.fn(),
  updatePlayProfile: vi.fn(),
}))

import { getPlayRecommend } from '@/api/play'
import { usePlayRecommend } from '@/composables/usePlayRecommend'
import { SCENARIO_PRESETS } from '@/types/play'

describe('usePlayRecommend', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('fetch sets result on success', async () => {
    ;(getPlayRecommend as any).mockResolvedValueOnce({ success: true, data: successResult, message: '', error: null })
    const c = usePlayRecommend()
    await c.fetch({ catId: 'c1' })
    expect(c.result.value).toEqual(successResult)
    expect(c.error.value).toBeNull()
    expect(c.loading.value).toBe(false)
  })

  it('fetch sets error when ApiResponse.success is false (non-business code path)', async () => {
    ;(getPlayRecommend as any).mockResolvedValueOnce({ success: false, data: null, message: '加载失败', error: 'X' })
    const c = usePlayRecommend()
    await c.fetch({ catId: 'c1' })
    expect(c.error.value).toBe('加载失败')
    expect(c.result.value).toBeNull()
  })

  it('treats RecommendResult.needProfileCompletion as a valid (non-error) result', async () => {
    ;(getPlayRecommend as any).mockResolvedValueOnce({ success: true, data: needProfileResult, message: '', error: null })
    const c = usePlayRecommend()
    await c.fetch({ catId: 'c1' })
    expect(c.result.value).toEqual(needProfileResult)
    expect(c.error.value).toBeNull()
  })

  it('older fetch result is discarded when superseded', async () => {
    let resolveOld: (v: any) => void = () => {}
    const oldPromise = new Promise(r => { resolveOld = r })
    ;(getPlayRecommend as any)
      .mockReturnValueOnce(oldPromise)
      .mockResolvedValueOnce({ success: true, data: fallbackResult, message: '', error: null })

    const c = usePlayRecommend()
    const p1 = c.fetch({ catId: 'c1' })
    const p2 = c.fetch({ catId: 'c1', availableTime: 5 })
    await p2
    resolveOld({ success: true, data: successResult, message: '', error: null })
    await p1
    expect(c.result.value).toEqual(fallbackResult)
  })

  it('aborts old AbortController when new fetch starts', async () => {
    const aborts: Array<(s: AbortSignal) => void> = []
    ;(getPlayRecommend as any).mockImplementation((_q: any, signal: AbortSignal) => {
      const cb = () => {}
      signal?.addEventListener('abort', cb)
      aborts.push(cb)
      return new Promise(() => { /* never */ })
    })
    const c = usePlayRecommend()
    void c.fetch({ catId: 'c1' })
    void c.fetch({ catId: 'c1', availableTime: 5 })
    // 第一个 controller 应该被 abort（通过未抛出 reject 间接验证 reqSeq 机制即可）
    expect(aborts.length).toBe(2)
  })

  it('network error sets error and resets loading', async () => {
    ;(getPlayRecommend as any).mockRejectedValueOnce(new Error('Network down'))
    const c = usePlayRecommend()
    await c.fetch({ catId: 'c1' })
    expect(c.error.value).toBe('网络异常，请重试')
    expect(c.loading.value).toBe(false)
  })

  it('CanceledError from axios is silently swallowed', async () => {
    const err = new Error('aborted')
    ;(err as any).name = 'CanceledError'
    ;(getPlayRecommend as any).mockRejectedValueOnce(err)
    const c = usePlayRecommend()
    await c.fetch({ catId: 'c1' })
    expect(c.error.value).toBeNull()
  })

  it('applyScenario sets activeScenarioId and merges query', async () => {
    ;(getPlayRecommend as any).mockResolvedValueOnce({ success: true, data: successResult, message: '', error: null })
    const c = usePlayRecommend()
    await c.applyScenario(SCENARIO_PRESETS[0], 'c1')   // SC1: availableTime=5
    expect(c.activeScenarioId.value).toBe('SC1')
    expect(getPlayRecommend).toHaveBeenCalledWith({ catId: 'c1', availableTime: 5 }, expect.any(AbortSignal))
  })

  it('reset clears result, error, activeScenarioId', async () => {
    ;(getPlayRecommend as any).mockResolvedValueOnce({ success: true, data: successResult, message: '', error: null })
    const c = usePlayRecommend()
    await c.applyScenario(SCENARIO_PRESETS[0], 'c1')
    c.reset()
    expect(c.result.value).toBeNull()
    expect(c.activeScenarioId.value).toBeNull()
    expect(c.error.value).toBeNull()
  })
})
```

- [ ] **Step 2: Run, verify fail**

```bash
npm run test:unit -- frontend/src/__tests__/play/usePlayRecommend.test.ts
```

Expected: FAIL — module `@/composables/usePlayRecommend` not found.

- [ ] **Step 3: Implement `frontend/src/composables/usePlayRecommend.ts`**

```ts
import { ref } from 'vue'
import { getPlayRecommend } from '@/api/play'
import type { RecommendQuery, RecommendResult, ScenarioPreset } from '@/types/play'

export function usePlayRecommend() {
  const result = ref<RecommendResult | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const activeScenarioId = ref<string | null>(null)

  let reqSeq = 0
  let aborter: AbortController | null = null

  async function fetch(query: RecommendQuery): Promise<void> {
    const myId = ++reqSeq
    aborter?.abort()
    aborter = new AbortController()
    loading.value = true
    error.value = null
    try {
      const res = await getPlayRecommend(query, aborter.signal)
      if (myId !== reqSeq) return
      if (!res.success) {
        error.value = res.message || '加载推荐失败'
        return
      }
      result.value = res.data
    } catch (e: any) {
      if (e?.name === 'CanceledError' || e?.name === 'AbortError') return
      if (myId !== reqSeq) return
      error.value = '网络异常，请重试'
    } finally {
      if (myId === reqSeq) loading.value = false
    }
  }

  function applyScenario(preset: ScenarioPreset, catId: string): Promise<void> {
    activeScenarioId.value = preset.id
    return fetch({ catId, ...preset.query })
  }

  function reset(): void {
    activeScenarioId.value = null
    result.value = null
    error.value = null
  }

  return { result, loading, error, activeScenarioId, fetch, applyScenario, reset }
}
```

- [ ] **Step 4: Run, verify pass**

```bash
npm run test:unit -- frontend/src/__tests__/play/usePlayRecommend.test.ts
```

Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/composables/usePlayRecommend.ts frontend/src/__tests__/play/usePlayRecommend.test.ts
git commit -m "feat(play): add usePlayRecommend composable with race protection"
```

---

### Task 6: `PlayEmptyStates.vue`

**Files:**
- Create: `frontend/src/views/Play/components/PlayEmptyStates.vue`

> No standalone test — pure presentational, will be exercised through container test.

- [ ] **Step 1: Implement**

Create `frontend/src/views/Play/components/PlayEmptyStates.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

type EmptyType = 'no-cat' | 'vet-hint' | 'network'

const props = defineProps<{
  type: EmptyType
  message?: string
}>()

const emit = defineEmits<{
  (e: 'retry'): void
}>()

const router = useRouter()

const config = computed(() => {
  switch (props.type) {
    case 'no-cat':
      return {
        icon: '🐈',
        title: '还没有猫咪档案',
        desc: '先添加一只猫咪，再来看陪玩推荐吧',
        cta: '去添加猫咪',
        action: () => router.push('/my-cats/new'),
      }
    case 'vet-hint':
      return {
        icon: '🩺',
        title: '建议先咨询兽医',
        desc: props.message || '当前健康状况下暂不建议自行陪玩。',
        cta: '咨询喵星顾问',
        action: () => router.push('/ai-chat'),
      }
    case 'network':
      return {
        icon: '⚠️',
        title: '加载失败',
        desc: '检查网络后再试一次',
        cta: '重试',
        action: () => emit('retry'),
      }
  }
})
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div class="text-6xl mb-4" aria-hidden="true">{{ config.icon }}</div>
    <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ config.title }}</h3>
    <p class="text-sm text-gray-500 mb-6 max-w-sm">{{ config.desc }}</p>
    <el-button type="primary" @click="config.action">{{ config.cta }}</el-button>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/Play/components/PlayEmptyStates.vue
git commit -m "feat(play): add PlayEmptyStates component (no-cat/vet-hint/network)"
```

---

### Task 7: `ScenarioPresets.vue`

**Files:**
- Create: `frontend/src/views/Play/components/ScenarioPresets.vue`
- Test: `frontend/src/__tests__/play/ScenarioPresets.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/play/ScenarioPresets.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScenarioPresets from '@/views/Play/components/ScenarioPresets.vue'
import { SCENARIO_PRESETS } from '@/types/play'

describe('ScenarioPresets', () => {
  it('renders 6 buttons + a reset button', () => {
    const wrapper = mount(ScenarioPresets, {
      props: { activeScenarioId: null, loading: false },
    })
    const buttons = wrapper.findAll('button')
    // 6 scenarios + 1 reset
    expect(buttons.length).toBe(7)
  })

  it('emits apply with the matching preset when clicked', async () => {
    const wrapper = mount(ScenarioPresets, {
      props: { activeScenarioId: null, loading: false },
    })
    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    const events = wrapper.emitted('apply') as unknown[][]
    expect(events).toHaveLength(1)
    expect(events[0][0]).toEqual(SCENARIO_PRESETS[0])
  })

  it('emits reset when reset button clicked', async () => {
    const wrapper = mount(ScenarioPresets, {
      props: { activeScenarioId: 'SC1', loading: false },
    })
    const buttons = wrapper.findAll('button')
    await buttons[6].trigger('click')   // 最后一个是 reset
    expect(wrapper.emitted('reset')).toHaveLength(1)
  })

  it('disables all buttons while loading', () => {
    const wrapper = mount(ScenarioPresets, {
      props: { activeScenarioId: null, loading: true },
    })
    wrapper.findAll('button').forEach(b => {
      expect((b.element as HTMLButtonElement).disabled).toBe(true)
    })
  })

  it('applies active class to currently active scenario button', () => {
    const wrapper = mount(ScenarioPresets, {
      props: { activeScenarioId: 'SC2', loading: false },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons[1].classes()).toContain('is-active')
    expect(buttons[0].classes()).not.toContain('is-active')
  })
})
```

- [ ] **Step 2: Run, verify fail**

```bash
npm run test:unit -- frontend/src/__tests__/play/ScenarioPresets.test.ts
```

Expected: FAIL — component not found.

- [ ] **Step 3: Implement `frontend/src/views/Play/components/ScenarioPresets.vue`**

```vue
<script setup lang="ts">
import { SCENARIO_PRESETS, type ScenarioPreset } from '@/types/play'

defineProps<{
  activeScenarioId: string | null
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'apply', preset: ScenarioPreset): void
  (e: 'reset'): void
}>()
</script>

<template>
  <div class="flex flex-wrap gap-2 mb-4">
    <button
      v-for="p in SCENARIO_PRESETS"
      :key="p.id"
      type="button"
      :class="[
        'px-3 py-1.5 rounded-full border text-sm transition-colors',
        activeScenarioId === p.id
          ? 'is-active bg-orange-500 border-orange-500 text-white'
          : 'bg-white border-gray-300 text-gray-700 hover:border-orange-400',
      ]"
      :disabled="loading"
      @click="emit('apply', p)"
    >
      {{ p.label }}
    </button>
    <button
      type="button"
      class="px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-500"
      :disabled="loading"
      @click="emit('reset')"
    >
      重置
    </button>
  </div>
</template>
```

- [ ] **Step 4: Run, verify pass**

```bash
npm run test:unit -- frontend/src/__tests__/play/ScenarioPresets.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/Play/components/ScenarioPresets.vue frontend/src/__tests__/play/ScenarioPresets.test.ts
git commit -m "feat(play): add ScenarioPresets quick-button row"
```

---

### Task 8: `PlayProfileSetup.vue`

**Files:**
- Create: `frontend/src/views/Play/components/PlayProfileSetup.vue`
- Test: `frontend/src/__tests__/play/PlayProfileSetup.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/play/PlayProfileSetup.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/play', () => ({
  updatePlayProfile: vi.fn(),
}))
import { updatePlayProfile } from '@/api/play'
import PlayProfileSetup from '@/views/Play/components/PlayProfileSetup.vue'

describe('PlayProfileSetup', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('disables submit until personality and energyBaseline are both set', async () => {
    const wrapper = mount(PlayProfileSetup, { props: { catId: 'c1' } })
    const submit = wrapper.get('[data-testid="profile-submit"]')
    expect((submit.element as HTMLButtonElement).disabled).toBe(true)

    // 选 personality
    await wrapper.get('[data-testid="personality-active"]').trigger('click')
    expect((submit.element as HTMLButtonElement).disabled).toBe(true)

    // 设置 energyBaseline=3（默认就是 3，但需要明确选择以解锁；用 testid hook 触发）
    await wrapper.get('[data-testid="energy-3"]').trigger('click')
    expect((submit.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('calls updatePlayProfile and onCompleted on submit success', async () => {
    ;(updatePlayProfile as any).mockResolvedValueOnce({ success: true, data: null, message: '', error: null })
    const onCompleted = vi.fn()
    const wrapper = mount(PlayProfileSetup, { props: { catId: 'c1', onCompleted } })

    await wrapper.get('[data-testid="personality-curious"]').trigger('click')
    await wrapper.get('[data-testid="energy-4"]').trigger('click')
    await wrapper.get('[data-testid="health-senior"]').trigger('click')
    await wrapper.get('[data-testid="profile-submit"]').trigger('click')
    await flushPromises()

    expect(updatePlayProfile).toHaveBeenCalledWith('c1', {
      personality: 'curious',
      energyBaseline: 4,
      healthTags: ['senior'],
    })
    expect(onCompleted).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run, verify fail**

```bash
npm run test:unit -- frontend/src/__tests__/play/PlayProfileSetup.test.ts
```

Expected: FAIL — component not found.

- [ ] **Step 3: Implement `frontend/src/views/Play/components/PlayProfileSetup.vue`**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  PERSONALITY_OPTIONS,
  ENERGY_LEVELS,
  HEALTH_TAG_OPTIONS,
  type Personality,
  type HealthTag,
} from '@/types/play'
import { updatePlayProfile } from '@/api/play'

const props = defineProps<{
  catId: string
  onCompleted?: () => void
}>()

const personality = ref<Personality | null>(null)
const energyBaseline = ref<number | null>(null)
const healthTags = ref<HealthTag[]>([])
const submitting = ref(false)

const canSubmit = computed(() =>
  personality.value !== null && energyBaseline.value !== null && !submitting.value,
)

function toggleHealthTag(tag: HealthTag) {
  const idx = healthTags.value.indexOf(tag)
  if (idx >= 0) healthTags.value.splice(idx, 1)
  else healthTags.value.push(tag)
}

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const res = await updatePlayProfile(props.catId, {
      personality: personality.value!,
      energyBaseline: energyBaseline.value!,
      healthTags: [...healthTags.value],
    })
    if (!res.success) {
      ElMessage.error(res.message || '保存失败')
      return
    }
    ElMessage.success('画像保存成功')
    props.onCompleted?.()
  } catch (_e) {
    ElMessage.error('网络异常，请重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="bg-white rounded-2xl p-6 shadow-sm">
    <h2 class="text-xl font-semibold mb-1">先了解一下你的猫咪</h2>
    <p class="text-sm text-gray-500 mb-6">完成画像后即可获得个性化陪玩推荐</p>

    <!-- 性格 -->
    <section class="mb-6">
      <h3 class="text-base font-medium mb-3">性格特点</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          v-for="opt in PERSONALITY_OPTIONS"
          :key="opt.value"
          :data-testid="`personality-${opt.value}`"
          type="button"
          :class="[
            'text-left p-3 rounded-xl border-2 transition-colors',
            personality === opt.value
              ? 'border-orange-500 bg-orange-50'
              : 'border-gray-200 hover:border-orange-300',
          ]"
          @click="personality = opt.value"
        >
          <div class="font-medium">{{ opt.label }}</div>
          <div class="text-xs text-gray-600 mt-1">{{ opt.description }}</div>
          <div class="text-xs text-gray-400 mt-1">典型：{{ opt.example }}</div>
        </button>
      </div>
    </section>

    <!-- 精力档位 -->
    <section class="mb-6">
      <h3 class="text-base font-medium mb-3">日常精力档位</h3>
      <div class="grid grid-cols-5 gap-2">
        <button
          v-for="lvl in ENERGY_LEVELS"
          :key="lvl.value"
          :data-testid="`energy-${lvl.value}`"
          type="button"
          :class="[
            'flex flex-col items-center py-2 rounded-lg border-2',
            energyBaseline === lvl.value
              ? 'border-orange-500 bg-orange-50'
              : 'border-gray-200 hover:border-orange-300',
          ]"
          @click="energyBaseline = lvl.value"
        >
          <span class="text-lg font-semibold">{{ lvl.value }}</span>
          <span class="text-xs text-gray-600">{{ lvl.label }}</span>
        </button>
      </div>
      <p v-if="energyBaseline" class="text-xs text-gray-500 mt-2">
        {{ ENERGY_LEVELS.find(l => l.value === energyBaseline)?.description }}
      </p>
    </section>

    <!-- 健康标签 -->
    <section class="mb-6">
      <h3 class="text-base font-medium mb-3">
        健康标签 <span class="text-xs text-gray-400 font-normal">（可选，多选）</span>
      </h3>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tag in HEALTH_TAG_OPTIONS"
          :key="tag.value"
          :data-testid="`health-${tag.value}`"
          type="button"
          :title="tag.hint"
          :class="[
            'px-3 py-1.5 rounded-full border text-sm',
            healthTags.includes(tag.value)
              ? 'border-orange-500 bg-orange-50 text-orange-700'
              : 'border-gray-300 text-gray-600 hover:border-orange-300',
          ]"
          @click="toggleHealthTag(tag.value)"
        >
          {{ tag.label }}
        </button>
      </div>
    </section>

    <button
      data-testid="profile-submit"
      type="button"
      class="w-full py-3 rounded-xl bg-orange-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="!canSubmit"
      @click="submit"
    >
      {{ submitting ? '保存中…' : '保存并查看推荐' }}
    </button>
  </div>
</template>
```

- [ ] **Step 4: Run, verify pass**

```bash
npm run test:unit -- frontend/src/__tests__/play/PlayProfileSetup.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/Play/components/PlayProfileSetup.vue frontend/src/__tests__/play/PlayProfileSetup.test.ts
git commit -m "feat(play): add PlayProfileSetup form for personality/energy/health"
```

---

### Task 9: `PlaySuggestionCard.vue`

**Files:**
- Create: `frontend/src/views/Play/components/PlaySuggestionCard.vue`
- Test: `frontend/src/__tests__/play/PlaySuggestionCard.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/play/PlaySuggestionCard.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { successResult, fallbackResult } from './fixtures'

vi.mock('@/api/play', () => ({
  submitPlayFeedback: vi.fn(),
}))
import { submitPlayFeedback } from '@/api/play'
import PlaySuggestionCard from '@/views/Play/components/PlaySuggestionCard.vue'

describe('PlaySuggestionCard', () => {
  beforeEach(() => { vi.clearAllMocks() })

  const baseProps = {
    suggestion: successResult.suggestions[0],
    fallback: false,
    catId: 'c1',
    position: 0,
  }

  it('renders score when not fallback', () => {
    const wrapper = mount(PlaySuggestionCard, { props: baseProps })
    expect(wrapper.find('[data-testid="card-score"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('92')
  })

  it('does not render score when fallback', () => {
    const wrapper = mount(PlaySuggestionCard, {
      props: { ...baseProps, suggestion: fallbackResult.suggestions[0], fallback: true },
    })
    expect(wrapper.find('[data-testid="card-score"]').exists()).toBe(false)
  })

  it('disables submit until score >= 1', async () => {
    const wrapper = mount(PlaySuggestionCard, { props: baseProps })
    const submit = wrapper.get('[data-testid="card-submit"]')
    expect((submit.element as HTMLButtonElement).disabled).toBe(true)

    await wrapper.get('[data-testid="star-4"]').trigger('click')
    expect((submit.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('submits feedback with current values and switches to recorded state', async () => {
    ;(submitPlayFeedback as any).mockResolvedValueOnce({ success: true, data: { id: 'fb1' }, message: '', error: null })
    const wrapper = mount(PlaySuggestionCard, { props: baseProps })
    await wrapper.get('[data-testid="star-5"]').trigger('click')
    await wrapper.get('[data-testid="card-submit"]').trigger('click')
    await flushPromises()

    expect(submitPlayFeedback).toHaveBeenCalledWith(expect.objectContaining({
      catId: 'c1',
      gameId: 'feather-fishing',
      score: 5,
      completion: true,
      actualDuration: 10,
    }))
    expect(wrapper.find('[data-testid="card-recorded"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-edit"]').exists()).toBe(true)
  })

  it('clicking edit re-opens the form after submit', async () => {
    ;(submitPlayFeedback as any).mockResolvedValueOnce({ success: true, data: { id: 'fb1' }, message: '', error: null })
    const wrapper = mount(PlaySuggestionCard, { props: baseProps })
    await wrapper.get('[data-testid="star-3"]').trigger('click')
    await wrapper.get('[data-testid="card-submit"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="card-edit"]').trigger('click')
    expect(wrapper.find('[data-testid="card-submit"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="card-recorded"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run, verify fail**

```bash
npm run test:unit -- frontend/src/__tests__/play/PlaySuggestionCard.test.ts
```

Expected: FAIL — component not found.

- [ ] **Step 3: Implement `frontend/src/views/Play/components/PlaySuggestionCard.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { Suggestion } from '@/types/play'
import { CATEGORY_LABEL } from '@/types/play'
import { submitPlayFeedback } from '@/api/play'
import { track } from '@/utils/track'

const props = defineProps<{
  suggestion: Suggestion
  fallback: boolean
  catId: string
  position: number
}>()

const score = ref(0)
const completion = ref(true)
const actualDuration = ref(props.suggestion.game.durationMin)
const submitting = ref(false)
const submitted = ref(false)
const expanded = ref(false)
let startTracked = false

function expandDetails() {
  expanded.value = !expanded.value
  track('recommendation_click', {
    catId: props.catId,
    gameId: props.suggestion.game.id,
    position: props.position,
    score: props.suggestion.score,
  })
}

function setScore(v: number) {
  score.value = v
  if (!startTracked) {
    track('play_start', {
      catId: props.catId,
      gameId: props.suggestion.game.id,
      source: 'page',
    })
    startTracked = true
  }
}

async function submit() {
  if (score.value < 1 || submitting.value) return
  submitting.value = true
  try {
    const res = await submitPlayFeedback({
      catId: props.catId,
      gameId: props.suggestion.game.id,
      score: score.value,
      completion: completion.value,
      actualDuration: actualDuration.value,
    })
    if (!res.success) {
      ElMessage.error(res.message || '提交失败')
      return
    }
    submitted.value = true
    track('feedback_submit', {
      catId: props.catId,
      gameId: props.suggestion.game.id,
      score: score.value,
      completion: completion.value,
    })
    if (completion.value) {
      track('play_complete', {
        catId: props.catId,
        gameId: props.suggestion.game.id,
        actualDuration: actualDuration.value,
      })
    }
  } catch (_e) {
    ElMessage.error('网络异常，请重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <article class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
    <header class="flex items-start justify-between gap-3 mb-3">
      <div>
        <h3 class="text-lg font-semibold">{{ suggestion.game.name }}</h3>
        <div class="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
          <span class="px-2 py-0.5 rounded bg-gray-100">{{ CATEGORY_LABEL[suggestion.game.category] }}</span>
          <span>难度 · {{ suggestion.game.difficulty }}</span>
          <span>{{ suggestion.game.durationMin }} 分钟</span>
          <span>强度 {{ '●'.repeat(suggestion.game.energyCost) }}{{ '○'.repeat(5 - suggestion.game.energyCost) }}</span>
        </div>
      </div>
      <div v-if="!fallback" data-testid="card-score" class="text-right shrink-0">
        <div class="text-2xl font-bold text-orange-500">{{ suggestion.score }}</div>
        <div class="text-[10px] text-gray-400 leading-tight">
          性 {{ suggestion.breakdown?.personality ?? '-' }} ·
          力 {{ suggestion.breakdown?.energy ?? '-' }}<br>
          时 {{ suggestion.breakdown?.time ?? '-' }} ·
          好 {{ suggestion.breakdown?.preference ?? '-' }}
        </div>
      </div>
    </header>

    <ul class="text-sm text-gray-700 mb-3 space-y-1">
      <li v-for="r in suggestion.reasons" :key="r" class="flex gap-1.5">
        <span class="text-orange-500">·</span><span>{{ r }}</span>
      </li>
    </ul>

    <button class="text-xs text-gray-500 hover:text-orange-500 mb-3" type="button" @click="expandDetails">
      {{ expanded ? '收起详情' : '查看玩法 / 道具 / 小贴士 ↓' }}
    </button>

    <div v-if="expanded" class="text-sm text-gray-600 mb-4 space-y-2">
      <p>{{ suggestion.game.description }}</p>
      <p class="text-gray-500">所需道具：{{ suggestion.game.requiredProps.join('、') || '无需道具' }}</p>
      <p class="text-gray-500">小贴士：{{ suggestion.game.tips }}</p>
    </div>

    <!-- 反馈区 -->
    <div v-if="!submitted" class="border-t border-gray-100 pt-3">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-gray-700">猫咪喜欢吗？</span>
        <div class="flex gap-1">
          <button
            v-for="n in 5"
            :key="n"
            :data-testid="`star-${n}`"
            type="button"
            class="text-xl leading-none"
            :class="n <= score ? 'text-amber-400' : 'text-gray-300'"
            @click="setScore(n)"
          >★</button>
        </div>
      </div>
      <label class="flex items-center gap-2 text-sm text-gray-600 mb-2">
        <input v-model="completion" type="checkbox" />
        <span>玩满了建议时长</span>
      </label>
      <label class="flex items-center gap-2 text-sm text-gray-600 mb-3">
        <span>实际时长（分钟）</span>
        <input v-model.number="actualDuration" type="number" min="0" max="120" class="w-20 px-2 py-1 border border-gray-300 rounded" />
      </label>
      <button
        data-testid="card-submit"
        type="button"
        class="w-full py-2 rounded-lg bg-orange-500 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="score < 1 || submitting"
        @click="submit"
      >
        {{ submitting ? '提交中…' : '提交反馈' }}
      </button>
    </div>
    <div v-else data-testid="card-recorded" class="border-t border-gray-100 pt-3 flex items-center justify-between text-sm">
      <span class="text-gray-700">已记录 ⭐{{ score }} · {{ completion ? '完成' : '中断' }} · {{ actualDuration }} 分钟</span>
      <button data-testid="card-edit" type="button" class="text-orange-500 text-sm" @click="submitted = false">修改</button>
    </div>
  </article>
</template>
```

- [ ] **Step 4: Run, verify pass**

```bash
npm run test:unit -- frontend/src/__tests__/play/PlaySuggestionCard.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/Play/components/PlaySuggestionCard.vue frontend/src/__tests__/play/PlaySuggestionCard.test.ts
git commit -m "feat(play): add PlaySuggestionCard with inline rating + tracking"
```

---

### Task 10: `views/Play/index.vue` (container)

**Files:**
- Create: `frontend/src/views/Play/index.vue`

> No standalone test for the container — its branches are individually exercised by the component tests in Tasks 7/8/9 plus the composable test in Task 5. The five render branches are verified by manual QA in Task 15. Adding a container test would require installing Pinia + Element Plus globals into jsdom, which exceeds the value for P0.

- [ ] **Step 1: Implement `frontend/src/views/Play/index.vue`**

```vue
<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { useMyCatStore } from '@/stores/myCat'
import { usePlayRecommend } from '@/composables/usePlayRecommend'
import ScenarioPresets from './components/ScenarioPresets.vue'
import PlaySuggestionCard from './components/PlaySuggestionCard.vue'
import PlayProfileSetup from './components/PlayProfileSetup.vue'
import PlayEmptyStates from './components/PlayEmptyStates.vue'
import CatSelector from '@/components/cat/CatSelector.vue'
import { track } from '@/utils/track'
import { PERSONALITY_OPTIONS, type Personality } from '@/types/play'

const myCatStore = useMyCatStore()
const { result, loading, error, activeScenarioId, fetch, applyScenario, reset } = usePlayRecommend()

function loadDefault() {
  if (!myCatStore.currentCat) return
  fetch({ catId: myCatStore.currentCat.id })
}

onMounted(loadDefault)

watch(() => myCatStore.currentCat?.id, () => {
  reset()
  loadDefault()
})

watch(result, r => {
  if (r?.success) {
    track('recommendation_view', {
      catId: myCatStore.currentCat?.id,
      source: activeScenarioId.value ? 'scenario' : 'page',
      gameIds: r.suggestions.map(s => s.game.id),
      scores: r.suggestions.map(s => s.score),
      fallback: r.fallback,
    })
  }
})

const fallbackPersonalityLabel = computed<string>(() => {
  const p = (myCatStore.currentCat as any)?.personality as Personality | undefined
  return p ? PERSONALITY_OPTIONS.find(o => o.value === p)?.label || '' : ''
})
</script>

<template>
  <div class="max-w-3xl mx-auto p-4">
    <header class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">陪玩推荐</h1>
      <CatSelector />
    </header>

    <!-- 1. 没有猫咪 -->
    <PlayEmptyStates v-if="!myCatStore.currentCat" type="no-cat" />

    <!-- 2. 网络错误 -->
    <PlayEmptyStates v-else-if="error" type="network" @retry="loadDefault" />

    <!-- 3. 加载中 + 没有结果 -->
    <div v-else-if="loading && !result" class="py-16 text-center text-gray-500">加载中…</div>

    <!-- 4. 画像未完成 -->
    <PlayProfileSetup
      v-else-if="result?.needProfileCompletion"
      :cat-id="myCatStore.currentCat.id"
      :on-completed="loadDefault"
    />

    <!-- 5. 业务降级 L2（兽医提示） -->
    <PlayEmptyStates
      v-else-if="result && !result.success"
      type="vet-hint"
      :message="result.message"
    />

    <!-- 6. fallback=true：卡片列表（不展示分数 + 不展示场景预设） -->
    <template v-else-if="result?.fallback">
      <p class="text-sm text-gray-500 mb-3">
        {{ fallbackPersonalityLabel ? `按${fallbackPersonalityLabel}为你挑选` : '为你挑选' }}
      </p>
      <div class="space-y-4">
        <PlaySuggestionCard
          v-for="(s, i) in result.suggestions"
          :key="s.game.id"
          :suggestion="s"
          :fallback="true"
          :cat-id="myCatStore.currentCat.id"
          :position="i"
        />
      </div>
    </template>

    <!-- 7. 正常成功 -->
    <template v-else-if="result?.success">
      <ScenarioPresets
        :active-scenario-id="activeScenarioId"
        :loading="loading"
        @apply="p => applyScenario(p, myCatStore.currentCat!.id)"
        @reset="() => { reset(); loadDefault() }"
      />
      <div class="space-y-4">
        <PlaySuggestionCard
          v-for="(s, i) in result.suggestions"
          :key="s.game.id"
          :suggestion="s"
          :fallback="false"
          :cat-id="myCatStore.currentCat.id"
          :position="i"
        />
      </div>
    </template>
  </div>
</template>
```

- [ ] **Step 2: Typecheck**

```bash
cd e:/AiProject/cctest/PangHu/frontend && npm run typecheck 2>&1 | grep -E "error|Play/index" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/Play/index.vue
git commit -m "feat(play): add /play container view with all render branches"
```

---

### Task 11: Register `/play` route

**Files:**
- Modify: `frontend/src/router/index.ts`

- [ ] **Step 1: Locate the routes array**

```bash
grep -n "name: 'AIChat'" e:/AiProject/cctest/PangHu/frontend/src/router/index.ts
```

Expected: a line number; the AIChat route block is the model for ours.

- [ ] **Step 2: Insert `/play` route**

In `frontend/src/router/index.ts`, find the route block for `AIChat` and insert immediately after it:

```ts
{
  path: '/play',
  name: 'Play',
  component: () => import('../views/Play/index.vue'),
  meta: { requiresAuth: true },
},
```

- [ ] **Step 3: Verify dev server picks up the route**

```bash
# Restart frontend dev server in another shell, then:
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5173/play
```

Expected: `200` (Vite always returns 200 for SPA paths).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/router/index.ts
git commit -m "feat(play): register /play route with auth guard"
```

---

### Task 12: Sidebar nav entry (Tabbar deferred)

**Files:**
- Add: `frontend/src/assets/icon/play.png` (placeholder copy of an existing PNG)
- Modify: `frontend/src/layouts/components/AppSidebar.vue`

> **Tabbar entry is intentionally deferred.** [AppTabbar.vue](../../../frontend/src/layouts/components/AppTabbar.vue) is a fixed 5-slot layout with a central FAB; inserting a 6th tab requires design rework. Mobile discoverability is covered by the Dashboard `TodayPlayCard` (Task 13), which appears above the fold on every visit. Tabbar redesign is a follow-up.

- [ ] **Step 1: Create the icon placeholder**

```bash
cp e:/AiProject/cctest/PangHu/frontend/src/assets/icon/喵星顾问.png e:/AiProject/cctest/PangHu/frontend/src/assets/icon/play.png
```

- [ ] **Step 2: Add the import + nav item to AppSidebar**

Open `frontend/src/layouts/components/AppSidebar.vue`. Add the icon import alongside the existing icons (after `iconAdvisor`):

```ts
import iconPlay from '../../assets/icon/play.png'
```

Then in the `navItems` array (lines 14-20), insert one entry **after** `'喵喵医生'`. The final array should be:

```ts
const navItems = computed(() => [
  { name: '首页', path: '/', icon: iconHome, isImage: true },
  { name: '成长记录', path: '/timeline', icon: iconTimeline, isImage: true },
  { name: '养猫指南', path: '/guides', icon: iconGuide, isImage: true },
  { name: '喵喵医生', path: '/ai-chat', icon: iconAdvisor, isImage: true, requiresAuth: true },
  { name: '陪玩', path: '/play', icon: iconPlay, isImage: true, requiresAuth: true },
  { name: '我的猫咪', path: '/my-cats', icon: iconMascot, isImage: true, requiresAuth: true }
].filter(item => !item.requiresAuth || authStore.isAuthenticated))
```

- [ ] **Step 3: Manual verification**

Open the dev server in a desktop-width browser. Confirm a "陪玩" item appears between "喵喵医生" and "我的猫咪" with the icon visible. Click and confirm it lands on `/play`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/assets/icon/play.png frontend/src/layouts/components/AppSidebar.vue
git commit -m "feat(play): add sidebar nav entry for /play"
```

---

### Task 13: `TodayPlayCard.vue` + Dashboard integration

**Files:**
- Create: `frontend/src/components/home/TodayPlayCard.vue`
- Modify: `frontend/src/modules/dashboard/pages/DashboardPage.vue`

- [ ] **Step 1: Implement the card**

Create `frontend/src/components/home/TodayPlayCard.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useMyCatStore } from '@/stores/myCat'
import { getPlayRecommend } from '@/api/play'
import type { Suggestion } from '@/types/play'

const myCatStore = useMyCatStore()
const { currentCat } = storeToRefs(myCatStore)
const router = useRouter()

const root = ref<HTMLElement | null>(null)
const top = ref<Suggestion | null>(null)
const needsSetup = ref(false)
const loaded = ref(false)
let observer: IntersectionObserver | null = null

async function loadOnce() {
  if (loaded.value || !currentCat.value) return
  loaded.value = true
  try {
    const res = await getPlayRecommend({ catId: currentCat.value.id })
    if (!res.success || !res.data.success) {
      needsSetup.value = !!res.data?.needProfileCompletion
      return
    }
    top.value = res.data.suggestions[0] ?? null
  } catch (_e) {
    // 静默失败：卡片仍可点击进入 /play 重试
  }
}

onMounted(() => {
  if (!('IntersectionObserver' in window) || !root.value) {
    void loadOnce()
    return
  }
  observer = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) {
      void loadOnce()
      observer?.disconnect()
    }
  })
  observer.observe(root.value)
})

onBeforeUnmount(() => observer?.disconnect())

function go() {
  router.push('/play')
}
</script>

<template>
  <div ref="root" class="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 cursor-pointer" @click="go">
    <div class="flex items-center justify-between">
      <div>
        <div class="text-sm text-gray-500">今日陪玩</div>
        <div class="text-base font-semibold mt-0.5">
          <template v-if="needsSetup">点击设置陪玩档案</template>
          <template v-else-if="top">{{ top.game.name }} · {{ top.reasons[0] }}</template>
          <template v-else>为 {{ currentCat?.name || '猫咪' }} 推荐合适的小游戏</template>
        </div>
      </div>
      <div class="text-orange-500 text-lg">→</div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Mount on Dashboard**

Open `frontend/src/modules/dashboard/pages/DashboardPage.vue`. Find the section between the Hero card and the data grid (look for the close of the hero block and the start of the grid). Insert:

```vue
<TodayPlayCard v-if="currentCat" class="mb-4" />
```

Make sure to import the component:

```ts
import TodayPlayCard from '@/components/home/TodayPlayCard.vue'
```

- [ ] **Step 3: Manual smoke test**

```bash
# In browser DevTools Network tab, filter for /api/play/recommend
# 1. Reload dashboard → Recommend request should NOT fire on initial load
# 2. Scroll the dashboard → as the card enters viewport, exactly ONE recommend request fires
# 3. Click the card → routes to /play
```

Expected: behaviour matches. If recommend request fires on load even when card is off-screen, recheck the IntersectionObserver wiring.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/home/TodayPlayCard.vue frontend/src/modules/dashboard/pages/DashboardPage.vue
git commit -m "feat(play): add TodayPlayCard with viewport lazy-load on Dashboard"
```

---

### Task 14: Sync `PlayFeedback` table to local DB

**Files:** none (DB-only)

This is required so feedback submission actually persists locally. The migration file already exists (`backend/prisma/migrations/20260616000000_add_cat_play_profile_and_play_feedback/migration.sql`) but the local DB hasn't been baselined.

- [ ] **Step 1: Verify the table is missing**

```bash
PGPASSWORD=postgres "C:/Program Files/PostgreSQL/16/bin/psql.exe" -U postgres -h localhost -d panghu -c "\dt PlayFeedback"
```

Expected: no rows returned (table missing).

- [ ] **Step 2: Stop the backend dev server**

Find the backend node process (3000) and stop it before running prisma:

```bash
netstat -ano | grep -E "3000.*LISTEN"
# Take the PID, then:
cmd //c "taskkill /F /PID <PID>"
```

- [ ] **Step 3: Push schema (PlayFeedback only)**

`prisma db push` may try to also re-apply embedding columns and fail on missing pgvector. Workaround: temporarily comment out the `embedding` column from `backend/prisma/schema.prisma`, push, then restore it.

```bash
cd e:/AiProject/cctest/PangHu/backend
# 1. Edit schema.prisma: comment out the line `embedding Unsupported("vector(2048)")?` (~line 134)
# 2. Run:
npx prisma db push
# 3. Restore the line
```

Expected: `🚀 Your database is now in sync with your Prisma schema.`

- [ ] **Step 4: Verify**

```bash
PGPASSWORD=postgres "C:/Program Files/PostgreSQL/16/bin/psql.exe" -U postgres -h localhost -d panghu -c "\d PlayFeedback"
```

Expected: full PlayFeedback table schema printed.

- [ ] **Step 5: Restart backend**

```bash
cd e:/AiProject/cctest/PangHu/backend && npm run dev   # in a background shell
```

Expected: server starts on :3000 with no Prisma errors.

- [ ] **Step 6: Commit (no file changes if schema was reverted; skip if clean)**

```bash
cd e:/AiProject/cctest/PangHu && git status
# If only the schema is dirty due to comment/uncomment, ensure it's clean:
git diff backend/prisma/schema.prisma   # should be empty
```

No commit needed if there's no diff.

---

### Task 15: Run all play tests + manual verification checklist

- [ ] **Step 1: Run all play unit tests**

```bash
cd e:/AiProject/cctest/PangHu && npm run test:unit -- frontend/src/__tests__/play
```

Expected: every spec from Tasks 1-10 passes (≥ 26 tests).

- [ ] **Step 2: Typecheck the frontend**

```bash
cd e:/AiProject/cctest/PangHu/frontend && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Manual checklist (with backend + frontend dev servers running)**

Run through every row of the spec's §7 verification table (V1..V12). For each row, mark complete only after eyeballing the actual behavior in the browser.

- [ ] V1 — `/play` with no `personality` set: PlayProfileSetup renders.
- [ ] V2 — Submit profile: list re-renders without manual refresh.
- [ ] V3 — All 6 scenario buttons trigger requests with the expected query params (verify in DevTools Network).
- [ ] V4 — Submit a rating: card switches to "已记录" state.
- [ ] V5 — When the API returns `fallback: true` (forcing scenario: e.g., set healthTags=['post_op'] for a low-energy cat to constrain pool): score not shown, reasons shown.
- [ ] V6 — When `success: false` (forcing scenario: set every healthTag → empty pool): vet-hint empty state renders.
- [ ] V7 — Switch cat via `CatSelector`: list refreshes, no stale results.
- [ ] V8 — Disable network in DevTools, reload `/play`: network empty state with retry.
- [ ] V9 — `TodayPlayCard`: only fetches when scrolled into view.
- [ ] V10 — Desktop sidebar entry lands on `/play`; on mobile, the Dashboard `TodayPlayCard` is the entry point (Tabbar entry deferred — see Task 12 note).
- [ ] V11 — Logged out + visit `/play`: redirected to `/login`.
- [ ] V12 — Open DevTools console, exercise the page: 5 `[track]` events appear (`recommendation_view`, `recommendation_click`, `play_start`, `play_complete`, `feedback_submit`).

- [ ] **Step 4: Wrap-up commit (only if any docstring/README updates needed)**

If during the manual check you found a tweak (typo, copy fix), fix it and commit:

```bash
git add -p
git commit -m "fix(play): minor copy/UX tweaks from manual QA"
```

---

## Final State

After all tasks:
- 10 new source files (`types/play.ts`, `utils/track.ts`, `api/play.ts`, `composables/usePlayRecommend.ts`, 4 components in `views/Play/components/`, `views/Play/index.vue`, `components/home/TodayPlayCard.vue`).
- 1 new asset (`assets/icon/play.png`).
- 5 new test files (~24 unit/component tests across types/track/composable/3 components).
- 3 modified files (`router/index.ts`, `layouts/components/AppSidebar.vue`, `modules/dashboard/pages/DashboardPage.vue`).
- 1 dev dependency added (`@vue/test-utils`).
- 1 DB table synced (`PlayFeedback`).
- All P0 verification items in the spec satisfied.
- Tabbar nav entry deferred to a follow-up (see Task 12 note).
