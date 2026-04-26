<script setup lang="ts">
import type { DashboardRecentRecord } from '../types/index.js'
import { getRecordIcon, getRecordTypeLabel } from '../utils/recordHelpers.js'
import { formatWeight, getWeightValue } from '../utils/formatters.js'

defineProps<{
  record: DashboardRecentRecord
  isFirst: boolean
  isLast: boolean
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <div class="timeline-item" @click="emit('click')">
    <div class="timeline-left">
      <div class="timeline-line" :class="{ first: isFirst, last: isLast }"></div>
      <div class="timeline-dot" :class="`dot-${record.type}`"></div>
    </div>

    <div class="timeline-card">
      <div class="card-header">
        <div class="type-icon" :class="`icon-bg-${record.type}`">
          <span class="svg-icon" v-html="getRecordIcon(record.type)"></span>
        </div>
        <span class="record-type">{{ getRecordTypeLabel(record.originalType || record.type) }}</span>
        <span class="record-date">{{ record.date }}</span>
      </div>

      <div class="card-body">
        <div class="main-info">
          <span v-if="record.type === 'weight'" class="value-text">
            {{ getWeightValue(record) }}<span class="unit">kg</span>
            <span v-if="record.weightChange" class="trend" :class="record.weightChange.direction">
              <svg class="trend-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path v-if="record.weightChange.direction === 'up'" d="M12 19V5M5 12l7-7 7 7" />
                <path v-else d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              <span class="trend-value">{{ formatWeight(record.weightChange.value) }}kg</span>
            </span>
          </span>
          <span v-else class="title-text">{{ record.title }}</span>
        </div>
      </div>

      <div v-if="record.notes" class="notes-text">{{ record.notes }}</div>

      <div class="card-footer">
        <div v-if="record.photos && record.photos.length > 0" class="photo-wall">
          <img
            v-for="(photo, idx) in record.photos.slice(0, 3)"
            :key="idx"
            :src="photo"
            class="mini-photo"
            alt="记录照片"
          />
          <span v-if="record.photos.length > 3" class="more-photos">+{{ record.photos.length - 3 }}</span>
        </div>
        <div class="tag-box">
          <span v-if="record.isAdoptionDay" class="anniversary-tag">🎉 纪念日</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-item {
  position: relative;
  display: flex;
  gap: 14px;
  padding-bottom: var(--space-lg);
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-left {
  position: relative;
  flex-shrink: 0;
  width: 16px;
}

.timeline-line {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--color-border-light);
}

.timeline-line.first { top: 8px; }
.timeline-line.last { bottom: auto; height: 12px; }

.timeline-dot {
  position: absolute;
  left: -5px;
  top: 4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 3px solid var(--color-bg-page);
  z-index: 1;
}

.timeline-dot.dot-weight {
  background: var(--color-success);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}
.timeline-dot.dot-vaccine {
  background: var(--color-info);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}
.timeline-dot.dot-general {
  background: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(255, 138, 76, 0.15);
}
.timeline-dot.dot-medical {
  background: var(--color-danger);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}

.timeline-card {
  flex: 1;
  background: var(--color-bg-card);
  border-radius: var(--radius-xs);
  padding: var(--space-md);
  box-shadow: var(--shadow-card-normal);
  transition: all 0.2s ease;
  cursor: pointer;
  border: 1px solid var(--color-border-light);
}

.timeline-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--color-primary-light);
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.record-date {
  font-size: var(--text-xs);
  color: var(--color-text-light);
  font-weight: var(--font-medium);
  order: -1;
}

.type-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.type-icon .svg-icon svg {
  width: 14px;
  height: 14px;
}

.type-icon.icon-bg-weight { background: var(--color-action-green); color: var(--color-success); }
.type-icon.icon-bg-vaccine { background: var(--color-action-blue); color: var(--color-info); }
.type-icon.icon-bg-general { background: var(--color-action-orange); color: var(--color-primary); }
.type-icon.icon-bg-medical { background: var(--color-action-pink); color: var(--color-danger); }

.record-type {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}

.card-body { margin-bottom: var(--space-xs); }

.main-info { display: flex; align-items: baseline; }

.value-text {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  font-family: var(--font-family-base);
}

.unit {
  font-size: var(--text-xs);
  font-weight: var(--font-normal);
  color: var(--color-text-regular);
  margin-left: 2px;
}

.title-text {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
}

.trend {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: var(--space-sm);
  padding: 2px var(--space-sm);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.trend .trend-icon { width: 12px; height: 12px; flex-shrink: 0; }

.trend.up { background: rgba(255, 138, 76, 0.12); color: var(--color-primary); }
.trend.down { background: rgba(16, 185, 129, 0.12); color: var(--color-success); }

.notes-text {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-top: 6px;
  margin-bottom: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.photo-wall {
  display: flex;
  gap: 6px;
  align-items: center;
  flex: 1;
}

.mini-photo {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-xs);
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid var(--color-border-light);
}

.more-photos {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  background: var(--color-bg-block);
  padding: 0 var(--space-sm);
  height: 44px;
  display: flex;
  align-items: center;
  border-radius: var(--radius-xs);
  font-weight: var(--font-medium);
}

.tag-box { margin-left: auto; }

.anniversary-tag {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: var(--color-danger);
  font-size: var(--text-xs);
  padding: var(--space-xs) var(--space-sm);
  border-radius: 6px;
  font-weight: var(--font-semibold);
}

@media (min-width: 768px) {
  .timeline-left { width: 20px; }
  .timeline-dot { width: 18px; height: 18px; left: -6px; }
  .timeline-card { padding: var(--space-lg); }
  .value-text { font-size: var(--text-2xl); }
}

@media (max-width: 640px) {
  .timeline-left { width: 14px; }
  .timeline-dot { width: 12px; height: 12px; left: -4px; top: 5px; }
  .timeline-card { padding: var(--space-md); }
  .card-header { margin-bottom: var(--space-sm); gap: var(--space-sm); }
  .value-text { font-size: var(--text-lg); }
  .title-text { font-size: var(--text-sm); }
  .card-footer { flex-direction: column; align-items: flex-start; gap: var(--space-sm); }
  .photo-wall { width: 100%; }
  .mini-photo { width: 36px; height: 36px; }
  .more-photos { height: 36px; font-size: 10px; padding: 0 4px; }
  .tag-box { margin-left: 0; }
}
</style>
