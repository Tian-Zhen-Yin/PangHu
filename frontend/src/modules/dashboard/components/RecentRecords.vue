<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { DashboardRecentRecord } from '../types'

defineProps<{
  records: DashboardRecentRecord[]
}>()
</script>

<template>
  <div class="recent-records">
    <div class="section-header">
      <h3 class="section-title">📝 最近记录</h3>
      <RouterLink to="/timeline" class="more-link">查看全部 →</RouterLink>
    </div>

    <div v-if="records.length === 0" class="empty-state">
      <span class="empty-text">暂无记录</span>
    </div>

    <div v-else class="records-list">
      <RouterLink
        v-for="record in records"
        :key="record.id"
        :to="`/my-cats/${record.catId}`"
        class="record-item"
      >
        <span class="record-icon">{{ record.icon }}</span>
        <div class="record-content">
          <span class="record-title">{{ record.catName }} · {{ record.title }}</span>
          <span class="record-date">{{ record.date }}</span>
        </div>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.recent-records {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-sm);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.section-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-main);
  margin: 0;
}

.more-link {
  font-size: var(--text-sm);
  color: var(--color-link);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.more-link:hover {
  color: var(--color-link-hover);
}

.empty-state {
  padding: var(--space-xl) 0;
  text-align: center;
  color: var(--color-text-sub);
  font-size: var(--text-sm);
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.record-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: background var(--transition-base);
}

.record-item:hover {
  background: var(--color-bg-alt);
}

.record-icon {
  font-size: var(--text-xl);
  flex-shrink: 0;
}

.record-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-sm);
}

.record-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-main);
}

.record-date {
  font-size: var(--text-xs);
  color: var(--color-text-sub);
  white-space: nowrap;
}
</style>
