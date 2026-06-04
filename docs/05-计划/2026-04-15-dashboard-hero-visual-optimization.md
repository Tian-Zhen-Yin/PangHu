# Dashboard Hero Card Visual Optimization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Dashboard hero card from a left-right split layout to a unified full-width three-layer layout, remove dead CSS, and migrate hardcoded colors to CSS variables.

**Architecture:** Single-file change to `DashboardPage.vue`. Template restructures from `hero-left`/`hero-right` split into `profile-bar` → `actions-row` → `data-grid` horizontal layers. All hero CSS rewritten; dead `.health-overview-card` CSS removed.

**Tech Stack:** Vue 3 SFC (template + scoped CSS), no test framework — visual verification only.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/src/modules/dashboard/pages/DashboardPage.vue` | Modify | Hero card template + CSS restructure, dead CSS removal |

No new files. No other files touched.

---

### Task 1: Remove Dead CSS

**Files:**
- Modify: `frontend/src/modules/dashboard/pages/DashboardPage.vue` (CSS section only)

Remove all `.health-overview-card` CSS rules (47 occurrences). These rules are never referenced in the template — they are leftover from a previous design iteration.

- [ ] **Step 1: Remove `.health-overview-card` desktop rules (lines ~1157-1424)**

Delete the entire block from line 1157 (`/* 健康概览卡片 - 新版通栏布局 */`) through line 1424 (end of `.inline-action-btn svg`). This is approximately 270 lines of dead CSS.

- [ ] **Step 2: Remove `.health-overview-card` mobile rules (lines ~1860-1880)**

Within the `@media (max-width: 640px)` block, delete the `.health-overview-card` responsive rules:

```css
/* DELETE these lines inside @media (max-width: 640px): */
  .health-overview-card {
    padding: 16px;
    border-radius: 16px;
  }

  .health-overview-card .data-split {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .health-overview-card .divider {
    display: none;
  }

  .health-overview-card .weight-block .num {
    font-size: 24px;
  }

  .health-overview-card .weight-block .sparkline-container {
    height: 28px;
  }
```

- [ ] **Step 3: Verify app still loads**

Run: `cd /Users/yintao/Documents/trae_projects/PangHu/frontend && npm run build`
Expected: Build succeeds (dead CSS removal cannot break runtime)

- [ ] **Step 4: Commit**

```bash
cd /Users/yintao/Documents/trae_projects/PangHu
git add frontend/src/modules/dashboard/pages/DashboardPage.vue
git commit -m "refactor(dashboard): remove dead .health-overview-card CSS rules"
```

---

### Task 2: Restructure Hero Template

**Files:**
- Modify: `frontend/src/modules/dashboard/pages/DashboardPage.vue` (template section, lines ~317-415)

Replace the hero card template from `<!-- 1. Hero Card -->` through the closing `</section>` with the new three-layer structure.

- [ ] **Step 1: Replace hero card template section**

Find the section starting with `<!-- 1. Hero Card: 主视图 - 融合猫咪档案与健康概览 -->` and ending with the matching `</section>` (line ~415). Replace the entire block with:

```html
        <!-- 1. Hero Card: 主视图 - 统一通栏布局 -->
        <section class="hero-card">
          <!-- 装饰背景 -->
          <div class="hero-decor"></div>

          <div class="hero-content">
            <!-- Layer 1: 身份栏 -->
            <div class="profile-bar">
              <div class="cat-profile">
                <div class="profile-avatar">
                  <img
                    v-if="catStore.currentCat.avatarData || catStore.currentCat.avatar"
                    :src="getCatAvatarUrl(catStore.currentCat)"
                    :alt="catStore.currentCat.name"
                  />
                  <div v-else class="avatar-placeholder">
                    {{ catStore.currentCat.name?.charAt(0) || '?' }}
                  </div>
                </div>
                <div class="profile-info">
                  <div class="profile-name-row">
                    <h2 class="profile-name">{{ catStore.currentCat.name }}</h2>
                    <span class="current-badge">当前</span>
                  </div>
                  <p class="profile-meta">{{ getAgeText(catStore.currentCat) }} · {{ catStore.currentCat.weight || '--' }}kg</p>
                </div>
              </div>
              <!-- 桌面端：健康状态（嵌入身份栏右侧） -->
              <div class="status-pill" @click="goToAIChat">
                <span v-if="healthAnalysis?.weightAdvice?.status === 'normal'" class="status-dot normal"></span>
                <span v-else-if="healthAnalysis?.weightAdvice?.status" class="status-dot warning"></span>
                <span v-else class="status-dot neutral"></span>
                <span v-if="healthAnalysis?.weightAdvice?.status === 'normal'" class="status-text normal">体型正常</span>
                <span v-else-if="healthAnalysis?.weightAdvice?.status" class="status-text warning">需关注</span>
                <span v-else class="status-text neutral">点击咨询</span>
                <span class="status-divider"></span>
                <span class="status-desc">{{ healthAnalysis?.generalAdvice || `${catStore.currentCat.name}最近状态很棒，继续保持哦！` }}</span>
              </div>
            </div>

            <!-- Layer 2: 快捷操作 -->
            <div class="actions-row">
              <button class="hero-action-btn primary" @click="addRecord">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                记一笔
              </button>
              <button class="hero-action-btn secondary" @click="goToAIChat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                AI 咨询
              </button>
            </div>

            <!-- 移动端：独立状态 Banner -->
            <div class="status-banner-mobile" @click="goToAIChat">
              <span v-if="healthAnalysis?.weightAdvice?.status === 'normal'" class="status-dot normal"></span>
              <span v-else-if="healthAnalysis?.weightAdvice?.status" class="status-dot warning"></span>
              <span v-else class="status-dot neutral"></span>
              <span v-if="healthAnalysis?.weightAdvice?.status === 'normal'" class="status-text normal">体型正常</span>
              <span v-else-if="healthAnalysis?.weightAdvice?.status" class="status-text warning">需关注</span>
              <span v-else class="status-text neutral">点击咨询</span>
              <span class="status-divider"></span>
              <span class="status-desc">{{ healthAnalysis?.generalAdvice || `${catStore.currentCat.name}最近状态很棒，继续保持哦！` }}</span>
            </div>

            <!-- Layer 3: 数据网格 -->
            <div class="data-grid">
              <!-- 体重仪表盘 -->
              <div class="data-item gauge-card">
                <div class="gauge-header">
                  <span class="data-label">当前体重</span>
                  <span v-if="weightAnalysis" class="standard-range">标准: {{ weightAnalysis.min }}-{{ weightAnalysis.max }}kg</span>
                </div>
                <div class="gauge-container">
                  <WeightGauge
                    :value="catStore.currentCat.weight || 0"
                    :min="weightAnalysis?.min || 1.5"
                    :max="weightAnalysis?.max || 5.0"
                    :standard-min="weightAnalysis?.min || 2.5"
                    :standard-max="weightAnalysis?.max || 4.0"
                  />
                </div>
              </div>

              <!-- 近期待办 -->
              <div class="data-item todos-card">
                <span class="data-label">近期待办</span>
                <div class="todos-list">
                  <label v-for="todo in reminders.slice(0, 3)" :key="todo.id" class="todo-item">
                    <input type="checkbox" class="todo-checkbox" />
                    <div class="todo-content">
                      <span class="todo-title">{{ todo.title }}</span>
                      <span v-if="todo.urgency === 'high'" class="todo-date urgent">{{ todo.description }}</span>
                      <span v-else class="todo-date">{{ todo.description }}</span>
                    </div>
                  </label>
                  <div v-if="reminders.length === 0" class="todos-empty">
                    <span class="todo-checkbox done"></span>
                    <span class="todo-text">暂无待办</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
```

Key structural changes:
- `hero-left` + `hero-right` → `profile-bar` + `actions-row` + `status-banner-mobile` + `data-grid`
- Status banner split: `.status-pill` (desktop, inside profile bar) + `.status-banner-mobile` (mobile only)
- `data-grid` is now a direct child of `hero-content`, no longer nested inside `hero-right`
- All data bindings, event handlers, and component props remain identical

- [ ] **Step 2: Verify build**

Run: `cd /Users/yintao/Documents/trae_projects/PangHu/frontend && npm run build`
Expected: Build succeeds. Template references unchanged — no logic changes.

---

### Task 3: Rewrite Hero CSS

**Files:**
- Modify: `frontend/src/modules/dashboard/pages/DashboardPage.vue` (CSS section)

Replace the old hero card CSS block (from `/* Hero Card 主视图 */` through the end of `/* 待办卡片 */`) with the new layer-based CSS. Also remove the old `status-banner` styles (replaced by `status-pill` + `status-banner-mobile`).

- [ ] **Step 1: Replace the hero card CSS block**

Find and replace the CSS from `/* Hero Card 主视图 */` (line ~625) through the end of the `.hero-right` related styles (up to but not including `/* 其他家庭成员网格 */` at line ~1032). Replace with:

```css
/* Hero Card - 统一通栏布局 */
.hero-card {
  position: relative;
  background: var(--color-bg-card);
  border-radius: 20px;
  padding: 24px;
  box-shadow: var(--shadow-card-normal);
  overflow: hidden;
}

.hero-decor {
  position: absolute;
  right: -20px;
  top: -20px;
  width: 160px;
  height: 160px;
  background: linear-gradient(135deg, var(--color-primary-light) 0%, rgba(255, 138, 76, 0.1) 100%);
  border-radius: 50%;
  filter: blur(40px);
  pointer-events: none;
}

.hero-content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Layer 1: 身份栏 */
.profile-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--color-border-light);
}

