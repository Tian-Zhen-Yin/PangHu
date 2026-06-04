# PangHu UI Health Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Timeline overload (4,035 lines → 6 focused files), unify 3 conflicting gray palettes and 115 wrong-brand-gradient occurrences to the design-system token layer.

**Architecture:** Six-phase incremental surgery. First extend the token layer with missing values, then split Timeline into route-based sub-pages, then systematically replace hardcoded colors file-by-file with verification at each step.

**Tech Stack:** Vue 3.5, TypeScript, Vite 7, Pinia, CSS Custom Properties, vue-router

---

## File Structure

### New Files

| File | Responsibility |
|---|---|
| `views/Timeline/TimelineLayout.vue` | Shared header (mascot + cat selector) + stage timeline + sub-nav tabs |
| `views/Timeline/OverviewTab.vue` | Milestones grid + task preview cards |
| `views/Timeline/TasksTab.vue` | Task checklist with category grouping |
| `views/Timeline/VaccinesTab.vue` | Vaccine schedule + health progress |
| `views/Timeline/GrowthRecords.vue` | Record list + filters + add record modal |
| `composables/useChartColors.ts` | Reads CSS custom properties for ECharts JS configs |

### Modified Files

| File | Change |
|---|---|
| `views/Timeline/index.vue` | Becomes a redirect wrapper (~10 lines) |
| `router/index.ts` | Replace single `/timeline` route with 5 nested routes |
| `styles/color.css` | Add 6 new tokens (primary-medium, primary-dark, bg-block-hover, text-placeholder, bg-warm, bg-cream) |
| `components/cat/WeightTrend.vue` | Replace hardcoded chart colors with `useChartColors()` |
| 27 other Vue files | Replace hardcoded gray/brand/status hex values with tokens |

---

## Phase 1: Token Layer Extension

### Task 1: Add missing design tokens to color.css

**Files:**
- Modify: `frontend/src/styles/color.css:1-68`

- [ ] **Step 1: Add new tokens to `color.css`**

Add these tokens inside the `:root` block, in their respective sections:

Under brand colors section (after `--color-primary-gradient`):
```css
  --color-primary-medium: #FFB88C;         /* medium brand bg, replaces #F4A261 */
  --color-primary-dark: #E06A30;           /* dark brand text, replaces #E76F51/#ea580c */
  --color-primary-gradient-hover: linear-gradient(135deg, #FFB088 0%, #FF8848 100%);
```

Under neutrals section (after `--color-bg-hover`):
```css
  --color-bg-block-hover: #F1F0ED;         /* warm hover state, replaces cool-gray hovers */
  --color-bg-warm: #FAF8F5;                /* warm page bg, consolidates cream tints */
  --color-bg-cream: #FDF3E9;               /* cream accent bg, replaces #FDF3E9/#FFF7ED */
```

Under text section (after `--color-text-light`):
```css
  --color-text-placeholder: #B5B0AB;       /* warm placeholder, replaces #94a3b8/#9CA3AF */
```

Note: These tokens already exist and must NOT be duplicated:
- `--color-primary-light: #FFF4EE` (line 11)
- `--color-success-bg: #E8F8F2` (line 17)
- `--color-warning-bg: #FEF3C7` (line 20)
- `--color-danger-bg: #FEE2E2` (line 23)
- `--color-info-bg: #EEF2FF` (line 29)

- [ ] **Step 2: Verify tokens load without errors**

Run: `cd /Users/yintao/Documents/trae_projects/PangHu/frontend && npx vite build 2>&1 | head -20`
Expected: Build succeeds or shows only the pre-existing Search/index error

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/color.css
git commit -m "feat: add missing design tokens for UI health improvement"
```

---

### Task 2: Create useChartColors composable

**Files:**
- Create: `frontend/src/composables/useChartColors.ts`

- [ ] **Step 1: Create the composable**

```typescript
export function useChartColors() {
  const root = document.documentElement
  const s = getComputedStyle(root)

  function get(name: string): string {
    return s.getPropertyValue(name).trim()
  }

  return {
    primary: get('--color-primary'),
    primaryMedium: get('--color-primary-medium'),
    primaryDark: get('--color-primary-dark'),
    success: get('--color-success'),
    danger: get('--color-danger'),
    warning: get('--color-warning'),
    info: get('--color-info'),
    textPrimary: get('--color-text-primary'),
    textSecondary: get('--color-text-secondary'),
    borderLight: get('--color-border-light'),
    bgPage: get('--color-bg-page'),
    bgCard: get('--color-bg-card'),
  }
}
```

- [ ] **Step 2: Verify types**

Run: `cd /Users/yintao/Documents/trae_projects/PangHu/frontend && npx vue-tsc --noEmit 2>&1 | tail -5`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/composables/useChartColors.ts
git commit -m "feat: add useChartColors composable for ECharts token bridge"
```

