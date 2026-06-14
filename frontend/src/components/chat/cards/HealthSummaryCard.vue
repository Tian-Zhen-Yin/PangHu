<script setup lang="ts">
/**
 * 健康评估卡片
 * 对应工具：check_health
 * 数据提取自原 ChatMessage.vue 的 healthSummary()
 */
import { computed } from 'vue'

const props = defineProps<{
  toolOutput: any
}>()

const summary = computed<{ status: string; message: string; value: string; icon: string } | null>(() => {
  const wa = props.toolOutput?.weightAnalysis
  if (!wa) return null
  // 兼容中英文：后端可能返回 'overweight' / 'thin' / 'normal'，也可能直接返回 '超重' / '偏瘦' / '正常'
  const isOverweight = wa.status === 'overweight' || wa.status === '超重'
  const isThin = wa.status === 'thin' || wa.status === '偏瘦'
  return {
    status: isOverweight ? '超重' : isThin ? '偏瘦' : '正常',
    message: wa.message,
    value: `${wa.currentWeight}${wa.deviation ? ` (偏差 ${wa.deviation})` : ''}`,
    icon: isOverweight ? '⚠️' : isThin ? '⚖️' : '✅',
  }
})
</script>

<template>
  <div v-if="summary" class="agent-summary-card">
    <span class="agent-summary-icon">{{ summary.icon }}</span>
    <div class="agent-summary-body">
      <div class="agent-summary-title">健康评估：{{ summary.status }}</div>
      <div class="agent-summary-text">{{ summary.message }}</div>
      <div class="agent-summary-value">{{ summary.value }}</div>
    </div>
  </div>
</template>
