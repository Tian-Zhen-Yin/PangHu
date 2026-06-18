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

const summary = computed(() => {
  const out = props.toolOutput
  if (!out) return null

  // 支持 { success: false, message: '...' } 的情况
  if (out.success === false && out.message) {
    return {
      icon: '⚕️',
      title: '健康评估',
      message: out.message,
      value: null,
    }
  }

  // 支持多种数据结构：{ weightAnalysis: {...} } 或 { status, message, weight }
  const wa = out.weightAnalysis
  if (wa) {
    // 兼容中英文：后端可能返回 'overweight' / 'thin' / 'normal'，也可能直接返回 '超重' / '偏瘦' / '正常'
    const isOverweight = wa.status === 'overweight' || wa.status === '超重'
    const isThin = wa.status === 'thin' || wa.status === '偏瘦'
    const isNormal = wa.status === 'normal' || wa.status === '正常'
    const statusText = isOverweight ? '超重' : isThin ? '偏瘦' : '正常'
    const icon = isOverweight ? '⚠️' : isThin ? '⚖️' : '✅'
    const value = wa.currentWeight
      ? `${wa.currentWeight}${wa.deviation ? ` (偏差 ${wa.deviation})` : ''}`
      : null

    return {
      icon,
      title: `健康评估：${statusText}`,
      message: wa.message || '评估完成',
      value,
    }
  }

  // 简单情况：只有 status 和 message
  if (out.message || out.summary) {
    return {
      icon: '✅',
      title: '健康评估',
      message: out.message || out.summary,
      value: out.currentWeight ? `体重 ${out.currentWeight}` : null,
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
      <div class="agent-summary-text">{{ summary.message }}</div>
      <div v-if="summary.value" class="agent-summary-value">{{ summary.value }}</div>
    </div>
  </div>
</template>