---

## Phase 2: Timeline Split

### Task 3: Extract Timeline shared state into composable

**Files:**
- Create: `frontend/src/views/Timeline/composables/useTimelineState.ts`

- [ ] **Step 1: Create the composable**

Extract shared state from `views/Timeline/index.vue` lines 49-58 (stores + refs) and lines 34-47 (type definitions):

```typescript
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCatStore } from '../../../stores/cat'
import { useMyCatStore } from '../../../stores/myCat'
import { useAuthStore } from '../../../stores/auth'
import type { Stage } from '../../../types/cat'

export interface TaskState {
  completed: boolean
  date?: string
  notes?: string
}

export function useTimelineState() {
  const catStore = useCatStore()
  const myCatStore = useMyCatStore()
  const authStore = useAuthStore()
  const { currentCat } = storeToRefs(myCatStore)

  const selectedStage = ref<Stage | null>(null)
  const taskStates = ref<Record<string, TaskState>>({})

  const stages = computed(() => catStore.stages)
  const filteredStages = computed(() => {
    if (!currentCat.value) return stages.value
    const status = currentCat.value.adoptStatus
    if (status === 'adoptedAdult') {
      return stages.value.filter(s => s.minAgeWeeks >= 52)
    }
    return stages.value
  })

  const pageSubtitle = computed(() => {
    if (!currentCat.value) return '选择一只猫咪开始记录'
    const status = currentCat.value.adoptStatus
    switch (status) {
      case 'raisedFromBaby': return '从幼猫开始，记录每一步成长'
      case 'adoptedYoung': return '从接回家开始，记录每一步成长'
      case 'adoptedAdult': return '成猫也可以有新的成长记录'
      default: return '记录猫咪的每一个成长瞬间'
    }
  })

  const taskProgress = computed(() => {
    if (!selectedStage.value?.tasks) return { total: 0, completed: 0, percentage: 0 }
    const tasks = selectedStage.value.tasks
    const completed = tasks.filter(t => taskStates.value[t.id]?.completed).length
    return {
      total: tasks.length,
      completed,
      percentage: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
    }
  })

  function loadTaskStates(catId: string) {
    try {
      const saved = localStorage.getItem(`task-states-${catId}`)
      if (saved) taskStates.value = JSON.parse(saved)
    } catch { taskStates.value = {} }
  }

  function saveTaskStates(catId: string) {
    localStorage.setItem(`task-states-${catId}`, JSON.stringify(taskStates.value))
  }

  function toggleTask(taskId: string, catId: string) {
    const current = taskStates.value[taskId]
    taskStates.value = {
      ...taskStates.value,
      [taskId]: { completed: !current?.completed }
    }
    saveTaskStates(catId)
  }

  function completeTask(taskId: string, catId: string, date: string, notes: string) {
    taskStates.value = {
      ...taskStates.value,
      [taskId]: { completed: true, date, notes }
    }
    saveTaskStates(catId)
  }

  return {
    catStore,
    myCatStore,
    authStore,
    currentCat,
    selectedStage,
    stages,
    filteredStages,
    pageSubtitle,
    taskStates,
    taskProgress,
    loadTaskStates,
    saveTaskStates,
    toggleTask,
    completeTask,
  }
}
```

Also extract the `sectionIcons` constant (lines 18-31 of original) into a sibling file `frontend/src/views/Timeline/composables/sectionIcons.ts`:

