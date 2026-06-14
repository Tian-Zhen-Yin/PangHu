<script setup lang="ts">
/**
 * 过敏信息卡片
 * 对应工具：GET_allergy_records
 *
 * P1 阶段为摘要卡片，保持与其他卡片一致的 .agent-summary-card 结构。
 * 后续 P3 可增强为带时间轴的独立大卡片。
 */
import { computed } from 'vue'
import type { AllergyToolOutput } from '@/types/chat'

const props = defineProps<{
  toolOutput: any
}>()

const SEVERITY_LABEL: Record<string, string> = {
  mild: '轻微',
  moderate: '中等',
  severe: '严重',
}

const summary = computed(() => {
  const out = props.toolOutput as AllergyToolOutput | undefined
  if (!out) return null

  // 支持无过敏记录或获取失败的情况
  if (out.success === false && out.message) {
    return {
      icon: '🤧',
      title: '过敏信息',
      text: out.message,
      subtext: null,
      tags: [] as string[],
    }
  }

  if (out.totalRecords === 0) {
    return {
      icon: '✅',
      title: '过敏信息：无记录',
      text: out.message || '暂无过敏记录',
      subtext: null,
      tags: [] as string[],
    }
  }

  const tags = out.patternAnalysis?.topAllergens || out.allergens || []
  const recentCount = out.patternAnalysis?.recentCount ?? 0
  const seasonalPattern = out.patternAnalysis?.seasonalPattern || null

  // 计算最近发作时间
  let lastOccurrenceText: string | null = null
  if (out.lastOccurrence) {
    const d = new Date(out.lastOccurrence)
    const diffDays = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000))
    if (diffDays === 0) lastOccurrenceText = '今天'
    else if (diffDays === 1) lastOccurrenceText = '昨天'
    else if (diffDays < 30) lastOccurrenceText = `${diffDays}天前`
    else lastOccurrenceText = `${d.getMonth() + 1}/${d.getDate()}`
  }

  return {
    icon: '🤧',
    title: `过敏信息：${out.totalRecords} 条记录`,
    text: tags.length > 0 ? `主要过敏原：${tags.slice(0, 3).join('、')}` : out.message || '暂无详细信息',
    subtext: recentCount > 0 ? `近30天发作 ${recentCount} 次` : '近30天无发作',
    tags: tags.slice(0, 5),
    seasonalPattern,
    lastOccurrenceText,
  }
})
</script>

<template>
  <div v-if="summary" class="agent-summary-card">
    <span class="agent-summary-icon">{{ summary.icon }}</span>
    <div class="agent-summary-body">
      <div class="agent-summary-title">
        {{ summary.title }}
        <span v-if="summary.lastOccurrenceText" class="allergy-last">最近 {{ summary.lastOccurrenceText }}</span>
      </div>
      <div class="agent-summary-text">
        <span v-if="summary.tags.length > 0" class="allergy-tags">
          <span
            v-for="allergen in summary.tags"
            :key="allergen"
            class="allergy-tag"
          >{{ allergen }}</span>
        </span>
        <span v-else>{{ summary.text }}</span>
      </div>
      <div v-if="summary.subtext" class="agent-summary-value">
        {{ summary.subtext }}
        <span v-if="summary.seasonalPattern" class="allergy-seasonal">
          · {{ summary.seasonalPattern }}
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
