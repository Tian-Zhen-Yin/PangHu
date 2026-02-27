<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { DashboardQuickAction } from '../types'

const actions: DashboardQuickAction[] = [
  { id: 'record', label: '记录', icon: '📸', path: '/timeline/new', color: 'var(--color-primary)' },
  { id: 'weight', label: '体重', icon: '⚖️', path: '/my-cats', color: 'var(--color-secondary)' },
  { id: 'vaccine', label: '疫苗', icon: '💉', path: '/my-cats', color: 'var(--color-accent)' },
  { id: 'guide', label: '指南', icon: '📚', path: '/guides', color: 'var(--color-info)' }
]
</script>

<template>
  <div class="quick-actions">
    <RouterLink
      v-for="action in actions"
      :key="action.id"
      :to="action.path"
      class="action-item"
      :style="{ '--action-color': action.color }"
    >
      <span class="action-icon">{{ action.icon }}</span>
      <span class="action-label">{{ action.label }}</span>
    </RouterLink>
  </div>
</template>

<style scoped>
.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-lg) var(--space-sm);
  background: var(--color-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  text-decoration: none;
  transition: transform var(--transition-base), box-shadow var(--transition-base);
  aspect-ratio: 1;
}

.action-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.action-item:active {
  transform: scale(0.95);
}

.action-icon {
  font-size: var(--text-2xl);
}

.action-label {
  font-size: var(--text-xs);
  color: var(--color-text-main);
  font-weight: var(--font-medium);
}

@media (max-width: 480px) {
  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
  }

  .action-item {
    aspect-ratio: auto;
    padding: var(--space-xl);
  }
}
</style>
