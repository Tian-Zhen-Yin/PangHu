<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import WeightSparkline from '../../../components/record/WeightSparkline.vue'
import type { DashboardRecentRecord } from '../types/index.js'

const props = defineProps<{
  records: DashboardRecentRecord[]
}>()

// 提取体重记录用于趋势图
const weightRecords = computed(() => {
  return props.records
    .filter(r => {
      // 匹配 type 为 weight 或标题中包含体重
      if (r.type === 'weight') return true
      if (r.title.includes('体重') || r.title.includes('kg')) return true
      return false
    })
    .slice(0, 10)
    .map(r => {
      // 从标题中提取体重，支持多种格式: "体重: 4.5kg", "4.5kg", "体重: 4.5"
      const title = r.title ?? ''
      const match = title.match(/(\d+\.?\d*)\s*kg/)
        || title.match(/体重[：:]\s*(\d+\.?\d*)/)
        || title.match(/(\d+\.?\d*)/)
      const weight = match?.[1] ? parseFloat(match[1]) : 0
      return {
        weight: isNaN(weight) ? 0 : weight,
        date: r.date
      }
    })
    .filter(r => r.weight > 0) // 过滤掉无效体重
})

// 根据类型获取标签样式
function getTypeTag(type: string): { label: string; class: string } {
  const tags: Record<string, { label: string; class: string }> = {
    weight: { label: '体重', class: 'tag-weight' },
    vaccine: { label: '疫苗', class: 'tag-vaccine' },
    general: { label: '日常', class: 'tag-general' }
  }
  return (tags[type] ?? tags.general)!
}
</script>

<template>
  <div class="recent-records">
    <div class="section-header">
      <h3 class="section-title">最近记录</h3>
      <RouterLink to="/timeline" class="more-link">查看全部 →</RouterLink>
    </div>

    <!-- 体重趋势图 (有体重记录时显示在顶部) -->
    <WeightSparkline
      v-if="weightRecords.length > 0"
      :data="weightRecords"
    />

    <!-- 记录列表 -->
    <div v-if="records.length === 0" class="empty-state">
      <span class="empty-text">暂无记录</span>
    </div>

    <div v-else class="records-list">
      <RouterLink
        v-for="record in records"
        :key="record.id"
        :to="`/my-cats/${record.catId}`"
        class="record-item"
      >
        <span class="record-icon">{{ record.icon }}</span>
        <div class="record-content">
          <div class="record-main">
            <span class="record-title">{{ record.title }}</span>
            <span class="record-tag" :class="getTypeTag(record.type).class">
              {{ getTypeTag(record.type).label }}
            </span>
          </div>
          <div class="record-meta">
            <span class="record-cat">{{ record.catName }}</span>
            <span class="record-dot">·</span>
            <span class="record-date">{{ record.date }}</span>
          </div>
        </div>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.recent-records {
  background: var(--color-card);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  box-shadow: var(--shadow-xs);
  border: 1px solid var(--color-border);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.section-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-main);
  margin: 0;
}

.more-link {
  font-size: var(--text-xs);
  color: var(--color-link);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.more-link:hover {
  color: var(--color-link-hover);
}

.empty-state {
  padding: var(--space-xl) 0;
  text-align: center;
  color: var(--color-text-light);
  font-size: var(--text-xs);
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.record-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: background var(--transition-base);
}

.record-item:hover {
  background: var(--color-bg-alt);
}

.record-icon {
  font-size: var(--text-xl);
  flex-shrink: 0;
  margin-top: 2px;
}

.record-content {
  flex: 1;
  min-width: 0;
}

.record-main {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-xs);
}

.record-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-main);
}

.record-tag {
  padding: 2px var(--space-sm);
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: var(--font-medium);
  flex-shrink: 0;
}

.tag-weight {
  background: var(--color-primary-dim);
  color: var(--color-primary-dark);
}

.tag-vaccine {
  background: rgba(158, 213, 184, 0.2);
  color: #5a9970;
}

.tag-general {
  background: var(--color-bg-alt);
  color: var(--color-text-sub);
}

.record-meta {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-xs);
  color: var(--color-text-sub);
}

.record-dot {
  opacity: 0.5;
}
</style>