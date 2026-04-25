<template>
  <span class="record-type-badge" :class="typeClass">
    <component :is="iconSvg" class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" />
    <span class="badge-label">{{ config.label }}</span>
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

const config = computed(() => RECORD_TYPE_CONFIG[props.type])

const typeClass = computed(() => {
  if (props.isAdoptionDay) return 'is-adoption'
  return `is-${props.type}`
})

// SVG 图标
const iconSvg = computed(() => {
  const icons: Record<string, unknown> = {
    daily: 'svg',
    vaccine: 'svg',
    deworm: 'svg',
    health: 'svg',
    free: 'svg'
  }
  return 'svg'
})
</script>

<script lang="ts">
// 图标 SVG 路径定义
const iconPaths = {
  daily: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />',
  vaccine: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 2h6a2 2 0 012 2v2a2 2 0 01-2 2H9a2 2 0 01-2-2V4a2 2 0 012-2z" /><path stroke-linecap="round" stroke-linejoin="round" d="M9 10V6a3 3 0 016 0v4" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 14v4" /><path stroke-linecap="round" stroke-linejoin="round" d="M10 16h4" />',
  deworm: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />',
  health: '<path stroke-linecap="round" stroke-linejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2" />',
  free: '<path stroke-linecap="round" stroke-linejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path stroke-linecap="round" stroke-linejoin="round" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />'
}
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
