<template>
  <div class="weight-trend">
    <div class="trend-header">
      <h3>体重趋势</h3>
      <div class="header-actions">
        <span v-if="latestWeight" class="current-weight">
          当前体重: <strong>{{ latestWeight }}kg</strong>
        </span>
        <button @click="handleExportCSV" class="btn-export" :class="{ 'premium-locked': !isPremium }" :title="isPremium ? '导出CSV' : '升级会员解锁'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          导出
        </button>
      </div>
    </div>

    <!-- 日期筛选器 -->
    <div class="date-filter-section">
      <div class="filter-presets">
        <button
          v-for="preset in datePresets"
          :key="preset.key"
          :class="['preset-btn', { active: selectedPreset === preset.key }]"
          @click="selectPreset(preset.key)"
        >
          {{ preset.label }}
        </button>
      </div>

      <!-- 筛选状态指示器 -->
      <div v-if="startDate || endDate" class="filter-status">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span>已筛选 <strong>{{ weightHistory.length }}</strong> 条记录</span>
        <span v-if="allWeightHistory.length > 0" class="filter-info">
          (共 {{ allWeightHistory.length }} 条)
        </span>
      </div>

      <div class="date-range-picker">
        <div class="date-input-group">
          <label class="date-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            开始日期
          </label>
          <input
            v-model="startDate"
            type="date"
            class="date-input"
            :max="endDate || today"
            @change="onDateChange"
          />
        </div>
        <span class="date-separator">至</span>
        <div class="date-input-group">
          <label class="date-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            结束日期
          </label>
          <input
            v-model="endDate"
            type="date"
            class="date-input"
            :min="startDate"
            :max="today"
            @change="onDateChange"
          />
        </div>
        <button
          v-if="startDate || endDate"
          @click="clearDateFilter"
          class="clear-filter-btn"
          title="清除筛选"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
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

    <div v-else class="chart-wrapper">
      <!-- 右上角悬浮状态标签 -->
      <div v-if="analysis" class="floating-status" :class="analysis.status">
        <svg v-if="analysis.status === 'normal'" class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <svg v-else-if="analysis.status === 'thin'" class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 12h8"/>
          <path d="M12 8v8"/>
        </svg>
        <svg v-else class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20v-6M6 20V10"/>
          <path d="M18 20V4"/>
        </svg>
        <span class="status-label">{{ getStatusText(analysis.status) }}</span>
      </div>

      <!-- 关键指标 -->
      <div class="metrics-bar">
        <div class="metric-item">
          <span class="metric-label">初始体重</span>
          <span class="metric-value">{{ formatWeightValue(weightHistory[0]?.weight) }}kg</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">当前体重</span>
          <span class="metric-value primary">{{ latestWeight }}kg</span>
        </div>
        <div v-if="weightHistory.length > 1" class="metric-item">
          <span class="metric-label">相比上次</span>
          <span class="metric-value" :class="weightChange >= 0 ? 'positive' : 'negative'">
            {{ weightChange >= 0 ? '↑' : '↓' }}{{ formatWeightValue(Math.abs(weightChange)) }}kg
          </span>
        </div>
      </div>

      <div ref="chartRef" class="chart-container"></div>
    </div>

    <!-- 目标体重设置 -->
    <div class="goal-section">
      <div v-if="myCatStore.weightGoal" class="goal-info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
        <span>目标: <strong>{{ formatWeightValue(myCatStore.weightGoal.target) }}kg</strong></span>
        <span class="goal-date">{{ myCatStore.weightGoal.date }}</span>
        <button @click="showGoalForm = true" class="btn-edit-goal">修改</button>
      </div>
      <button v-else @click="showGoalForm = true" class="btn-set-goal">+ 设置目标体重</button>

      <div v-if="showGoalForm" class="goal-form">
        <input v-model.number="goalTarget" type="number" min="0" step="0.1" placeholder="目标体重(kg)" class="goal-input" />
        <input v-model="goalDate" type="date" class="goal-input" />
        <button @click="saveGoal" class="btn-save-goal">保存</button>
        <button @click="showGoalForm = false" class="btn-cancel-goal">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  MarkPointComponent,
  DataZoomComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, MarkPointComponent, DataZoomComponent, CanvasRenderer])
