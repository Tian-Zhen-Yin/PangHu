<script setup lang="ts">
import { computed } from 'vue'

export type TrendDirection = 'up' | 'down' | 'stable'

export interface TrendPoint {
  date: string
  value: number
  label?: string
}

interface Props {
  data: TrendPoint[]
  unit?: string
  direction?: TrendDirection
  status?: 'normal' | 'warning' | 'danger'
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  unit: '',
  direction: 'stable',
  status: 'normal',
  size: 'medium'
})

// 计算变化值
const changeValue = computed(() => {
  if (props.data.length < 2) return 0
  const first = props.data[0]!.value
  const last = props.data[props.data.length - 1]!.value
  return last - first
})

// 计算变化百分比
const changePercent = computed(() => {
  if (props.data.length < 2) return 0
  const first = props.data[0]!.value
  if (first === 0) return 0
  return ((changeValue.value / first) * 100).toFixed(1)
})

// 状态颜色
const statusColor = computed(() => {
  switch (props.status) {
    case 'normal':
      return 'var(--color-success)'
    case 'warning':
      return '#F59E0B'
    case 'danger':
      return 'var(--color-danger)'
    default:
      return 'var(--color-text-regular)'
  }
})

// SVG 路径生成
const chartPath = computed(() => {
  if (props.data.length === 0) return ''

  const width = 200
  const height = 60
  const padding = 4

  const values = props.data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = props.data.map((point, index) => {
    const x = (index / (props.data.length - 1)) * (width - padding * 2) + padding
    const y = height - ((point.value - min) / range) * (height - padding * 2) - padding
    return `${x},${y}`
  })

  return `M ${points.join(' L ')}`
})

// 区域填充路径
const areaPath = computed(() => {
  if (!chartPath.value) return ''
  const width = 200
  const height = 60
  return `${chartPath.value} L ${width - 4},${height} L 4,${height} Z`
})

// 趋势图标
const trendIcon = computed(() => {
  switch (props.direction) {
    case 'up':
      return 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
    case 'down':
      return 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'
    case 'stable':
      return 'M5 12h14'
    default:
      return ''
  }
})
</script>

<template>
  <div :class="['trend-chart', size, status]">
    <!-- 趋势图标和变化值 -->
    <div class="trend-header">
      <svg class="trend-direction-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="trendIcon"/>
      </svg>
      <span class="trend-value" :style="{ color: statusColor }">
        {{ changeValue > 0 ? '+' : '' }}{{ changeValue }}{{ unit }}
      </span>
      <span class="trend-percent" :style="{ color: statusColor }">
        ({{ changePercent > 0 ? '+' : '' }}{{ changePercent }}%)
      </span>
    </div>

    <!-- SVG 折线图 -->
    <svg class="chart-svg" viewBox="0 0 200 60" preserveAspectRatio="none">
      <defs>
        <linearGradient :id="`gradient-${status}`" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" :stop-color="statusColor" stop-opacity="0.2"/>
          <stop offset="100%" :stop-color="statusColor" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <!-- 区域填充 -->
      <path
        :d="areaPath"
        :fill="`url(#gradient-${status})`"
      />
      <!-- 折线 -->
      <path
        :d="chartPath"
        :stroke="statusColor"
        stroke-width="2.5"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="chart-line"
      />
      <!-- 数据点 -->
      <circle
        v-for="(point, index) in data"
        :key="index"
        :cx="((index / (data.length - 1)) * 192) + 4"
        :cy="60 - ((point.value - Math.min(...data.map(d => d.value))) / (Math.max(...data.map(d => d.value)) - Math.min(...data.map(d => d.value)) || 1)) * 52 - 4"
        r="3"
        :fill="statusColor"
        class="chart-point"
      />
    </svg>

    <!-- 时间标签 -->
    <div class="trend-labels">
      <span class="label-start">{{ data[0]?.label || data[0]?.date }}</span>
      <span class="label-end">{{ data[data.length - 1]?.label || data[data.length - 1]?.date }}</span>
    </div>
  </div>
</template>

<style scoped>
.trend-chart {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  background: var(--color-bg-warm);
  border-radius: 12px;
  border: 1px solid #F5F0E8;
}

.trend-chart.small {
  padding: 8px 12px;
}

.trend-chart.large {
  padding: 16px 20px;
}

/* 状态边框 */
.trend-chart.warning {
  border-color: var(--color-primary-medium);
  background: linear-gradient(135deg, var(--color-bg-warm) 0%, var(--color-bg-cream) 100%);
}

.trend-chart.danger {
  border-color: #FECACA;
  background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%);
}

/* 趋势头部 */
.trend-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.trend-direction-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.trend-value {
  font-size: 16px;
  font-weight: 700;
}

.trend-percent {
  font-size: 12px;
  font-weight: 600;
}

/* SVG 图表 */
.chart-svg {
  width: 100%;
  height: 60px;
  overflow: visible;
}

.chart-line {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  animation: drawLine 1s ease-out forwards;
  stroke-dasharray: 400;
  stroke-dashoffset: 400;
}

@keyframes drawLine {
  to {
    stroke-dashoffset: 0;
  }
}

.chart-point {
  animation: fadeIn 0.5s ease-out forwards;
  opacity: 0;
}

.chart-point:nth-child(1) { animation-delay: 0.1s; }
.chart-point:nth-child(2) { animation-delay: 0.2s; }
.chart-point:nth-child(3) { animation-delay: 0.3s; }
.chart-point:nth-child(4) { animation-delay: 0.4s; }
.chart-point:nth-child(5) { animation-delay: 0.5s; }

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

/* 时间标签 */
.trend-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--color-text-placeholder);
}

.trend-chart.small .trend-value {
  font-size: 14px;
}

.trend-chart.small .chart-svg {
  height: 40px;
}

.trend-chart.large .trend-value {
  font-size: 18px;
}

.trend-chart.large .chart-svg {
  height: 80px;
}
</style>
