<script setup lang="ts">
/**
 * 体重趋势卡片
 * 对应工具：get_weight_trend
 * 数据提取自原 ChatMessage.vue 的 weightSummary()
 */
import { computed } from 'vue'

const props = defineProps<{
  toolOutput: any
}>()

const summary = computed(() => {
  const data = props.toolOutput
  if (!data) return null

  const analysis = data.analysis
  const records = data.records || []
  const catName = data.catName || '猫咪'

  if (analysis) {
    // 完整分析数据
    const currentWeight = analysis.endWeight != null ? `${Number(analysis.endWeight).toFixed(2)} kg` : null
    const changePercent = analysis.changePercent != null
      ? `${analysis.changePercent > 0 ? '+' : ''}${Number(analysis.changePercent).toFixed(1)}%`
      : null
    const trendIcon =
      analysis.trend === '上升' ? '📈' :
      analysis.trend === '下降' ? '📉' :
      analysis.trend === '稳定' ? '➡️' : '📊'
    const trendText = analysis.trend || '数据正常'
    const totalRecords = analysis.totalRecords || records.length || 0

    const lines: string[] = []
    if (totalRecords > 0) lines.push(`📋 ${totalRecords} 条记录`)
    if (analysis.startWeight != null && analysis.endWeight != null) {
      lines.push(`${Number(analysis.startWeight).toFixed(2)} kg → ${Number(analysis.endWeight).toFixed(2)} kg`)
    }
    if (changePercent) lines.push(`变化 ${changePercent}`)
    if (analysis.averageWeight != null) {
      lines.push(`平均 ${Number(analysis.averageWeight).toFixed(2)} kg`)
    }

    return {
      icon: trendIcon,
      title: `体重趋势：${trendText}`,
      text: lines.join(' · '),
      subtext: currentWeight ? `当前体重：${currentWeight}` : null,
    }
  } else if (data.message) {
    // 只有 message 的情况（如无数据）
    return {
      icon: '📊',
      title: '体重信息',
      text: data.message,
      subtext: null,
    }
  }

  return null
})
</script>

<template>
  <div v-if="summary" class="agent-summary-card">
    <span class="agent-summary-icon">{{ summary.icon }}</span>
    <div class="agent-summary-body">
      <div class="agent-summary-title">{{ summary.title }}</div>
      <div class="agent-summary-text">{{ summary.text }}</div>
      <div v-if="summary.subtext" class="agent-summary-value">{{ summary.subtext }}</div>
    </div>
  </div>
</template>
