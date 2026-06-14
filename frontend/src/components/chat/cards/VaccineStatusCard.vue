<script setup lang="ts">
/**
 * 疫苗状态卡片
 * 对应工具：check_vaccine
 * 数据提取自原 ChatMessage.vue 的 vaccineSummary()
 */
import { computed } from 'vue'

const props = defineProps<{
  toolOutput: any
}>()

const summary = computed<{ status: string; text: string; icon: string } | null>(() => {
  const out = props.toolOutput
  if (!out) return null
  const needs = out.needsAttention || []
  const text = needs.length > 0
    ? `需关注：${needs.map((n: any) => n.name).join('、')}`
    : `${out.catName || '猫咪'}：已接种 ${out.count || 0} 项`
  const icon = needs.length > 0 ? '🔴' : '✅'
  const status = needs.length > 0 ? '待补种' : '状态良好'
  return { status, text, icon }
})
</script>

<template>
  <div v-if="summary" class="agent-summary-card">
    <span class="agent-summary-icon">{{ summary.icon }}</span>
    <div class="agent-summary-body">
      <div class="agent-summary-title">疫苗状态：{{ summary.status }}</div>
      <div class="agent-summary-text">{{ summary.text }}</div>
    </div>
  </div>
</template>