```typescript
export const sectionIcons: Record<string, string> = {
  milestone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2z"/></svg>',
  task: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
  health: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  feeding: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><path d="M6 1v3"/><path d="M10 1v3"/><path d="M14 1v3"/></svg>',
  training: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>',
  care: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 015 5c0 5-5 10-5 10s-5-5-5-10a5 5 0 015-5z"/><path d="M12 8a2 2 0 110 4 2 2 0 010-4z"/></svg>',
  vaccine: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2h6a2 2 0 012 2v2a2 2 0 01-2 2H9a2 2 0 01-2-2V4a2 2 0 012-2z"/><path d="M9 10V6a3 3 0 016 0v4"/><path d="M12 14v4"/><path d="M10 16h4"/></svg>',
  deworm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>',
  free: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  celebration: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/></svg>',
  daily: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>',
}
```

- [ ] **Step 2: Verify types**

Run: `cd /Users/yintao/Documents/trae_projects/PangHu/frontend && npx vue-tsc --noEmit 2>&1 | tail -5`
Expected: No new errors related to these files

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/Timeline/composables/useTimelineState.ts frontend/src/views/Timeline/composables/sectionIcons.ts
git commit -m "refactor: extract Timeline shared state into composable"
```

---

### Task 4: Create TimelineLayout.vue

**Files:**
- Create: `frontend/src/views/Timeline/TimelineLayout.vue`

- [ ] **Step 1: Create the layout component**

This wraps the shared header + stage timeline + sub-nav tabs extracted from original lines 610-699. The child route content renders via `<router-view />`.

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MascotCharacter from '../../components/mascot/MascotCharacter.vue'
import CatSelector from '../../components/cat/CatSelector.vue'
import HorizontalStageTimeline from '../../components/growth/HorizontalStageTimeline.vue'
import { useTimelineState } from './composables/useTimelineState'
import { usePetStore } from '../../stores/pet'

const route = useRoute()
const petStore = usePetStore()
const {
  authStore,
  currentCat,
  selectedStage,
  filteredStages,
  pageSubtitle,
  taskProgress,
} = useTimelineState()

const activeTab = computed(() => {
  const path = route.path
  if (path.includes('/tasks')) return 'tasks'
  if (path.includes('/vaccines')) return 'vaccines'
  if (path.includes('/growth')) return 'growth'
  return 'overview'
})
</script>

<template>
  <div class="timeline-page">
    <div class="timeline-header-compact" v-if="authStore.isAuthenticated">
      <div class="header-left">
        <div class="title-group">
          <MascotCharacter expression="default" size="small" :animated="false" class="title-mascot" />
          <div class="title-text">
            <h1 class="page-title">{{ currentCat?.timelineTitle || '猫咪养成时间线' }}</h1>
            <p class="page-subtitle">{{ pageSubtitle }}</p>
          </div>
        </div>
      </div>
      <div class="header-right">
        <CatSelector />
      </div>
    </div>

    <div class="page-header" v-else>
      <h1 class="page-title">
        <MascotCharacter expression="default" size="small" :animated="false" class="title-mascot" />
        {{ currentCat?.timelineTitle || '猫咪养成时间线' }}
      </h1>
      <p class="page-subtitle">{{ pageSubtitle }}</p>
    </div>

    <div class="timeline-container">
      <HorizontalStageTimeline v-model="selectedStage" :stages="filteredStages" />

      <div class="premium-tabs-container" v-if="selectedStage">
        <router-link to="/timeline/overview" class="tab-btn" :class="{ 'is-active': activeTab === 'overview' }">
          <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span class="tab-text">概览</span>
        </router-link>

        <router-link to="/timeline/tasks" class="tab-btn" :class="{ 'is-active': activeTab === 'tasks' }">
          <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span class="tab-text">任务清单</span>
          <span v-if="taskProgress.total > 0" class="tab-badge">{{ taskProgress.completed }}/{{ taskProgress.total }}</span>
        </router-link>

        <router-link to="/timeline/vaccines" class="tab-btn" :class="{ 'is-active': activeTab === 'vaccines' }">
          <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <span class="tab-text">疫苗接种</span>
          <span v-if="selectedStage?.vaccines?.length" class="tab-badge warning">{{ selectedStage.vaccines.length }}</span>
        </router-link>

        <router-link to="/timeline/growth" class="tab-btn" :class="{ 'is-active': activeTab === 'growth' }">
          <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="tab-text">成长记录</span>
        </router-link>
      </div>

      <router-view />
    </div>
  </div>
</template>
```

