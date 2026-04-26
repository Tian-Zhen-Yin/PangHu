<template>
  <span class="record-type-badge" :class="typeClass">
    <span class="badge-label">{{ config!.label }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface RecordTypeConfig {
  label: string
  icon: string
  color: string
  bgColor: string
}

const RECORD_TYPE_CONFIG: Record<string, RecordTypeConfig> = {
  daily: {
    label: '日常',
    icon: 'daily',
    color: '#10B981',
    bgColor: '#E8F8F2'
  },
  vaccine: {
    label: '疫苗',
    icon: 'vaccine',
    color: '#6366F1',
    bgColor: '#EEF2FF'
  },
  deworm: {
    label: '驱虫',
    icon: 'deworm',
    color: '#F59E0B',
    bgColor: '#FEF3C7'
  },
  healthCheck: {
    label: '体检',
    icon: 'health',
    color: '#A78BFA',
    bgColor: '#F3E8FF'
  },
  free: {
    label: '自由',
    icon: 'free',
    color: '#94A3B8',
    bgColor: '#F1F5F9'
  }
}

interface Props {
  type: 'daily' | 'vaccine' | 'deworm' | 'healthCheck' | 'free'
  isAdoptionDay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isAdoptionDay: false
})

const config = computed(() => RECORD_TYPE_CONFIG[props.type] ?? RECORD_TYPE_CONFIG.daily)

const typeClass = computed(() => {
  if (props.isAdoptionDay) return 'is-adoption'
  return `is-${props.type}`
})


</script>

<style scoped>
.record-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.record-type-badge .badge-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

/* 日常记录 - 薄荷绿 */
.record-type-badge.is-daily {
  background-color: #E8F8F2;
  color: #10B981;
}

/* 疫苗记录 - 天空蓝 */
.record-type-badge.is-vaccine {
  background-color: #EEF2FF;
  color: #6366F1;
}

/* 驱虫记录 - 暖阳橙 */
.record-type-badge.is-deworm {
  background-color: #FEF3C7;
  color: #F59E0B;
}

/* 体检记录 - 薰衣草紫 */
.record-type-badge.is-healthCheck {
  background-color: #F3E8FF;
  color: #A78BFA;
}

/* 自由记录 - 中性灰 */
.record-type-badge.is-free {
  background-color: #F1F5F9;
  color: #94A3B8;
}

/* 领养纪念日 - 特殊渐变样式 */
.record-type-badge.is-adoption {
  background: linear-gradient(135deg, #FDF2F8 0%, var(--color-bg-cream) 100%);
  color: #EC4899;
  border: 1px solid #FBCFE8;
  box-shadow: 0 2px 8px rgba(236, 72, 153, 0.15);
  position: relative;
}

.record-type-badge.is-adoption::before {
  content: '🎂';
  margin-right: 0.125rem;
  font-size: 0.875rem;
}

.record-type-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>
