<script setup lang="ts">
/**
 * 猫咪档案卡片
 * 对应工具：get_cat_info
 * 数据提取自原 ChatMessage.vue 的 catSummary()
 */
import { computed } from 'vue'

const props = defineProps<{
  toolOutput: any
}>()

const summary = computed(() => {
  const out = props.toolOutput
  if (!out) return null

  // 尝试多种数据结构：{ cat: {...} } 或 {...} 或 { success: false, message: '...' }
  const catData = out.cat || (out.name ? out : null)
  if (!catData && out.message) {
    // 只有消息的情况：表示没有猫咪数据或获取失败
    return {
      icon: '🐱',
      title: '猫咪档案',
      text: out.message,
      subtext: null,
    }
  }
  if (!catData) return null

  const lines: string[] = []
  if (catData.breed) lines.push(`品种：${catData.breed}`)
  if (catData.age) lines.push(`年龄：${catData.age}`)
  if (catData.gender) lines.push(`性别：${catData.gender}`)
  if (catData.weight) lines.push(`体重：${catData.weight}`)
  if (catData.isNeutered) lines.push('已绝育')
  if (catData.lastVaccine) lines.push(`最近疫苗：${catData.lastVaccine}`)
  if (catData.allergies) lines.push(`过敏：${catData.allergies}`)
  if (catData.diseases) lines.push(`备注：${catData.diseases}`)
  if (catData.lastRecordDate) lines.push(`最近记录：${catData.lastRecordDate}`)

  if (lines.length === 0 && out.message) {
    return {
      icon: '🐱',
      title: '猫咪档案',
      text: out.message,
      subtext: null,
    }
  }

  return {
    icon: '🐱',
    title: catData.name || '猫咪档案',
    text: lines.join(' · '),
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
