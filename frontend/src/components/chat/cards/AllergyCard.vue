<script setup lang="ts">
/**
 * 过敏信息卡片
 * 对应工具：GET_allergy_records
 *
 * P1 阶段为摘要卡片，保持与其他卡片一致的 .agent-summary-card 结构。
 * 后续 P3 可增强为带时间轴的独立大卡片。
 */
import { computed } from 'vue'
import type { AllergyToolOutput } from '../../types/chat.js'

const props = defineProps<{
  toolOutput: any
}>()

const SEVERITY_LABEL: Record<string, string> = {
  mild: '轻微',
  moderate: '中等',
  severe: '严重',
}

const data = computed<AllergyToolOutput | null>(() => {
  const out = props.toolOutput as AllergyToolOutput | undefined
  if (!out || !out.success || out.totalRecords === 0) return null
  return out
})

const lastOccurrenceText = computed(() => {
  if (!data.value?.lastOccurrence) return null
  const d = new Date(data.value.lastOccurrence)
  const diffDays = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 30) return `${diffDays}天前`
  return `${d.getMonth() + 1}/${d.getDate()}`
})
</script>

<template>
  <div v-if="data" class="agent-summary-card">
    <span class="agent-summary-icon">🤧</span>
    <div class="agent-summary-body">
      <div class="agent-summary-title">
        过敏信息：{{ data.totalRecords }} 条记录
        <span v-if="lastOccurrenceText" class="allergy-last">最近发作 {{ lastOccurrenceText }}</span>
      </div>
      <div class="agent-summary-text">
        <span class="allergy-tags">
          <span
            v-for="allergen in data.patternAnalysis.topAllergens"
            :key="allergen"
            class="allergy-tag"
          >{{ allergen }}</span>
        </span>
      </div>
      <div class="agent-summary-value">
        近30天发作 {{ data.patternAnalysis.recentCount }} 次
        <span v-if="data.patternAnalysis.seasonalPattern" class="allergy-seasonal">
          · {{ data.patternAnalysis.seasonalPattern }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.allergy-last {
  font-size: 11px;
  font-weight: 400;
  color: #B59E82;
  margin-left: 8px;
}

.allergy-tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
}

.allergy-tag {
  display: inline-block;
  padding: 1px 8px;
  background: linear-gradient(135deg, #FFF5DC 0%, #FFECC8 100%);
  border-radius: 4px;
  font-size: 11px;
  color: #8B7355;
  font-weight: 500;
}

.allergy-seasonal {
  color: #BC8F6F;
}
</style>
