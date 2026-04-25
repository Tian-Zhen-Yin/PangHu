# PangHu UI Health Improvement Design

**Date:** 2026-04-22
**Approach:** A — Incremental Surgery
**Scope:** Timeline split, gray palette unification, brand gradient unification, token migration

---

## Problem Statement

The PangHu frontend has three systemic UI issues:

1. **Timeline overloaded** — `views/Timeline/index.vue` is 4,035 lines, handling 4 distinct responsibilities (overview, tasks, vaccines, growth records) in a single file with tab-based local state
2. **Three conflicting gray palettes** — 238 hardcoded gray values across 29 files using Tailwind grays (103), Slate grays (135), and design-system warm grays (effectively unused)
3. **Brand gradient inconsistency** — 115 occurrences of non-token `#F4A261`/`#E76F51` across 14 files, while the design system defines `#FF8A4C` as `--color-primary`
4. **1,245+ total hardcoded colors** across 52 Vue files, with the top 5 files accounting for ~520 occurrences

---

## Design Section 1: Timeline Split

### Current State

- Single file: `views/Timeline/index.vue` (4,035 lines)
- Four tabs controlled by `activeTab` local state: `overview | tasks | vaccines | growth`
- All templates, logic, and styles in one SFC

### Target Structure

```
views/Timeline/
├── index.vue              (~200 lines) — redirect to /timeline/overview
├── TimelineLayout.vue     (~150 lines) — shared header + cat selector + stage timeline + sub-nav
├── OverviewTab.vue        (~300 lines) — milestones grid + task preview cards
├── TasksTab.vue           (~400 lines) — task checklist with categories (health/feeding/training/care)
├── VaccinesTab.vue        (~350 lines) — vaccine schedule + health progress card
└── GrowthRecords.vue      (~600 lines) — record list + filters + add record modal
```

### Routes

```typescript
{ path: '/timeline',           redirect: '/timeline/overview' }
{ path: '/timeline/overview',  component: OverviewTab }
{ path: '/timeline/tasks',     component: TasksTab }
{ path: '/timeline/vaccines',  component: VaccinesTab }
{ path: '/timeline/growth',    component: GrowthRecords }
```

All routes nested under `TimelineLayout` which provides shared header.

### Shared State

Create `composables/useTimelineState.ts`:
- `selectedCat` — current cat selection
- `currentStage` — active growth stage
- `stages` — fetched stage data
- Sourced from existing `useCatStore` and `usePetStore`

### Component Reuse

Existing components remain unchanged:
- `HorizontalStageTimeline` — used in TimelineLayout
- `MilestoneCard` — used in OverviewTab
- `MascotCharacter` — used in TimelineLayout header
- `CatSelector` — used in TimelineLayout header

### Record Creation

The add-record modal stays inside `GrowthRecords.vue` — it's only used in the growth records tab. No extraction needed.

---

## Design Section 2: Gray Palette Unification

### Mapping Table

Replace all Tailwind and Slate grays with design-system warm gray tokens:

| Hardcoded values | Role | Token replacement |
|---|---|---|
| `#1e293b`, `#374151` | Headings / strong text | `--color-text-primary` |
| `#475569`, `#4B5563`, `#64748b`, `#6B7280` | Body / label text | `--color-text-regular` |
| `#94a3b8`, `#9CA3AF`, `#D1D5DB` | Muted / hint text | `--color-text-secondary` |
| `#cbd5e1`, `#e2e8f0`, `#E5E7EB` | Borders | `--color-border-light` |
| `#f1f5f9`, `#F3F4F6`, `#F9FAFB`, `#f8fafc` | Backgrounds | `--color-bg-page` |

### New Tokens

Add to `color.css`:
```css
--color-bg-block-hover: #F1F0ED;    /* warm gray hover, replaces #f1f5f9/#F3F4F6 */
--color-text-placeholder: #B5B0AB;  /* warm placeholder, replaces #94a3b8/#9CA3AF */
```

### Scope

- 29 files, ~238 replacements
- Execution: file-by-file find-and-replace with screenshot verification per file

---

## Design Section 3: Brand Gradient Unification

### Mapping Table

