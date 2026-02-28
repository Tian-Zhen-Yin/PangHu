<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { DashboardQuickAction } from '../types'

const actions: DashboardQuickAction[] = [
  { id: 'record', label: '记录', icon: '📷', path: '/timeline/new', color: 'var(--color-primary)' },
  { id: 'weight', label: '体重', icon: '⚖️', path: '/my-cats', color: 'var(--color-secondary)' },
  { id: 'vaccine', label: '疫苗', icon: '💉', path: '/my-cats', color: 'var(--color-accent)' },
  { id: 'guide', label: '指南', icon: '📘', path: '/guides', color: 'var(--color-info)' }
]
</script>

<template>
  <div class="quick-actions">
    <RouterLink
      v-for="action in actions"
      :key="action.id"
      :to="action.path"
      class="action-btn"
    >
      <span class="action-icon">{{ action.icon }}</span>
      <span class="action-label">{{ action.label }}</span>
    </RouterLink>
  </div>
</template>

<style scoped>
.quick-actions {
  display: flex;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xs);
  border: 1px solid var(--color-border);
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  padding: var(--space-lg);
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: all var(--transition-base);
  flex: 1;
  min-width: 0;
}

.action-btn:hover {
  background: var(--color-primary-dim);
  transform: translateY(-2px);
}

.action-btn:active {
  transform: scale(0.96);
}

.action-icon {
  font-size: 24px;
}

.action-label {
  font-size: var(--text-xs);
  color: var(--color-text-main);
  font-weight: var(--font-medium);
}

@media (max-width: 480px) {
  .action-btn {
    padding: var(--space-md);
  }

  .action-icon {
    font-size: 22px;
  }
}
</style>