import LoadingSpinner from '../common/LoadingSpinner.vue'
import { getWeightAnalysis, getWeightHistoryStandards } from '../../api/weightStandard.js'
import type { WeightAnalysis, WeightHistoryWithStandard } from '../../types/weight.js'
import { useMyCatStore } from '../../stores/myCat.js'
import { exportWeightCSV } from '../../api/myCat.js'
import { useMember } from '../../composables/useMember.js'
import { useChartColors } from '../../composables/useChartColors.js'
import { formatWeightValue } from '../../utils/format.js'

interface Props {
  catId: string
  catName?: string
}

const props = defineProps<Props>()

const myCatStore = useMyCatStore()
const { isPremium } = useMember()
const chartColors = useChartColors()
const chartRef = ref<HTMLDivElement>()
const weightHistory = ref<WeightHistoryWithStandard[]>([])
const allWeightHistory = ref<WeightHistoryWithStandard[]>([]) // 保存所有数据
const loading = ref(true)
const error = ref('')
const analysis = ref<WeightAnalysis | null>(null)
const showGoalForm = ref(false)
const goalTarget = ref(0)
const goalDate = ref('')

// 日期筛选相关
const startDate = ref('')
const endDate = ref('')
const selectedPreset = ref('all')
const today = computed(() => {
  const date = new Date()
  return date.toISOString().slice(0, 10)
})

// 日期预设选项
const datePresets = [
  { key: 'all', label: '全部' },
  { key: '7days', label: '最近7天' },
  { key: '30days', label: '最近30天' },
  { key: '3months', label: '最近3个月' },
  { key: '6months', label: '最近6个月' },
  { key: '1year', label: '最近1年' }
]

let chart: echarts.ECharts | null = null

// 导出 CSV
async function handleExportCSV() {
  if (!isPremium.value) return
  try {
    const blob = await exportWeightCSV(props.catId)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.catName || 'cat'}_weight.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    // silent
  }
}

// 保存目标体重
async function saveGoal() {
  if (!goalTarget.value || !goalDate.value) return
  const ok = await myCatStore.setGoal(goalTarget.value, goalDate.value)
  if (ok) {
    showGoalForm.value = false
    updateChart()
  }
}

// 计算最新体重
const latestWeight = computed(() => {
  if (weightHistory.value.length === 0) return null
  const lastWeight = weightHistory.value[weightHistory.value.length - 1]?.weight
  return lastWeight ? formatWeightValue(lastWeight) : null
})

// 计算体重变化
const weightChange = computed(() => {
  if (weightHistory.value.length < 2) return 0
  const lastWeight = weightHistory.value[weightHistory.value.length - 1]?.weight ?? 0
  const prevWeight = weightHistory.value[weightHistory.value.length - 2]?.weight ?? 0
  return lastWeight - prevWeight
})

// 选择日期预设
function selectPreset(preset: string) {
  selectedPreset.value = preset
  const now = new Date()

  switch (preset) {
    case 'all':
      startDate.value = ''
      endDate.value = ''
      break
    case '7days':
      startDate.value = formatDate(subDays(now, 7))
      endDate.value = today.value
      break
    case '30days':
      startDate.value = formatDate(subDays(now, 30))
      endDate.value = today.value
      break
    case '3months':
      startDate.value = formatDate(subDays(now, 90))
      endDate.value = today.value
      break
    case '6months':
      startDate.value = formatDate(subDays(now, 180))
      endDate.value = today.value
      break
    case '1year':
      startDate.value = formatDate(subDays(now, 365))
      endDate.value = today.value
      break
  }

  applyDateFilter()
}

// 日期改变时的处理
function onDateChange() {
  selectedPreset.value = 'custom'
  applyDateFilter()
}