| Hardcoded | Token replacement | Context |
|---|---|---|
| `#F4A261` (93x) | `--color-primary-light` (backgrounds) or `--color-primary` (accents) | Backgrounds, borders, badges |
| `#E76F51` (22x) | `--color-primary-dark` (text/borders) or `--color-primary` (accents) | Text, borders, accents |
| `#f97316` (~15x) | `--color-primary` | Profile, TemplateDetail |
| `#ea580c` (~8x) | `--color-primary-dark` | Profile, TemplateDetail borders |
| `#FB923C`, `#f5a623`, `#ff7f50` (~8x) | `--color-primary` | Timeline, WeightTrend charts |

### New Tokens

Add to `color.css`:
```css
--color-primary-light: #FFB88C;          /* light brand bg, replaces #F4A261 backgrounds */
--color-primary-dark: #E06A30;           /* dark brand text, replaces #E76F51/#ea580c */
--color-primary-gradient-hover: linear-gradient(135deg, #FFB088 0%, #FF8848 100%);
```

### ECharts Handling

Create `composables/useChartColors.ts`:
```typescript
export function useChartColors() {
  const style = getComputedStyle(document.documentElement)
  return {
    primary: style.getPropertyValue('--color-primary').trim(),
    success: style.getPropertyValue('--color-success').trim(),
    danger: style.getPropertyValue('--color-danger').trim(),
    warning: style.getPropertyValue('--color-warning').trim(),
  }
}
```

Used in `WeightTrend.vue` and any future chart components.

### Scope

- 14 files, ~143 replacements
- Heaviest: Guides/index (28), Timeline/index (25), Guides/Detail (12), ChatMessage (12)

---

## Design Section 4: Token Migration for Status & Decorative Colors

### Status Color Tokens

| Hardcoded | Token replacement |
|---|---|
| `#22C55E`, `#16a34a`, `#52c41a` | `--color-success` |
| `#ef4444`, `#dc2626` | `--color-danger` |
| `#d97706`, `#faad14`, `#eab308` | `--color-warning` |
| `#3B82F6`, `#2563EB` | `--color-info` |

### New Tokens

Add to `color.css`:
```css
--color-success-bg: #ECFDF5;   /* light green bg */
--color-danger-bg: #FEF2F2;    /* light red bg */
--color-warning-bg: #FFFBEB;   /* light yellow bg */
--color-info-bg: #EFF6FF;      /* light blue bg */
```

### Cream Tint Consolidation

8+ similar off-white values consolidated to 2 tokens:

```css
--color-bg-warm: #FAF8F5;      /* warm page bg, replaces #FAF8F5/#FFFBF7/#FFF9F0/#FFF9F5/#FFFBF8 */
--color-bg-cream: #FDF3E9;     /* cream accent bg, replaces #FDF3E9/#FFF7ED/#FED7AA */
```

### Domain-Specific Colors

Keep as file-local CSS custom properties — not worth tokenizing:
- Task category colors (health green, feeding orange, training violet, care purple)
- Celebration gradient (`#FCD34D`/`#F9A8D4`)
- Mascot expression colors

### Scope

- Top 5 files (Timeline, WeightTrend, TemplateDetail, Guides, Profile) + others
- ~80 status replacements, ~30 cream consolidations

---

## Execution Order

1. **Add new tokens** to `color.css` (Section 2-4 new tokens) — zero-risk foundation
2. **Create `useChartColors` composable** — prerequisite for WeightTrend
3. **Timeline split** (Section 1) — highest impact, largest single change
4. **Gray unification** (Section 2) — 29 files, mechanical replacement
5. **Brand gradient unification** (Section 3) — 14 files
6. **Status + cream migration** (Section 4) — remaining cleanup

Each step: implement → screenshot verify → commit.

---

## Files Modified (Estimated)

| Step | Files | Lines Changed |
|---|---|---|
| New tokens + composable | 2 | ~30 |
| Timeline split | 6 new + 2 modified (router + old index) | ~2,000 (net reduction) |
| Gray unification | 29 | ~238 replacements |
| Brand gradient | 14 | ~143 replacements |
| Status + cream | ~20 | ~110 replacements |

**Total:** ~41 files touched, 4,035-line monolith → 6 focused files, 1,245 hardcoded colors → ~90% token-based.

---

## Out of Scope

- Pages rated A/A+ (Auth, Dashboard, AIChat) — no changes unless gray/brand replacements touch them incidentally
- Element Plus component theming — separate concern
- Responsive layout changes — the split preserves existing responsive behavior
- New UI features — this is purely structural + consistency work
