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

const summary = computed<{ status: string; text: string; icon: string } | null>(() => {
  const a = props.toolOutput?.analysis
  if (!a) return null
  const icon = a.trend === '上升' ? '📈' : a.trend === '下降' ? '📉' : '➡️'
  const text = `${props.toolOutput.catName || '猫咪'}：${a.totalRecords} 条记录 · 起始 ${a.startWeight} kg → 当前 ${a.endWeight} kg · 变化 ${a.changePercent || 0}%`
  return { status: a.trend, text, icon }
})
</script>

<template>
  <div v-if="summary" class="agent-summary-card">
    <span class="agent-summary-icon">{{ summary.icon }}</span>
    <div class="agent-summary-body">
      <div class="agent-summary-title">体重趋势：{{ summary.status }}</div>
      <div class="agent-summary-text">{{ summary.text }}</div>
    </div>
  </div>
</template>
