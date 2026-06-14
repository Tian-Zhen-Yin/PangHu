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

const summary = computed<{ name: string; text: string } | null>(() => {
  const data = props.toolOutput?.cat
  if (!data) return null
  const lines = [
    data.breed ? `品种：${data.breed}` : null,
    `年龄：${data.age || '未知'}`,
    data.weight ? `体重：${data.weight}` : null,
    data.isNeutered ? '已绝育' : null,
    data.diseases ? `备注：${data.diseases}` : null,
  ].filter(Boolean) as string[]
  return { name: data.name || '猫咪', text: lines.join(' · ') }
})
</script>

<template>
  <div v-if="summary" class="agent-summary-card">
    <span class="agent-summary-icon">🐱</span>
    <div class="agent-summary-body">
      <div class="agent-summary-title">{{ summary.name }}</div>
      <div class="agent-summary-text">{{ summary.text }}</div>
    </div>
  </div>
</template>
