<template>
  <div class="weight-trend">
    <div class="trend-header">
      <h3>体重趋势</h3>
      <span v-if="latestWeight" class="current-weight">
        当前体重: <strong>{{ latestWeight }}kg</strong>
      </span>
    </div>

    <div v-if="loading" class="loading">
      <LoadingSpinner />
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="weightHistory.length === 0" class="empty-state">
      <p>暂无体重记录</p>
      <p class="hint">添加成长记录时记录体重，即可查看趋势图</p>
    </div>

    <div v-else ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import LoadingSpinner from '../common/LoadingSpinner.vue'
import { getWeightHistory } from '../../api/myCat'
import type { WeightHistoryRecord } from '../../types/cat'

interface Props {
  catId: string
  catName?: string
}

const props = defineProps<Props>()

const chartRef = ref<HTMLDivElement>()
const weightHistory = ref<WeightHistoryRecord[]>([])
const loading = ref(true)
const error = ref('')

let chart: echarts.ECharts | null = null

// 计算最新体重
const latestWeight = computed(() => {
  if (weightHistory.value.length === 0) return null
  const lastWeight = weightHistory.value[weightHistory.value.length - 1]?.weight
  return lastWeight ? lastWeight.toFixed(1) : null
})

// 初始化图表
function initChart() {
  console.log('[WeightTrend] initChart called, chartRef.value:', chartRef.value)
  if (!chartRef.value) {
    console.error('[WeightTrend] chartRef.value is null, cannot initialize chart')
    return
  }

  // 检查容器尺寸
  const rect = chartRef.value.getBoundingClientRect()
  console.log('[WeightTrend] Chart container size:', rect.width, 'x', rect.height)
  if (rect.width === 0 || rect.height === 0) {
    console.warn('[WeightTrend] Chart container has zero size, retrying after delay...')
    setTimeout(() => {
      if (chartRef.value) {
        console.log('[WeightTrend] Retry initChart')
        initChart()
      }
    }, 100)
    return
  }

  // 销毁已存在的图表
  if (chart) {
    chart.dispose()
  }

  chart = echarts.init(chartRef.value)
  console.log('[WeightTrend] ECharts instance created')
  updateChart()
}

// 更新图表数据
function updateChart() {
  console.log('[WeightTrend] updateChart called, chart:', !!chart, 'weightHistory.length:', weightHistory.value.length)
  if (!chart || weightHistory.value.length === 0) {
    console.error('[WeightTrend] Cannot update chart - chart:', !!chart, 'data length:', weightHistory.value.length)
    return
  }

  const dates = weightHistory.value.map(record => record.date)
  const weights = weightHistory.value.map(record => record.weight)
  console.log('[WeightTrend] dates:', dates.slice(0, 5), '...(total:', dates.length, ')')
  console.log('[WeightTrend] weights:', weights.slice(0, 5), '...(total:', weights.length, ')')

  // 计算体重变化
  const firstWeight = weights[0] ?? 0
  const lastWeight = weights[weights.length - 1] ?? 0
  const weightChange = weights.length > 1 ? lastWeight - firstWeight : 0
  console.log('[WeightTrend] Weight range:', firstWeight, '->', lastWeight, 'change:', weightChange)

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        if (!params || params.length === 0) return ''
        const param = params[0]
        const record = weightHistory.value[param.dataIndex] as WeightHistoryRecord | undefined
        let tooltip = `<div style="padding: 8px;">
          <div style="margin-bottom: 4px; font-weight: bold;">${param.axisValue}</div>
          <div>体重: ${param.value}kg</div>`
        if (record?.notes) {
          tooltip += `<div style="margin-top: 4px; color: #666; font-size: 12px;">${record.notes}</div>`
        }
        tooltip += '</div>'
        return tooltip
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: '#ddd'
        }
      },
      axisLabel: {
        color: '#666',
        fontSize: 12
      }
    },
    yAxis: {
      type: 'value',
      name: '体重 (kg)',
      nameTextStyle: {
        color: '#666',
        padding: [0, 0, 0, -10]
      },
      axisLine: {
        lineStyle: {
          color: '#ddd'
        }
      },
      axisLabel: {
        color: '#666',
        formatter: '{value} kg'
      },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0',
          type: 'dashed'
        }
      }
    },
    series: [
      {
        name: '体重',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        data: weights,
        itemStyle: {
          color: '#f5a623'
        },
        lineStyle: {
          width: 3,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#f5a623' },
              { offset: 1, color: '#ff7f50' }
            ]
          }
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245, 166, 35, 0.3)' },
              { offset: 1, color: 'rgba(245, 166, 35, 0.05)' }
            ]
          }
        },
        markLine: weightChange > 0.1 ? {
          silent: true,
          symbol: 'none',
          data: [
            {
              type: 'average',
              name: '平均值'
            }
          ],
          lineStyle: {
            color: '#999',
            type: 'dashed'
          },
          label: {
            show: true,
            position: 'end',
            formatter: '平均: {c}kg'
          }
        } : undefined
      }
    ]
  }

  chart.setOption(option)
  console.log('[WeightTrend] Chart option set successfully')
}

// 获取体重历史数据
async function fetchWeightHistory() {
  console.log('[WeightTrend] fetchWeightHistory called, catId:', props.catId)
  loading.value = true
  error.value = ''

  try {
    const response = await getWeightHistory(props.catId)
    console.log('[WeightTrend] API response:', response)
    weightHistory.value = response.data || []
    console.log('[WeightTrend] weightHistory set to:', weightHistory.value)
    console.log('[WeightTrend] weightHistory.length:', weightHistory.value.length)

    // 先关闭 loading 状态，让图表容器渲染
    loading.value = false

    // 等待 DOM 更新后再初始化图表
    await nextTick()
    console.log('[WeightTrend] about to call initChart, chartRef.value:', chartRef.value)
    initChart()
  } catch (err: any) {
    console.error('[WeightTrend] Error fetching weight history:', err)
    error.value = err.message || '获取体重历史失败'
    loading.value = false
  }
}

// 窗口大小变化时重新渲染图表
function handleResize() {
  chart?.resize()
}

onMounted(() => {
  fetchWeightHistory()
  window.addEventListener('resize', handleResize)
})

// 监听 catId 变化
watch(() => props.catId, () => {
  fetchWeightHistory()
})

// 组件卸载时清理
onUnmounted(() => {
  chart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.weight-trend {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.trend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.trend-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.current-weight {
  font-size: 14px;
  color: #666;
}

.current-weight strong {
  color: #f5a623;
  font-size: 16px;
}

.loading,
.error,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #999;
}

.empty-state {
  text-align: center;
}

.empty-state .hint {
  font-size: 12px;
  margin-top: 8px;
}

.chart-container {
  width: 100%;
  height: 280px;
}
</style>
