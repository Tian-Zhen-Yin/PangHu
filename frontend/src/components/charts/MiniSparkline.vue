<template>
  <svg class="mini-sparkline" viewBox="0 0 100 30" preserveAspectRatio="none">
    <defs>
      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" :stop-color="color" stop-opacity="0.3" />
        <stop offset="100%" :stop-color="color" stop-opacity="0" />
      </linearGradient>
    </defs>
    <!-- 渐变填充区域 -->
    <polygon v-if="polygonPoints" :points="polygonPoints" fill="url(#lineGradient)" />
    <!-- 趋势线 -->
    <polyline :points="linePoints" fill="none" :stroke="color" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    <!-- 当前点 -->
    <circle v-if="lastPoint" :cx="lastPoint.x" :cy="lastPoint.y" r="3" :fill="color" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  data: number[]
  color?: string
}>()

const color = computed(() => props.color || '#10b981')

// 计算 SVG 坐标点
const linePoints = computed(() => {
  if (props.data.length < 2) return ''
  const max = Math.max(...props.data)
  const min = Math.min(...props.data)
  const range = (max - min) || 1 // 防止除以 0

  return props.data.map((val, i) => {
    const x = (i / (props.data.length - 1)) * 100
    // 留出上下 3px 的 padding 防止线条被截断
    const y = 27 - ((val - min) / range) * 24
    return `${x},${y}`
  }).join(' ')
})

// 用于闭合底部形成渐变的坐标点
const polygonPoints = computed(() => {
  if (!linePoints.value) return ''
  return `0,30 ${linePoints.value} 100,30`
})

// 最后一个点的坐标（用于绘制圆点）
const lastPoint = computed(() => {
  if (props.data.length === 0) return null
  const max = Math.max(...props.data)
  const min = Math.min(...props.data)
  const range = (max - min) || 1
  const lastVal = props.data[props.data.length - 1] ?? 0
  const x = 100
  const y = 27 - ((lastVal - min) / range) * 24
  return { x, y }
})
</script>

<style scoped>
.mini-sparkline {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