The `<style scoped>` block must include the shared CSS from the original file: `.timeline-page`, `.timeline-header-compact`, `.header-left`, `.header-right`, `.title-group`, `.page-title`, `.page-subtitle`, `.timeline-container`, `.premium-tabs-container`, `.tab-btn`, `.tab-icon`, `.tab-text`, `.tab-badge` rules. Copy these verbatim from the original `index.vue` `<style>` section. They will be migrated to tokens in Phase 3-5.

- [ ] **Step 2: Verify build**

Run: `cd /Users/yintao/Documents/trae_projects/PangHu/frontend && npx vue-tsc --noEmit 2>&1 | tail -5`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/Timeline/TimelineLayout.vue
git commit -m "refactor: create TimelineLayout with shared header and route-driven tabs"
```

---

### Task 5: Extract tab pages from index.vue

**Files:**
- Create: `frontend/src/views/Timeline/OverviewTab.vue`
- Create: `frontend/src/views/Timeline/TasksTab.vue`
- Create: `frontend/src/views/Timeline/VaccinesTab.vue`
- Create: `frontend/src/views/Timeline/GrowthRecords.vue`

- [ ] **Step 1: Create OverviewTab.vue**

Extract template from original lines 702-785. Script imports `useTimelineState` and renders milestones grid + task preview cards. Copy the exact template markup and relevant styles verbatim from the original.

```vue
<script setup lang="ts">
import { useTimelineState } from './composables/useTimelineState'
import { sectionIcons } from './composables/sectionIcons'

const { selectedStage, taskProgress, taskStates } = useTimelineState()
</script>

<template>
  <!-- Copy verbatim from original lines 702-785 -->
  <!-- Includes: milestones-section, milestones-grid, milestone-premium-card -->
  <!-- Includes: task-preview-section with top 3 tasks -->
  <div class="tab-content" v-if="selectedStage">
    <section class="milestones-section" v-if="selectedStage.milestones && selectedStage.milestones.length > 0">
      <!-- milestone markup from original -->
    </section>
    <section class="task-preview-section" v-if="selectedStage.tasks && selectedStage.tasks.length > 0">
      <!-- task preview markup from original -->
    </section>
  </div>
</template>
```

Copy the `.tab-content`, `.milestones-section`, `.milestones-grid`, `.milestone-premium-card`, `.task-preview-section` styles from the original file's `<style scoped>`.

- [ ] **Step 2: Create TasksTab.vue**

Extract template from original lines 788-870. Contains task checklist organized by category (health/feeding/training/care), progress bar, task completion modal with date picker and notes.

State used: `taskStates`, `taskProgress`, `toggleTask()`, `completeTask()`, `showTaskModal`, `currentTask`, `taskCompletionDate`, `taskNotes`.

Copy the task-category CSS, progress bar styles, task card styles, and modal styles from the original.

- [ ] **Step 3: Create VaccinesTab.vue**

Extract template from original lines 872-941. Contains health progress card with mascot expression tied to progress, vertical vaccine timeline with done/pending status, medical tips.

Copy vaccine-related styles from the original.

- [ ] **Step 4: Create GrowthRecords.vue**

Extract template from original lines 943-1184. This is the largest extraction (~600 lines with styles). Contains:

State to move into this component (from original lines 60-100):
- `showAddRecordModal`, `recordPhotoFiles`, `recordPhotoPreviews`, `recordType`, `isAdoptionDay`
- `recordForm`, `recordFilter`, `showFilterMenu`
- `startDate`, `endDate`, `selectedDatePreset`, `showDateFilterMenu`
- All record CRUD functions (`addRecord`, `deleteRecord`, photo upload handlers)

Copy all record-related styles: `.record-filter`, `.date-filter`, `.add-record-modal`, `.record-list`, `.month-group`, `.record-card`, photo upload styles, form styles.

- [ ] **Step 5: Verify build**

Run: `cd /Users/yintao/Documents/trae_projects/PangHu/frontend && npx vue-tsc --noEmit 2>&1 | tail -10`
Expected: No new errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/Timeline/OverviewTab.vue frontend/src/views/Timeline/TasksTab.vue frontend/src/views/Timeline/VaccinesTab.vue frontend/src/views/Timeline/GrowthRecords.vue
git commit -m "refactor: extract Timeline into 4 route-based tab pages"
```

