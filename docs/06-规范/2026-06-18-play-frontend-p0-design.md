# 宠物陪玩功能前端 P0 - 设计文档

| 项 | 值 |
|---|---|
| 文档版本 | v1.0 |
| 创建日期 | 2026-06-18 |
| 范围 | 前端 P0 实现 |
| 关联 PRD | [docs/01-产品/宠物陪玩功能PRD.md](../../01-产品/宠物陪玩功能PRD.md) |
| 关联技术设计 | [docs/02-开发/核心功能/宠物陪玩功能技术设计.md](../../02-开发/核心功能/宠物陪玩功能技术设计.md) |
| 后端状态 | 已就绪（API + Agent Tool + 数据库 schema 全部完成） |

## 0. 背景与目标

后端"宠物陪玩"功能已完整实现：路由 `/api/play/recommend` / `/api/play/feedback`、Agent 工具 `recommend_play` / `submit_play_feedback`、推荐引擎、健康过滤、降级逻辑、数据库表（`Cat.personality/energyBaseline/healthTags` + `PlayFeedback`）。**前端缺失，导致最终用户无法使用该功能**。

本设计仅覆盖 PRD §9.1 的 **P0 范围**（画像录入、智能推荐 UI、反馈采集、Dashboard 入口）。**P1（陪玩记录列表、偏好画像查看、周报）与 P2（主动提醒）不在本期范围内**。

## 1. 范围与决策

四项关键决策（已与产品/Owner 确认）：

| # | 决策 | 取舍理由 |
|---|---|---|
| D1 | 范围：仅 P0 | 最快上线，避免与后端 P1 接口节奏耦合 |
| D2 | 入口：独立路由 `/play` + Dashboard 卡片 | 6 个场景预设按钮塞不进 Dashboard；侧边栏/Tabbar 也需固定入口 |
| D3 | 画像补全：仅在 `/play` 内嵌引导，不动猫咪编辑页 | 画像缺失是阻断推荐的硬条件，内嵌让流程不离场；P1 可再扩到编辑页 |
| D4 | 反馈：卡片内联评分 + 提交按钮 | 与 PRD §4.5.3 一致；不引入计时器/弹窗，代码量最小 |

## 2. 架构

### 2.1 文件结构

```
frontend/src/
├── api/play.ts                          # getPlayRecommend / submitPlayFeedback / updatePlayProfile
├── types/play.ts                        # 类型 + 文案配置（PERSONALITY_OPTIONS / ENERGY_LEVELS / HEALTH_TAG_OPTIONS / SCENARIO_PRESETS / CATEGORY_LABEL）
├── assets/icon/play.png                 # 新增侧边栏导航 PNG（沿用现有图标风格）
├── utils/track.ts                       # track(event, payload) 单点封装（埋点占位）
├── views/Play/
│   ├── index.vue                        # /play 容器（路由懒加载）
│   ├── composables/
│   │   └── usePlayRecommend.ts          # 视图局部状态：result / loading / error / activeScenarioId / fetch / applyScenario / reset
│   └── components/
│       ├── PlayProfileSetup.vue         # needProfileCompletion=true 时的画像引导表单
│       ├── ScenarioPresets.vue          # SC1-SC6 六个快捷按钮（带 active 态）
│       ├── PlaySuggestionCard.vue       # 单条推荐卡片（含星级 + 完成 toggle + actualDuration + 已记录态）
│       └── PlayEmptyStates.vue          # 三种空态：no-cat / vet-hint / network
└── components/home/
    └── TodayPlayCard.vue                # Dashboard 入口卡（IntersectionObserver 懒加载）
```

### 2.2 关键架构选择

| 选择 | 取舍 |
|---|---|
| 不开 Pinia store，状态走 composable | /play 状态不跨页共享；Pinia store 现状一律是跨页全局状态（auth/myCat/pet 等） |
| TodayPlayCard 进入视口才拉数据 | Dashboard 已并发请求 my-cats / chat/conversations / cats/stages / guides，不再叠加 |
| 单调 reqSeq + AbortController 防竞态 | 6 个场景按钮快速切换时只渲染最新结果 |
| 三种空态合并成 `PlayEmptyStates.vue` | 避免开三个文件，靠 prop type 区分 |

### 2.3 路由与导航