// 清除日期筛选
function clearDateFilter() {
  startDate.value = ''
  endDate.value = ''
  selectedPreset.value = 'all'
  applyDateFilter()
}

// 应用日期筛选
function applyDateFilter() {
  console.log('[WeightTrend] applyDateFilter called', {
    startDate: startDate.value,
    endDate: endDate.value,
    allRecords: allWeightHistory.value.length
  })

  if (!startDate.value && !endDate.value) {
    // 没有筛选，显示全部数据
    weightHistory.value = [...allWeightHistory.value]
  } else {
    // 根据日期范围筛选 - 使用日期字符串直接比较（格式：YYYY-MM-DD）
    weightHistory.value = allWeightHistory.value.filter(record => {
      const recordDate = record.date

      // 开始日期筛选
      if (startDate.value && recordDate < startDate.value) return false
      // 结束日期筛选
      if (endDate.value && recordDate > endDate.value) return false

      return true
    })
  }

  console.log('[WeightTrend] Filtered records:', weightHistory.value.length)

  // 重新计算分析
  updateAnalysis()
  // 更新图表
  nextTick(() => {
    if (chart) {
      updateChart()
    } else {
      console.warn('[WeightTrend] Chart instance not available yet')
    }
  })
}

// 更新健康分析（基于筛选后的数据）
function updateAnalysis() {
  if (weightHistory.value.length === 0) {
    analysis.value = null
    return
  }

  const lastWeight = weightHistory.value[weightHistory.value.length - 1]
  if (lastWeight?.status) {
    analysis.value = {
      status: lastWeight.status,
      message: '',
      current: lastWeight.weight,
      min: lastWeight.minWeight ?? 0,
      max: lastWeight.maxWeight ?? 0,
      percentage: 50,
      deviation: 0
    }
  }
}

// 辅助函数：减去天数
function subDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() - days)
  return result
}

// 辅助函数：格式化日期为 YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 获取状态文本
function getStatusText(status: 'thin' | 'normal' | 'overweight'): string {
  switch (status) {
    case 'thin': return '偏瘦'
    case 'normal': return '完美体型'
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
  if (!chart) {
    console.error('[WeightTrend] Chart instance is null')
    return
  }

  if (weightHistory.value.length === 0) {
    console.warn('[WeightTrend] No data to display, clearing chart')
    chart.clear()
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
          <div>体重: ${record ? formatWeightValue(record.weight) : '0.00'}kg</div>`

        if (record?.minWeight && record?.maxWeight) {
          const inRange = record.weight >= record.minWeight && record.weight <= record.maxWeight
          const statusColor = inRange ? 'var(--color-success)' : 'var(--color-warning)'
          tooltip += `<div style="margin-top: 4px; color: ${statusColor}; font-size: 12px;">
            标准范围: ${formatWeightValue(record.minWeight)}kg - ${formatWeightValue(record.maxWeight)}kg
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
      top: '8%',
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
        symbolSize: (_value: number, params: any) => {
          // 只给最后一个点显示大圆点
          return params.dataIndex === weights.length - 1 ? 12 : 0
        },
        data: weights,
        itemStyle: {
          color: chartColors.primary
        },
        lineStyle: {
          width: 2.5,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: chartColors.primary },
              { offset: 1, color: chartColors.primaryDark }
            ]
          }
        },
        // 最后一个点的波纹效果
        showSymbol: true,
        emphasis: {
          scale: 1.5,
          focus: 'self'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245, 166, 35, 0.15)' },
              { offset: 1, color: 'rgba(245, 166, 35, 0.02)' }
            ]
          }
        },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            ...(weightChange > 0.1 ? [{ type: 'average', name: '平均值' }] : []),
            ...(myCatStore.weightGoal ? [{
              yAxis: myCatStore.weightGoal.target,
              name: '目标体重',
              lineStyle: { color: '#a78bfa', type: 'dashed', width: 2 },
              label: { show: true, position: 'insideEnd', formatter: () => `目标: ${formatWeightValue(myCatStore.weightGoal!.target)}kg`, color: '#7C3AED' }
            }] : [])
          ],
          lineStyle: { color: '#999', type: 'dashed', width: 1.5 },
          label: {
            show: true,
            position: 'insideEnd',
            formatter: '平均: {c}kg',
            color: 'var(--color-text-regular)',
            fontSize: 11,
            fontWeight: 500,
            distance: 5
          }
        },
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

    // 保存所有数据
    allWeightHistory.value = historyResponse.data || []
    analysis.value = analysisResponse.data || null

    console.log('[WeightTrend] allWeightHistory set to:', allWeightHistory.value.length, 'records')
    console.log('[WeightTrend] analysis set to:', analysis.value)

    // 应用当前日期筛选
    applyDateFilter()

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
  background: linear-gradient(145deg, #FFFFFF 0%, var(--color-bg-warm) 100%);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 4px 24px rgba(244, 162, 97, 0.12), 0 1px 6px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--color-bg-cream);
}