---

### Task 6: Update router and convert index.vue to redirect

**Files:**
- Modify: `frontend/src/router/index.ts:19-23`
- Modify: `frontend/src/views/Timeline/index.vue` (replace entire file)

- [ ] **Step 1: Replace the timeline route in router**

In `router/index.ts`, replace lines 19-23 (the single timeline route) with:

```typescript
  {
    path: '/timeline',
    component: () => import('../views/Timeline/TimelineLayout.vue'),
    children: [
      { path: '', redirect: '/timeline/overview' },
      {
        path: 'overview',
        name: 'TimelineOverview',
        component: () => import('../views/Timeline/OverviewTab.vue'),
        meta: { title: '养成时间线 - 哈吉咪养成计划' }
      },
      {
        path: 'tasks',
        name: 'TimelineTasks',
        component: () => import('../views/Timeline/TasksTab.vue'),
        meta: { title: '任务清单 - 哈吉咪养成计划' }
      },
      {
        path: 'vaccines',
        name: 'TimelineVaccines',
        component: () => import('../views/Timeline/VaccinesTab.vue'),
        meta: { title: '疫苗接种 - 哈吉咪养成计划' }
      },
      {
        path: 'growth',
        name: 'TimelineGrowth',
        component: () => import('../views/Timeline/GrowthRecords.vue'),
        meta: { title: '成长记录 - 哈吉咪养成计划' }
      }
    ]
  },
```

- [ ] **Step 2: Verify dev server loads timeline**

Run: `cd /Users/yintao/Documents/trae_projects/PangHu/frontend && npx vite --port 5174 &`
Visit `http://localhost:5174/timeline` — should redirect to `/timeline/overview` and render the split pages.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/router/index.ts
git commit -m "refactor: convert Timeline to nested route structure with 4 sub-pages"
```

---

## Phase 3: Gray Palette Unification

### Task 7: Replace hardcoded grays across all files

**Files:**
- Modify: ~29 Vue files in `frontend/src/`

- [ ] **Step 1: Replace heading/strong text grays**

Search and replace across all `.vue` files:
- `#1e293b` → `var(--color-text-primary)`
- `#374151` → `var(--color-text-primary)`
- `#334155` → `var(--color-text-primary)`

Run first to identify scope: `grep -rl '#1e293b\|#374151\|#334155' src/ --include='*.vue'`

Process each file using the Edit tool. Use `replace_all: true` within each file.

- [ ] **Step 2: Replace body/label text grays**

- `#475569` → `var(--color-text-regular)`
- `#4B5563` → `var(--color-text-regular)`
- `#64748b` → `var(--color-text-regular)`
- `#6B7280` → `var(--color-text-regular)`

- [ ] **Step 3: Replace muted/hint text grays**

- `#94a3b8` → `var(--color-text-placeholder)`
- `#9CA3AF` → `var(--color-text-placeholder)`
- `#D1D5DB` → `var(--color-text-secondary)`

- [ ] **Step 4: Replace border grays**

- `#cbd5e1` → `var(--color-border-light)`
- `#e2e8f0` → `var(--color-border-light)`
- `#E5E7EB` → `var(--color-border-light)`

- [ ] **Step 5: Replace background grays**

- `#f1f5f9` → `var(--color-bg-block-hover)`
- `#F3F4F6` → `var(--color-bg-block-hover)`
- `#F9FAFB` → `var(--color-bg-page)`
- `#f8fafc` → `var(--color-bg-page)`

- [ ] **Step 6: Verify build**

Run: `cd /Users/yintao/Documents/trae_projects/PangHu/frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "style: unify gray palette to design-system warm gray tokens across 29 files"
```

---

## Phase 4: Brand Gradient Unification

### Task 8: Replace #F4A261/#E76F51 with token references

**Files:**
- Modify: 14 Vue files

- [ ] **Step 1: Replace #F4A261**

Context-dependent replacement:
- **Background** (`background: #F4A261`) → `var(--color-primary-medium)`
- **Border** (`border-color: #F4A261`, `border: ... solid #F4A261`) → `var(--color-primary-medium)`
- **Text** (`color: #F4A261`) → `var(--color-primary)`
- **Gradient** (`#F4A261...#E76F51`) → `var(--color-primary-gradient)`

