<template>
  <div class="weight-change-indicator" :class="directionClass">
    <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path v-if="direction === 'up'" d="M12 19V5M5 12l7-7 7 7" />
      <path v-else-if="direction === 'down'" d="M12 5v14M5 12l7 7 7-7" />
      <path v-else d="M5 12h14" />
    </svg>
    <span class="weight-value">{{ formattedValue }}</span>
    <span class="weight-unit">kg</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatWeightValue } from '../../utils/format.js'

interface Props {
  value: number // 体重变化值，正数表示增加，负数表示减少，0 表示不变
  showSign?: boolean // 是否显示正负号
}

const props = withDefaults(defineProps<Props>(), {
  showSign: true
})

const direction = computed<'up' | 'down' | 'stable'>(() => {
  if (props.value > 0) return 'up'
  if (props.value < 0) return 'down'
  return 'stable'
})

const directionClass = computed(() => `is-${direction.value}`)

const formattedValue = computed(() => {
  const absValue = Math.abs(props.value)
  const sign = props.showSign && props.value > 0 ? '+' : ''
  return `${sign}${formatWeightValue(absValue)}`
})
</script>

<style scoped>
.weight-change-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.weight-change-indicator .arrow-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  transition: transform 0.3s ease;
}

.weight-change-indicator:hover .arrow-icon {
  transform: scale(1.1);
}

/* 体重上升 - 橙色系 */
.weight-change-indicator.is-up {
  background-color: var(--color-bg-cream);
  color: var(--color-primary);
}

.weight-change-indicator.is-up .arrow-icon {
  animation: bounce-up 0.6s ease-in-out;
}

/* 体重下降 - 绿色系（健康减重） */
.weight-change-indicator.is-down {
  background-color: #F0FDF4;
  color: #10B981;
}

.weight-change-indicator.is-down .arrow-icon {
  animation: bounce-down 0.6s ease-in-out;
}

/* 体重稳定 - 中性色 */
.weight-change-indicator.is-stable {
  background-color: var(--color-bg-block-hover);
  color: var(--color-text-placeholder);
}

.weight-value {
  font-variant-numeric: tabular-nums;
}

@keyframes bounce-up {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

@keyframes bounce-down {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(3px); }
}
</style>
