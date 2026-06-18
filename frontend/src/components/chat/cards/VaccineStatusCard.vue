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

const summary = computed(() => {
  const out = props.toolOutput
  if (!out) return null

  // 支持多种数据结构：
  // 1. { needsAttention: [...], count: number, catName: '...', upToDate: boolean }
  // 2. { vaccines: [...], total: number }
  // 3. { success: false, message: '...' }

  if (out.success === false && out.message) {
    return {
      icon: '💉',
      title: '疫苗状态',
      text: out.message,
      subtext: null,
    }
  }

  const needs = out.needsAttention || []
  const count = out.count != null ? out.count : (out.vaccines?.length || 0)
  const catName = out.catName || '猫咪'

  if (needs.length > 0) {
    const needNames = needs.map((n: any) => n.name || n).filter(Boolean).join('、')
    return {
      icon: '🔴',
      title: '疫苗状态：需关注',
      text: `需关注：${needNames}`,
      subtext: `已接种 ${count} 项`,
    }
  }

  return {
    icon: '✅',
    title: '疫苗状态：良好',
    text: `${catName}：已接种 ${count} 项`,
    subtext: null,
  }
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
