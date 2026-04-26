<template>
  <div class="weight-trend-comparison">
    <div class="chart-header">
      <h3>体重趋势对比</h3>
      <span class="chart-info">最多显示最近 {{ MAX_DATA_POINTS }} 条记录</span>
    </div>

    <div v-if="loading" class="loading">
      <LoadingSpinner />
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="catsWithoutHistory.length === cats.length" class="empty-state">
      <p>暂无体重数据</p>
      <p class="hint">请先为猫咪添加体重记录</p>
    </div>

    <div v-else ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import LoadingSpinner from '../common/LoadingSpinner.vue'
import type { CatComparisonData } from '../../types/weight'
import { formatWeightValue } from '../../utils/format'

const MAX_DATA_POINTS = 30

interface Props {
  cats: CatComparisonData[]
  loading?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: ''
})

const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

// 没有历史数据的猫咪
const catsWithoutHistory = computed(() => {
  return props.cats.filter(cat => !cat.history || cat.history.length === 0)
})

// 猫咪颜色方案 - 马卡龙色系
const CAT_COLORS = [
  '#FF8A4C', // 橙色（主色 - 珊瑚橘）
  '#10B981', // 薄荷绿
  '#38BDF8', // 天空蓝
  '#A78BFA', // 薰衣草紫
  '#F59E0B', // 琥珀黄
]

function initChart() {
  if (!chartRef.value) return

  const rect = chartRef.value.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) {
    setTimeout(() => {
      if (chartRef.value) initChart()
    }, 100)
    return
  }

  if (chart) {
    chart.dispose()
  }

  chart = echarts.init(chartRef.value)
  updateChart()
}

function updateChart() {
  if (!chart) return

  // 过滤有历史数据的猫咪，并限制数据点数量
  const catsWithHistory = props.cats
    .filter(cat => cat.history && cat.history.length > 0)
    .map(cat => ({
      ...cat,
      history: cat.history.slice(-MAX_DATA_POINTS)
    }))

  if (catsWithHistory.length === 0) return

  // 收集所有日期并去重排序
  const allDates = new Set<string>()
  catsWithHistory.forEach(cat => {
    cat.history.forEach(record => allDates.add(record.date))
  })
  const sortedDates = Array.from(allDates).sort()

  // 构建系列数据
  const series = catsWithHistory.map((cat, index) => {
    const color = CAT_COLORS[index % CAT_COLORS.length]!

    // 创建日期到体重的映射
    const weightMap = new Map<string, number>()
    cat.history.forEach(record => {
      weightMap.set(record.date, record.weight)
    })

    // 按照统一日期序列填充数据
    const data = sortedDates.map(date => weightMap.get(date) ?? null)

    return {
      name: cat.cat.name,
      type: 'line' as const,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      data: data,
      connectNulls: false,
      itemStyle: { color },
      lineStyle: {
        width: 2.5,
        color
      }
    }
  })

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        if (!params || params.length === 0) return ''
        let tooltip = `<div style="padding: 8px;">
          <div style="margin-bottom: 8px; font-weight: bold;">${params[0].axisValue}</div>`

        params.forEach((param: any) => {
          if (param.value !== null) {
            tooltip += `<div style="margin-bottom: 4px;">
              <span style="display: inline-block; width: 10px; height: 10px; background: ${param.color}; border-radius: 50%; margin-right: 6px;"></span>
              <span style="font-weight: 500;">${param.seriesName}</span>
              <span style="margin-left: 8px; color: ${param.color};">${formatWeightValue(param.value)}kg</span>
            </div>`
          }
        })

        tooltip += '</div>'
        return tooltip
      }
    },
    legend: {
      data: catsWithHistory.map(cat => cat.cat.name),
      top: 0,
      left: 'center',
      textStyle: {
        fontSize: 12,
        color: 'var(--color-text-regular)'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '40px',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: sortedDates,
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: 'var(--color-border)'
        }
      },
      axisLabel: {
        color: 'var(--color-text-regular)',
        fontSize: 11,
        rotate: sortedDates.length > 10 ? 45 : 0
      }
    },
    yAxis: {
      type: 'value',
      name: '体重 (kg)',
      nameTextStyle: {
        color: 'var(--color-text-regular)',
        fontSize: 12
      },
      axisLine: {
        lineStyle: {
          color: 'var(--color-border)'
        }
      },
      axisLabel: {
        color: 'var(--color-text-regular)',
        fontSize: 11,
        formatter: '{value} kg'
      },
      splitLine: {
        lineStyle: {
          color: 'var(--color-border-light)',
          type: 'dashed'
        }
      }
    },
    series
  }

  chart.setOption(option)
}

function handleResize() {
  chart?.resize()
}

onMounted(() => {
  nextTick(() => {
    initChart()
  })
  window.addEventListener('resize', handleResize)
})

watch(() => props.cats, () => {
  nextTick(() => {
    if (chart) {
      updateChart()
    } else {
      initChart()
    }
  })
}, { deep: true })

onUnmounted(() => {
  chart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.weight-trend-comparison {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow-card-normal);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chart-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--color-text-primary);
}

.chart-info {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.loading,
.error,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 250px;
  color: var(--color-text-secondary);
}

.empty-state {
  text-align: center;
}

.empty-state .hint {
  font-size: 12px;
  margin-top: 6px;
}

.chart-container {
  width: 100%;
  height: 320px;
}
</style>