Heaviest files to process first:
1. `views/Guides/index.vue` (21 occurrences)
2. Timeline split files (originally 24)
3. `views/Guides/Detail.vue` (9)
4. `views/AIChat/components/ChatMessage.vue` (9)

- [ ] **Step 2: Replace #E76F51**

All → `var(--color-primary-dark)` for text/border, `var(--color-primary)` for accent usage.

Run: `grep -rn '#E76F51' src/ --include='*.vue'` to find all 22 occurrences.

- [ ] **Step 3: Replace #f97316 and #ea580c**

- `#f97316` → `var(--color-primary)` (Profile, TemplateDetail)
- `#ea580c` → `var(--color-primary-dark)` (Profile, TemplateDetail)

- [ ] **Step 4: Replace misc brand oranges and integrate useChartColors**

- `#FB923C` → `var(--color-primary)`
- `#f5a623` and `#ff7f50` in WeightTrend ECharts → replace via `useChartColors()`:

In `WeightTrend.vue`, add:
```typescript
import { useChartColors } from '../../composables/useChartColors'
const chartColors = useChartColors()
```
Then replace `'#f5a623'` with `chartColors.primary` and `'#ff7f50'` with `chartColors.primaryDark` in the ECharts option objects.

- [ ] **Step 5: Verify build**

Run: `cd /Users/yintao/Documents/trae_projects/PangHu/frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "style: unify brand gradient to design-system primary tokens across 14 files"
```

---

## Phase 5: Status & Cream Migration

### Task 9: Replace hardcoded status colors and consolidate cream tints

**Files:**
- Modify: ~15 Vue files

- [ ] **Step 1: Replace success greens**

- `#22C55E` → `var(--color-success)`
- `#16a34a` → `var(--color-success)`
- `#52c41a` → `var(--color-success)` (ECharts — use `chartColors.success`)

- [ ] **Step 2: Replace danger reds**

- `#ef4444` → `var(--color-danger)`
- `#dc2626` → `var(--color-danger)`

- [ ] **Step 3: Replace warning yellows**

- `#d97706` → `var(--color-warning)`
- `#faad14` → `var(--color-warning)` (ECharts — use `chartColors.warning`)
- `#eab308` → `var(--color-warning)`

- [ ] **Step 4: Replace info blues**

- `#3B82F6` → `var(--color-info)`
- `#2563EB` → `var(--color-info)`

- [ ] **Step 5: Consolidate cream tints**

- `#FAF8F5`, `#FFFBF7`, `#FFF9F0`, `#FFF9F5`, `#FFFBF8` → `var(--color-bg-warm)`
- `#FDF3E9`, `#FFF7ED` → `var(--color-bg-cream)`
- `#FED7AA` → `var(--color-primary-medium)` (light orange, not cream)

- [ ] **Step 6: Verify build**

Run: `cd /Users/yintao/Documents/trae_projects/PangHu/frontend && npx vite build 2>&1 | tail -5`

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "style: replace hardcoded status and cream colors with design tokens"
```

---

### Task 10: Visual verification and final count

**Files:**
- All modified files

- [ ] **Step 1: Start dev server and verify key pages**

Run: `cd /Users/yintao/Documents/trae_projects/PangHu/frontend && npx vite --port 5174`

Verify each page loads without console errors:
1. `/timeline` → redirects to `/timeline/overview`
2. `/timeline/tasks` — task checklist
3. `/timeline/vaccines` — vaccine schedule
4. `/timeline/growth` — records + add modal
5. `/` — Dashboard still works
6. `/guides` — brand colors unified
7. `/profile` — gray palette unified

- [ ] **Step 2: Count remaining hardcoded colors**

Run: `cd /Users/yintao/Documents/trae_projects/PangHu/frontend && grep -roh '#[0-9a-fA-F]\{6\}' src/ --include='*.vue' | sort | uniq -c | sort -rn | head -20`

Expected: Significant reduction from 1,245. Remaining should be domain-specific (task category colors, celebration gradient, mascot colors) which are acceptable per spec.

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: visual verification cleanup after UI health improvement"
```