```ts
// router/index.ts
{
  path: '/play',
  name: 'Play',
  component: () => import('@/views/Play/index.vue'),
  meta: { requiresAuth: true },
}
```

- 桌面 `AppSidebar.vue` 在「养猫指南」「喵星顾问」之间插入「陪玩」项，icon 使用新 `assets/icon/play.png`。
- 移动 `AppTabbar.vue` 加内联 SVG 的 Tab 项（与现有 Tabbar 约定一致）。

## 3. 数据契约

### 3.1 类型（`types/play.ts`）

与后端 `backend/src/data/playGames.types.ts` + `backend/src/agent/recommend/fallback.ts` 对齐：

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
  personality: number; energy: number; time: number; preference: number
}

export interface Suggestion {
  game: PlayGame
  score: number
  breakdown: ScoreBreakdown | null   // fallback=true 时为 null
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
  availableTime?: number             // 1-120
  preferredCategory?: GameCategory
  currentEnergyOverride?: number     // 1-5
}

export interface FeedbackPayload {
  catId: string
  gameId: string
  score: number                      // 1-5
  completion: boolean
  actualDuration: number             // ≥0 分钟
  playedAt?: string                  // ISO，缺省由后端取 now
  notes?: string
}

export interface PlayProfilePayload {
  personality: Personality
  energyBaseline: number             // 1-5
  healthTags: HealthTag[]            // 可空数组
}
```

### 3.2 文案配置（用户视角）

与 PRD §4.2.2 / §4.2.3 / §4.4.1 一一对照：

```ts
export const PERSONALITY_OPTIONS: Array<{
  value: Personality
  label: string         // "活泼好动型"
  description: string   // PRD §4.2.2 描述列
  example: string       // 典型表现
}> = [
  { value: 'active',  label: '活泼好动型', description: '精力旺盛，喜欢追逐奔跑', example: '经常飞奔、扑咬、撕咬玩具' },
  { value: 'curious', label: '聪明好奇型', description: '喜欢探索，善于解谜',     example: '爱开柜门、研究新物品' },
  { value: 'clingy',  label: '黏人互动型', description: '依赖主人，喜欢被关注',   example: '跟随主人、爱被抚摸' },
  { value: 'aloof',   label: '高冷独立型', description: '喜欢独处，选择性互动',   example: '喜欢独自待着、不爱被打扰' },
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
  chase: '追逐', hunting: '狩猎', puzzle: '益智',
  interaction: '互动', climbing: '攀爬', solo: '独处',
}