.trend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.trend-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* 日期筛选区域 */
.date-filter-section {
  margin-bottom: 16px;
  padding: 16px;
  background: linear-gradient(135deg, var(--color-bg-warm) 0%, var(--color-bg-cream) 100%);
  border-radius: 12px;
  border: 1px solid var(--color-primary-medium);
}

/* 预设按钮 */
.filter-presets {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

/* 筛选状态指示器 */
.filter-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #FFFFFF;
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  font-size: 12px;
  color: var(--color-text-regular);
  margin-bottom: 12px;
}

.filter-status svg {
  flex-shrink: 0;
  color: var(--color-success);
}

.filter-status strong {
  color: var(--color-primary);
  font-weight: 700;
}

.filter-status .filter-info {
  color: var(--color-text-placeholder);
  font-size: 11px;
}

.preset-btn {
  padding: 6px 14px;
  background: #FFFFFF;
  border: 1px solid var(--color-border-light);
  border-radius: 100px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-regular);
  cursor: pointer;
  transition: all 0.2s ease;
}

.preset-btn:hover {
  border-color: var(--color-primary-medium);
  background: var(--color-bg-warm);
  color: var(--color-primary);
}

.preset-btn.active {
  background: linear-gradient(135deg, var(--color-primary-gradient) 0%, var(--color-primary-dark) 100%);
  border-color: transparent;
  color: #FFFFFF;
  box-shadow: 0 2px 8px rgba(244, 162, 97, 0.3);
}

/* 日期选择器 */
.date-range-picker {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.date-input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 140px;
}

.date-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-placeholder);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-label svg {
  flex-shrink: 0;
}

.date-input {
  padding: 8px 12px;
  background: #FFFFFF;
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  font-size: 13px;
  color: var(--color-text-primary);
  font-family: inherit;
  transition: all 0.2s ease;
  cursor: pointer;
}

.date-input:hover {
  border-color: var(--color-primary-medium);
}

.date-input:focus {
  outline: none;
  border-color: var(--color-primary-medium);
  box-shadow: 0 0 0 3px rgba(244, 162, 97, 0.15);
}

.date-input::-webkit-calendar-picker-indicator {
  cursor: pointer;
  color: var(--color-text-placeholder);
}

.date-input::-webkit-calendar-picker-indicator:hover {
  color: var(--color-primary);
}

.date-separator {
  font-size: 13px;
  color: var(--color-text-placeholder);
  font-weight: 500;
  padding-top: 20px;
  flex-shrink: 0;
}

.clear-filter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-top: 18px;
  background: #FFFFFF;
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  color: var(--color-text-regular);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.clear-filter-btn:hover {
  background: #FEF2F2;
  border-color: #FCA5A5;
  color: var(--color-danger);
}

.clear-filter-btn svg {
  width: 14px;
  height: 14px;
}

