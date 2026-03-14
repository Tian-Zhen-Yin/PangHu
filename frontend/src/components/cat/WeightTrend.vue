<template>
  <div class="weight-trend">
    <div class="trend-header">
      <h3>体重趋势</h3>
      <div style="display:flex;align-items:center;gap:0.75rem">
        <span v-if="latestWeight" class="current-weight">
          当前体重: <strong>{{ latestWeight }}kg</strong>
        </span>
        <button @click="handleExportCSV" class="btn-export" :class="{ 'premium-locked': !isPremium }" :title="isPremium ? '导出CSV' : '升级会员解锁'">⬇ 导出</button>
      </div>
    </div>

    <!-- 健康状态分析 - 胖虎呼吸灯效果 -->
    <div v-if="analysis && !loading" class="health-analysis" :class="analysis.status">
      <div class="status-indicator-pangu">
        <MascotCharacter
          :expression="analysis.status === 'normal' ? 'happy' : 'confused'"
          size="small"
          :animated="analysis.status === 'normal'"
          class="status-mascot"
        />
        <span class="status-text">
          <span class="dot"></span>
          {{ getStatusText(analysis.status) }}
        </span>
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

    <!-- 目标体重设置 -->
    <div class="goal-section">
      <div v-if="myCatStore.weightGoal" class="goal-info">
        <span>🎯 目标: <strong>{{ myCatStore.weightGoal.target }}kg</strong></span>
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
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import LoadingSpinner from '../common/LoadingSpinner.vue'
import MascotCharacter from '../mascot/MascotCharacter.vue'
import { getWeightAnalysis, getWeightHistoryStandards } from '../../api/weightStandard'
import type { WeightAnalysis, WeightHistoryWithStandard } from '../../types/weight'
import { useMyCatStore } from '../../stores/myCat'
import { exportWeightCSV } from '../../api/myCat'
import { useMember } from '../../composables/useMember'

interface Props {
  catId: string
  catName?: string
}

const props = defineProps<Props>()

const myCatStore = useMyCatStore()
const { isPremium } = useMember()
const chartRef = ref<HTMLDivElement>()
const weightHistory = ref<WeightHistoryWithStandard[]>([])
const loading = ref(true)
const error = ref('')
const analysis = ref<WeightAnalysis | null>(null)
const showGoalForm = ref(false)
const goalTarget = ref(0)
const goalDate = ref('')

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
  return lastWeight ? lastWeight.toFixed(1) : null
})

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
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            ...(weightChange > 0.1 ? [{ type: 'average', name: '平均值' }] : []),
            ...(myCatStore.weightGoal ? [{
              yAxis: myCatStore.weightGoal.target,
              name: '目标体重',
              lineStyle: { color: '#a78bfa', type: 'dashed', width: 2 },
              label: { show: true, position: 'end', formatter: `目标: ${myCatStore.weightGoal.target}kg`, color: '#a78bfa' }
            }] : [])
          ],
          lineStyle: { color: '#999', type: 'dashed' },
          label: { show: true, position: 'end', formatter: '平均: {c}kg' }
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
  background: linear-gradient(145deg, #FFFFFF 0%, #FFFBF7 100%);
  border-radius: 24px;
  padding: 24px;
  box-shadow:
    0 4px 20px rgba(244, 162, 97, 0.08),
    0 1px 4px rgba(0, 0, 0, 0.03);
  border: 1px solid #FDF3E9;
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
  color: #374151;
}

.current-weight {
  font-size: 14px;
  color: #9CA3AF;
}

.current-weight strong {
  color: #f5a623;
  font-size: 16px;
}

/* 健康分析样式 */
.health-analysis {
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 20px;
  border: 1px solid transparent;
  transition: all 0.3s ease;
}

/* 状态颜色 */
.health-analysis.normal {
  background: linear-gradient(135deg, #F6FFED 0%, #DCFCE7 100%);
  border-color: #86EFAC;
}

.health-analysis.thin {
  background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);
  border-color: #FCD34D;
}

.health-analysis.overweight {
  background: linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%);
  border-color: #FCA5A5;
}

/* 胖虎状态指示器 */
.status-indicator-pangu {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.status-mascot {
  flex-shrink: 0;
}

.health-analysis.normal .status-mascot {
  animation: breathe 3s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

.status-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
}

.health-analysis.normal .status-text {
  color: #16A34A;
}

.health-analysis.thin .status-text {
  color: #D97706;
}

.health-analysis.overweight .status-text {
  color: #DC2626;
}

.status-text .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: blink 2s ease-in-out infinite;
}

.health-analysis.normal .dot {
  background: #22C55E;
}

.health-analysis.thin .dot {
  background: #F59E0B;
}

.health-analysis.overweight .dot {
  background: #EF4444;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
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
  background: #FFFFFF;
  border-radius: 16px;
  padding: 12px;
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.02);
  margin-bottom: 16px;
}

.btn-export {
  padding: 0.25rem 0.75rem;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  cursor: pointer;
  color: #475569;
  transition: all 0.2s;
}

.btn-export:hover {
  background: #e2e8f0;
}

.premium-locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.goal-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f1f5f9;
}

.goal-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: #475569;
}

.goal-info strong {
  color: #a78bfa;
}

.goal-date {
  color: #94a3b8;
}

.btn-edit-goal {
  background: transparent;
  border: none;
  color: #a78bfa;
  cursor: pointer;
  font-size: 0.8125rem;
  padding: 0;
}

.btn-set-goal {
  background: transparent;
  border: 1px dashed #cbd5e1;
  border-radius: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-set-goal:hover {
  border-color: #a78bfa;
  color: #a78bfa;
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
  border: 1px solid #e2e8f0;
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
  background: #f1f5f9;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  color: #64748b;
}
</style>
