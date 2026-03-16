<template>
  <div ref="chartRef" class="weight-gauge-chart"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

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

  const option: EChartsOption = {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min,
        max,
        splitNumber: 3,
        radius: '75%',
        center: ['50%', '65%'],
        axisLine: {
          lineStyle: {
            width: 12,
            color: [
              [standardStartRatio, '#fbbf24'], // 偏瘦区 (黄)
              [standardEndRatio, '#10b981'], // 正常区 (绿)
              [1, '#ef4444'] // 超重区 (红)
            ]
          }
        },
        pointer: {
          icon: 'path://M0,0 L10,5 L0,10 L-10,5 Z',
          length: '55%',
          width: 8,
          offsetCenter: [0, '-10%'],
          itemStyle: {
            color: '#475569'
          }
        },
        axisTick: {
          show: false
        },
        splitLine: {
          show: false
        },
        axisLabel: {
          show: false
        },
        detail: {
          valueAnimation: true,
          formatter: '{value}',
          color: '#1e293b',
          fontSize: 20,
          fontWeight: 'bold',
          offsetCenter: [0, '20%'],
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 8,
          padding: [4, 12]
        },
        data: [
          {
            value: props.value
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
  min-height: 100px;
}
</style>
