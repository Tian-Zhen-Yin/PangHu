<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { DashboardReminder } from '../types'

defineProps<{
  reminders: DashboardReminder[]
}>()
</script>

<template>
  <div class="reminders-card">
    <h3 class="card-title">📋 今日提醒</h3>
    <div v-if="reminders.length === 0" class="empty-state">
      <span class="empty-icon">✅</span>
      <span class="empty-text">暂无待办事项</span>
    </div>
    <div v-else class="reminders-list">
      <div
        v-for="reminder in reminders"
        :key="reminder.id"
        class="reminder-item"
        :class="`urgency-${reminder.urgency}`"
      >
        <span class="reminder-icon">{{ reminder.icon }}</span>
        <div class="reminder-content">
          <span class="reminder-title">{{ reminder.title }}</span>
          <span class="reminder-desc">{{ reminder.description }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reminders-card {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-sm);
}

.card-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-main);
  margin: 0 0 var(--space-md) 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xl) 0;
  color: var(--color-text-sub);
}

.empty-icon {
  font-size: var(--text-3xl);
}

.empty-text {
  font-size: var(--text-sm);
}

.reminders-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.reminder-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  border-left: 3px solid transparent;
  transition: background var(--transition-base);
}

.reminder-item.urgency-high {
  border-left-color: var(--color-error);
  background: var(--color-error-light);
}

.reminder-item.urgency-medium {
  border-left-color: var(--color-warning);
  background: var(--color-warning-light);
}

.reminder-item.urgency-low {
  border-left-color: var(--color-success);
  background: var(--color-success-light);
}

.reminder-icon {
  font-size: var(--text-2xl);
  flex-shrink: 0;
}

.reminder-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.reminder-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-main);
}

.reminder-desc {
  font-size: var(--text-xs);
  color: var(--color-text-sub);
}
</style>