.cat-profile {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--color-primary-light);
  flex-shrink: 0;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar .avatar-placeholder {
  width: 100%;
  height: 100%;
  background: var(--color-primary-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-white);
  font-size: 28px;
  font-weight: 700;
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.profile-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.profile-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.current-badge {
  font-size: 10px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  padding: 3px 10px;
  border-radius: 100px;
  font-weight: 600;
}

.profile-meta {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 6px 0 0 0;
}

/* 桌面端健康状态 Pill（身份栏右侧） */
.status-pill {
  display: none; /* hidden on mobile */
}

@media (min-width: 768px) {
  .status-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    background: var(--color-success-bg);
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.2s ease;
    flex-shrink: 0;
  }

  .status-pill:hover {
    background: var(--color-success-light);
  }
}

/* 移动端独立状态 Banner */
.status-banner-mobile {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-success-bg);
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.status-banner-mobile:hover {
  background: var(--color-success-light);
}

@media (min-width: 768px) {
  .status-banner-mobile {
    display: none; /* hidden on desktop */
  }
}

/* 状态指示点 */
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.normal {
  background: var(--color-success);
}

.status-dot.warning {
  background: var(--color-warning);
}

.status-dot.neutral {
  background: var(--color-border);
}

.status-text {
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.status-text.normal {
  color: #059669;
}

.status-text.warning {
  color: #d97706;
}

.status-text.neutral {
  color: var(--color-text-secondary);
}

.status-divider {
  width: 1px;
  height: 12px;
  background: var(--color-success-light);
  flex-shrink: 0;
}

.status-desc {
  font-size: 11px;
  color: #047857;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

/* Layer 2: 快捷操作 */
.actions-row {
  display: flex;
  gap: 10px;
}

.hero-action-btn {
  flex: 1;
  max-width: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 11px 20px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hero-action-btn svg {
  width: 16px;
  height: 16px;
}

.hero-action-btn.primary {
  background: var(--color-primary-gradient);
  color: var(--color-text-white);
  border: none;
  box-shadow: var(--shadow-primary-btn);
}

.hero-action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 138, 76, 0.35);
}

.hero-action-btn.secondary {
  background: var(--color-bg-block);
  color: var(--color-text-secondary);
  border: 1.5px solid var(--color-border-light);
}

.hero-action-btn.secondary:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* Layer 3: 数据网格 */
.data-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.data-item {
  background: var(--color-bg-block);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.data-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* 体重仪表盘卡片 */
.gauge-card {
  min-height: 140px;
}

.gauge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.standard-range {
  font-size: 10px;
  color: var(--color-text-light);
  background: var(--color-bg-card);
  padding: 2px 8px;
  border-radius: 100px;
  border: 1px solid var(--color-border-light);
}

.gauge-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
}

/* 待办卡片 */
.todos-card {
  min-height: 140px;
}

.todos-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.todo-item:hover {
  background: var(--color-bg-card);
}

.todo-item input[type="checkbox"] {
  margin-top: 2px;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid var(--color-border-light);
  accent-color: var(--color-primary);
  flex-shrink: 0;
}

.todo-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.todo-title {
  font-size: 13px;
  color: var(--color-text-primary);
  font-weight: 500;
}

.todo-date {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.todo-date.urgent {
  color: var(--color-warning);
  font-weight: 500;
}

.todos-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.todos-empty .todo-checkbox {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-success);
  background: var(--color-success);
  border-radius: 4px;
  position: relative;
}

.todos-empty .todo-checkbox::after {
  content: '\2713';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--color-text-white);
  font-size: 10px;
  font-weight: bold;
}

