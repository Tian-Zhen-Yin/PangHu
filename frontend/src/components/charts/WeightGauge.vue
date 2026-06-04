<template>
  <div ref="chartRef" class="weight-gauge-chart"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts/core'
import { GaugeChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'

echarts.use([GaugeChart, CanvasRenderer])

const props = defineProps<{
  value: number
  min?: number
  max?: number
  standardMin?: number
  standardMax?: number
}>()

const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

const initChart = () => {
  if (!chartRef.value) return

  chart = echarts.init(chartRef.value)
  updateChart()
}

const updateChart = () => {
  if (!chart) return

  const min = props.min || 1.5
  const max = props.max || 5.0
  const standardMin = props.standardMin || 2.5
  const standardMax = props.standardMax || 4.0

  // 计算标准区间在总范围的百分比位置
  const standardStartRatio = (standardMin - min) / (max - min)
  const standardEndRatio = (standardMax - min) / (max - min)

  // 当前值对应的状态颜色
  const valueRatio = (props.value - min) / (max - min)
  let valueColor = '#10b981' // 正常绿
  if (valueRatio < standardStartRatio) valueColor = '#f59e0b' // 偏瘦黄
  else if (valueRatio > standardEndRatio) valueColor = 'var(--color-danger)' // 超重红

  const option: EChartsOption = {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min,
        max,
        splitNumber: 4,
        radius: '90%',
        center: ['50%', '70%'],
        axisLine: {
          lineStyle: {
            width: 18,
            color: [
              [standardStartRatio, '#fbbf24'], // 偏瘦区 (黄)
              [standardEndRatio, '#10b981'], // 正常区 (绿)
              [1, 'var(--color-danger)'] // 超重区 (红)
            ]
          }
        },
        pointer: {
          icon: 'path://M0,0 L10,5 L0,10 L-10,5 Z',
          length: '60%',
          width: 10,
          offsetCenter: [0, '-15%'],
          itemStyle: {
            color: 'var(--color-text-primary)'
          }
        },
        axisTick: {
          show: true,
          distance: -22,
          length: 4,
          lineStyle: {
            color: 'var(--color-text-placeholder)',
            width: 1
          }
        },
        splitLine: {
          show: true,
          distance: -24,
          length: 10,
          lineStyle: {
            color: 'var(--color-text-regular)',
            width: 1.5
          }
        },
        axisLabel: {
          show: true,
          distance: -32,
          fontSize: 10,
          color: 'var(--color-text-regular)',
          fontWeight: 500,
          formatter: (value: number) => value.toFixed(1)
        },
        detail: {
          valueAnimation: true,
          formatter: '{value}',
          color: valueColor,
          fontSize: 26,
          fontWeight: 'bold',
          fontFamily: '-apple-system, BlinkMacSystemFont, "DIN Alternate", sans-serif',
          offsetCenter: [0, '15%'],
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 10,
          padding: [6, 16],
          shadowColor: 'rgba(0, 0, 0, 0.06)',
          shadowBlur: 8,
          shadowOffsetY: 2
        },
        data: [
          {
            value: parseFloat(props.value.toFixed(1))
          }
        ],
        title: {
          show: false
        }
      }
    ]
  }

  chart.setOption(option)
}

onMounted(() => {
  initChart()
  window.addEventListener('resize', () => chart?.resize())
})

onUnmounted(() => {
  chart?.dispose()
})

watch(() => [props.value, props.min, props.max, props.standardMin, props.standardMax], () => {
  updateChart()
})
</script>

<style scoped>
.weight-gauge-chart {
  width: 100%;
  height: 100%;
  min-height: 160px;
}
</style>
