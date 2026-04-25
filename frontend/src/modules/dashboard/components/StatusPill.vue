<script setup lang="ts">
defineProps<{
  weightStatus?: string
  generalAdvice?: string
  catName?: string
}>()

const emit = defineEmits<{
  click: []
}>()

function statusDotClass(status?: string): string {
  if (status === 'normal') return 'normal'
  if (status) return 'warning'
  return 'neutral'
}

function statusTextClass(status?: string): string {
  if (status === 'normal') return 'normal'
  if (status) return 'warning'
  return 'neutral'
}

function statusLabel(status?: string): string {
  if (status === 'normal') return '体型正常'
  if (status) return '需关注'
  return '点击咨询'
}
</script>

<template>
  <div class="status-pill" @click="emit('click')">
    <span class="status-dot" :class="statusDotClass(weightStatus)"></span>
    <span class="status-text" :class="statusTextClass(weightStatus)">{{ statusLabel(weightStatus) }}</span>
    <span class="status-divider"></span>
    <span class="status-desc">{{ generalAdvice || `${catName}最近状态很棒，继续保持哦！` }}</span>
  </div>
</template>

<style scoped>
.status-pill {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) 14px;
  background: var(--color-success-bg);
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: background 0.2s ease;
  flex-shrink: 0;
}

.status-pill:hover {
  background: var(--color-success-light);
}

@media (max-width: 767px) {
  .status-pill {
    width: 100%;
    order: 10;
    border: 1px solid var(--color-success-light);
    border-radius: var(--radius-sm);
    padding: var(--space-md);
  }
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.normal { background: var(--color-success); }
.status-dot.warning { background: var(--color-warning); }
.status-dot.neutral { background: var(--color-border); }

.status-text {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  flex-shrink: 0;
}

.status-text.normal { color: var(--color-success); }
.status-text.warning { color: var(--color-warning); }
.status-text.neutral { color: var(--color-text-secondary); }

.status-divider {
  width: 1px;
  height: 12px;
  background: var(--color-success-light);
  flex-shrink: 0;
}

.status-desc {
  font-size: var(--text-xs);
  color: var(--color-success);
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  font-weight: var(--font-normal);
}
</style>
