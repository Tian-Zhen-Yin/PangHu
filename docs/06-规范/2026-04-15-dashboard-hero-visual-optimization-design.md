# Dashboard Hero Card Visual Optimization

**Date:** 2026-04-15
**Status:** Approved
**Scope:** DashboardPage.vue Hero Card section

## Background

The Dashboard page (`/modules/dashboard/pages/DashboardPage.vue`) currently uses a left-right split layout for the hero card: cat profile on the left (260px fixed width on desktop) and health data panel on the right. This creates visual imbalance and makes mobile adaptation feel forced. Additionally, the file contains ~2000 lines with significant dead CSS (`health-overview-card` styles no longer used in the template).

## Goal

Refine and polish the hero card visual design using a unified full-width layout (Option A) for a more cohesive, balanced appearance with cleaner information hierarchy.

## Design Decision

**Chosen approach: Unified Full-Width Layout (Option A)**

The hero card reorganizes into three horizontal layers instead of a left-right split:

### Layer Structure

**Layer 1 — Identity Bar (通栏身份栏)**
- Horizontal bar: Avatar (64px desktop / 52px mobile) + Name + "当前" badge + Age/Weight meta
- Desktop: Health status pill integrated on the right side of the bar (green background)
- Mobile: Health status becomes a standalone banner below actions
- Separated from Layer 2 by a subtle `border-bottom: 1px solid #F3F4F6`

**Layer 2 — Actions Row**
- Two equal-width buttons: "记一笔" (primary gradient) + "AI 咨询" (secondary outlined)
- Desktop: `max-width: 200px` each, left-aligned
- Mobile: Full width, stacked in a row

**Layer 3 — Data Grid**
- Desktop: `grid-template-columns: 1fr 1fr` — Weight gauge left, Todos right
- Mobile: Vertical stack (`flex-direction: column`) — Weight card on top, Todos below

### Key Visual Changes

| Element | Before | After |
|---------|--------|-------|
| Layout | Left-right split (`hero-left` / `hero-right`) | Full-width layers, no split |
| Profile | Left column, 260px fixed | Horizontal bar, full width |
| Divider | `border-right` on left column | `border-bottom` after identity bar |
| Health status | Separate card area | Integrated into identity bar (desktop) / banner (mobile) |
| Decorative glow | Present | Keep, refine positioning |
| Colors | Hardcoded (#F4A261, #374151, etc.) | CSS variables from design tokens |
| Dead CSS | ~600 lines of unused `.health-overview-card` styles | Remove entirely |

### CSS Variable Migration

All hardcoded colors in the hero card section will be replaced with CSS variables from the project's design token system (`src/styles/tokens/`):

- `#374151` → `var(--color-text-primary)`
- `#9CA3AF` → `var(--color-text-secondary)` / `var(--color-text-light)`
- `#F3F4F6` → `var(--color-border-light)`
- `#F9FAFB` → `var(--color-bg-block)`
- `#ECFDF5` → `var(--color-success-bg)`
- `#10B981` / `#059669` → `var(--color-success)` / `var(--color-success-dark)`
- `#FFF7ED` → `var(--color-primary-light)`

### Responsive Breakpoints

- **Desktop (>=768px):** Identity bar with status pill inline, data grid 2 columns, buttons max-width constrained
- **Mobile (<768px):** Identity bar without inline status, status as separate banner, data grid stacked vertically, smaller avatar

### Files Changed

| File | Change |
|------|--------|
| `modules/dashboard/pages/DashboardPage.vue` | Restructure hero card template + rewrite hero CSS section + remove dead CSS |

The template structure changes from:

```
hero-card > hero-content > [hero-left, hero-right]
```

To:

```
hero-card > hero-content > [profile-bar, actions-row, data-grid]
```

### Out of Scope

- WeightGauge component itself (no changes to the gauge chart)
- Other cats section (unchanged)
- Timeline section (unchanged)
- FAB button (unchanged)
- Backend API or data fetching logic
- Component extraction (keeping everything in DashboardPage.vue for now)

## Implementation Notes

1. The `hero-decor` (decorative glow) element stays but repositioned for the new layout
2. The `WeightGauge` component usage remains the same, just repositioned within the new grid
3. Todo checkbox interaction logic remains unchanged
4. The `other-cats-section` and `timeline-section` styles are untouched
5. Remove all `.health-overview-card` CSS rules (lines ~1157-1424) as they are dead code