.current-weight {
  font-size: 14px;
  color: var(--color-text-placeholder);
}

.current-weight strong {
  color: var(--color-primary);
  font-size: 16px;
}

/* 图表包裹器 */
.chart-wrapper {
  position: relative;
}

/* 右上角悬浮状态标签 - 专业简洁风格 */
.floating-status {
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  z-index: 10;
}

.floating-status.normal {
  background: var(--color-bg-page);
  color: var(--color-text-regular);
  border: 1px solid var(--color-border-light);
}

.floating-status.thin {
  background: #FFFBEB;
  color: var(--color-warning);
  border: 1px solid var(--color-primary-medium);
}

.floating-status.overweight {
  background: #FEF2F2;
  color: var(--color-danger);
  border: 1px solid #FCA5A5;
}

.floating-status .status-icon {
  width: 14px;
  height: 14px;
}

.floating-status.normal .status-icon {
  color: var(--color-text-placeholder);
}

.floating-status.thin .status-icon {
  color: var(--color-warning);
}

.floating-status.overweight .status-icon {
  color: var(--color-danger);
}

/* 关键指标条 */
.metrics-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  padding: 10px 16px;
  background: #FAFAFA;
  border-radius: 12px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-label {
  font-size: 11px;
  color: var(--color-text-placeholder);
}

.metric-value {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.metric-value.primary {
  color: var(--color-primary);
}

.metric-value.positive {
  color: var(--color-success);
}

.metric-value.negative {
  color: var(--color-danger);
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
  height: 300px;
  background: #FFFFFF;
  border-radius: 16px;
  padding: 16px 16px 16px 16px;
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.02);
}

.btn-export {
  padding: 0.25rem 0.625rem;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  font-size: 0.8125rem;
  cursor: pointer;
  color: var(--color-text-regular);
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-export:hover {
  background: var(--color-bg-block-hover);
  color: var(--color-text-primary);
}

.btn-export svg {
  stroke-width: 1.5;
}

.premium-locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.goal-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-bg-block-hover);
}

.goal-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-regular);
}

.goal-info svg {
  flex-shrink: 0;
  color: var(--color-text-placeholder);
}

.goal-info strong {
  color: var(--color-text-regular);
}

.goal-date {
  color: var(--color-text-placeholder);
}

.btn-edit-goal {
  background: transparent;
  border: none;
  color: var(--color-text-placeholder);
  cursor: pointer;
  font-size: 0.8125rem;
  padding: 0;
  margin-left: auto;
}

.btn-edit-goal:hover {
  color: var(--color-text-regular);
}

.btn-set-goal {
  background: transparent;
  border: 1px dashed var(--color-border-light);
  border-radius: 8px;
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  color: var(--color-text-placeholder);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-set-goal:hover {
  border-color: var(--color-text-placeholder);
  color: var(--color-text-regular);
}

.goal-form {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.goal-input {
  padding: 0.375rem 0.625rem;
  border: 1px solid var(--color-border-light);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  width: 130px;
}

.goal-input:focus {
  outline: none;
  border-color: #a78bfa;
}

.btn-save-goal {
  padding: 0.375rem 0.75rem;
  background: #a78bfa;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.btn-cancel-goal {
  padding: 0.375rem 0.75rem;
  background: var(--color-bg-block-hover);
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--color-text-regular);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .date-filter-section {
    padding: 12px;
  }

  .filter-presets {
    gap: 6px;
  }

  .preset-btn {
    padding: 5px 12px;
    font-size: 12px;
    flex: 1;
    min-width: 60px;
    text-align: center;
  }

  .filter-status {
    flex-wrap: wrap;
    font-size: 11px;
  }

  .date-range-picker {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .date-input-group {
    min-width: unset;
  }

  .date-separator {
    display: none;
  }

  .clear-filter-btn {
    width: 100%;
    margin-top: 0;
  }

  .header-actions {
    flex-wrap: wrap;
  }

  .current-weight {
    font-size: 12px;
  }
}
</style>
