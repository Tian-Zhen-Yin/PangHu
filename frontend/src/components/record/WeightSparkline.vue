<script setup lang="ts">
import { computed } from 'vue'
import MascotCharacter from '../mascot/MascotCharacter.vue'

interface DataPoint {
  weight: number
  date: string
}

const props = defineProps<{
  data: DataPoint[]
}>()

const width = 300
const height = 80
const padding = 10

const latestWeight = computed(() => props.data[props.data.length - 1]?.weight || 0)

// 将体重数据映射到 SVG 坐标系
const points = computed(() => {
  if (props.data.length < 1) return []
  const weights = props.data.map(d => d.weight)
  const minW = Math.min(...weights) * 0.9
  const maxW = Math.max(...weights) * 1.1
  const range = maxW - minW || 1

  // 只有一个点时，放在中间
  if (props.data.length === 1) {
    return [{
      x: width / 2,
      y: height / 2
    }]
  }

  return props.data.map((d, i) => ({
    x: (i / (props.data.length - 1)) * (width - padding * 2) + padding,
    y: height - ((d.weight - minW) / range) * (height - padding * 2) - padding
  }))
})

// 生成 SVG 路径指令 (使用二次贝塞尔曲线平滑)
const linePath = computed(() => {
  if (points.value.length < 1) return ''

  // 单点时，显示一个标记点
  if (points.value.length === 1) {
    return ''
  }

  // 使用平滑曲线
  const firstPoint = points.value[0]
  if (!firstPoint) return ''
  let path = `M ${firstPoint.x} ${firstPoint.y}`

  for (let i = 1; i < points.value.length; i++) {
    const p0 = points.value[i - 1]
    const p1 = points.value[i]
    if (!p0 || !p1) continue
    const midX = (p0.x + p1.x) / 2

    path += ` Q ${p0.x + (midX - p0.x) * 0.5} ${p0.y}, ${midX} ${(p0.y + p1.y) / 2}`
    path += ` Q ${midX + (p1.x - midX) * 0.5} ${p1.y}, ${p1.x} ${p1.y}`
  }

  return path
})

const areaPath = computed(() => {
  if (points.value.length < 1) return ''
  if (points.value.length === 1) {
    // 单点时显示一个圆形区域
    const p = points.value[0]
    if (!p) return ''
    return `M ${p.x - 10} ${p.y} A 10 10 0 1 1 ${p.x + 10} ${p.y} A 10 10 0 1 1 ${p.x - 10} ${p.y}`
  }
  const lastPt = points.value[points.value.length - 1]
  const firstPt = points.value[0]
  if (!lastPt || !firstPt) return ''
  return `${linePath.value} L ${lastPt.x} ${height} L ${firstPt.x} ${height} Z`
})

const lastPoint = computed(() => points.value[points.value.length - 1] || { x: width / 2, y: height / 2 })
</script>

<template>
  <div class="sparkline-card">
    <div class="chart-header">
      <div class="title-group">
        <MascotCharacter expression="excited" size="small" :animated="false" />
        <span class="label">体重成长趋势</span>
      </div>
      <span class="current-val">{{ latestWeight.toFixed(2) }}kg</span>
    </div>

    <div class="svg-container">
      <svg :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.2" />
            <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0" />
          </linearGradient>
        </defs>

        <!-- 渐变填充区域 -->
        <path
          v-if="areaPath"
          :d="areaPath"
          fill="url(#sparkline-gradient)"
        />

        <!-- 曲线 -->
        <path
          v-if="linePath"
          :d="linePath"
          fill="none"
          stroke="var(--color-primary)"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- 单点显示 -->
        <circle
          v-if="points.length === 1 && points[0]"
          :cx="points[0].x"
          :cy="points[0].y"
          r="8"
          fill="var(--color-primary)"
          stroke="#fff"
          stroke-width="2"
        />

        <!-- 终点标记 -->
        <circle
          v-if="points.length > 1 && lastPoint"
          :cx="lastPoint.x"
          :cy="lastPoint.y"
          r="4"
          fill="var(--color-primary)"
          stroke="#fff"
          stroke-width="2"
        />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.sparkline-card {
  background: var(--color-card);
  border-radius: var(--radius-xl);
  padding: var(--space-lg);
  margin-bottom: var(--space-lg);
  box-shadow: var(--shadow-sm);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.title-group {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-main);
}

.current-val {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-primary);
}

.svg-container {
  height: 80px;
  width: 100%;
}

.svg-container svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}
</style>