/* Hero Card 响应式 */
@media (max-width: 767px) {
  .hero-card {
    padding: 16px;
    border-radius: 16px;
  }

  .profile-bar {
    padding-bottom: 14px;
  }

  .profile-avatar {
    width: 52px;
    height: 52px;
  }

  .profile-name {
    font-size: 18px;
  }

  .actions-row {
    gap: 8px;
  }

  .hero-action-btn {
    max-width: none; /* full width on mobile */
    padding: 9px 16px;
    border-radius: 10px;
  }

  .data-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
```

Key CSS changes:
- **Removed:** `.hero-left`, `.hero-right`, old `.hero-content` flex-direction rules, old `.status-banner`, desktop `@media (min-width: 768px)` split rules
- **Added:** `.profile-bar` (full-width row), `.status-pill` (desktop only), `.status-banner-mobile` (mobile only), `.actions-row`
- **Kept:** `.data-grid`, `.data-item`, `.gauge-card`, `.todos-card` with CSS variable migration
- **Migrated colors:** All hardcoded hex values replaced with `var(--color-*)` tokens
- **Responsive:** New `@media (max-width: 767px)` block for hero card, data grid stacks to single column on mobile

- [ ] **Step 2: Remove old mobile hero CSS that no longer applies**

In the existing `@media (max-width: 640px)` block, remove any remaining old hero-related rules that reference deleted classes (`.hero-left`, `.hero-right`, old `.status-banner` patterns). Keep all non-hero rules (timeline, FAB button, etc.) unchanged.

- [ ] **Step 3: Verify build**

Run: `cd /Users/yintao/Documents/trae_projects/PangHu/frontend && npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /Users/yintao/Documents/trae_projects/PangHu
git add frontend/src/modules/dashboard/pages/DashboardPage.vue
git commit -m "feat(dashboard): restructure hero card to unified full-width layout"
```

---

### Task 4: Visual Verification

- [ ] **Step 1: Start dev server**

Run: `cd /Users/yintao/Documents/trae_projects/PangHu/frontend && npm run dev`

- [ ] **Step 2: Verify desktop layout**

Open browser at the dev server URL. Log in and navigate to Dashboard. Verify:
- Profile bar displays horizontally: avatar + name + badge + status pill (right side)
- Actions row has two properly styled buttons
- Data grid shows weight gauge (left) and todos (right) side by side
- Decorative glow still visible in top-right corner
- No visual regressions in other-cats section or timeline section

- [ ] **Step 3: Verify mobile layout**

Resize browser to < 768px or use device emulator. Verify:
- Profile bar shows avatar + name + badge (no status pill)
- Status banner appears as standalone green bar below actions
- Data grid stacks vertically: gauge on top, todos below
- All touch targets are adequate size
- No horizontal overflow

- [ ] **Step 4: Verify edge cases**

- Cat with no avatar (shows initial placeholder)
- No health analysis data (shows neutral "点击咨询" status)
- No reminders (shows "暂无待办" empty state)
- Multiple cats in the other-cats section still display correctly
