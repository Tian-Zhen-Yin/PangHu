<template>
  <div class="weight-range">
    <div class="wr-head">
      <span class="wr-value" :style="{ color: statusColor }">{{ displayValue }}</span>
      <span class="wr-unit">kg</span>
      <span class="wr-status" :style="{ color: statusColor, background: statusBg }">{{ statusLabel }}</span>
    </div>

    <div class="wr-track">
      <div class="wr-seg thin" :style="{ flexBasis: thinPercent + '%' }"></div>
      <div class="wr-seg normal" :style="{ flexBasis: normalPercent + '%' }"></div>
      <div class="wr-seg over" :style="{ flexBasis: overPercent + '%' }"></div>

      <div class="wr-marker" :style="{ left: markerPercent + '%' }">
        <span class="wr-dot" :style="{ borderColor: statusColor }"></span>
      </div>
    </div>

    <div class="wr-scale">
      <span class="wr-scale-min">{{ rangeMin.toFixed(1) }}</span>
      <span class="wr-scale-std">标准 {{ standardMinValue.toFixed(2) }}–{{ standardMaxValue.toFixed(2) }}</span>
      <span class="wr-scale-max">{{ rangeMax.toFixed(1) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: number
  min?: number
  max?: number
  standardMin?: number
  standardMax?: number
}>()

const standardMinValue = computed(() => props.standardMin ?? 2.5)
const standardMaxValue = computed(() => props.standardMax ?? 4.0)

const rangeMin = computed(() => props.min ?? 1.5)
const rangeMax = computed(() => props.max ?? 5.0)

const span = computed(() => Math.max(rangeMax.value - rangeMin.value, 0.0001))

function ratio(v: number): number {
  return ((v - rangeMin.value) / span.value) * 100
}

function clampPercent(p: number): number {
  return Math.min(100, Math.max(0, p))
}

const thinPercent = computed(() => clampPercent(ratio(standardMinValue.value)))
const overPercent = computed(() => clampPercent(100 - ratio(standardMaxValue.value)))
const normalPercent = computed(() => clampPercent(100 - thinPercent.value - overPercent.value))

const markerPercent = computed(() => clampPercent(ratio(props.value)))

const status = computed<'thin' | 'normal' | 'over'>(() => {
  if (props.value < standardMinValue.value) return 'thin'
  if (props.value > standardMaxValue.value) return 'over'
  return 'normal'
})

const statusLabel = computed(() => {
  if (status.value === 'thin') return '偏瘦'
  if (status.value === 'over') return '偏重'
  return '正常'
})

const statusColor = computed(() => {
  if (status.value === 'thin') return '#F59E0B'
  if (status.value === 'over') return '#EF4444'
  return '#10B981'
})

const statusBg = computed(() => {
  if (status.value === 'thin') return 'rgba(245, 158, 11, 0.12)'
  if (status.value === 'over') return 'rgba(239, 68, 68, 0.12)'
  return 'rgba(16, 185, 129, 0.12)'
})

const displayValue = computed(() => Number(props.value || 0).toFixed(1))
</script>

<style scoped>
.weight-range {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 6px 2px;
}

.wr-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.wr-value {
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
  font-family: -apple-system, BlinkMacSystemFont, 'DIN Alternate', sans-serif;
}

.wr-unit {
  font-size: 14px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.wr-status {
  margin-left: auto;
  align-self: center;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: var(--radius-full, 999px);
}

.wr-track {
  position: relative;
  display: flex;
  width: 100%;
  height: 10px;
  border-radius: 999px;
  overflow: visible;
}

.wr-seg {
  height: 100%;
  flex-grow: 0;
  flex-shrink: 0;
}

.wr-seg.thin {
  background: #FBBF24;
  border-radius: 999px 0 0 999px;
}

.wr-seg.normal {
  background: #10B981;
}

.wr-seg.over {
  background: #EF4444;
  border-radius: 0 999px 999px 0;
}

.wr-marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.wr-dot {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  border: 3px solid #10b981;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
}

.wr-scale {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--color-text-placeholder);
  font-weight: 500;
}

.wr-scale-std {
  color: var(--color-text-secondary);
}
</style>