export interface ScenarioPreset {
  id: 'SC1' | 'SC2' | 'SC3' | 'SC4' | 'SC5' | 'SC6'
  label: string
  query: Partial<Pick<RecommendQuery, 'availableTime' | 'currentEnergyOverride' | 'preferredCategory'>>
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  { id: 'SC1', label: '只有 5 分钟',  query: { availableTime: 5  } },
  { id: 'SC2', label: '只有 10 分钟', query: { availableTime: 10 } },
  { id: 'SC3', label: '精力旺盛',     query: { currentEnergyOverride: 5 } },
  { id: 'SC4', label: '有点累',       query: { currentEnergyOverride: 2 } },
  { id: 'SC5', label: '想玩追逐',     query: { preferredCategory: 'chase' } },
  { id: 'SC6', label: '想玩益智',     query: { preferredCategory: 'puzzle' } },
]
```

### 3.3 API 模块（`api/play.ts`）

签名约定与 [api/myCat.ts](../../../frontend/src/api/myCat.ts) 完全一致：声明返回 `Promise<ApiResponse<T>>`，调用 `api.get/post/put` 时**不传泛型**（项目 axios 拦截器 [api/index.ts](../../../frontend/src/api/index.ts) 已把 `response.data` 直接返回，运行时拿到的就是 ApiResponse 对象）。

```ts
import api from './index.js'
import type { ApiResponse } from '../types/common.js'
import type {
  RecommendQuery, RecommendResult,
  FeedbackPayload, PlayProfilePayload,
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

> 调用处典型用法：`const res = await getPlayRecommend(...); if (!res.success) {...} else { res.data.suggestions ... }`。

## 4. 组件职责

### 4.1 `composables/usePlayRecommend.ts`

```ts
function usePlayRecommend() {
  const result = ref<RecommendResult | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const activeScenarioId = ref<string | null>(null)
  let reqSeq = 0
  let aborter: AbortController | null = null

  async function fetch(query: RecommendQuery) {
    const myId = ++reqSeq
    aborter?.abort()
    aborter = new AbortController()
    loading.value = true
    error.value = null
    try {
      const res = await getPlayRecommend(query, aborter.signal)
      if (myId !== reqSeq) return
      if (!res.success) { error.value = res.message ?? '加载推荐失败'; return }
      result.value = res.data
    } catch (e: any) {
      if (e.name === 'CanceledError' || e.name === 'AbortError') return
      if (myId !== reqSeq) return
      error.value = '网络异常，请重试'
    } finally {
      if (myId === reqSeq) loading.value = false
    }
  }

  function applyScenario(p: ScenarioPreset, catId: string) {
    activeScenarioId.value = p.id
    return fetch({ catId, ...p.query })
  }

  function reset() {
    activeScenarioId.value = null
    result.value = null
    error.value = null
  }

  return { result, loading, error, activeScenarioId, fetch, applyScenario, reset }
}
```

### 4.2 `views/Play/index.vue`（容器）

只做拉取 + 分发，不写业务逻辑。

```text
mounted / watch(currentCat):
  if (!currentCat) → PlayEmptyStates type="no-cat"
  else fetch({ catId: currentCat.id })   // 默认入参 = R311 快速推荐

渲染分支（优先级从高到低）：
  loading && !result                    → 骨架屏
  error                                 → PlayEmptyStates type="network" + 重试
  result.needProfileCompletion          → PlayProfileSetup
  !result.success                       → PlayEmptyStates type="vet-hint"  (L2)
  result.fallback === true              → 顶部提示条「按 X 性格为你挑选」+ 卡片列表（不展示分数）
  result.success === true               → ScenarioPresets + 卡片列表（展示分数 + reasons）
```

- 顶部固定 `CatSelector`，切换猫咪触发 `reset() + fetch`。
- ScenarioPresets 仅在 `result.success === true` 时渲染。
- 推荐卡片渲染完毕触发埋点 `recommendation_view`。

### 4.3 `PlayProfileSetup.vue`

输入：`catId: string`、`onCompleted: () => void`。

三段式：
- `personality` 必填，渲染 `PERSONALITY_OPTIONS` 4 张选择卡（label + description + example）。
- `energyBaseline` 必填，5 档滑块；每档下方显示 `ENERGY_LEVELS[i].label / description`。
- `healthTags` 选填，多选 chips（`HEALTH_TAG_OPTIONS`），每个 chip 带 `hint` tooltip。

提交：personality + energyBaseline 都非空才允许点「保存并查看推荐」→ `updatePlayProfile(catId, payload)` → 成功后调 `onCompleted()`，由父组件重新 `fetch()`。

### 4.4 `ScenarioPresets.vue`

- 渲染 6 个 `SCENARIO_PRESETS` 按钮，激活样式来自 `activeScenarioId === preset.id`。
- emit `apply(preset)`，父组件调 `applyScenario(preset, catId)`。
- 一个「重置」按钮 → emit `reset`，父组件调 `reset() + fetch({catId})`。
- loading 期间所有按钮 disabled。

### 4.5 `PlaySuggestionCard.vue`

输入：`suggestion: Suggestion`、`fallback: boolean`、`catId: string`。

布局（垂直）：
1. **头部**：游戏名 + category badge（`CATEGORY_LABEL`）+ 难度 + 时长 + 强度（5 dot）
2. **分数行**：`fallback === true` 时不渲染；否则展示 score 大字 + 4 个子分数小标签
3. **reasons 列表**：直出后端文案，不再二次加工
4. **描述 + tips + 所需道具**：折叠/展开
5. **反馈区**（始终展示）：
   - `ElRate` 1-5 星
   - 完成 toggle（默认 true）
   - 实际时长 input（默认 `game.durationMin`，可改）
   - 「提交反馈」按钮：`disabled = score === 0 || submitting`
6. **已记录态**：提交成功后切「已记录 ⭐4 · 完成 · 12 分钟」+「修改」按钮，重新展开后可再提交（后端按 `(catId, gameId, playedAt 当天)` upsert）

本地状态：`score / completion / actualDuration / submitting / submitted`，每张卡独立。

埋点：
- 反馈区首次展开（用户开始操作） → `play_start`
- 提交时 completion === true → `play_complete`
- 提交成功 → `feedback_submit`
- 卡片被点击展开描述 → `recommendation_click`

### 4.6 `PlayEmptyStates.vue`

| `type` 值 | 文案 | CTA |
|---|---|---|
| `no-cat` | "还没有猫咪档案，先添加一只吧" | 跳 `/my-cats/new` |
| `vet-hint` | 后端 `result.message`（兽医提示） | 「咨询喵星顾问」跳 `/ai-chat` |
| `network` | "加载失败，检查网络后重试" | 「重试」按钮（emit `retry`） |

### 4.7 `TodayPlayCard.vue`

挂在 [DashboardPage.vue](../../../frontend/src/modules/dashboard/pages/DashboardPage.vue) Hero 卡片与数据网格之间。

- 默认渲染：标题「今日陪玩」+ 副标题「为 {currentCat.name} 推荐合适的小游戏」+「查看推荐 →」。
- IntersectionObserver 进入视口后才发 `getPlayRecommend({catId})`（**关键**：不增加 Dashboard 首屏并发请求）。
- 拿到结果后只渲染**第 1 条** suggestion 的名字 + 一句 reason，作为预览。
- 卡片整体可点击 → 跳 `/play`。
- `currentCat === null` / `result.success === false` / `needProfileCompletion === true` 时降级为静态 CTA「点击设置陪玩档案 →」跳 `/play`，不在首页处理表单。

## 5. 状态时序

### 5.1 进入 `/play` 主流程

```
用户点击侧边栏「陪玩」
  ↓
Play/index.vue mounted
  ↓
读 useMyCatStore.currentCat
  ↓
  ├─ null → 渲染 no-cat 空态，结束
  └─ Cat → fetch({ catId })
              ↓
            渲染分支（见 §4.2）
```

### 5.2 场景预设切换（含竞态保护）

```
用户连续点 SC1 → SC3
  ↓
applyScenario(SC1) → reqSeq=1, aborter#1, fetch start
  ↓
applyScenario(SC3) → reqSeq=2, aborter#1.abort(), aborter#2, fetch start
  ↓
SC1 响应回来：myId(1) !== reqSeq(2) → 丢弃
  ↓
SC3 响应回来：myId(2) === reqSeq(2) → 写入 result
```

### 5.3 画像补全闭环

```
fetch → result.needProfileCompletion === true
  ↓
渲染 PlayProfileSetup
  ↓
用户填完 personality + energyBaseline + healthTags → 提交
  ↓
updatePlayProfile 成功 → onCompleted()
  ↓
父组件 fetch({ catId })  // 重新拉推荐
  ↓
result.success === true → 渲染卡片列表
```

### 5.4 反馈提交闭环

```
用户调整 score / completion / actualDuration → 点提交
  ↓
submitPlayFeedback → 成功
  ↓
本地 submitted = true → 切「已记录」态
  ↓
用户点「修改」 → 重新展开表单 → 可再提交（后端 upsert）
```

## 6. 测试策略

### 6.1 单元测试（Vitest，`frontend/src/__tests__/play/`）

- `usePlayRecommend.test.ts`
  - 多次 `fetch` 串行，旧响应不污染 `result`（验证 reqSeq）
  - `applyScenario` 触发 abort，无未处理 rejection
  - 网络错误：`error` 被设置，`loading` 复位
  - 业务降级（`success=false`）：`error` 不被污染
- `types/play.test.ts`
  - `SCENARIO_PRESETS` 6 项 id 唯一、覆盖 SC1-SC6
  - `PERSONALITY_OPTIONS` / `ENERGY_LEVELS` / `HEALTH_TAG_OPTIONS` 与后端类型一一对应

### 6.2 组件测试

- `PlaySuggestionCard.spec.ts`：fallback 不渲染分数；score=0 按钮 disabled；提交后切「已记录」
- `PlayProfileSetup.spec.ts`：personality + energyBaseline 都非空才能提交；触发 onCompleted
- `views/Play/index.spec.ts`：5 条渲染分支按优先级正确切换；`currentCat` 切换触发 reset+fetch

### 6.3 Mock

- API mock：`vi.mock('@/api/play')`
- Fixture 文件：`__tests__/play/fixtures/recommend.success.json` / `recommend.fallback.json` / `recommend.needProfile.json` / `recommend.vetHint.json` / `feedback.success.json`，shape 与后端测试一致

### 6.4 不做

- E2E（playwright 已有，留到打包验证里跑）
- 视觉回归

## 7. 验收标准（P0）

| # | 验收点 | 验证方式 |
|---|---|---|
| V1 | 首次进入 /play 且 personality 缺失 → 渲染 PlayProfileSetup | 组件测试 + 人工 |
| V2 | 完成画像 → 自动重新拉推荐 | 人工 |
| V3 | 6 个场景预设按钮全部可触发，参数与 SCENARIO_PRESETS 一致 | 单元 + 人工 |
| V4 | 卡片支持星级 + 完成 toggle + 时长，提交后切「已记录」 | 组件测试 + 人工 |
| V5 | `fallback=true` 不展示分数，展示后端 reasons 文案 | 组件测试 |
| V6 | `success=false` 渲染 vet-hint 空态 | 组件测试 |
| V7 | 切换 currentCat 立刻重新拉取，不残留旧结果 | 人工 |
| V8 | 网络失败展示重试按钮，重试后恢复 | 人工 |
| V9 | Dashboard TodayPlayCard 默认不发请求；进入视口后才拉一次 | 人工（DevTools Network） |
| V10 | 桌面侧边栏 / 移动 Tabbar 都能进入 /play | 人工三端自测 |
| V11 | 未登录访问 /play 自动跳 /login | 人工 |
| V12 | 5 个核心埋点字段就位（结构化 console.log 即可） | 单元（spy） |

## 8. 埋点

PRD §7.1 列了 7 个事件，P0 只埋前 5 个（PRD §9.1）：

```
recommendation_view  { catId, source: 'page'|'dashboard'|'scenario', gameIds[], scores[], fallback }
recommendation_click { catId, gameId, position, score }
play_start           { catId, gameId, source }
play_complete        { catId, gameId, actualDuration }
feedback_submit      { catId, gameId, score, completion }
```

封装到 `frontend/src/utils/track.ts` 的单一函数 `track(event, payload)`，先用 `console.info('[track]', event, payload)` 占位，等正式埋点 SDK 接入时一处替换。

## 9. 不在范围内（明确）

- 陪玩记录列表页（PRD F5，P1）
- 偏好画像查看页（PRD F6，P1）
- 周报页面（PRD F7，P1）
- 主动提醒（PRD F8/F9，P2）
- 在猫咪编辑页 `/my-cats/:id/edit` 加陪玩字段（推迟到 P1）
- E2E 测试与视觉回归
- 正式埋点 SDK 接入

## 10. 依赖与前置

- 后端 `/api/play/recommend` / `/api/play/feedback` / `/api/cats/:id/play-profile` 已就绪 ✅
- `Cat.personality / energyBaseline / healthTags` 字段在数据库中存在 ✅
- `PlayFeedback` 表：本地 DB 当前缺，需在实施阶段同步（已在 prisma migration 中，需要 baseline + deploy 或 db push）
- 前端无新增 npm 依赖（Element Plus 的 `ElRate` / `ElSlider` / `ElCheckbox` 等都是现成）
- 新增静态资源：`assets/icon/play.png`（沿用项目现有 PNG 图标风格）

## 11. 风险与对策

| 风险 | 对策 |
|---|---|
| 后端 API 在实施期间字段微调 | 类型放 `types/play.ts` 单一来源；联调时优先以后端为准 |
| `Cat.personality` 老用户为空（R103） | 内嵌引导 + 不阻断 Dashboard 其他功能即可 |
| 场景按钮快速切换的竞态 | reqSeq + AbortController 双保险 |
| Dashboard 首屏并发过多 | TodayPlayCard 改为视口懒加载 |
| 反馈 upsert 误覆盖（用户当天玩了两次同游戏） | P0 接受：后端按 `(catId, gameId, playedAt 当天)` 唯一；P1 加多次记录功能时再放宽 |

---

**文档版本**: v1.0
**作者**: 工程团队
**关联**: [PRD v2.0.2](../../01-产品/宠物陪玩功能PRD.md) / [技术设计 v2.0.2](../../02-开发/核心功能/宠物陪玩功能技术设计.md)
