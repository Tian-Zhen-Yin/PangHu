<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  actionLabel?: string
}>()

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="section-header">
    <div class="section-header-left">
      <h3 class="section-title">{{ title }}</h3>
      <span v-if="subtitle" class="section-subtitle">{{ subtitle }}</span>
    </div>
    <div v-if="actionLabel" class="section-action" @click="emit('action')">
      {{ actionLabel }} <span class="action-arrow">&#x203A;</span>
    </div>
    <slot name="action" />
  </div>
</template>

<style scoped>
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
  padding: 0 var(--space-xs);
}

.section-header-left {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
}

.section-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.section-subtitle {
  font-size: var(--text-xs);
  color: var(--color-text-light);
}

.section-action {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.section-action:hover {
  color: var(--color-primary);
}

.action-arrow {
  font-size: var(--text-lg);
  margin-left: 2px;
  line-height: 1;
  transform: translateY(-1px);
}
</style>
