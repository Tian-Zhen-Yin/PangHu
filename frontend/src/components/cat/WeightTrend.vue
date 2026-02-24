<template>
  <div class="weight-trend">
    <div class="trend-header">
      <h3>体重趋势</h3>
      <span v-if="latestWeight" class="current-weight">
        当前体重: <strong>{{ latestWeight }}kg</strong>
      </span>
    </div>

    <!-- 健康状态分析 -->
    <div v-if="analysis && !loading" class="health-analysis">
      <div class="status-badge" :class="analysis.status">
        <span class="status-icon">{{ getStatusIcon(analysis.status) }}</span>
        <span class="status-text">{{ getStatusText(analysis.status) }}</span>
      </div>
      <p class="analysis-message">{{ analysis.message }}</p>
      <div v-if="analysis.min > 0 && analysis.max > 0" class="standard-range">
        <span>标准范围: {{ analysis.min }}kg - {{ analysis.max }}kg</span>
        <span v-if="analysis.deviation !== 0" :class="['deviation', analysis.deviation > 0 ? 'positive' : 'negative']">
          {{ analysis.deviation > 0 ? '+' : '' }}{{ analysis.deviation }}kg
        </span>
      </div>
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
import { getWeightAnalysis, getWeightHistoryStandards } from '../../api/weightStandard'
import type { WeightAnalysis, WeightHistoryWithStandard } from '../../types/weight'

interface Props {
  catId: string
  catName?: string
}

const props = defineProps<Props>()

const chartRef = ref<HTMLDivElement>()
const weightHistory = ref<WeightHistoryWithStandard[]>([])
const loading = ref(true)
const error = ref('')
const analysis = ref<WeightAnalysis | null>(null)

let chart: echarts.ECharts | null = null

// 计算最新体重
const latestWeight = computed(() => {
  if (weightHistory.value.length === 0) return null
  const lastWeight = weightHistory.value[weightHistory.value.length - 1]?.weight
  return lastWeight ? lastWeight.toFixed(1) : null
})

// 获取状态图标
function getStatusIcon(status: 'thin' | 'normal' | 'overweight'): string {
  switch (status) {
    case 'thin': return '📉'
    case 'normal': return '✅'
    case 'overweight': return '📈'
    default: return '❓'
  }
}

// 获取状态文本
function getStatusText(status: 'thin' | 'normal' | 'overweight'): string {
  switch (status) {
    case 'thin': return '偏瘦'
    case 'normal': return '正常'
    case 'overweight': return '超重'
    default: return '未知'
  }
}

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
  const minWeights = weightHistory.value.map(record => record.minWeight)
  const maxWeights = weightHistory.value.map(record => record.maxWeight)

  console.log('[WeightTrend] dates:', dates.slice(0, 5), '...(total:', dates.length, ')')
  console.log('[WeightTrend] weights:', weights.slice(0, 5), '...(total:', weights.length, ')')

  // 计算体重变化
  const firstWeight = weights[0] ?? 0
  const lastWeight = weights[weights.length - 1] ?? 0
  const weightChange = weights.length > 1 ? lastWeight - firstWeight : 0
  console.log('[WeightTrend] Weight range:', firstWeight, '->', lastWeight, 'change:', weightChange)

  // 构建标准区间数据
  const standardData = minWeights.map((min, i) => {
    const max = maxWeights[i]
    return min !== undefined && max !== undefined ? [min, max] : null
  })

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        if (!params || params.length === 0) return ''
        const record = weightHistory.value[params[0].dataIndex] as WeightHistoryWithStandard | undefined
        let tooltip = `<div style="padding: 8px;">
          <div style="margin-bottom: 4px; font-weight: bold;">${params[0].axisValue}</div>
          <div>体重: ${record?.weight}kg</div>`

        if (record?.minWeight && record?.maxWeight) {
          const inRange = record.weight >= record.minWeight && record.weight <= record.maxWeight
          const statusColor = inRange ? '#52c41a' : '#faad14'
          tooltip += `<div style="margin-top: 4px; color: ${statusColor}; font-size: 12px;">
            标准范围: ${record.minWeight}kg - ${record.maxWeight}kg
          </div>`

          if (record.status) {
            const statusText = getStatusText(record.status)
            tooltip += `<div style="margin-top: 2px; color: ${statusColor}; font-size: 12px;">
              状态: ${statusText}
            </div>`
          }
        }

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
      // 体重曲线
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
        } : undefined,
        z: 2
      },
      // 标准区间阴影
      {
        name: '标准区间',
        type: 'line',
        data: standardData,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          opacity: 0
        },
        areaStyle: {
          color: 'rgba(82, 196, 26, 0.15)'
        },
        z: 1
      }
    ] as any
  }

  chart.setOption(option)
  console.log('[WeightTrend] Chart option set successfully')
}

// 获取体重历史数据及标准范围
async function fetchWeightHistory() {
  console.log('[WeightTrend] fetchWeightHistory called, catId:', props.catId)
  loading.value = true
  error.value = ''
  analysis.value = null

  try {
    // 并行获取体重历史、健康分析和标准范围数据
    const [historyResponse, analysisResponse] = await Promise.all([
      getWeightHistoryStandards(props.catId),
      getWeightAnalysis(props.catId)
    ])

    console.log('[WeightTrend] history API response:', historyResponse)
    console.log('[WeightTrend] analysis API response:', analysisResponse)

    weightHistory.value = historyResponse.data || []
    analysis.value = analysisResponse.data || null

    console.log('[WeightTrend] weightHistory set to:', weightHistory.value.length, 'records')
    console.log('[WeightTrend] analysis set to:', analysis.value)

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

/* 健康分析样式 */
.health-analysis {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.status-badge.thin {
  background: #fff7e6;
  color: #fa8c16;
  border: 1px solid #ffd591;
}

.status-badge.normal {
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.status-badge.overweight {
  background: #fff2e8;
  color: #fa541c;
  border: 1px solid #ffbb96;
}

.status-icon {
  margin-right: 4px;
}

.status-text {
  font-weight: 500;
}

.analysis-message {
  margin: 8px 0;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

.standard-range {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #999;
}

.deviation {
  font-weight: 500;
}

.deviation.positive {
  color: #fa541c;
}

.deviation.negative {
  color: #fa8c16;
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
